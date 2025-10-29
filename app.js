/* ============================
   CONFIG
============================ */
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";

// Contact settings
const PHONE = "01169429832"; // Malaysia number, no +60 needed for wa
const WA_BASE = "https://wa.me/6" + PHONE; // 6 + 011... handles leading zero

/* ============================
   HELPERS
============================ */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

function csvParse(text) {
  // Small, robust CSV parser (handles quoted fields)
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;

  function pushField() {
    row.push(field);
    field = "";
  }
  function pushRow() {
    rows.push(row);
    row = [];
  }

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") pushField();
      else if (c === "\n" || c === "\r") {
        // handle \r\n or \n
        if (c === "\r" && text[i + 1] === "\n") i++;
        pushField();
        pushRow();
      } else field += c;
    }
    i++;
  }
  // flush last
  pushField();
  pushRow();

  // headers
  const headers = rows.shift().map(h => h.trim().toLowerCase());
  return rows
    .filter(r => r.some(x => x.trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => (obj[h] = (r[idx] || "").trim()));
      return obj;
    });
}

function money(n) {
  if (!n) return "RM 0";
  const x = parseFloat(String(n).replace(/[^\d.]/g, "")) || 0;
  return "RM " + x.toLocaleString("en-MY", { maximumFractionDigits: 0 });
}

function isHot(v) {
  return /^(1|yes|true|hot)$/i.test(v || "");
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function imgPathFor(title, file) {
  // folder is EXACT title; encode for spaces etc.
  return `assets/listings/${encodeURIComponent(title)}/${file}`;
}

/* ============================
   RENDERING
============================ */
const state = {
  all: [],
  filtered: [],
  imagesCache: {}, // title -> array of images found
  current: null,
  galleryIdx: 0
};

const els = {
  hotWrap: $("#hotWrap"),
  hotEmpty: $("#hotEmpty"),
  listWrap: $("#listWrap"),
  listEmpty: $("#listEmpty"),
  q: $("#q"),
  ftype: $("#ftype"),
  floc: $("#floc"),
  fsort: $("#fsort"),
  apply: $("#apply"),
  reset: $("#reset"),
  // modal
  modal: $("#modal"),
  modalClose: $("#modalClose"),
  mTitle: $("#mTitle"),
  mPrice: $("#mPrice"),
  mType: $("#mType"),
  mLoc: $("#mLoc"),
  mSpecs: $("#mSpecs"),
  mMapWrap: $("#mMapWrap"),
  mMap: $("#mMap"),
  gImg: $("#gImg"),
  gPrev: $("#gPrev"),
  gNext: $("#gNext"),
  waBtn: $("#waBtn"),
  callBtn: $("#callBtn"),
};

function buildCard(item, hot = false) {
  const card = document.createElement("article");
  card.className = "card";
  const thumbSrc = imgPathFor(item.title, "thumb.jpg");

  card.innerHTML = `
    <img class="thumb lazy" data-src="${thumbSrc}" alt="${item.title}" onerror="this.onerror=null;this.src='assets/placeholder.jpg'">
    <div class="card-body">
      <p class="price">${money(item.price)}</p>
      <h3 class="title">${item.title}</h3>
      <p class="meta">${item.type || "-"} • ${item.location || "-"}</p>
    </div>
  `;
  card.addEventListener("click", () => openModal(item));
  (hot ? els.hotWrap : els.listWrap).appendChild(card);
}

function render() {
  // Filters
  const q = els.q.value.trim().toLowerCase();
  const t = els.ftype.value;
  const l = els.floc.value;
  const s = els.fsort.value;

  let data = [...state.all];

  if (q) data = data.filter(d => (d.title+d.location).toLowerCase().includes(q));
  if (t) data = data.filter(d => (d.type || "").toLowerCase() === t.toLowerCase());
  if (l) data = data.filter(d => (d.location || "").toLowerCase() === l.toLowerCase());

  // sort
  if (s === "price_asc") data.sort((a,b)=>(+a.price||0) - (+b.price||0));
  if (s === "price_desc") data.sort((a,b)=>(+b.price||0) - (+a.price||0));
  if (s === "title_asc") data.sort((a,b)=>a.title.localeCompare(b.title));

  // render hot
  els.hotWrap.innerHTML = "";
  const hot = data.filter(d => isHot(d.hot));
  if (!hot.length) els.hotEmpty.hidden = false;
  else {
    els.hotEmpty.hidden = true;
    hot.forEach(d => buildCard(d, true));
  }

  // render list
  els.listWrap.innerHTML = "";
  const rest = data;
  if (!rest.length) els.listEmpty.hidden = false;
  else {
    els.listEmpty.hidden = true;
    rest.forEach(d => buildCard(d, false));
  }

  // lazy images
  lazyLoad();
}

function populateFilters(data) {
  const types = unique(data.map(d => (d.type || "").trim()).filter(Boolean));
  const locs = unique(data.map(d => (d.location || "").trim()).filter(Boolean));
  els.ftype.innerHTML = `<option value="">All Types</option>` +
    types.map(x => `<option>${x}</option>`).join("");
  els.floc.innerHTML = `<option value="">All Locations</option>` +
    locs.map(x => `<option>${x}</option>`).join("");
}

/* ============================
   MODAL & GALLERY
============================ */
async function ensureImages(item) {
  if (state.imagesCache[item.title]) return state.imagesCache[item.title];

  // Try numbered files 1..8 (adjustable)
  const imgs = [];
  for (let i=1; i<=12; i++) {
    const p = imgPathFor(item.title, `${i}.jpg`);
    const ok = await imgExists(p);
    if (ok) imgs.push(p);
  }
  if (!imgs.length) imgs.push("assets/placeholder.jpg");
  state.imagesCache[item.title] = imgs;
  return imgs;
}

function imgExists(url) {
  return fetch(url, { method:'HEAD' }).then(r => r.ok).catch(()=>false);
}

async function openModal(item) {
  state.current = item;
  state.galleryIdx = 0;

  els.mTitle.textContent = item.title;
  els.mPrice.textContent = money(item.price);
  els.mType.textContent = item.type || "-";
  els.mLoc.textContent = item.location || "-";
  els.mSpecs.textContent = item.specs || "-";

  if (item.map) {
    els.mMap.href = item.map;
    els.mMapWrap.style.display = "";
  } else els.mMapWrap.style.display = "none";

  // Contacts
  const msg = encodeURIComponent(`Hai, saya nak tahu tentang "${item.title}"`);
  els.waBtn.href = `${WA_BASE}?text=${msg}`;
  els.callBtn.href = `tel:${PHONE}`;

  const imgs = await ensureImages(item);
  setGalleryImage(imgs[state.galleryIdx]);

  els.modal.classList.add("show");
  els.modal.setAttribute("aria-hidden","false");
}

function setGalleryImage(src) {
  els.gImg.src = src;
  els.gImg.onerror = () => els.gImg.src = "assets/placeholder.jpg";
}

els.gPrev.addEventListener("click", ()=>{
  const imgs = state.imagesCache[state.current.title] || [];
  if (!imgs.length) return;
  state.galleryIdx = (state.galleryIdx - 1 + imgs.length) % imgs.length;
  setGalleryImage(imgs[state.galleryIdx]);
});
els.gNext.addEventListener("click", ()=>{
  const imgs = state.imagesCache[state.current.title] || [];
  if (!imgs.length) return;
  state.galleryIdx = (state.galleryIdx + 1) % imgs.length;
  setGalleryImage(imgs[state.galleryIdx]);
});
els.modalClose.addEventListener("click", closeModal);
els.modal.addEventListener("click", e => { if (e.target === els.modal) closeModal(); });

function closeModal(){
  els.modal.classList.remove("show");
  els.modal.setAttribute("aria-hidden","true");
}

/* ============================
   LAZY IMAGES
============================ */
function lazyLoad(){
  const imgs = $$(".lazy");
  const io = new IntersectionObserver((entries, obs)=>{
    entries.forEach(en=>{
      if(en.isIntersecting){
        const img = en.target;
        img.src = img.dataset.src;
        img.classList.remove("lazy");
        obs.unobserve(img);
      }
    })
  },{rootMargin:"200px 0px"});
  imgs.forEach(im=>io.observe(im));
}

/* ============================
   INIT
============================ */
async function init(){
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const rows = csvParse(text);

  // Normalize keys we care about:
  // ref, title, price, type, location, specs, map, hot
  state.all = rows.map(r => ({
    ref: r.ref || "",
    title: r.title || r.displaytitle || "",
    price: r.price || "",
    type: r.type || "",
    location: r.location || "",
    specs: r.specs || "",
    map: r.map || "",
    hot: r.hot || ""
  })).filter(x => x.title);

  populateFilters(state.all);
  render();

  // Apply/reset
  els.apply.addEventListener("click", render);
  els.reset.addEventListener("click", ()=>{
    els.q.value="";
    els.ftype.value="";
    els.floc.value="";
    els.fsort.value="default";
    render();
  });
}
init();
