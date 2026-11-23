/* Local sample/archival browsing; no commerce state, price or availability simulation. */
document.querySelectorAll('[data-sample-catalog][data-catalog-scope="all"]').forEach(grid=>{
 const section=grid.closest('section');
 const controls=section?.querySelector('[data-sample-catalog-controls]');
 if(!controls)return;
 const cards=[...grid.querySelectorAll('[data-catalog-style]')];
 const categoryButtons=[...controls.querySelectorAll('[data-catalog-category]')];
 const seriesSelect=controls.querySelector('[data-catalog-series]');
 const count=controls.querySelector('[data-catalog-count]');
 const empty=controls.querySelector('[data-catalog-empty]');
 const searchPage=/\/search\/?$/.test(location.pathname);
 const searchInput=section.querySelector('input[name="q"]');
 const allowed=new Set(categoryButtons.map(b=>b.dataset.catalogCategory));
 const normalize=v=>String(v||'').normalize('NFKC').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu,' ')
  .replace(/\bt\s*shirts?\b/g,'tshirt')
  .replace(/t\s*\u6064/gu,'tshirt')
  .replace(/([\u3400-\u9fff])([a-z0-9])/g,'$1 $2')
  .replace(/([a-z0-9])([\u3400-\u9fff])/g,'$1 $2')
  .replace(/\s+/g,' ').trim();
 const searchIndex=new Map(cards.map(card=>[card,normalize(card.dataset.search).split(' ').filter(Boolean)]));
 const matchesTerm=(words,term)=>/^[a-z][a-z0-9]*$/.test(term)
  ? words.some(word=>word.startsWith(term))
  : words.some(word=>word.includes(term));
 let state;
 function read(){
  const params=new URL(location.href).searchParams;
  const category=params.get('category')||'all';
  const series=params.get('series')||'all';
  state={category:allowed.has(category)?category:'all',series:['all','samples','archive'].includes(series)?series:'all',query:searchPage?params.get('q')||'':''};
 }
 function apply(){
  let total=0;const hasQuery=String(state.query||'').trim().length>0;
  const terms=normalize(state.query).split(' ').filter(Boolean);
  cards.forEach(card=>{
   const show=(state.category==='all'||card.dataset.category===state.category)&&(state.series==='all'||card.dataset.series===state.series)&&(!hasQuery||(terms.length>0&&terms.every(term=>matchesTerm(searchIndex.get(card),term))));
   card.hidden=!show;if(show)total++;
  });
  categoryButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.catalogCategory===state.category)));
  seriesSelect.value=state.series;
  if(searchInput)searchInput.value=state.query;
  count.textContent=count.dataset.countLabel.replace('[count]',String(total));
  empty.hidden=total!==0;
  controls.hidden=false;
 }
 function update(){
  const url=new URL(location.href);
  for(const [key,value]of [['category',state.category],['series',state.series]]){if(value==='all')url.searchParams.delete(key);else url.searchParams.set(key,value);}
  if(searchPage){if(state.query)url.searchParams.set('q',state.query);else url.searchParams.delete('q');}
  history.pushState(null,'',url.pathname+url.search+url.hash);apply();
 }
 categoryButtons.forEach(button=>button.addEventListener('click',()=>{state.category=button.dataset.catalogCategory;update();}));
 seriesSelect.addEventListener('change',()=>{state.series=seriesSelect.value;update();});
 controls.querySelector('[data-catalog-reset]').addEventListener('click',()=>{
  state={category:'all',series:'all',query:''};update();
  // Reset hides this button. Move focus to a visible place to continue browsing.
  (searchInput || categoryButtons.find(button=>button.dataset.catalogCategory==='all'))?.focus();
 });
 window.addEventListener('popstate',()=>{read();apply();});
 read();apply();
 const returnedCard = cards.find(card => !card.hidden && location.hash === '#' + card.id);
 returnedCard?.scrollIntoView({block:'nearest'});
});
