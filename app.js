/* ====== CONFIG ====== */
/* Your live CSV (Google Sheets → Publish to web → CSV) */
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";

/* WhatsApp number & default message */
const WA_NUMBER = "601169429832";

/* Image search settings */
const TRY_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"];
const MAX_IMAGES_TO_TRY = 20;     // 1..20 per folder
const PLACEHOLDER = "assets/placeholder.jpg";

/* ====== HELPERS ====== */
const el = (sel) => document.querySelector(sel);
const create = (tag, cls) => { const x = document.createElement(tag); if (cls) x.className = cls; return x; };

const money = (n) => {
  const v = Number(n);
  if (Number.isFinite(v)) return "RM " + v.toLocaleString("en-MY");
  return "RM " + n; // fallback
};

const sanitizeFolder = (s) => s; // user already uses exact title as folder name

const buildWAUrl = (title) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hai, boleh saya tahu tentang property "${title}"?`)}`;

/* CSV parser (simple) */
function parseCSV(text){
  // Very light CSV (handles commas in values by quotes)
  const rows = [];
  let i = 0, cur = "", cell = "", inQ = false;
  while (i <= text.length){
    const c = text[i], n = text[i+1];
    if (inQ){
      if (c === '"' && n === '"'){ cell += '"'; i += 2; continue; }
      if (c === '"'){ inQ = false; i++; continue; }
      cell += c; i++; continue;
    } else {
      if (c === '"'){ inQ = true; i++; continue; }
      if (c === "," || c === "\t"){ cur += cell + "\t"; cell = ""; i++; continue; }
      if (c === "\n" || c === "\r" || c === undefined){
        rows.push((cur + cell).split("\t")); cur = ""; cell = ""; i++; continue;
      }
      cell += c; i++;
    }
  }
  // headers
  const header = rows.shift().map(h => h.trim().toLowerCase());
  return rows.filter(r => r.length).map(r => {
    const obj = {};
    r.forEach((v,idx) => obj[header[idx]] = v.trim());
    return obj;
  });
}

/* try to discover images in assets/listings/<Title>/ */
async function loadImagesFor(title){
  const folder = `assets/listings/${sanitizeFolder(title)}/`;
  // try specific thumb first (thumb / Thumb)
  const thumbCandidates = ["thumb", "Thumb", "thumbnail", "cover"];
  for (const base of thumbCandidates){
    for (const ext of TRY_EXTS){
      const url = folder + base + ext;
      const ok = await ping(url);
      if (ok) return await enumerateFromFirst(url, folder); // build slides incl. more
    }
  }
  // else try 1..N
  for (let i=1;i<=MAX_IMAGES_TO_TRY;i++){
    for (const ext of TRY_EXTS){
      const url = folder + i + ext;
      const ok = await ping(url);
      if (ok) return await enumerateFromFirst(url, folder);
    }
  }
  // nothing found
  return [PLACEHOLDER];
}

async function enumerateFromFirst(firstUrl, folder){
  const slides = [firstUrl];
  // continue discovering 2..N around that folder
  for (let i=1;i<=MAX_IMAGES_TO_TRY;i++){
    const tries = TRY_EXTS.map(ext => folder + i + ext);
    for (const url of tries){
      if (url === firstUrl) continue;
      const ok = await ping(url);
      if (ok) { slides.push(url); break; }
    }
  }
  // remove duplicates
  return [...new Set(slides)];
}

function ping(url){
  return new Promise(res=>{
    const i = new Image();
    i.src = url;
    i.onload = () => res(true);
    i.onerror = () => res(false);
  });
}

/* ====== RENDER ====== */
let allListings = [];
let swiper; // Swiper instance

async function boot(){
  const csvText = await fetch(CSV_URL).then(r=>r.text());
  const raw = parseCSV(csvText);

  // normalize
  allListings = raw.map((r,idx)=>({
    id: idx + 1,
    ref: r.ref || "",
    title: r.title || "",
    price: r.price || "",
    type: r.type || "",
    location: r.location || "",
    specs: r.specs || "",
    details: r.details || "",
    map: r.map || "",
    hot: (r.hot||"").toString().toUpperCase() === "TRUE"
  }));

  populateFilters();
  render();
  bindGlobalActions();
}

function populateFilters(){
  // type
  const type = el("#type");
  type.innerHTML = `<option value="">All Types</option>`;
  [...new Set(allListings.map(x=>x.type).filter(Boolean))].forEach(v=>{
    type.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`);
  });

  // location
  const loc = el("#loc");
  loc.innerHTML = `<option value="">All Locations</option>`;
  [...new Set(allListings.map(x=>x.location).filter(Boolean))].forEach(v=>{
    loc.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`);
  });
}

function getFiltered(){
  const q = el("#q").value.trim().toLowerCase();
  const type = el("#type").value;
  const loc = el("#loc").value;
  const sort = el("#sort").value;

  let rows = allListings.filter(x=>{
    let ok = true;
    if (q){
      ok = (x.title.toLowerCase().includes(q) ||
            x.location.toLowerCase().includes(q) ||
            (x.details||"").toLowerCase().includes(q));
    }
    if (ok && type) ok = (x.type === type);
    if (ok && loc) ok = (x.location === loc);
    return ok;
  });

  // sort
  if (sort === "priceAsc") rows.sort((a,b)=>Number(a.price)-Number(b.price));
  if (sort === "priceDesc") rows.sort((a,b)=>Number(b.price)-Number(a.price));
  if (sort === "newest") rows.sort((a,b)=>b.id-a.id);

  return rows;
}

async function render(){
  const rows = getFiltered();

  // Hot: strictly hot === true
  const hot = rows.filter(x=>x.hot);
  await renderGrid(hot.slice(0,3), el("#hotGrid")); // cap to 3 cards visually
  await renderGrid(rows, el("#listGrid"));

  // global footer actions -> generic WA
  el("#waGlobal").href = buildWAUrl("umum (laman utama)");
}

async function renderGrid(items, mount){
  mount.innerHTML = "";
  if (!items.length){
    mount.innerHTML = `<div class="meta">Tiada listing ditemui.</div>`;
    return;
  }

  for (const item of items){
    const card = create("article","card");
    const imgWrap = create("div","card-imgwrap");
    const firstImg = (await loadImagesFor(item.title))[0] || PLACEHOLDER;
    imgWrap.innerHTML = `<img src="${firstImg}" alt="${escapeHtml(item.title)}" loading="lazy">`;
    card.appendChild(imgWrap);

    const body = create("div","card-body");
    body.innerHTML = `
      <div class="price">${money(item.price)}</div>
      <div class="title">${escapeHtml(item.title)}</div>
      <div class="meta">${escapeHtml(item.type || "-")} • ${escapeHtml(item.location || "-")}</div>
    `;
    card.appendChild(body);

    // open modal
    card.addEventListener("click",()=>openModal(item));
    mount.appendChild(card);
  }
}

/* ====== MODAL/GALLERY ====== */
async function openModal(item){
  el("#mTitle").textContent = item.title;
  el("#mMeta").innerHTML =
    `Price: <strong>${money(item.price)}</strong> &nbsp; • &nbsp; 
     Type: ${escapeHtml(item.type||"-")} &nbsp; • &nbsp; 
     Location: ${escapeHtml(item.location||"-")}<br>
     Specs: ${escapeHtml(item.specs||"-")}${item.details?`<br>Details: ${escapeHtml(item.details)}`:""}
     ${item.map?`<br><a href="${item.map}" target="_blank">Map</a>`:""}`;

  const slidesEl = el("#mSlides");
  slidesEl.innerHTML = "";

  const imgs = await loadImagesFor(item.title);
  imgs.forEach(src=>{
    const s = create("div","swiper-slide");
    s.innerHTML = `<img src="${src}" alt="">`;
    slidesEl.appendChild(s);
  });

  // (re)init swiper
  if (swiper) swiper.destroy(true,true);
  swiper = new Swiper('#gallerySwiper', {
    loop: imgs.length>1,
    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
    pagination: { el: '.swiper-pagination', clickable: true },
    keyboard: { enabled: true },
  });

  // contact actions
  el("#mWa").href = buildWAUrl(item.title);
  el("#mCall").href = "tel:+601169429832";

  // show
  el("#modal").classList.add("show");
}

function bindGlobalActions(){
  el("#closeModal").addEventListener("click",()=>el("#modal").classList.remove("show"));
  el("#modal").addEventListener("click",(e)=>{
    if (e.target.id === "modal") el("#modal").classList.remove("show");
  });
  el("#apply").addEventListener("click",render);
  el("#reset").addEventListener("click",()=>{
    el("#q").value=""; el("#type").value=""; el("#loc").value=""; el("#sort").value="default";
    render();
  });
}

/* tiny util */
function escapeHtml(s){ return (s||"").replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])); }

/* go */
boot();
