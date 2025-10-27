
// Replace with your published Google Sheet CSV URL
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQhh1miy0ybTomX1hrTj44jYunYtzivOvNAFv_IlYcwOazm7BHa6-aSVkCZg0q_rd5aC9K-dTOa88Rn/pub?gid=0&single=true&output=csv";

async function loadProperties() {
  const response = await fetch(sheetUrl);
  const data = await response.text();
  const rows = data.split("\n").map(r => r.split(","));
  const headers = rows[0].map(h => h.trim().toLowerCase());

  const idx = {
    title: headers.indexOf("title"),
    images: headers.indexOf("images"),
    price: headers.indexOf("price"),
    type: headers.indexOf("type"),
    specs: headers.indexOf("specs"),
    details: headers.indexOf("details"),
    map: headers.indexOf("map"),
    hot: headers.indexOf("hot"),
  };

  const container = document.getElementById("properties");
  container.innerHTML = "";

  rows.slice(1).forEach(r => {
    if (!r[idx.title]) return;
    const title = r[idx.title];
    const images = r[idx.images] ? r[idx.images].split(" ") : [];
    const price = r[idx.price] ? `RM${parseInt(r[idx.price]).toLocaleString()}` : "N/A";
    const type = r[idx.type] || "";
    const specs = r[idx.specs] || "";
    const details = r[idx.details] || "";
    const map = r[idx.map] || "";

    const card = document.createElement("div");
    card.className = "card";

    let imgTag = "";
    if (images.length > 0) {
      imgTag = `<img src="${images[0]}" alt="${title}" />`;
    }

    card.innerHTML = `
      ${imgTag}
      <h3>${title}</h3>
      <p>${price}</p>
      <p>${specs}</p>
      <small>${type}</small>
    `;

    container.appendChild(card);
  });
}

function applyFilters() {
  // placeholder filter
  loadProperties();
}
function resetFilters() {
  document.getElementById("search").value = "";
  document.getElementById("typeFilter").value = "";
  document.getElementById("minPrice").value = "";
  document.getElementById("maxPrice").value = "";
  document.getElementById("sortFilter").value = "default";
  loadProperties();
}

loadProperties();
