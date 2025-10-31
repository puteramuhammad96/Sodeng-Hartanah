/* ============================
   CONFIG
============================ */
const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";
const PHONE = "01169429832";
const WA_BASE = "https://wa.me/6" + PHONE;

/* ============================
   HELPERS
============================ */
const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

function csvParse(text) {
  const rows = [];
  let i = 0, field = "", row = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") pushField();
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; pushField(); pushRow(); }
      else field += c;
    }
    i++;
  }
  pushField(); pushRow();
  const headers = rows.shift().map(h => h.trim().toLowerCase());
  return rows.filter(r => r.some(x => (x || "").trim() !== ""))
    .map(r => {
      const o = {};
      headers.forEach((h, idx) => o[h] = (r[idx] || "").trim());
      return o;
    });
}

function money(n) {
  const x = parseFloat(String(n).replace(/[^\d.]/g, "")) || 0;
  return "RM " + x.toLocaleString("en-MY", { maximumFractionDigits: 0 });
}
const isHot = v => /^(1|yes|true|hot)$/i.test(v || "");
const unique = arr => [...new Set(arr.filter(Boolean))];
const imgPathFor = (title, file) => `assets/listings/${encodeURIComponent(title)}/${file}`;

/* ============================
   STATE + ELEMENTS
============================ */
const state = { all: [], imagesCache: {}, current: null, galleryIdx: 0 };

const els = {
  hotWrap: $("#hotWrap"),
  hotEmpty: $("#hotEmpty"),
  listWrap: $("#listWrap"),
  listEmpty: $("#listEmpty"),
  q: $("#q"),
  ftype: $("#ftype"),
  floc: $("#floc"),
  pmin: $("#pmin"),
  pmax: $("#pmax"),
  fsort: $("#fsort"),
  apply: $("#apply"),
  reset: $("#reset"),
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
  shareBtn: $("#shareBtn"),
  toast: $("#toast"),
};

/* ============================
   RENDERING
============================ */
function buildCard(item, isHotCard = false) {
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
  (isHotCard ? els.hotWrap : els.listWrap).appendChild(card);
}

function render() {
  const q = els.q.value.trim().toLowerCase();
  const t = els.ftype.value;
  const l = els.floc.value;
  const s = els.fsort.value;

  const minP = parseFloat(els.pmin.value) || 0;
  const maxP = parseFloat(els.pmax.value) || Infinity;

  let data = [...state.all];
  if (q) data = data.filter(d => (d.title + " " + (d.location || "")).toLowerCase().includes(q));
  if (t) data = data.filter(d => (d.type || "").toLowerCase() === t.toLowerCase());
  if (l) data = data.filter(d => (d.location || "").toLowerCase() === l.toLowerCase());
  data = data.filter(d => {
    const p = parseFloat(String(d.price).replace(/[^\d.]/g, "")) || 0;
    return p >= minP && p <= maxP;
  });

  if (s === "price_asc") data.sort((a, b) => (+a.price || 0) - (+b.price || 0));
  if (s === "price_desc") data.sort((a, b) => (+b.price || 0) - (+a.price || 0));
  if (s === "title_asc") data.sort((a, b) => a.title.localeCompare(b.title));

  els.hotWrap.innerHTML = "";
  const hot = data.filter(d => isHot(d.hot));
  els.hotEmpty.hidden = !!hot.length;
  hot.forEach(d => buildCard(d, true));

  els.listWrap.innerHTML = "";
  els.listEmpty.hidden = !!data.length;
  data.forEach(d => buildCard(d, false));

  lazyLoad();
}

/* ============================
   MODAL
============================ */
async function openModal(item) {
  state.current = item;
  state.galleryIdx = 0;

  els.mTitle.textContent = item.title;
  els.mPrice.textContent = money(item.price);
  els.mType.textContent = item.type || "-";
  els.mLoc.textContent = item.location || "-";
  els.mSpecs.textContent = item.specs || "-";

  if (item.map) { els.mMap.href = item.map; els.mMapWrap.style.display = ""; }
  else els.mMapWrap.style.display = "none";

  const msg = encodeURIComponent(`Hai, saya nak tahu tentang "${item.title}"`);
  els.waBtn.href = `${WA_BASE}?text=${msg}`;
  els.callBtn.href = `tel:${PHONE}`;

  const shareURL = `${window.location.origin}?property=${encodeURIComponent(item.title)}`;
  els.shareBtn.onclick = () => copyLink(shareURL);

  const imgs = await ensureImages(item);
  setGalleryImage(imgs[state.galleryIdx]);

  els.modal.classList.add("show");
  els.modal.setAttribute("aria-hidden", "false");
}

/* === Copy Link === */
function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    els.toast.classList.add("show");
    setTimeout(() => els.toast.classList.remove("show"), 2000);
  });
}

/* === Lazy Load === */
function lazyLoad() {
  const imgs = $$(".lazy");
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        const img = en.target;
        img.src = img.dataset.src;
        img.classList.remove("lazy");
        obs.unobserve(img);
      }
    });
  }, { rootMargin: "200px 0px" });
  imgs.forEach(im => io.observe(im));
}

/* === Image Handling === */
async function ensureImages(item) {
  if (state.imagesCache[item.title]) return state.imagesCache[item.title];
  const imgs = [];
  for (let i = 1; i <= 12; i++) {
    const p = imgPathFor(item.title, `${i}.jpg`);
    const ok = await fetch(p, { method: 'HEAD' }).then(r => r.ok).catch(() => false);
    if (ok) imgs.push(p);
  }
  if (!imgs.length) imgs.push("assets/placeholder.jpg");
  state.imagesCache[item.title] = imgs;
  return imgs;
}

function setGalleryImage(src) {
  els.gImg.src = src;
  els.gImg.onerror = () => els.gImg.src = "assets/placeholder.jpg";
}

/* ============================
   INIT
============================ */
async function init() {
  const res = await fetch(CSV_URL);
  const text = await res.text();
  const rows = csvParse(text);

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

  render();

  // Auto open property if shared link used
  const urlParams = new URLSearchParams(window.location.search);
  const shared = urlParams.get("property");
  if (shared) {
    const match = state.all.find(x => x.title.toLowerCase() === decodeURIComponent(shared).toLowerCase());
    if (match) openModal(match);
  }
}
init();
