/* Native product image viewer. Original links remain usable without enhancement. */
(() => {
 const viewer=document.getElementById('ImageViewer');
 const image=document.getElementById('ViewerImage');
 const caption=document.getElementById('ViewerCaption');
 const count=document.getElementById('ViewerCount');
 const status=document.getElementById('ViewerLoadStatus');
 const original=document.getElementById('ViewerOriginal');
 const navigation=viewer?.querySelector('[data-viewer-navigation]');
 const zoom=document.getElementById('ViewerZoom');
 const rotate=document.getElementById('ViewerRotate');
 const viewport=document.getElementById('ViewerViewport');
 const canvas=document.getElementById('ViewerCanvas');
 if(!viewer||!image||!caption||!count||!status||!original||!navigation||typeof viewer.showModal!=='function')return;
 let items=[],index=0,opener=null,request=0,rotation=0;
 function layoutImage(){
  if(!canvas||!viewport||!image.naturalWidth||!image.naturalHeight)return;
  const sideways=rotation===90||rotation===270;
  const width=sideways?image.naturalHeight:image.naturalWidth;
  const height=sideways?image.naturalWidth:image.naturalHeight;
  const fit=Math.min(viewport.clientWidth/width,viewport.clientHeight/height);
  const enlarged=zoom?.getAttribute('aria-pressed')==='true';
  const scale=Math.min(1,fit*(enlarged?2:1));
  canvas.style.width=width*scale+'px';
  canvas.style.height=height*scale+'px';
  canvas.style.setProperty('--viewer-photo-width',image.naturalWidth*scale+'px');
  canvas.style.setProperty('--viewer-photo-height',image.naturalHeight*scale+'px');
  canvas.style.setProperty('--viewer-photo-angle',rotation+'deg');
  if(zoom)zoom.disabled=fit>=1&&!enlarged;
  viewport.scrollLeft=enlarged?Math.max(0,(width*scale-viewport.clientWidth)/2):0;
  viewport.scrollTop=0;
 }
 function resetZoom(){
  if(zoom){
   zoom.setAttribute('aria-pressed','false');
   zoom.textContent=zoom.dataset.zoomLabel;
  }
  viewport?.removeAttribute('data-zoomed');
  layoutImage();
 }
 zoom?.addEventListener('click',()=>{
  if(zoom.disabled||!viewport)return;
  if(zoom.getAttribute('aria-pressed')==='true'){resetZoom();return;}
  zoom.setAttribute('aria-pressed','true');
  zoom.textContent=zoom.dataset.fitLabel;
  viewport.setAttribute('data-zoomed','');
  layoutImage();
 });
 rotate?.addEventListener('click',()=>{
  if(rotate.disabled)return;
  rotation=(rotation+90)%360;
  resetZoom();
 });
 if(viewport&&typeof ResizeObserver!=='undefined'){
  new ResizeObserver(()=>{if(!image.hidden)layoutImage();}).observe(viewport);
 }
 function render(){
  const item=items[index];if(!item)return;
  const token=++request;
  const configured=Number(item.dataset.viewRotation);
  rotation=[0,90,180,270].includes(configured)?configured:0;
  resetZoom();
  if(zoom)zoom.disabled=true;
  if(rotate)rotate.disabled=true;
  if(canvas)canvas.hidden=true;
  image.hidden=true;
  status.hidden=false;status.textContent=status.dataset.loading;
  viewer.setAttribute('aria-busy','true');
  caption.textContent=item.dataset.caption||'';
  image.alt=item.querySelector('img')?.alt||caption.textContent;
  count.textContent=count.dataset.label.replace('[current]',String(index+1)).replace('[total]',String(items.length));
  navigation.hidden=items.length<2;
  original.hidden=true;original.href=item.dataset.viewImage;
  image.onload=()=>{
   if(token!==request)return;
   image.hidden=false;
   if(canvas)canvas.hidden=false;
   status.hidden=true;original.hidden=false;
   if(rotate)rotate.disabled=false;
   layoutImage();
   viewer.setAttribute('aria-busy','false');
  };
  image.onerror=()=>{
   if(token!==request)return;
   image.hidden=true;status.textContent=status.dataset.failed;
   status.hidden=false;original.hidden=false;
   viewer.setAttribute('aria-busy','false');
  };
  image.src=item.dataset.viewImage;
  const gallery=item.closest('[data-product-gallery]');
  if(gallery)gallery.dispatchEvent(new CustomEvent('product:image',{detail:item.dataset.galleryFrame}));
 }
 function move(step){
  if(items.length<2)return;
  index=(index+step+items.length)%items.length;render();
 }
 document.addEventListener('click',event=>{
  const item=event.target.closest('[data-view-image]');
  if(!item||event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||(event.button!=null&&event.button!==0))return;
  const gallery=item.closest('[data-product-gallery]');
  items=gallery?[...gallery.querySelectorAll('[data-view-image]')]:[item];
  items=items.filter(entry=>entry.dataset.viewImage);
  index=items.indexOf(item);if(index<0)return;
  event.preventDefault();opener=item;render();
  if(!viewer.open)viewer.showModal();
 });
 viewer.addEventListener('click',event=>{
  if(event.target.closest('[data-viewer-previous]'))move(-1);
  if(event.target.closest('[data-viewer-next]'))move(1);
 });
 viewer.addEventListener('keydown',event=>{
  if(!viewer.open||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(zoom?.getAttribute('aria-pressed')==='true'&&viewport?.contains(event.target))return;
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||items.length<2)return;
  event.preventDefault();
  if(event.key==='Home'){index=0;render();}
  else if(event.key==='End'){index=items.length-1;render();}
  else move(event.key==='ArrowRight'?1:-1);
 });
 viewer.addEventListener('close',()=>{
  ++request;image.onload=null;image.onerror=null;
  resetZoom();
  if(zoom)zoom.disabled=true;
  if(rotate)rotate.disabled=true;
  viewer.setAttribute('aria-busy','false');
  const target=items[index]?.isConnected?items[index]:opener;
  target?.focus({preventScroll:true});
  items=[];opener=null;
 });
})();
