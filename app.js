const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";

let listings = [];

async function fetchListings() {
  const res = await fetch(csvUrl);
  const text = await res.text();
  const rows = text.split("\n").map(r => r.split(",")).filter(r => r[0] && r[0] !== "ref");

  listings = rows.map(r => ({
    ref: r[0],
    title: r[1],
    price: parseInt(r[2]) || 0,
    type: r[3],
    location: r[4],
    specs: r[5],
    details: r[6],
    map: r[7],
    hot: r[8] && r[8].toLowerCase().includes("yes")
  }));

  renderFilters();
  renderListings();
}

function renderFilters() {
  const typeSet = new Set(listings.map(l => l.type).filter(Boolean));
  const locSet = new Set(listings.map(l => l.location).filter(Boolean));

  const typeFilter = document.getElementById("typeFilter");
  typeSet.forEach(t => typeFilter.innerHTML += `<option>${t}</option>`);

  const locFilter = document.getElementById("locationFilter");
  locSet.forEach(l => locFilter.innerHTML += `<option>${l}</option>`);
}

function renderListings() {
  const hot = document.getElementById("hotListings");
  const all = document.getElementById("listings");
  hot.innerHTML = "";
  all.innerHTML = "";

  let filtered = [...listings];
  const search = document.getElementById("searchInput").value.toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const loc = document.getElementById("locationFilter").value;
  const sort = document.getElementById("sortFilter").value;

  if (search) filtered = filtered.filter(l => l.title.toLowerCase().includes(search) || l.location.toLowerCase().includes(search));
  if (type) filtered = filtered.filter(l => l.type === type);
  if (loc) filtered = filtered.filter(l => l.location === loc);

  if (sort === "priceAsc") filtered.sort((a,b)=>a.price-b.price);
  if (sort === "priceDesc") filtered.sort((a,b)=>b.price-a.price);

  const hotListings = filtered.filter(l => l.hot);
  const normalListings = filtered.filter(l => !l.hot);

  if (hotListings.length === 0) hot.innerHTML = "<p>Tiada listing ditemui.</p>";
  else hotListings.forEach(l => hot.appendChild(createCard(l)));

  normalListings.forEach(l => all.appendChild(createCard(l)));
}

function createCard(listing) {
  const card = document.createElement("div");
  card.className = "card";
  const folder = `assets/listings/${listing.title}`;
  const thumb = `${folder}/thumb.jpg`;

  card.innerHTML = `
    <img src="${thumb}" alt="${listing.title}" onerror="this.src='assets/placeholder.jpg'"/>
    <div class="info">
      <p class="price">RM ${listing.price.toLocaleString()}</p>
      <h3>${listing.title}</h3>
      <small>${listing.type} • ${listing.location}</small>
    </div>
  `;
  card.onclick = () => openModal(listing);
  return card;
}

function openModal(listing) {
  const modal = document.getElementById("listingModal");
  modal.style.display = "flex";

  document.getElementById("modalDetails").innerHTML = `
    <h2>${listing.title}</h2>
    <p><strong>Price:</strong> RM ${listing.price.toLocaleString()}</p>
    <p><strong>Type:</strong> ${listing.type} • <strong>Location:</strong> ${listing.location}</p>
    <p><strong>Specs:</strong> ${listing.specs}</p>
    <p>${listing.details || ""}</p>
    <a href="${listing.map}" target="_blank">📍 View Map</a>
  `;

  const modalImages = document.getElementById("modalImages");
  modalImages.innerHTML = "";

  let i = 1;
  const folder = `assets/listings/${listing.title}`;
  function loadNext() {
    const img = new Image();
    img.src = `${folder}/${i}.jpg`;
    img.onerror = () => {};
    img.onload = () => {
      modalImages.appendChild(img);
      i++;
      loadNext();
    };
  }
  loadNext();

  document.getElementById("whatsappBtn").href = `https://wa.me/601169429832?text=Hi, saya berminat dengan ${listing.title}`;
  document.getElementById("callBtn").href = "tel:01169429832";
}

function closeModal() {
  document.getElementById("listingModal").style.display = "none";
}

function applyFilters() { renderListings(); }
function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("typeFilter").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("sortFilter").value = "";
  renderListings();
}

fetchListings();
