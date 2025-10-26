const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vShnLuLipWzmMjEWVuDS5hRqDnV57kMDrqsKsyfCJSIIvOH4xNleKM6PoXniSBvFnmfPF86jX1jydvh/pub?output=csv";

let properties = [];

async function loadProperties() {
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const rows = text.split("\n").map(r => r.split(","));

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const idx = {
    title: headers.indexOf("title"),
    displayTitle: headers.indexOf("displaytitle"),
    images: headers.indexOf("images"),
    price: headers.indexOf("price"),
    type: headers.indexOf("type"),
    hot: headers.indexOf("hot")
  };

  properties = rows.slice(1).map(r => ({
    title: r[idx.title],
    displayTitle: r[idx.displayTitle],
    images: r[idx.images],
    price: parseFloat(r[idx.price] || 0),
    type: r[idx.type],
    hot: r[idx.hot]
  }));

  renderListings();
}

function renderListings() {
  const listEl = document.getElementById("propertyList");
  const hotEl = document.getElementById("hotListings");
  listEl.innerHTML = "";
  hotEl.innerHTML = "";

  properties.forEach(p => {
    if (!p.displayTitle) return;
    const images = p.images ? p.images.split(",").map(x=>x.trim()) : [];
    const thumb = images.length ? images[0] : "https://via.placeholder.com/400x250?text=No+Image";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${thumb}" alt="${p.displayTitle}">
      <h3>${p.displayTitle}</h3>
      <p>RM${Number(p.price).toLocaleString("ms-MY",{minimumFractionDigits:2})}</p>
    `;
    card.onclick = () => showDetail(p);
    listEl.appendChild(card);

    if (p.hot && p.hot.toLowerCase() === "yes") {
      hotEl.appendChild(card.cloneNode(true));
    }
  });
}

function showDetail(property) {
  const detailEl = document.getElementById("propertyDetail");
  detailEl.classList.remove("hidden");

  const images = property.images ? property.images.split(",").map(x=>x.trim()) : [];
  const slides = images.map((img,i)=>`<div class="slide ${i===0?'active':''}"><img src="${img}"/></div>`).join("");

  detailEl.innerHTML = `
    <div class="slideshow">${slides}</div>
    <h2>${property.displayTitle}</h2>
    <p><strong>Harga:</strong> RM${Number(property.price).toLocaleString("ms-MY",{minimumFractionDigits:2})}</p>
    <a href="https://wa.me/60123456789?text=Hai, boleh saya tahu tentang property ${property.displayTitle}?" target="_blank">WhatsApp</a>
    <a href="tel:+60123456789">Call</a>
  `;

  startSlideshow();
}

function startSlideshow() {
  let idx = 0;
  const slides = document.querySelectorAll(".slide");
  setInterval(()=>{
    slides.forEach(s=>s.classList.remove("active"));
    idx = (idx+1) % slides.length;
    slides[idx].classList.add("active");
  },3000);
}

function applyFilters() { renderListings(); }
function resetFilters() { renderListings(); }

loadProperties();
