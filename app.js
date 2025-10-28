// ========== FETCH DATA FROM SHEET ==========
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";

let listings = [];

// Convert CSV to JSON
function csvToJson(csv) {
  const rows = csv.split("\n").map(r => r.split(","));
  const headers = rows.shift().map(h => h.trim());
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i] ? row[i].trim() : "");
    return obj;
  });
}

// ========== LOAD LISTINGS ==========
async function loadListings() {
  try {
    const res = await fetch(SHEET_URL);
    const csv = await res.text();
    listings = csvToJson(csv);

    populateLocationFilter();
    renderListings(listings);
    renderHotListings(listings.slice(0, 5));
  } catch (err) {
    console.error("Error loading sheet:", err);
  }
}

// ========== RENDER LISTINGS ==========
function renderListings(data) {
  const container = document.getElementById("listings");
  container.innerHTML = "";

  data.forEach(listing => {
    const slug = listing.Title.toLowerCase().replace(/\s+/g, "-");
    const thumbPath = `assets/listings/${slug}/thumb.jpg`;

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${thumbPath}" alt="${listing.Title}" onerror="this.src='assets/placeholder.jpg'"/>
      <div class="card-content">
        <h3>${listing.Title}</h3>
        <p>${listing.Location || ""}</p>
        <p class="price">RM ${Number(listing.Price || 0).toLocaleString()}</p>
        <p><em>${listing.Type}</em></p>
      </div>
    `;

    card.addEventListener("click", () => openDetail(listing, slug));
    container.appendChild(card);
  });
}

// ========== RENDER HOT LISTINGS ==========
function renderHotListings(data) {
  const container = document.getElementById("hotCarousel");
  container.innerHTML = "";
  data.forEach(listing => {
    const slug = listing.Title.toLowerCase().replace(/\s+/g, "-");
    const thumbPath = `assets/listings/${slug}/thumb.jpg`;

    const img = document.createElement("img");
    img.src = thumbPath;
    img.alt = listing.Title;
    img.onerror = () => img.src = "assets/placeholder.jpg";
    img.addEventListener("click", () => openDetail(listing, slug));
    container.appendChild(img);
  });
}

// ========== DETAIL PAGE ==========
async function openDetail(listing, slug) {
  // Ambil images.json
  let images = [];
  try {
    const res = await fetch(`assets/listings/${slug}/images.json`);
    images = await res.json();
  } catch (e) {
    console.warn("No images.json found for", slug);
  }

  const gallery = images.map(img => `<img src="assets/listings/${slug}/${img}" alt="${listing.Title}" />`).join("");

  document.body.innerHTML = `
    <div class="detail-page">
      <button onclick="location.reload()">← Back</button>
      <h2>${listing.Title}</h2>
      <p><strong>Location:</strong> ${listing.Location || "-"}</p>
      <p><strong>Type:</strong> ${listing.Type}</p>
      <p><strong>Price:</strong> RM ${Number(listing.Price || 0).toLocaleString()}</p>
      <div class="gallery">${gallery || "<p>No images available</p>"}</div>
      <div class="actions">
        <a href="https://wa.me/601169429832?text=Hai, boleh saya tahu tentang property ${encodeURIComponent(listing.Title)}" class="contact-btn whatsapp">💬 WhatsApp</a>
        <a href="tel:+601169429832" class="contact-btn call">📞 Call</a>
      </div>
    </div>
  `;
}

// ========== FILTERS ==========
function populateLocationFilter() {
  const select = document.getElementById("locationFilter");
  const locations = [...new Set(listings.map(l => l.Location).filter(Boolean))];
  locations.forEach(loc => {
    const option = document.createElement("option");
    option.value = loc;
    option.textContent = loc;
    select.appendChild(option);
  });
}

function applyFilters() {
  let filtered = [...listings];
  const search = document.getElementById("searchBar").value.toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const location = document.getElementById("locationFilter").value;
  const sort = document.getElementById("sortFilter").value;

  if (search) {
    filtered = filtered.filter(l => l.Title.toLowerCase().includes(search) || (l.Location || "").toLowerCase().includes(search));
  }
  if (type) filtered = filtered.filter(l => l.Type === type);
  if (location) filtered = filtered.filter(l => l.Location === location);

  if (sort === "price-asc") {
    filtered.sort((a, b) => (Number(a.Price) || 0) - (Number(b.Price) || 0));
  } else if (sort === "price-desc") {
    filtered.sort((a, b) => (Number(b.Price) || 0) - (Number(a.Price) || 0));
  }

  renderListings(filtered);
}

// ========== EVENT LISTENERS ==========
document.addEventListener("DOMContentLoaded", () => {
  loadListings();
  document.getElementById("searchBar").addEventListener("input", applyFilters);
  document.getElementById("typeFilter").addEventListener("change", applyFilters);
  document.getElementById("locationFilter").addEventListener("change", applyFilters);
  document.getElementById("sortFilter").addEventListener("change", applyFilters);
});

