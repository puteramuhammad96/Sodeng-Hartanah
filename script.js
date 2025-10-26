
(function(){
  const SHEET_ID = window.SHEET_ID;
  const WA = window.WHATSAPP_NUMBER;
  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('waBtn').href = `https://wa.me/${WA}?text=${encodeURIComponent("Hi Putera, saya berminat dengan hartanah tuan.")}`;

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  // Helpers
  const priceNum = v => Number(String(v||"").replace(/[^0-9.]/g,""))||0;
  const priceFmt = v => { const n = priceNum(v); return n ? "RM" + n.toLocaleString("en-MY",{minimumFractionDigits:2}) : ""; };

  function fixImageUrl(u){
    if(!u) return "";
    u = u.trim();
    if(u.includes("drive.google.com")){
      const m = u.match(/[-\w]{25,}/);
      if(m) return `https://drive.google.com/uc?export=view&id=${m[0]}`;
    }
    return u;
  }

  function parseGViz(txt){
    const start = txt.indexOf("(")+1, end = txt.lastIndexOf(")");
    return JSON.parse(txt.slice(start,end));
  }
  function normalize(obj){
    const cols = obj.table.cols.map(c => (c.label||"").toLowerCase().trim());
    return (obj.table.rows||[]).map(r => {
      const o = {};
      (r.c||[]).forEach((cell,i)=>{ o[cols[i]||`col${i}`] = cell ? cell.v : ""; });
      return o;
    });
  }

  function unique(arr){ return Array.from(new Set(arr.filter(Boolean))).sort(); }

  function makeCard(item){
    const title = item.displaytitle || item['display_title'] || item.title || "Untitled";
    // support image or images column, use first image for card
    const rawImg = (String(item.image||item.images||"").split(",")[0]||"").trim();
    const img = fixImageUrl(rawImg);

    return `<article class="card">
      ${img ? `<img src="${img}" alt="${title}">` : ""}
      <div class="body">
        <h3 class="title">${title}</h3>
        <div class="row">📍 ${item.location||""}</div>
        <div class="row">${item.type||""}</div>
        <div class="price">${priceFmt(item.price)}</div>
      </div>
    </article>`;
  }

  // Render + Filters
  const grid = document.getElementById("grid");
  let ALL = [];

  function render(list){
    grid.innerHTML = list.map(makeCard).join("");
  }

  function applyFilters(){
    const q = document.getElementById('q').value.toLowerCase().trim();
    const t = document.getElementById('type').value;
    const loc = document.getElementById('location').value;
    const minp = Number(document.getElementById('minp').value||0);
    const maxp = Number(document.getElementById('maxp').value||0);
    const sort = document.getElementById('sort').value;

    let list = ALL.slice();
    if(q) list = list.filter(x => (x.displaytitle||x.title||"").toLowerCase().includes(q) || (x.location||"").toLowerCase().includes(q));
    if(t) list = list.filter(x => (x.type||"").toLowerCase() === t.toLowerCase());
    if(loc) list = list.filter(x => (x.location||"") === loc);
    if(minp) list = list.filter(x => priceNum(x.price) >= minp);
    if(maxp) list = list.filter(x => priceNum(x.price) <= maxp);
    if(sort === "plh") list.sort((a,b)=> priceNum(a.price)-priceNum(b.price));
    if(sort === "phl") list.sort((a,b)=> priceNum(b.price)-priceNum(a.price));

    render(list);
  }

  document.getElementById('apply').addEventListener('click', applyFilters);
  document.getElementById('reset').addEventListener('click', ()=>{
    ['q','type','location','minp','maxp','sort'].forEach(id => document.getElementById(id).value = "");
    render(ALL);
  });

  async function load(){
    try{
      const res = await fetch(url);
      const txt = await res.text();
      const data = normalize(parseGViz(txt));

      // populate filters
      const locSel = document.getElementById('location');
      locSel.innerHTML = '<option value="">All Locations</option>' + unique(data.map(x=>x.location)).map(x=>`<option>${x}</option>`).join('');

      ALL = data;
      render(ALL);
    }catch(e){
      console.error(e);
      grid.innerHTML = "<p style='color:#c00'>Error loading data from Google Sheet.</p>";
    }
  }

  load();
})();