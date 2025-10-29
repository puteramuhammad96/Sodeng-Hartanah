// === Config ===
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";
const PHONE = "601169429832";

// === Helpers ===
const $ = (s, el=document) => el.querySelector(s);
const fmtRM = n => "RM " + (Number(n||0)).toLocaleString(undefined,{maximumFractionDigits:0});

// Build exact folder path from Title (must match your folder name exactly)
const folderFromTitle = (title) => title?.trim() || "";

// Try to load sequential images 1..12; hide if 404
function buildGalleryHTML(folder) {
  let imgs = "";
  for (let i=1;i<=12;i++){
    imgs += `<img src="assets/listings/${folder}/${i}.jpg" onerror="this.style.display='none'">`;
  }
  return imgs;
}

// === Load CSV ===
async function loadCSV() {
  const res = await fetch(CSV_URL);
  const csv = await res.text();
  const parsed = Papa.parse(csv, {header:true, skipEmptyLines:true}).data;

  // Normalize keys to lower-case (title, price, type, location, specs, details)
  const rows = parsed.map(r => {
    const obj = {};
    for (const k in r) obj[k.trim().toLowerCase()] = (r[k]||"").trim();
    return obj;
  }).filter(r => r.title);

  return rows;
}

// === Render ===
function renderHot(list){
  const wrap = $("#hotCarousel");
  wrap.innerHTML = "";
  list.slice(0,5).forEach(item=>{
    const folder = folderFromTitle(item.title);
    const card = document.createElement("div");
    card.className = "tile";
    card.innerHTML = `
      <img src="assets/listings/${folder}/thumb.jpg" onerror="this.src='assets/placeholder.jpg'" alt="">
      <div class="body">
        <div class="price">${fmtRM(item.price)}</div>
        <div>${item.title}</div>
      </div>`;
    card.addEventListener("click",()=>openDetail(item));
    wrap.appendChild(card);
  });
}

function renderGrid(list){
  const grid = $("#grid"); grid.innerHTML = "";
  list.forEach(item=>{
    const folder = folderFromTitle(item.title);
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <img src="assets/listings/${folder}/thumb.jpg" onerror="this.src='assets/placeholder.jpg'" alt="${item.title}">
      <div class="body">
        <h3>${item.title}</h3>
        <div class="price">${fmtRM(item.price)}</div>
        <div class="meta">${item.type||""} • ${item.location||""}</div>
      </div>`;
    el.addEventListener("click",()=>openDetail(item));
    grid.appendChild(el);
  });
}

// === Detail Modal ===
function openDetail(item){
  const folder = folderFromTitle(item.title);
  const modal = $("#modal");
  const box = $("#modalContent");

  box.innerHTML = `
    <div class="detail-header">
      <h2>${item.title}</h2>
      <div class="detail-meta">
        <div><b>Price:</b> ${fmtRM(item.price)}</div>
        <div><b>Type:</b> ${item.type||"-"} • <b>Location:</b> ${item.location||"-"}</div>
        ${item.specs ? `<div><b>Specs:</b> ${item.specs}</div>` : ""}
        ${item.details ? `<div><b>Details:</b> ${item.details}</div>` : ""}
      </div>
      <div class="gallery">
        <img src="assets/listings/${folder}/thumb.jpg" onerror="this.style.display='none'">
        ${buildGalleryHTML(folder)}
      </div>
      <div class="detail-actions">
        <a class="btn whatsapp" target="_blank" href="https://wa.me/${PHONE}?text=${encodeURIComponent(`Hai, boleh saya tahu tentang property ${item.title}?`)}">💬 WhatsApp</a>
        <a class="btn call" href="tel:+${PHONE}">📞 Call</a>
      </div>
    </div>
  `;
  modal.hidden = false;
}

function wireModal(){
  $("#modalClose").addEventListener("click",()=> $("#modal").hidden = true);
  $("#modal").addEventListener("click",(e)=>{ if(e.target.id==="modal") $("#modal").hidden = true; });
}

// === Filters ===
function unique(arr){ return [...new Set(arr.filter(Boolean))]; }

function applyFilters(data){
  const q = $("#q").value.toLowerCase();
  const t = $("#type").value;
  const loc = $("#location").value;
  const sort = $("#sort").value;

  let L = data.filter(x=>{
    const s = (x.title+" "+(x.location||"")).toLowerCase().includes(q);
    const ty = !t || x.type===t;
    const lo = !loc || x.location===loc;
    return s && ty && lo;
  });

  if (sort==="priceAsc") L.sort((a,b)=>(+a.price||0)-(+b.price||0));
  if (sort==="priceDesc") L.sort((a,b)=>(+b.price||0)-(+a.price||0));
  if (sort==="titleAsc") L.sort((a,b)=>a.title.localeCompare(b.title));

  return L;
}

async function init(){
  const data = await loadCSV();

  // populate locations
  const locSel = $("#location");
  unique(data.map(d=>d.location)).forEach(v=>{
    const o = document.createElement("option"); o.value=v; o.textContent=v; locSel.appendChild(o);
  });

  // render
  renderHot(data);
  renderGrid(data);

  // filter events
  ["q","type","location","sort"].forEach(id=>{
    $("#"+id).addEventListener("input",()=>renderGrid(applyFilters(data)));
    $("#"+id).addEventListener("change",()=>renderGrid(applyFilters(data)));
  });

  wireModal();
}

document.addEventListener("DOMContentLoaded", init);
