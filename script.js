// ====== CONFIG: your Google Sheet CSV (Publish to web) ======
// Replace this with your own CSV link when ready:
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";

let allProps = [];

// Robust CSV parser (supports quoted fields & commas inside)
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i+1];
    if (c === '"') { if (inQuotes && n === '"') { cell += '"'; i++; } else { inQuotes = !inQuotes; } }
    else if (c === ',' && !inQuotes) { row.push(cell); cell = ""; }
    else if ((c === '\n' || c === '\r') && !inQuotes) { if (cell !== "" || row.length) { row.push(cell); rows.push(row); row = []; cell = ""; } }
    else { cell += c; }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// Convert price to nice string
function money(n) {
  const num = parseFloat(String(n).replace(/[^\d.]/g, "")) || 0;
  return "RM" + num.toLocaleString("ms-MY", { minimumFractionDigits: 0 });
}

// Split multiple images in a cell
function splitImages(val) {
  if (!val) return [];
  return val.split(/[,;|\n]/).map(s => s.trim()).filter(Boolean);
}

// Normalize Google Drive links to uc?export=view&id=FILE_ID
function normalizeImageUrl(url) {
  if (!url) return url;
  // /file/d/<id>/view
  let m = url.match(/\/file\/d\/([-\w]{10,})/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  // id=<id>
  m = url.match(/[?&]id=([-\w]{10,})/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  // looks like raw id only
  m = url.match(/^([-\w]{10,})$/);
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`;
  return url;
}

// ========== LOAD SHEET ==========
async function load() {
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const rows = parseCSV(text);
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const idx = (name) => headers.indexOf(name);

  allProps = rows.slice(1).filter(r => r[idx('displaytitle')]).map((r,i) => {
    const imgs = splitImages(r[idx('images')] || "").map(normalizeImageUrl);
    return {
      id: i,
      title: r[idx('title')] || "",
      displayTitle: r[idx('displaytitle')] || "",
      price: r[idx('price')] || "",
      type: (r[idx('type')] || "").toLowerCase(),
      specs: r[idx('specs')] || "",
      details: r[idx('details')] || "",
      map: r[idx('map')] || "",
      hot: (r[idx('hot')] || "").toLowerCase() === "yes",
      images: imgs
    };
  });

  renderAll();
  renderHot();
}

function renderAll(list = allProps) {
  const el = document.getElementById('list');
  el.innerHTML = "";
  list.forEach(p => {
    const thumb = p.images[0] || "assets/placeholder.jpg";
    const a = document.createElement('a');
    a.className = "card";
    a.href = `details.html?id=${p.id}`;
    a.innerHTML = `
      <img src="${thumb}" alt="${p.displayTitle}" onerror="this.src='assets/placeholder.jpg'">
      <div class="meta">
        <h3>${p.displayTitle} ${p.type?`<span class='badge'>${p.type}</span>`:""}</h3>
        <div class="price">${money(p.price)}</div>
      </div>`;
    el.appendChild(a);
  });
}

function renderHot() {
  const hot = document.getElementById('hot');
  if (!hot) return;
  hot.innerHTML = "";
  allProps.filter(p=>p.hot).forEach(p => {
    const a = document.createElement('a');
    a.href = `details.html?id=${p.id}`;
    a.innerHTML = `<img src="${p.images[0]||'assets/placeholder.jpg'}" alt="${p.displayTitle}" onerror="this.src='assets/placeholder.jpg'">`;
    hot.appendChild(a);
  });
}

// ========== FILTERS ==========
function applyFilters() {
  const q = document.getElementById('search').value.toLowerCase();
  const t = document.getElementById('type').value.toLowerCase();
  const min = parseFloat(document.getElementById('min').value) || 0;
  const max = parseFloat(document.getElementById('max').value) || Infinity;
  const sort = document.getElementById('sort').value;

  let list = allProps.filter(p =>
    (!q || p.displayTitle.toLowerCase().includes(q)) &&
    (!t || p.type === t) &&
    ((parseFloat(p.price)||0) >= min && (parseFloat(p.price)||0) <= max)
  );
  if (sort === 'asc') list.sort((a,b)=>(a.price||0)-(b.price||0));
  if (sort === 'desc') list.sort((a,b)=>(b.price||0)-(a.price||0));
  renderAll(list);
}

function resetFilters() {
  ['search','type','min','max','sort'].forEach(id => document.getElementById(id).value = id==='sort'?'':'');
  renderAll();
}

// ========== DETAIL ==========
function getByQuery() {
  const id = new URLSearchParams(location.search).get('id');
  return allProps.find(x => String(x.id) === String(id));
}

async function renderDetail() {
  const container = document.getElementById('detail');
  if (!container) return;
  if (!allProps.length) await load();
  const p = getByQuery();
  if (!p) { container.innerHTML = "<p class='box'>Property not found.</p>"; return; }

  document.querySelector('.detail-title').textContent = p.displayTitle;

  const slides = (p.images.length ? p.images : ['assets/placeholder.jpg'])
    .map((u,i)=>`<img class="${i===0?'active':''}" src="${u}" onerror="this.src='assets/placeholder.jpg'">`)
    .join("");

  container.innerHTML = `
    <div class="row">
      <div class="box">
        <div class="slides" id="slides">${slides}
          <div class="slide-nav">
            <button onclick="prevSlide()">‹</button>
            <button onclick="nextSlide()">›</button>
          </div>
        </div>
      </div>
      <div class="box">
        <h2>${p.displayTitle}</h2>
        <div class="kv"><b>Price</b> ${money(p.price)}</div>
        ${p.type ? `<div class="kv"><b>Type</b> ${p.type}</div>`:""}
        ${p.specs ? `<div class="kv"><b>Specs</b> ${p.specs}</div>`:""}
        ${p.details ? `<div class="kv"><b>Details</b> ${p.details}</div>`:""}
        <div class="kv">
          <a class="btn" href="https://wa.me/601169429832?text=${encodeURIComponent('Hai, boleh saya tahu tentang property ' + p.displayTitle + '?')}" target="_blank">WhatsApp</a>
          &nbsp;
          <a class="btn" href="tel:+601169429832">Call</a>
        </div>
      </div>
    </div>
    ${p.map ? `<div class="box" style="margin-top:14px"><iframe src="${p.map}" width="100%" height="360" style="border:0" loading="lazy"></iframe></div>`:""}
  `;
  initSlide();
}

function initSlide(){
  const imgs = Array.from(document.querySelectorAll('#slides img'));
  if (!imgs.length) return;
  let i = 0;
  window.nextSlide = function(){
    imgs[i].classList.remove('active'); i = (i+1)%imgs.length; imgs[i].classList.add('active');
  }
  window.prevSlide = function(){
    imgs[i].classList.remove('active'); i = (i-1+imgs.length)%imgs.length; imgs[i].classList.add('active');
  }
  setInterval(()=>nextSlide(), 4000);
}

// ========= BOOT =========
if (location.pathname.endsWith('details.html')) {
  window.addEventListener('DOMContentLoaded', renderDetail);
} else {
  window.addEventListener('DOMContentLoaded', load);
}
