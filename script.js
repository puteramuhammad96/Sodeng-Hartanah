
(function(){
  const SHEET_ID = window.SHEET_ID;
  const WHATSAPP_NUMBER = window.WHATSAPP_NUMBER;
  const grid = document.getElementById('grid');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  // --- Helpers ---
  function fixImageUrl(url) {
    if (!url) return "";
    if (url.includes("drive.google.com")) {
      const match = url.match(/[-\w]{25,}/);
      if (match) return `https://drive.google.com/uc?export=view&id=${match[0]}`;
    }
    return url;
  }
  function formatPrice(value) {
    if (!value) return "";
    let num = String(value).replace(/[^0-9.]/g, "");
    if (!num) return value;
    return "RM" + Number(num).toLocaleString("en-MY", { minimumFractionDigits: 2 });
  }
  function parseSpecs(text){
    if(!text) return [];
    const parts = text.includes(";") ? text.split(";") : text.split("\n");
    return parts.map(p=>p.trim()).filter(Boolean).map(p=>{
      const [k,...rest]=p.split(":"); 
      return {k:(k||'').trim(), v:(rest.join(":")||'').trim()};
    });
  }
  function parsePriceNum(v){
    const s = String(v||'').replace(/[^0-9.]/g,'');
    return s ? Number(s) : 0;
  }
  function isHot(v){
    const s = String(v||'').toLowerCase().trim();
    return ['1','yes','true','hot','y'].includes(s);
  }

  // --- HERO (Hot listings) ---
  const hero = {
    list: [], index: 0, timer: null,
    mount(items){
      this.list = items.slice(0,5);
      const slides = document.getElementById('heroSlides');
      const dots = document.getElementById('heroDots');
      if(!this.list.length){
        document.getElementById('hero').style.display = 'none';
        return;
      }
      slides.innerHTML = this.list.map((item,i)=>{
        const firstImg = (String(item.image||'').split(',')[0]||'').trim();
        const src = fixImageUrl(firstImg) || 'https://picsum.photos/seed/hot/1200/600';
        return `
          <div class="hero-slide ${i==0?'active':''}" data-i="${i}" data-title="${item.title||''}">
            <img src="${src}" alt="${item.title||''}"/>
            <div class="hero-caption">
              <div class="hero-title">${item.title || ''}</div>
              <div class="hero-meta">${item.location || ''} • ${item.type || ''}</div>
              <div class="hero-price">${formatPrice(item.price)}</div>
            </div>
          </div>`;
      }).join('');
      dots.innerHTML = this.list.map((_,i)=>`<button data-i="${i}" class="${i==0?'active':''}"></button>`).join('');

      const prevBtn = document.querySelector('.hero-nav.prev');
      const nextBtn = document.querySelector('.hero-nav.next');
      prevBtn.onclick = ()=> this.show((this.index-1+this.list.length)%this.list.length, true);
      nextBtn.onclick = ()=> this.show((this.index+1)%this.list.length, true);
      dots.querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=> this.show(Number(b.dataset.i), true) ));
      document.querySelectorAll('.hero-slide').forEach(slide => {
        slide.addEventListener('click', ()=> {
          const i = Number(slide.dataset.i)||0;
          openModal(this.list[i]);
        });
      });

      // AUTOPLAY every 6 seconds
      this.start();
    },
    start(){
      this.stop();
      this.timer = setInterval(()=> this.show((this.index+1)%this.list.length, false), 6000);
    },
    stop(){
      if(this.timer) clearInterval(this.timer);
      this.timer = null;
    },
    show(i, fromUser){
      this.index = i;
      document.querySelectorAll('.hero-slide').forEach((s,idx)=> s.classList.toggle('active', idx===i));
      document.querySelectorAll('.hero-dots button').forEach((d,idx)=> d.classList.toggle('active', idx===i));
      if(fromUser){ this.start(); } // reset timer after manual action
    }
  };

  // --- Cards / Grid ---
  function makeCarousel(images) {
    let imgs = images.map((img,i)=>`<img src="${fixImageUrl(img.trim())}" class="${i==0?'active':''}" onerror="this.style.display='none'">`).join("");
    return `
    <div class="carousel">
      ${imgs}
      ${images.length>1?'<button class="prev">‹</button><button class="next">›</button>':""}
    </div>`;
  }
  function makeCard(item, index){
    const title = item.title || 'Untitled';
    const loc = item.location || '';
    const price = formatPrice(item.price);
    const type = item.type || '';
    const images = (item.image||"").split(",").map(s=>s.trim()).filter(Boolean);
    return `
      <article class="card" data-index="${index}">
        ${makeCarousel(images)}
        <div class="card-body">
          <h3 class="card-title">${title}</h3>
          <div class="row">📍 ${loc}</div>
          <div class="row">${type}</div>
          <div class="price">${price}</div>
        </div>
      </article>
    `;
  }

  // --- Data / filters / sort ---
  let ALL = [];
  function unique(arr){ return Array.from(new Set(arr.filter(Boolean))).sort(); }

  function applyFilters(){
    const q = document.getElementById('q').value.toLowerCase().trim();
    const type = document.getElementById('type').value;
    const loc = document.getElementById('location').value;
    const minp = Number(document.getElementById('minp').value || 0);
    const maxp = Number(document.getElementById('maxp').value || 0);
    const sort = document.getElementById('sort').value;
    let list = ALL.slice();
    if(q){
      list = list.filter(x => (x.title||'').toLowerCase().includes(q) || (x.location||'').toLowerCase().includes(q));
    }
    if(type){ list = list.filter(x => (x.type||'').toLowerCase() === type.toLowerCase()); }
    if(loc){ list = list.filter(x => (x.location||'') === loc); }
    if(minp){ list = list.filter(x => Number(String(x.price).replace(/[^0-9.]/g,'')) >= minp); }
    if(maxp){ list = list.filter(x => Number(String(x.price).replace(/[^0-9.]/g,'')) <= maxp); }
    if(sort==='plh'){ list.sort((a,b)=> Number(String(a.price).replace(/[^0-9.]/g,'')) - Number(String(b.price).replace(/[^0-9.]/g,''))); }
    if(sort==='phl'){ list.sort((a,b)=> Number(String(b.price).replace(/[^0-9.]/g,'')) - Number(String(a.price).replace(/[^0-9.]/g,''))); }
    render(list);
  }

  function setupFilterBar(){
    const locSel = document.getElementById('location');
    const locations = unique(ALL.map(x=>x.location));
    locSel.innerHTML = '<option value=\"\">All Locations</option>' + locations.map(l=>`<option>${l}</option>`).join('');
    document.getElementById('apply').addEventListener('click', applyFilters);
    document.getElementById('clear').addEventListener('click', ()=>{
      ['q','type','location','minp','maxp','sort'].forEach(id=>document.getElementById(id).value = '');
      render(ALL);
    });
  }

  function parseGViz(text){
    const start = text.indexOf('(') + 1;
    const end = text.lastIndexOf(')');
    const jsonText = text.slice(start, end);
    return JSON.parse(jsonText);
  }
  function normalize(table){
    const cols = table.table.cols.map(c=> (c.label||'').toLowerCase().trim());
    return (table.table.rows||[]).map(r => {
      const obj = {};
      r.c.forEach((cell,i)=>{
        const key = cols[i] || `col${i}`;
        obj[key] = cell ? cell.v : '';
      });
      return obj;
    });
  }

  async function load(){
    try{
      const res = await fetch(url);
      const text = await res.text();
      ALL = normalize(parseGViz(text));
      render(ALL);
      setupChips(ALL);
      setupFilterBar();
      const HOT = ALL.filter(x => isHot(x.hot || x.featured || x.favourite));
      hero.mount(HOT);
    }catch(e){
      console.error(e);
      grid.innerHTML = `<p>Error loading listings</p>`;
    }
  }

  function setupChips(data){
    document.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const t = btn.dataset.filter;
        if(t==='All'){ render(ALL); }
        else{ render(ALL.filter(x => (x.type||'').toLowerCase()===t.toLowerCase())); }
      });
    });
  }

  function render(list){
    grid.innerHTML = list.map((x,i)=>makeCard(x,i)).join('');
    setupCarousels();
    grid.querySelectorAll('.card').forEach(card=>{
      card.addEventListener('click', ()=> openModal(list[Number(card.dataset.index)]));
    });
  }

  // --- Card carousels ---
  function setupCarousels(){
    document.querySelectorAll('.carousel').forEach(c => {
      const imgs = c.querySelectorAll('img');
      let index = 0;
      const show = i => imgs.forEach((im,j)=>im.classList.toggle('active', j===i));
      const prev = c.querySelector('.prev');
      const next = c.querySelector('.next');
      if(prev) prev.addEventListener('click', (e)=>{ e.stopPropagation(); index=(index-1+imgs.length)%imgs.length;show(index)});
      if(next) next.addEventListener('click', (e)=>{ e.stopPropagation(); index=(index+1)%imgs.length;show(index)});
    });
  }

  // --- Modal (detail) ---
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');

  function openModal(item){
    const images = (item.image||"").split(",").map(s=>s.trim()).filter(Boolean);
    const wrap = document.getElementById('modalCarousel');
    const imgs = images.map((img,i)=>`<img src="${fixImageUrl(img)}" class="${i==0?'active':''}">`).join('');
    wrap.innerHTML = imgs + (images.length>1?'<button class="prev">‹</button><button class="next">›</button>':'');
    const thumbsWrap = document.getElementById('modalThumbs');
    thumbsWrap.innerHTML = images.map((img,i)=>`<img src="${fixImageUrl(img)}" data-i="${i}" class="${i==0?'active':''}">`).join('');

    document.getElementById('modalTitle').textContent = item.title || 'Untitled';
    document.getElementById('modalMeta').textContent = `${item.location || ''} • ${item.type || ''}`;
    document.getElementById('modalPrice').textContent = formatPrice(item.price);

    const specs = (function(text){ if(!text) return []; const parts = text.includes(";") ? text.split(";") : text.split("\n"); return parts.map(p=>p.trim()).filter(Boolean).map(p=>{ const [k,...rest]=p.split(":"); return {k:(k||'').trim(), v:(rest.join(":")||'').trim()}; }); })(item.specs || item.spec || '');
    const specsWrap = document.getElementById('modalSpecs');
    specsWrap.innerHTML = specs.map(s=>`<div class="spec"><strong>${s.k}:</strong> ${s.v}</div>`).join('');

    const details = (item.details || item.detail || '').trim();
    document.getElementById('modalDetails').textContent = details;

    const waMsg = `Hi Putera, saya berminat dengan ${item.title||''}`;
    const wa = document.getElementById('modalWA');
    wa.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;

    const mapBtn = document.getElementById('modalMap');
    const map = item.map || item.maps || item.map_link || "";
    if(map){
      mapBtn.style.display = 'inline-block';
      mapBtn.href = map.startsWith('http') ? map : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(map)}`;
    }else{
      mapBtn.style.display = 'none';
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    setupModalCarousel();
  }

  function closeModal(){
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
  }
  modal.addEventListener('click', (e)=>{
    if(e.target.classList.contains('modal-backdrop')) closeModal();
  });
  modalClose.addEventListener('click', closeModal);

  function setupModalCarousel(){
    const c = document.getElementById('modalCarousel');
    const imgs = c.querySelectorAll('img');
    if(!imgs.length) return;
    let index = 0;
    const show = i => {
      imgs.forEach((im,j)=>im.classList.toggle('active', j===i));
      document.querySelectorAll('#modalThumbs img').forEach((t,j)=>t.classList.toggle('active', j===i));
    };
    const prev = c.querySelector('.prev');
    const next = c.querySelector('.next');
    if(prev) prev.addEventListener('click', ()=>{ index=(index-1+imgs.length)%imgs.length; show(index); });
    if(next) next.addEventListener('click', ()=>{ index=(index+1)%imgs.length; show(index); });
    document.querySelectorAll('#modalThumbs img').forEach(t => {
      t.addEventListener('click', ()=>{ index = Number(t.dataset.i)||0; show(index); });
    });
  }

  // Load
  load();
})();
