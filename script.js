const sheetURL = "YOUR_GOOGLE_SHEET_JSON_URL"; // update dengan URL JSON Sheet

async function fetchProperties() {
  const res = await fetch(sheetURL);
  const data = await res.json();

  const listings = data.map(row => ({
    title: row.displayTitle || row.title,
    price: row.price ? `RM${Number(row.price).toLocaleString()}` : "N/A",
    images: row.images ? row.images.split(",")[0] : "", // ambil gambar pertama
    location: row.location || "",
    type: row.type || "",
  }));

  renderProperties(listings);
}

function renderProperties(listings) {
  const container = document.getElementById("property-list");
  container.innerHTML = "";

  listings.forEach(p => {
    const card = document.createElement("div");
    card.className = "property-card";

    card.innerHTML = `
      <img src="${p.images}" alt="${p.title}" onerror="this.src='assets/no-image.png'">
      <h3>${p.title}</h3>
      <p>${p.price}</p>
      <p><i class="fa fa-map-marker"></i> ${p.location}</p>
    `;

    container.appendChild(card);
  });
}

fetchProperties();