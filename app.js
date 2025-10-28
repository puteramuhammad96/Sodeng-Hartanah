// CSV Source
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";

let listingsData = [];

async function fetchListings() {
  const res = await fetch(SHEET_URL);
  const text = await res.text();
  const rows = text.split("\n").slice(1);
  listingsData = rows.map(r => {
    const [ref, title, type, location, price] = r.split(",");
    return { ref, title, type, location, price: parseFloat(price), folder: title };
  });
  renderListings(listingsData);
  renderCarousel(listingsData.slice(0, 3));
}

function renderListings(data) {
  const container = document.getElementById("listings");
  container.innerHTML = "";
  data.forEach(listing => {
    const folder = `assets/listings/${listing.folder}`;
    const thumb = `${folder}/thumb.jpg`;

    const div = document.createElement("div");
    div.className = "listing";
    div.innerHTML = `
      <img src="${thumb}" alt="${listing.title}" onerror="this.src='assets/placeholder.jpg'">
      <h3>${listing.title}</h3>
      <p class="price">RM ${listing.price.toLocaleString()}</p>
      <div class="actions">
        <a href="https://wa.me/601169429832?text=Hai, boleh saya tahu tentang property ${listing.title}" target="_blank">WhatsApp</a>
        <a href="tel:+601169429832">Call</a>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderCarousel(data) {
  const carousel = document.getElementById("carousel");
  carousel.innerHTML = "";
  data.forEach(listing => {
    const folder = `assets/listings/${listing.folder}`;
    const thumb = `${folder}/thumb.jpg`;

    const div = document.createElement("div");
    div.className = "listing";
    div.innerHTML = `
      <img src="${thumb}" alt="${listing.title}" onerror="this.src='assets/placeholder.jpg'">
      <h3>${listing.title}</h3>
      <p class="price">RM ${listing.price.toLocaleString()}</p>
    `;
    carousel.appendChild(div);
  });
}

// Search, Filter, Sort
document.getElementById("search").addEventListener("input", e => {
  const val = e.target.value.toLowerCase();
  const filtered = listingsData.filter(l => l.title.toLowerCase().includes(val));
  renderListings(filtered);
});

document.getElementById("filter-type").addEventListener("change", e => {
  const val = e.target.value;
  const filtered = val ? listingsData.filter(l => l.type === val) : listingsData;
  renderListings(filtered);
});

document.getElementById("filter-location").addEventListener("change", e => {
  const val = e.target.value;
  const filtered = val ? listingsData.filter(l => l.location === val) : listingsData;
  renderListings(filtered);
});

document.getElementById("sort-price").addEventListener("change", e => {
  const val = e.target.value;
  const sorted = [...listingsData].sort((a, b) =>
    val === "asc" ? a.price - b.price : b.price - a.price
  );
  renderListings(sorted);
});

// Init
fetchListings();
