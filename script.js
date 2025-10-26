// ====== CONFIG: link CSV (Published to web) ======
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQhh1miy0ybTomX1hrTj44jYunYtzivOvNAFv_IlYcwOazm7BHa6-aSVkCZg0q_rd5aC9K-dTOa88Rn/pub?gid=0&single=true&output=csv";

let allProps = [];

// Robust CSV parser (handles quoted fields & commas inside)
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

function normalizeDrive(url) {
  if (!url) return "";
  const idMatch = url.match(/[-\w]{25,}/);
  if (idMatch) {
    const id = idMatch[0];
    return {
      view: `https://drive.google.com/uc?export=view&id=${id}`,
      thumb: `https://drive.google.com/thumbnail?id=${id}&sz=w1600`
    };
  }
  return { view: url, thumb: url };
}

function splitImages(val) {
  if (!val) return [];
  // allow separators: comma, semicolon, pipe, newline
  return val.split(/[,;|\n]/).map(s => s.trim()).filter(Boolean);
}

function money(n) {
  const num = parseFloat(String(n).replace(/[^\d.]/g, "")) || 0;
  return "RM" + num.toLocaleString("ms-MY", { minimumFractionDigits: 0 });
}

async function load() {
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const rows = parseCSV(text);
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const idx = (name) => headers.indexOf(name);

  allProps = rows.slice(1).filter(r => r[idx('displaytitle')]).map((r,i) => {
    const imagesRaw = r[idx('images')] || "";
    const imgs = splitImages(imagesRaw).map(u => normalizeDrive(u));
    return {
      id: i,
      title: r[idx('title')] || "",
      displayTitle: r[idx('displaytitle')] || "",
      price: r[idx('price')] || "",
      type: (r[idx('type')] || "").trim(),
      specs: r[idx('specs')] || "",
      details: r[idx('details')] || "",
      map: r[idx('map')] || "",
      hot: (r[idx('hot')] || "").toLowerCase() === "yes",
      images: imgs,
      thumb: imgs[0]?.view || ""
    };
  });

  renderList(allProps);
  renderHot(allProps.filter(p => p.hot));
  renderDetailFromQuery();
}

function renderList(list) {
  const el = document.getElementById('list');
  if (!el) return;
  el.innerHTML = "";
  list.forEach(p => {
    const card = document.createElement('a');
    card.className = 'card';
    card.href = `details.html?id=${p.id}`;
    card.innerHTML = `
      <img src="${p.thumb}" alt="${p.displayTitle}"
           onerror="this.onerror=null;this.src='${p.images[0]?.thumb || 'assets/placeholder.jpg'}'">
      <div class="meta">
        <h3>${p.displayTitle} ${p.type ? `<span class='badge'>${p.type}</span>`:''}</h3>
        <div class="price">${money(p.price)}</div>
      </div>`;
    el.appendChild(card);
  });
}

function renderHot(list) {
  const el = document.getElementById('hot');
  if (!el) return;
  el.innerHTML = "";
  list.forEach(p => {
    const a = document.createElement('a');
    a.href = `details.html?id=${p.id}`;
    a.innerHTML = `<img src="${p.thumb}" alt="${p.displayTitle}"
                     onerror="this.onerror=null;this.src='${p.images[0]?.thumb || 'assets/placeholder.jpg'}'">`;
    el.appendChild(a);
  });
}

function applyFilters() {
  const q = document.getElementById('search').value.toLowerCase();
  const t = document.getElementById('type').value.toLowerCase();
  const min = parseFloat(document.getElementById('min').value) || 0;
  const max = parseFloat(document.getElementById('max').value) || Infinity;
  const sort = document.getElementById('sort').value;

  let list = allProps.filter(p =>
    (!q || p.displayTitle.toLowerCase().includes(q)) &&
    (!t || p.type.toLowerCase() === t) &&
    ((parseFloat(p.price)||0) >= min && (parseFloat(p.price)||0) <= max)
  );

  if (sort === 'asc') list.sort((a,b)=>(a.price||0)-(b.price||0));
  if (sort === 'desc') list.sort((a,b)=>(b.price||0)-(a.price||0));

  renderList(list);
}

function resetFilters() {
  ['search','type','min','max','sort'].forEach(id => document.getElementById(id).value = id==='sort'?'': '');
  renderList(allProps);
}

function renderDetailFromQuery() {
  const container = document.getElementById('detail');
  if (!container) return;
  const id = new URLSearchParams(location.search).get('id');
  const p = allProps.find(x => String(x.id) === String(id));
  if (!p) { container.innerHTML = "<p class='box'>Property not found.</p>"; return; }

  // Slideshow
  const slides = p.images.map((u,i)=>`<img class="${i===0?'active':''}" src="${u.view}" onerror="this.onerror=null;this.src='${u.thumb}'">`).join("");
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

  startAutoSlide();
}

function startAutoSlide(){
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

window.addEventListener('DOMContentLoaded', load);
