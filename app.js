const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv";

let listings = [];
let filteredListings = [];

// Fetch CSV
async function fetchListings() {
  try {
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    listings = parseCSV(csvText);
    filteredListings = listings;
    renderListings();
    populateFilters();
  } catch (error) {
    console.error("Error fetching listings:", error);
  }
}

// CSV parser
function parseCSV(csvText) {
  const rows = csvText.trim().split("\n");
  const headers = rows[0].split(",").map(h => h.trim());
  return rows.slice(1).map(row => {
    const values = row.split(",(?=(?:(?:[^\"]*\"){2})*[^\"]*$)").map(v => v.replace(/^"|"$/g, '').trim());
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = values[i] || "";
    });
    return obj;
  });
}

// Render listings
function renderListings() {
  const container = document.getElementById("listings");
  container.innerHTML = "";

  if (!filteredListings.length) {
    container.innerHTML = "<p>No listings available.</p>";
    return;
  }

  filteredListings.forEach(listing => {
    const card = document.createElement("div");
    card.className = "listing-card";

    // Fallback image
    let imgSrc = `assets/listings/${listing.title}/thumb.jpg`;
    if (!listing.title) {
      imgSrc = "assets/placeholder.jpg";
    }

    card.innerHTML = `
      <img src="${imgSrc}" alt="${listing.title}" class="listing-image" onerror="this.src='assets/placeholder.jpg'">
      <div class="listing-info">
        <h3>${listing.title}</h3>
        <p><strong>Price:</strong> RM${listing.price}</p>
        <p><strong>Type:</strong> ${listing.type}</p>
        <p><strong>Location:</strong> ${listing.location}</p>
        <p><strong>Specs:</strong> ${listing.specs}</p>
        <p><strong>Details:</strong> ${listing.details}</p>
        <div class="listing-actions">
          <a href="tel:+60123456789" class="btn-call">📞 Call</a>
          <a href="https://wa.me/60123456789" target="_blank" class="btn-whatsapp">💬 WhatsApp</a>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// Populate filters
function populateFilters() {
  const locationFilter = document.getElementById("filter-location");
  const uniqueLocations = [...new Set(listings.map(l => l.location).filter(Boolean))];
  locationFilter.innerHTML = `<option value="">All Locations</option>`;
  uniqueLocations.forEach(loc => {
    const option = document.createElement("option");
    option.value = loc;
    option.textContent = loc;
    locationFilter.appendChild(option);
  });
}

// Apply filters
function applyFilters() {
  const search = document.getElementById("search").value.toLowerCase();
  const type = document.getElementById("filter-type").value;
  const location = document.getElementById("filter-location").value;
  const minPrice = parseInt(document.getElementById("min-price").value) || 0;
  const maxPrice = parseInt(document.getElementById("max-price").value) || Infinity;

  filteredListings = listings.filter(l => {
    const matchesSearch =
      l.title.toLowerCase().includes(search) || l.location.toLowerCase().includes(search);
    const matchesType = !type || l.type === type;
    const matchesLocation = !location || l.location === location;
    const price = parseInt(l.price) || 0;
    const matchesPrice = price >= minPrice && price <= maxPrice;
    return matchesSearch && matchesType && matchesLocation && matchesPrice;
  });

  renderListings();
}

// Reset filters
function resetFilters() {
  document.getElementById("search").value = "";
  document.getElementById("filter-type").value = "";
  document.getElementById("filter-location").value = "";
  document.getElementById("min-price").value = "";
  document.getElementById("max-price").value = "";
  filteredListings = listings;
  renderListings();
}

// Init
fetchListings();


