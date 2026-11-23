/* Owner's original model/film. No automatic sound, no forced entry gate. */
const exodusObjectScripts = new Map();
function loadExodusObjectScript(source) {
 if (customElements.get('model-viewer')) return Promise.resolve();
 const url = new URL(source, document.baseURI);
 let entry = exodusObjectScripts.get(url.href);
 if (!entry) {
  entry = {promise: null, failures: 0};
  exodusObjectScripts.set(url.href, entry);
 }
 if (!entry.promise) {
  if (entry.failures && /^https?:$/.test(url.protocol)) url.searchParams.set('exodus_retry', String(entry.failures));
  entry.promise = import(url.href).catch(error => {
   entry.promise = null;
   entry.failures++;
   throw error;
  });
 }
 return entry.promise;
}
document.querySelectorAll('[data-object-exhibit]').forEach(exhibit => {
 const load=exhibit.querySelector('[data-load-object]'),rotate=exhibit.querySelector('[data-rotate-object]'),reset=exhibit.querySelector('[data-reset-object]'),frame=exhibit.querySelector('[data-model-frame]'),poster=exhibit.querySelector('[data-model-poster]'),status=exhibit.querySelector('[data-object-status]'),follow=exhibit.querySelector('[data-follow-object]');
 const fine=matchMedia('(hover:hover) and (pointer:fine)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let viewer=null,importing=false,generation=0,activeTimer,animation=0,following=false,targetX=0,targetY=85,currentX=0,currentY=85,lastTime=0;
 function stopRotation(){if(viewer){viewer.autoRotate=false;viewer.removeAttribute('auto-rotate');}rotate.setAttribute('aria-pressed','false');rotate.textContent=rotate.dataset.playLabel;}
 function setFollow(enabled){
  following=!!enabled&&fine.matches&&!reduced.matches&&!!viewer&&!importing;
  exhibit.dataset.following=String(following);
  if(follow){follow.setAttribute('aria-pressed',String(following));follow.textContent=following?follow.dataset.pauseLabel:follow.dataset.playLabel;}
  cancelAnimationFrame(animation);animation=0;lastTime=0;
  if(following){stopRotation();targetX=currentX=0;targetY=currentY=85;}
 }
 function animate(time){
  animation=0;if(!following||document.hidden||!viewer)return;
  const dt=lastTime?Math.min(60,time-lastTime):16;lastTime=time;const mix=1-Math.exp(-dt/110);
  currentX+=(targetX-currentX)*mix;currentY+=(targetY-currentY)*mix;
  viewer.cameraOrbit=currentX.toFixed(3)+'deg '+currentY.toFixed(3)+'deg 7m';
  viewer.setAttribute('camera-orbit',viewer.cameraOrbit);
  if(Math.abs(targetX-currentX)>.015||Math.abs(targetY-currentY)>.015)animation=requestAnimationFrame(animate);else lastTime=0;
 }
 function queue(){if(!animation&&following&&!document.hidden)animation=requestAnimationFrame(animate);}
 function fail(ticket){
  if(ticket!==generation)return;generation++;clearTimeout(activeTimer);setFollow(false);stopRotation();
  viewer?.remove();viewer=null;poster.hidden=false;rotate.hidden=true;reset.hidden=true;if(follow)follow.hidden=true;
  load.hidden=false;load.disabled=false;load.textContent=load.dataset.errorLabel;frame.removeAttribute('aria-busy');
  status.textContent=load.dataset.errorLabel;exhibit.dataset.modelState='error';importing=false;
 }
 load.addEventListener('click',async()=>{
  if(importing||exhibit.dataset.modelState==='ready')return;
  const ticket=++generation;importing=true;load.disabled=true;status.textContent=load.dataset.loadingLabel;frame.setAttribute('aria-busy','true');exhibit.dataset.modelState='loading';
  activeTimer=setTimeout(()=>fail(ticket),20000);
  try{
   await loadExodusObjectScript(load.dataset.moduleSrc);if(ticket!==generation)return;
   viewer?.remove();const candidate=document.createElement('model-viewer');viewer=candidate;
   candidate.src=load.dataset.modelSrc;candidate.alt=load.dataset.alt;candidate.a11y=JSON.parse(load.dataset.a11y);
   for(const [key,value] of Object.entries({'camera-controls':'','disable-pan':'','touch-action':'pan-y','interaction-prompt':'none','camera-orbit':'0deg 85deg 7m','min-camera-orbit':'auto 35deg 3m','max-camera-orbit':'auto 125deg 10m','field-of-view':'30deg','environment-image':'neutral','exposure':'1.3','shadow-intensity':'0','tabindex':'0'}))candidate.setAttribute(key,value);
   candidate.addEventListener('load',()=>{
    if(ticket!==generation||viewer!==candidate)return;clearTimeout(activeTimer);frame.removeAttribute('aria-busy');
    poster.hidden=true;load.hidden=true;load.disabled=false;rotate.hidden=false;reset.hidden=false;importing=false;
    if(follow)follow.hidden=!(fine.matches&&!reduced.matches);
    status.textContent=load.dataset.readyLabel;exhibit.dataset.modelState='ready';setFollow(true);
   },{once:true});
   candidate.addEventListener('error',()=>fail(ticket),{once:true});
   candidate.addEventListener('pointerdown',()=>setFollow(false));
   candidate.addEventListener('keydown',()=>setFollow(false));
   frame.append(candidate);
  }catch{fail(ticket);}
 });
 const stage=exhibit.closest('.identity-stage')||exhibit;
 stage.addEventListener('pointermove',event=>{
  if(!following||event.pointerType!=='mouse')return;
  const rect=stage.getBoundingClientRect();targetX=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1))*18;
  targetY=85+Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1))*7;queue();
 },{passive:true});
 stage.addEventListener('pointerleave',()=>{if(following){targetX=0;targetY=85;queue();}});
 follow?.addEventListener('click',()=>{const next=!following;setFollow(next);if(next)queue();});
 rotate.addEventListener('click',()=>{if(!viewer||importing)return;setFollow(false);viewer.autoRotate=!viewer.autoRotate;viewer.toggleAttribute('auto-rotate',viewer.autoRotate);rotate.setAttribute('aria-pressed',String(viewer.autoRotate));rotate.textContent=viewer.autoRotate?rotate.dataset.pauseLabel:rotate.dataset.playLabel;});
 reset.addEventListener('click',()=>{if(!viewer||importing)return;setFollow(false);stopRotation();viewer.cameraOrbit='0deg 85deg 7m';viewer.setAttribute('camera-orbit',viewer.cameraOrbit);viewer.fieldOfView='30deg';viewer.jumpCameraToGoal();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){setFollow(false);stopRotation();}});
 function motionPreference(){if(reduced.matches||!fine.matches){setFollow(false);stopRotation();}if(follow)follow.hidden=!(viewer&&fine.matches&&!reduced.matches);}
 reduced.addEventListener('change',motionPreference);fine.addEventListener('change',motionPreference);
 window.addEventListener('pagehide',()=>{setFollow(false);if(importing)fail(generation);else{generation++;clearTimeout(activeTimer);stopRotation();}});
 if(exhibit.hasAttribute('data-auto-object')){
  let started=false;const observer=new IntersectionObserver(entries=>{
   if(started||!entries[0].isIntersecting||document.hidden)return;
   started=true;observer.disconnect();
   const connection=navigator.connection;
   if(connection?.saveData||/2g/.test(connection?.effectiveType||''))return;
   const start=()=>{if(!document.hidden&&exhibit.dataset.modelState!=='error')load.click();};
   if('requestIdleCallback'in window)requestIdleCallback(start,{timeout:1600});else setTimeout(start,700);
  },{threshold:.2});observer.observe(exhibit);
 }
});

document.querySelectorAll('[data-archive-motion]').forEach(video=>{
 const section=video.closest('.motion-exhibit'),button=section.querySelector('[data-toggle-motion]'),status=section.querySelector('[data-motion-status]');
 const sync=()=>{button.textContent=video.paused?button.dataset.playLabel:button.dataset.pauseLabel;button.setAttribute('aria-pressed',String(!video.paused));};
 button.addEventListener('click',async()=>{if(video.paused){try{await video.play();status.textContent='';}catch{status.textContent=status.dataset.errorLabel;}}else video.pause();sync();});
 video.addEventListener('play',sync);video.addEventListener('pause',sync);video.addEventListener('error',()=>{status.textContent=status.dataset.errorLabel;});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause();});
 new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)video.pause();},{threshold:.05}).observe(video);
});

