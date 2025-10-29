let listings = [];

// CSV parser (handle commas inside quotes)
function parseCSV(text) {
  const rows = [];
  let inQuotes = false, field = "", row = [];

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if (c === "\n" && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Format RM
function formatRM(num) {
  return "RM " + num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv")
  .then(res => res.text())
  .then(text => {
    const rows = parseCSV(text);
    const header = rows.shift();

    listings = rows.map(r => {
      return {
        ref: r[0]?.trim(),
        title: r[1]?.trim(),
        price: parseInt(String(r[2]).replace(/[^\d]/g, "")) || 0,
        type: r[3]?.trim(),
        location: r[4]?.trim(),
        specs: r[5]?.trim(),
        map: r[6]?.trim(),
        hot: r[7]?.trim().toLowerCase(),
        folder: r[1]?.trim()
      };
    });
    populateFilters();
    render();
  });

// Populate filter dropdowns
function populateFilters() {
  const typeSelect = document.getElementById("typeFilter");
  const locationSelect = document.getElementById("locationFilter");
  const types = [...new Set(listings.map(l => l.type))];
  const locs = [...new Set(listings.map(l => l.location))];

  types.forEach(t => {
    if (t) {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      typeSelect.appendChild(opt);
    }
  });

  locs.forEach(l => {
    if (l) {
      const opt = document.createElement("option");
      opt.value = l;
      opt.textContent = l;
      locationSelect.appendChild(opt);
    }
  });
}

// Render listings
function render() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const location = document.getElementById("locationFilter").value;
  const minPrice = parseInt(document.getElementById("minPrice").value.replace(/[^\d]/g, "")) || 0;
  const maxPrice = parseInt(document.getElementById("maxPrice").value.replace(/[^\d]/g, "")) || Infinity;

  const hotDiv = document.getElementById("hotListings");
  const allDiv = document.getElementById("allListings");
  hotDiv.innerHTML = "";
  allDiv.innerHTML = "";

  listings
    .filter(l =>
      (!search || l.title.toLowerCase().includes(search) || l.location.toLowerCase().includes(search)) &&
      (!type || l.type === type) &&
      (!location || l.location === location) &&
      l.price >= minPrice && l.price <= maxPrice
    )
    .forEach(l => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="assets/listings/${l.folder}/thumb.jpg" alt="${l.title}" onerror="this.src='assets/placeholder.jpg'">
        <div class="info">
          <p class="price">${formatRM(l.price)}</p>
          <h3>${l.title}</h3>
          <p>${l.type} • ${l.location}</p>
          <p>${l.specs}</p>
        </div>
      `;
      if (l.hot === "yes" || l.hot === "1") {
        hotDiv.appendChild(card);
      } else {
        allDiv.appendChild(card);
      }
    });
}

document.getElementById("searchInput").addEventListener("input", render);
document.getElementById("typeFilter").addEventListener("change", render);
document.getElementById("locationFilter").addEventListener("change", render);
document.getElementById("minPrice").addEventListener("input", render);
document.getElementById("maxPrice").addEventListener("input", render);
document.getElementById("resetBtn").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("typeFilter").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("minPrice").value = "";
  document.getElementById("maxPrice").value = "";
  render();
});
