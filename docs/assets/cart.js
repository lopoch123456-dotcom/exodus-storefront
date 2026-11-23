/* Batch quantities by exact Shopify line-item keys. Reload server state for totals.
   update.js is not an inventory reservation; stock/checkout require live-store testing.
   After a failed/unknown mutation, require refresh rather than risk a blind retry. */
let bagMutationPending = false;
function bagInputs(form){return [...form.querySelectorAll('[data-cart-quantity]')];}
function bagDirty(form){return bagInputs(form).some(input=>input.value!==input.defaultValue);}
function bagNotice(form,message){form.querySelector('[data-cart-status]').textContent=message;}
function refreshBagDraft(form){
  const dirty=bagDirty(form);
  form.querySelector('[data-cart-draft]').textContent=dirty?form.dataset.draft:'';
  form.querySelector('[data-cart-save]').classList.toggle('has-changes',dirty);
}
function bagNextQuantity(input,direction){
  const minimum=Number(input.dataset.ruleMin)||1,step=Number(input.dataset.ruleStep)||1;
  const upper=input.max===''?Number.MAX_SAFE_INTEGER:Number(input.max);
  if(!Number.isSafeInteger(minimum)||minimum<1||!Number.isSafeInteger(step)||step<1||!Number.isSafeInteger(upper)||upper<minimum)return null;
  const limit=minimum+Math.floor((upper-minimum)/step)*step;
  let value=Number(input.value);
  if(!Number.isSafeInteger(value)||value<0)value=0;
  if(value>limit)return limit;
  if(direction==='1'){
    if(value<minimum)return minimum;
    if(value>=limit)return limit;
    return minimum+(Math.floor((value-minimum)/step)+1)*step;
  }
  if(value<=minimum)return 0;
  return minimum+(Math.ceil((value-minimum)/step)-1)*step;
}

document.addEventListener('click',event=>{
  const adjust=event.target.closest('[data-quantity-adjust]');
  if(!adjust)return;
  const form=adjust.closest('[data-cart-form]'),input=adjust.closest('[data-cart-line]').querySelector('[data-cart-quantity]');
  if(!input||bagMutationPending||form.dataset.uncertain==='true')return;
  const value=bagNextQuantity(input,adjust.dataset.quantityAdjust);
  if(value===null){bagNotice(form,form.dataset.ruleError);return;}
  input.value=String(value);input.setCustomValidity('');refreshBagDraft(form);
});
async function saveBag(form,removeKey=null){
  if(bagMutationPending||form.dataset.uncertain==='true')return;
  const inputs=bagInputs(form),updates=Object.create(null);
  for(const input of inputs){
    const key=input.dataset.lineKey,remove=key===removeKey;
    const quantity=remove?0:Number(input.value),minimum=Number(input.dataset.ruleMin)||1,step=Number(input.dataset.ruleStep)||1;
    input.setCustomValidity('');
    if(!remove&&(input.value.trim()===''||!Number.isInteger(quantity)||quantity<0||(quantity!==0&&(quantity<minimum||(quantity-minimum)%step!==0)))){
      input.setCustomValidity(form.dataset.ruleError);input.reportValidity();input.focus();return;
    }
    if(!remove&&!input.reportValidity()){input.focus();return;}
    if(remove||input.value!==input.defaultValue)updates[key]=quantity;
  }
  if(Object.keys(updates).length===0){bagNotice(form,form.dataset.noChanges);return;}
  bagMutationPending=true;form.setAttribute('aria-busy','true');
  const controls=[...form.querySelectorAll('button,input')].map(element=>({element,disabled:element.disabled}));
  controls.forEach(x=>{x.element.disabled=true;});
  bagNotice(form,form.dataset.pending);
  let confirmed=false;
  try{
    const response=await fetch(form.dataset.updateUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({updates})});
    const data=await response.json().catch(()=>null);
    if(!response.ok){
      const detail=typeof data?.description==='string'?data.description:form.dataset.error;
      bagNotice(form,detail+' '+form.dataset.review);form.dataset.uncertain='true';return;
    }
    if(!data||!Array.isArray(data.items)||!Number.isInteger(data.item_count))throw Error('Unexpected cart response');
    window.location.assign(form.dataset.cartUrl);confirmed=true;
  }catch{bagNotice(form,form.dataset.networkError);form.dataset.uncertain='true';}
  finally{
    if(!confirmed){
      bagMutationPending=false;form.removeAttribute('aria-busy');
      if(form.dataset.uncertain==='true')form.querySelector('[data-cart-refresh]').hidden=false;
      else controls.forEach(x=>{x.element.disabled=x.disabled;});
    }
  }
}
document.addEventListener('submit',event=>{
  const form=event.target.closest('[data-cart-form]');if(!form)return;
  if(bagMutationPending||form.dataset.uncertain==='true'){event.preventDefault();return;}
  if(event.submitter?.name==='checkout'){
    if(bagDirty(form)){event.preventDefault();bagNotice(form,form.dataset.dirtyMessage);bagInputs(form).find(input=>input.value!==input.defaultValue).focus();}
    return;
  }
  event.preventDefault();saveBag(form);
});
document.addEventListener('click',event=>{
  const remove=event.target.closest('[data-cart-remove]'),form=remove?.closest('[data-cart-form]');
  if(!form)return;event.preventDefault();saveBag(form,remove.dataset.cartRemove);
});
document.addEventListener('input',event=>{
  const input=event.target.closest('[data-cart-quantity]'),form=input?.closest('[data-cart-form]');
  if(!form)return;input.setCustomValidity('');bagNotice(form,'');refreshBagDraft(form);
});
