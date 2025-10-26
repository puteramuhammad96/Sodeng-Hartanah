
(function(){
  const SHEET_ID = window.SHEET_ID;
  const WHATSAPP_NUMBER = window.WHATSAPP_NUMBER;
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
  const grid = document.getElementById('grid');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Helpers
  const fixImageUrl = (u)=>{
    if(!u) return "";
    if(u.includes("drive.google.com")){
      const m = u.match(/[-\w]{25,}/);
      if(m) return `https://drive.google.com/uc?export=view&id=${m[0]}`;
    }
    return u;
  };
  const priceNum = v => {
    const s = String(v||"").replace(/[^0-9.]/g,"");
    return s ? Number(s) : 0;
  };
  const priceFmt = v => {
    if(!v) return "";
    const n = priceNum(v);
    if(!n) return String(v);
    return "RM" + n.toLocaleString("en-MY", {minimumFractionDigits:2});
  };
  const isHot = v => ["1","yes","y","true","hot"].includes(String(v||"").trim().toLowerCase());
  const parseGViz = (txt)=>{
    const start = txt.indexOf("(")+1, end = txt.lastIndexOf(")");
    return JSON.parse(txt.slice(start,end));
  };
  const normalize = (obj)=>{
    const cols = obj.table.cols.map(c => (c.label||"").toLowerCase().trim());
    return (obj.table.rows||[]).map(r => {
      const o = {}; (r.c||[]).forEach((cell,i)=> o[cols[i]||`col${i}`] = cell ? cell.v : "");
      return o;
    });
  };

  // HERO
  const hero = {
    list:[], i:0, t:null,
    mount(items){
      this.list = items.slice(0,5);
      const slides = document.getElementById('heroSlides');
      const dots = document.getElementById('heroDots');
      if(!this.list.length){ document.getElementById('hero').style.display='none'; return; }
      slides.innerHTML = this.list.map((it,idx)=>{
        const img = fixImageUrl((String(it.image||'').split(',')[0]||'').trim());
        const title = it.displaytitle || it.display_title || it.display || it.title || '';
        return `<div class="hero-slide ${idx===0?'active':''}" data-i="${idx}">
          <img src="${img}" alt="${title}"/>
          <div class="hero-caption">
            <div class="hero-title">${title}</div>
            <div class="hero-meta">${it.location||''} • ${it.type||''}</div>
            <div class="hero-price">${priceFmt(it.price)}</div>
          </div>
        </div>`;
      }).join('');
      dots.innerHTML = this.list.map((_,idx)=>`<button class="${idx===0?'active':''}" data-i="${idx}"></button>`).join('');
      document.querySelector('.hero-nav.prev').onclick = ()=> this.show((this.i-1+this.list.length)%this.list.length,true);
      document.querySelector('.hero-nav.next').onclick = ()=> this.show((this.i+1)%this.list.length,true);
      dots.querySelectorAll('button').forEach(b=> b.addEventListener('click',()=> this.show(Number(b.dataset.i),true)));
      document.querySelectorAll('.hero-slide').forEach(sl => sl.addEventListener('click', ()=> openModal(this.list[this.i])));
      this.start();
    },
    start(){ this.stop(); this.t=setInterval(()=> this.show((this.i+1)%this.list.length,false),6000); },
    stop(){ if(this.t) clearInterval(this.t); this.t=null; },
    show(i, user){
      this.i=i;
      document.querySelectorAll('.hero-slide').forEach((s,idx)=> s.classList.toggle('active', idx===i));
      document.querySelectorAll('.hero-dots button').forEach((d,idx)=> d.classList.toggle('active', idx===i));
      if(user) this.start();
    }
  };

  // Cards
  function makeCard(item, i){
    const title = item.displaytitle || item.display_title || item.display || item.title || 'Untitled';
    const images = String(item.image||'').split(',').map(s=>s.trim()).filter(Boolean);
    return `<article class="card" data-index="${i}">
      <div class="card-body">
        <h3 class="card-title">${title}</h3>
        <div class="row">📍 ${item.location||''}</div>
        <div class="row">${item.type||''}</div>
        <div class="price">${priceFmt(item.price)}</div>
      </div>
    </article>`;
  }

  // Modal
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
  modalClose.addEventListener('click', ()=> closeModal());
  modal.addEventListener('click', e=>{ if(e.target.classList.contains('modal-backdrop')) closeModal(); });
  function closeModal(){
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
  }
  function openModal(item){
    const images = String(item.image||'').split(',').map(s=>s.trim()).filter(Boolean);
    const wrap = document.getElementById('modalCarousel');
    wrap.innerHTML = images.map((u,i)=>`<img src="${fixImageUrl(u)}" class="${i===0?'active':''}">`).join('') + (images.length>1?'<button class="prev">‹</button><button class="next">›</button>':'');
    const thumbs = document.getElementById('modalThumbs');
    thumbs.innerHTML = images.map((u,i)=>`<img src="${fixImageUrl(u)}" data-i="${i}" class="${i===0?'active':''}">`).join('');
    const title = item.displaytitle || item.display_title || item.display || item.title || 'Untitled';
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMeta').textContent = `${item.location||''} • ${item.type||''}`;
    document.getElementById('modalPrice').textContent = priceFmt(item.price);
    const specsText = item.specs || item.spec || "";
    const specs = (specsText.includes(";")?specsText.split(";"):specsText.split("\n")).map(s=>s.trim()).filter(Boolean);
    document.getElementById('modalSpecs').innerHTML = specs.map(s=>{
      const [k,...r]=s.split(":"); return `<div class="spec"><strong>${(k||'').trim()}:</strong> ${(r.join(":")||'').trim()}</div>`;
    }).join('');
    document.getElementById('modalDetails').textContent = (item.details||item.detail||'').trim();
    const waMsg = `Hi Putera, saya berminat dengan ${title}`;
    document.getElementById('modalWA').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMsg)}`;
    const mapBtn = document.getElementById('modalMap');
    const map = item.map || item.maps || item.map_link || "";
    if(map){ mapBtn.style.display='inline-block'; mapBtn.href = map.startsWith('http')? map : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(map)}`; }
    else{ mapBtn.style.display='none'; }
    modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false');
    setupModalCarousel();
  }
  function setupModalCarousel(){
    const c = document.getElementById('modalCarousel');
    const imgs = c.querySelectorAll('img'); if(!imgs.length) return;
    let idx=0;
    const show=i=>{ imgs.forEach((im,j)=>im.classList.toggle('active', j===i)); document.querySelectorAll('#modalThumbs img').forEach((t,j)=>t.classList.toggle('active', j===i)); };
    const p = c.querySelector('.prev'), n = c.querySelector('.next');
    if(p) p.addEventListener('click', ()=>{ idx=(idx-1+imgs.length)%imgs.length; show(idx); });
    if(n) n.addEventListener('click', ()=>{ idx=(idx+1)%imgs.length; show(idx); });
    document.querySelectorAll('#modalThumbs img').forEach(t=> t.addEventListener('click', ()=>{ idx=Number(t.dataset.i)||0; show(idx); }));
  }

  // Filters & sort
  let ALL=[];
  const unique = arr => Array.from(new Set(arr.filter(Boolean))).sort();
  function setupFilterBar(){
    const locSel = document.getElementById('location');
    locSel.innerHTML = '<option value=\"\">All Locations</option>' + unique(ALL.map(x=>x.location)).map(x=>`<option>${x}</option>`).join('');
    document.getElementById('apply').addEventListener('click', applyFilters);
    document.getElementById('clear').addEventListener('click', ()=>{
      ['q','type','location','minp','maxp','sort'].forEach(id=> document.getElementById(id).value='');
      render(ALL);
    });
  }
  function applyFilters(){
    const q = document.getElementById('q').value.toLowerCase().trim();
    const t = document.getElementById('type').value;
    const loc = document.getElementById('location').value;
    const minp = Number(document.getElementById('minp').value||0);
    const maxp = Number(document.getElementById('maxp').value||0);
    const sort = document.getElementById('sort').value;
    let list = ALL.slice();
    if(q) list = list.filter(x => (x.displaytitle||x.title||'').toLowerCase().includes(q) || (x.location||'').toLowerCase().includes(q));
    if(t) list = list.filter(x => (x.type||'').toLowerCase()===t.toLowerCase());
    if(loc) list = list.filter(x => (x.location||'')===loc);
    if(minp) list = list.filter(x => priceNum(x.price)>=minp);
    if(maxp) list = list.filter(x => priceNum(x.price)<=maxp);
    if(sort==='plh') list.sort((a,b)=> priceNum(a.price)-priceNum(b.price));
    if(sort==='phl') list.sort((a,b)=> priceNum(b.price)-priceNum(a.price));
    render(list);
  }

  function setupChips(){
    document.querySelectorAll('.chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.chip').forEach(b=>b.classList.remove('active')); btn.classList.add('active');
        const t = btn.dataset.filter;
        if(t==='All') render(ALL);
        else render(ALL.filter(x => (x.type||'').toLowerCase()===t.toLowerCase()));
      });
    });
  }

  function render(list){
    grid.innerHTML = list.map((x,i)=> makeCard(x,i)).join('');
    grid.querySelectorAll('.card').forEach(c => c.addEventListener('click', ()=> openModal(list[Number(c.dataset.index)])));
  }

  async function load(){
    try{
      const res = await fetch(url);
      const text = await res.text();
      ALL = normalize(parseGViz(text));
      render(ALL);
      setupChips();
      setupFilterBar();
      const HOT = ALL.filter(x => isHot(x.hot || x.featured || x.favourite));
      hero.mount(HOT);
    }catch(e){
      console.error(e);
      grid.innerHTML = `<p>Error loading listings</p>`;
    }
  }

  load();
})();
