const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";

let listings = [];

async function loadListings() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  const rows = text.split("\n").map(r => r.split(","));
  const headers = rows[0];
  listings = rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = row[i] ? row[i].trim() : "");
    return obj;
  });
  renderListings();
}

function renderListings() {
  const search = document.getElementById("search").value.toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const location = document.getElementById("locationFilter").value;
  const minPrice = parseInt(document.getElementById("minPrice").value) || 0;
  const maxPrice = parseInt(document.getElementById("maxPrice").value) || Infinity;

  const filtered = listings.filter(l => {
    const price = parseInt(l.price) || 0;
    return (
      (!search || l.title.toLowerCase().includes(search) || l.location.toLowerCase().includes(search)) &&
      (!type || l.type === type) &&
      (!location || l.location === location) &&
      price >= minPrice &&
      price <= maxPrice
    );
  });

  const hotGrid = document.getElementById("hotListingsGrid");
  const allGrid = document.getElementById("allListingsGrid");
  hotGrid.innerHTML = "";
  allGrid.innerHTML = "";

  filtered.forEach(l => {
    const card = document.createElement("div");
    card.className = "listing-card";
    card.innerHTML = `
      <img src="assets/listings/${l.title}/thumb.jpg" onerror="this.src='assets/placeholder.jpg'">
      <div class="info">
        <div class="price">RM ${parseInt(l.price).toLocaleString()}</div>
        <h3>${l.title}</h3>
        <p>${l.type} • ${l.location}</p>
      </div>
    `;
    card.onclick = () => showModal(l);
    allGrid.appendChild(card);

    if (l.hot && l.hot.toLowerCase() === "yes") {
      hotGrid.appendChild(card.cloneNode(true));
    }
  });
}

function showModal(l) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modalBody");

  body.innerHTML = `
    <h2>${l.title}</h2>
    <p><b>Price:</b> RM ${parseInt(l.price).toLocaleString()}</p>
    <p><b>Type:</b> ${l.type} • <b>Location:</b> ${l.location}</p>
    <p><b>Specs:</b> ${l.specs}</p>
    ${l.map ? `<p>📍 <a href="${l.map}" target="_blank">View Map</a></p>` : ""}
    <div class="modal-images">
      <img src="assets/listings/${l.title}/1.jpg" onerror="this.style.display='none'">
      <img src="assets/listings/${l.title}/2.jpg" onerror="this.style.display='none'">
      <img src="assets/listings/${l.title}/3.jpg" onerror="this.style.display='none'">
    </div>
    <div class="contact-buttons">
      <a href="tel:01169429832" class="btn call">📞 Call</a>
      <a href="https://wa.me/601169429832" target="_blank" class="btn whatsapp">💬 WhatsApp</a>
    </div>
  `;
  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

function resetFilters() {
  document.getElementById("search").value = "";
  document.getElementById("typeFilter").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("minPrice").value = "";
  document.getElementById("maxPrice").value = "";
  renderListings();
}

loadListings();
