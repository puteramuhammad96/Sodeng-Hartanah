// ========= CONFIG =========
// CSV Google Sheet (Publish to web -> CSV)
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQhh1miy0ybTomX1hrTj44jYunYtzivOvNAFv_IlYcwOazm7BHa6-aSVkCZg0q_rd5aC9K-dTOa88Rn/pub?gid=0&single=true&output=csv";

// Google Apps Script Web App endpoint (we'll create it below)
// Example: const folderAPI = "https://script.google.com/macros/s/AKfycb.../exec";
const folderAPI = ""; // <= paste your deployed Web App URL here

// ========= HELPERS =========
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i+1];
    if (c === '"' ) {
      if (inQuotes && n === '"') { cell += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push(cell); cell = "";
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (cell !== "" || row.length) { row.push(cell); rows.push(row); row = []; cell = ""; }
    } else {
      cell += c;
    }
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function money(n) {
  const num = parseFloat(String(n).replace(/[^\d.]/g, "")) || 0;
  return "RM" + num.toLocaleString("ms-MY", { minimumFractionDigits: 0 });
}

function splitMulti(val) {
  if (!val) return [];
  return val.split(/[,;|\n]/).map(s=>s.trim()).filter(Boolean);
}

function getFolderId(v) {
  if (!v) return "";
  // Accept full link or pure ID
  const m = v.match(/[-\w]{25,}/);
  return m ? m[0] : "";
}

function driveViewFromAny(url) {
  const id = getFolderId(url);
  return id ? `https://drive.google.com/uc?export=view&id=${id}` : url;
}

// ========= DATA =========
let allProps = [];

async function load() {
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const rows = parseCSV(text);
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const idx = (name) => headers.indexOf(name);

  allProps = rows.slice(1).filter(r => r[idx('displaytitle')]).map((r,i) => {
    const imagesVal = r[idx('images')] || "";
    let folderId = "";
    let inlineImages = [];

    // If it's a folder link/id (contains '/folders/' or looks like an ID), treat as folder
    if (/folders\//.test(imagesVal) || (imagesVal.trim().split(/[,;|\n]/).length === 1 && getFolderId(imagesVal))) {
      folderId = getFolderId(imagesVal);
    } else {
      inlineImages = splitMulti(imagesVal).map(u => driveViewFromAny(u));
    }

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
      folderId,
      images: inlineImages
    };
  });

  renderAll();
  renderHot();
  // If we have folder API, try to enrich thumbnails for listings that use folderId
  if (folderAPI) {
    fillThumbnailsFromFolders();
  }
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
      <img src="${thumb}" alt="${p.displayTitle}">
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
    a.innerHTML = `<img src="${p.images[0]||'assets/placeholder.jpg'}" alt="${p.displayTitle}">`;
    hot.appendChild(a);
  });
}

async function fillThumbnailsFromFolders() {
  const toFetch = allProps.filter(p => p.folderId && p.images.length === 0);
  for (const p of toFetch) {
    try {
      const resp = await fetch(`${folderAPI}?id=${p.folderId}`);
      const data = await resp.json(); // {files: [{view,thumb}, ...]}
      if (data.files && data.files.length) {
        p.images = data.files.map(f => f.view);
      }
    } catch (e) { /* ignore */ }
  }
  renderAll(); // re-render with new thumbs
  renderHot();
}

// ========= Filters =========
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

// ========= Detail =========
async function loadDetailImages(p) {
  if (p.images.length) return p.images;
  if (p.folderId && folderAPI) {
    try {
      const resp = await fetch(`${folderAPI}?id=${p.folderId}`);
      const data = await resp.json();
      const files = (data.files||[]).map(f => f.view);
      if (files.length) p.images = files;
      return p.images;
    } catch(e) { return []; }
  }
  return [];
}

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

  const imgs = await loadDetailImages(p);
  const slides = imgs.map((u,i)=>`<img class="${i===0?'active':''}" src="${u}">`).join("") || `<img class="active" src="assets/placeholder.jpg">`;

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
