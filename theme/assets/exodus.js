/* Native links/forms remain usable without JavaScript. No fake commerce state. */
document.addEventListener('click', event => {
  const opener = event.target.closest('[data-open-dialog]');
  if (opener) {
    const dialog = document.getElementById(opener.dataset.openDialog);
    if (dialog && !dialog.open) dialog.showModal();
  }
  const closer = event.target.closest('[data-close-dialog]');
  if (closer) closer.closest('dialog')?.close();
  if (event.target.tagName === 'DIALOG') {
    const bounds = event.target.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) event.target.close();
  }
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target.closest('a')) dialog.close();
  });
});

/* Carry the current sample-list context across a language change in this tab. */
const productBack = document.querySelector('[data-product-back]');
const sampleReturnKey = 'exodus:sample-language-return';
const productHandle = productBack?.hasAttribute('data-sample-return') ? location.pathname.split('/').filter(Boolean).pop() : null;
let catalogReturn;

if (productBack) {
  const collection = new URL(productBack.href);
  const search = new URL(productBack.dataset.searchPath, location.origin);
  const referrer = document.referrer ? new URL(document.referrer) : null;
  if (referrer?.origin === location.origin) {
    // Static hosts may add a trailing slash to directory routes.
    const samePath = (a, b) => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');
    if (samePath(referrer.pathname, collection.pathname)) catalogReturn = {kind:'collection', query:referrer.search};
    if (samePath(referrer.pathname, search.pathname)) catalogReturn = {kind:'search', query:referrer.search};
  }
  if (productHandle) {
    let pending;
    try {
      pending = JSON.parse(sessionStorage.getItem(sampleReturnKey));
      sessionStorage.removeItem(sampleReturnKey);
    } catch {
      // The link still works when tab storage is unavailable.
    }
    const isLanguageArrival = pending?.product === productHandle &&
      pending.language === document.documentElement.lang &&
      pending.expires > Date.now();
    catalogReturn ??= isLanguageArrival ? pending.context : history.state?.exodusSampleReturn;
    if (catalogReturn) history.replaceState({...history.state, exodusSampleReturn:catalogReturn}, '');
  }
  if (catalogReturn?.kind === 'search' || catalogReturn?.kind === 'collection') {
    const target = catalogReturn.kind === 'search' ? search : collection;
    target.search = catalogReturn.query;
    if (productHandle && /^[a-z0-9-]+$/.test(productHandle)) target.hash = 'catalog-' + productHandle;
    productBack.href = target.pathname + target.search + target.hash;
    if (catalogReturn.kind === 'search') productBack.textContent = productBack.dataset.searchLabel;
  }
}

/* Use Shopify's localization form. No new cart or checkout state is created. */
document.querySelectorAll('form').forEach(form => {
  if (!form.querySelector('[name="language_code"]')) return;
  form.addEventListener('submit', event => {
    const returnTo = form.querySelector('[name="return_to"]');
    if (returnTo) returnTo.value = location.pathname + location.search + location.hash;
    if (!productHandle || !catalogReturn || !event.submitter?.value) return;
    try {
      sessionStorage.setItem(sampleReturnKey, JSON.stringify({
        product:productHandle,
        language:event.submitter.value,
        context:catalogReturn,
        expires:Date.now() + 120000
      }));
    } catch {
      // Language switching and the default collection link are still available.
    }
  });
});

/* Product gallery: all photographs remain visible if JavaScript is unavailable. */
document.querySelectorAll('[data-product-gallery]').forEach(gallery => {
  const frames = [...gallery.querySelectorAll('[data-gallery-frame]')];
  const rail = gallery.querySelector('.gallery-thumbnails');
  const thumbs = [...gallery.querySelectorAll('[data-gallery-thumb]')];
  function select(id) {
    if (!frames.some(frame => frame.dataset.galleryFrame === String(id))) return;
    frames.forEach(frame => { frame.hidden = frame.dataset.galleryFrame !== String(id); });
    const selectedThumb = thumbs.find(thumb => thumb.dataset.galleryThumb === String(id));
    thumbs.forEach(thumb => {
      if (thumb === selectedThumb) thumb.setAttribute('aria-current', 'true');
      else thumb.removeAttribute('aria-current');
    });
    if (!selectedThumb || !rail || rail.scrollWidth <= rail.clientWidth) return;
    const item = selectedThumb.getBoundingClientRect();
    const bounds = rail.getBoundingClientRect();
    if (item.left < bounds.left + 6) rail.scrollLeft += item.left - bounds.left - 6;
    else if (item.right > bounds.right - 6) rail.scrollLeft += item.right - bounds.right + 6;
  }
  gallery.addEventListener('click', event => {
    const thumb = event.target.closest('[data-gallery-thumb]');
    if (!thumb || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    select(thumb.dataset.galleryThumb);
  });
  gallery.addEventListener('keydown', event => {
    const thumb = event.target.closest('[data-gallery-thumb]');
    if (!thumb || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let index = thumbs.indexOf(thumb);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = thumbs.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + thumbs.length) % thumbs.length;
    select(thumbs[index].dataset.galleryThumb);
    thumbs[index].focus();
  });
  gallery.addEventListener('product:image', event => select(event.detail));
  const linkedFrame = frames.find(frame => location.hash === '#' + frame.id);
  const variantImageId = gallery.closest('.product-layout')?.querySelector('[data-product-variant] option:checked')?.dataset.imageId;
  const variantFrame = frames.find(frame => frame.dataset.galleryFrame === variantImageId);
  select((linkedFrame || variantFrame || frames[0])?.dataset.galleryFrame);
});

/* Values come from Shopify's rendered variants, never an invented stock model. */
document.querySelectorAll('[data-product-variant]').forEach(select => {
  function update() {
    const option = select.selectedOptions[0];
    if (!option) return;
    const info = select.closest('.product-info');
    const price = info.querySelector('[data-product-price]');
    const add = info.querySelector('[data-product-add]');
    if (price) price.textContent = option.dataset.price;
    if (add) {
      add.disabled = option.dataset.available !== 'true';
      add.textContent = add.disabled ? add.dataset.soldOutLabel : add.dataset.availableLabel;
    }
    const url = new URL(location.href);
    url.searchParams.set('variant', option.value);
    history.replaceState({}, '', url);
    const gallery = select.closest('.product-layout').querySelector('[data-product-gallery]');
    if (gallery && option.dataset.imageId) gallery.dispatchEvent(new CustomEvent('product:image', {detail: option.dataset.imageId}));
  }
  select.addEventListener('change', update);
});

/* Keep mobile filtering compact; native details/form work without JavaScript. */
if (window.matchMedia('(max-width: 767px)').matches) {
  document.querySelectorAll('[data-catalog-controls]').forEach(control => { control.open = false; });
}

// Keep the collection/search return context while changing a sample color.
document.querySelectorAll('[data-product-color-handle]').forEach(link=>{
 link.addEventListener('click',()=>{
  if(!catalogReturn)return;
  try{sessionStorage.setItem(sampleReturnKey,JSON.stringify({product:link.dataset.productColorHandle,language:document.documentElement.lang,context:catalogReturn,expires:Date.now()+120000}));}catch{}
 });
});
