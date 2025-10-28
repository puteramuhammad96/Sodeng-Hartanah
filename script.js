/* ====== CONFIG ====== */
const SHEET_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";
const DEFAULT_PHONE = "601169429832";

/* ====== tiny CSV parser (handles quotes) ====== */
function parseCSV(text) {
  const rows = [];
  let i = 0, cur = [], val = "", inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { val += '"'; i++; }
        else inQ = false;
      } else val += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { cur.push(val.trim()); val = ""; }
      else if (c === '\n' || c === '\r') {
        if (val !== "" || cur.length) { cur.push(val.trim()); rows.push(cur); cur = []; val = ""; }
        while (text[i + 1] === '\n' || text[i + 1] === '\r') i++;
      } else val += c;
    }
    i++;
  }
  if (val !== "" || cur.length) { cur.push(val.trim()); rows.push(cur); }
  return rows;
}

/* ====== utils ====== */
const fmtRM = n => "RM" + (Number(n||0)).toLocaleString("en-MY");
const byId = id => document.getElementById(id);
const nowYear = () => (byId('y') && (byId('y').textContent = new Date().getFullYear()));
function driveToView(u){ const m=u?.match(/\/d\/([a-zA-Z0-9_-]+)\//); return m? `https://drive.google.com/uc?export=view&id=${m[1]}` : u; }

/* Try to discover local images assets/listings/<TITLE>/1..8.jpg (TITLE exact) */
async function discoverLocalImagesByTitle(title) {
  const max = 8;
  const base = `assets/listings/${title}/`;
  const out = [];
  for (let i = 1; i <= max; i++) {
    const url = base + `${i}.jpg`;
    try {
      const res = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (res.ok) out.push(url);
    } catch (e) { /* ignore */ }
  }
  return out;
}

/* ====== data load ====== */
async function loadData() {
  const res = await fetch(SHEET_CSV, { cache: "no-store" });
  const csv = await res.text();
  const rows = parseCSV(csv);
  const header = rows.shift().map(h => h.trim().toLowerCase());
  // Expect columns e.g.: ref, title, price, type, location, specs, details, map, hot, (optional phone), (optional images)
  return rows.map(r => {
    const o = {};
    header.forEach((h, i) => { if(h!=='ref') o[h] = r[i] ?? "" });
    // normalization
    o.id = encodeURIComponent(o.title || ("id"+Math.random()));
    o.priceNum = Number((o.price||"").toString().replace(/[^\d.]/g,"")) || 0;
    o.hot = (o.hot || "").toString().toLowerCase() === "yes" || (o.hot || "").toString().toLowerCase() === "true";
    // images from CSV (optional fallback)
    if (o.images) {
      o.images = o.images.split(",").map(s => driveToView(s.trim())).filter(Boolean);
    }
    return o;
  });
}

/* ====== Home page ====== */
async function initHome() {
  nowYear();
  const data = await loadData();

  // populate filters
  const typeSel = byId('type');
  const locSel  = byId('loc');
  const types = ["All Types", ...new Set(data.map(x => (x.type||"").trim()).filter(Boolean))];
  const locs  = ["All Locations", ...new Set(data.map(x => (x.location||"").trim()).filter(Boolean))];
  typeSel.innerHTML = types.map((t,i)=>`<option value="${i? t: ""}">${t}</option>`).join("");
  locSel.innerHTML  = locs.map((t,i)=>`<option value="${i? t: ""}">${t}</option>`).join("");

  byId('apply').addEventListener('click', apply);
  byId('reset').addEventListener('click', reset);

  renderHot(data);
  renderCards(data);

  function apply() {
    const q = byId('q').value.trim().toLowerCase();
    const t = byId('type').value;
    const l = byId('loc').value;
    const min = Number(byId('min').value||0);
    const max = Number(byId('max').value||0);
    const sort = byId('sort').value;

    let list = data.filter(x=>{
      const hay = (x.title+" "+(x.location||"")).toLowerCase();
      const okQ = q ? hay.includes(q) : true;
      const okT = t ? (x.type||"") === t : true;
      const okL = l ? (x.location||"") === l : true;
      const okMin = min ? x.priceNum >= min : true;
      const okMax = max ? x.priceNum <= max : true;
      return okQ && okT && okL && okMin && okMax;
    });

    if (sort==="price-asc") list.sort((a,b)=>a.priceNum-b.priceNum);
    if (sort==="price-desc") list.sort((a,b)=>b.priceNum-a.priceNum);

    renderCards(list);
  }

  function reset() {
    byId('q').value = ""; byId('type').selectedIndex=0; byId('loc').selectedIndex=0;
    byId('min').value=""; byId('max').value=""; byId('sort').value="default";
    renderCards(data);
  }
}

function cardThumb(title, imgs){
  const src = (imgs && imgs[0]) || "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'><rect width='100%' height='100%' fill='#e9eef5'/><text x='50%' y='50%' text-anchor='middle' fill='#99a3b5' font-family='Arial' font-size='18'>No Image</text></svg>`);
  return `<img class="thumb" src="${src}" alt="${title}">`;
}

async function renderCards(list) {
  const el = byId('cards');
  el.innerHTML = "";

  for (const item of list) {
    // Try local images by TITLE folder
    let imgs = await discoverLocalImagesByTitle(item.title);
    // fallback to CSV images if provided
    if (!imgs.length && Array.isArray(item.images)) imgs = item.images;

    const card = document.createElement('article');
    card.className = "card";
    card.innerHTML = `
      ${cardThumb(item.title, imgs)}
      <div class="card-body">
        <div class="meta">
          ${item.type ? `<span class="pill">${(item.type||"").toLowerCase()}</span>`:""}
          ${item.hot ? `<span class="pill">hot</span>`:""}
        </div>
        <h3 class="title">${item.title||"-"}</h3>
        <p class="price">${fmtRM(item.priceNum)}</p>
        <p class="loc">${item.location||""}</p>
        <a class="more" href="listing.html?id=${encodeURIComponent(item.id)}">View details →</a>
      </div>
    `;
    el.appendChild(card);
  }
}

async function renderHot(data){
  const hot = data.filter(x=>x.hot);
  const el = byId('hotbar');
  if (!hot.length) { el.innerHTML = ""; return; }
  el.innerHTML = "🔥 Hot: " + hot.map(x=>`<a href="listing.html?id=${encodeURIComponent(x.id)}">${x.title}</a>`).join(" • ");
}

/* ====== Detail page ====== */
async function initDetail() {
  const data = await loadData();
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const item = data.find(x => x.id === id) || data[0];
  if (!item) return;

  byId('d-title').textContent = item.title || "Property Details";
  byId('d-price').textContent = fmtRM(item.priceNum);
  byId('d-type').textContent = item.type||"";
  byId('d-loc').textContent = item.location||"";
  byId('d-specs').textContent = item.specs||"-";
  byId('d-details').textContent = item.details||"-";
  const mapEl = byId('d-map');
  if (item.map) { mapEl.href = item.map; mapEl.textContent = "Open map"; } else { mapEl.textContent = "—"; mapEl.removeAttribute('href'); }

  const phone = (item.phone||"").replace(/\D/g,"") || DEFAULT_PHONE;
  const waMsg = encodeURIComponent(`Hai, boleh saya tahu tentang property "${item.title}"?`);
  byId('wa-btn').href = `https://wa.me/${phone}?text=${waMsg}`;
  byId('call-btn').href = `tel:${phone}`;

  // gallery
  const gal = byId('gallery');
  let imgs = await discoverLocalImagesByTitle(item.title);
  if (!imgs.length && Array.isArray(item.images)) imgs = item.images.map(d=>driveToView(d));

  if (!imgs.length) {
    gal.innerHTML = `<div style="padding:12px;border:1px solid var(--line);border-radius:12px;background:#fff;">No image yet.</div>`;
  } else {
    imgs.forEach(u=>{
      const im = new Image();
      im.src = u; im.alt = item.title;
      gal.appendChild(im);
    });
  }

  const y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear();
}

/* ====== bootstrap ====== */
document.addEventListener('DOMContentLoaded', ()=>{
  const page = document.body.id;
  if (page === 'page-home') initHome();
  if (page === 'page-detail') initDetail();
  const y = document.getElementById('y'); if (y) y.textContent = new Date().getFullYear();
});
