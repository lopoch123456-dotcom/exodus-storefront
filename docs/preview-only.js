
/* Static fixture adapter only: Shopify normally resolves ?variant server-side. */
if(location.pathname.includes('/__fixtures/variants')){
 const control=document.querySelector('[data-product-variant]');
 const selected=new URL(location.href).searchParams.get('variant');
 if(control && [...control.options].some(option=>option.value===selected && !option.disabled)){
  control.value=selected;control.dispatchEvent(new Event('change',{bubbles:true}));
 }
}
document.addEventListener('submit',event=>{
 const form=event.target;
 if(form.matches('[data-offline-form]')){
  if(event.defaultPrevented)return;
  event.preventDefault();
  const status=form.querySelector('[data-preview-status]');
  if(status)status.textContent=form.dataset.previewNotice||document.body.dataset.previewSubmitNotice;
 }
 if(form.matches('[data-offline-localization]')){
  event.preventDefault();
  const lang=event.submitter?.value;
  if(!['en','zh-CN'].includes(lang))return;
  const url=new URL(location.href);
  const base=url.pathname.slice(18).replace(/^\/zh-cn(?=\/|$)/,'')||'/';
  url.pathname='/exodus-storefront'+(lang==='zh-CN'?'/zh-cn':'')+base;
  location.assign(url.href);
 }
});
