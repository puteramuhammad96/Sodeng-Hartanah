// Ganti URL bawah ni dengan Google Sheet CSV link awak
const sheetUrl = "https://docs.google.com/spreadsheets/d/<<YOUR_SHEET_ID>>/gviz/tq?tqx=out:csv";

async function loadProperties() {
  try {
    const response = await fetch(sheetUrl);
    const data = await response.text();

    const rows = data.split("\n").map(r => r.split(","));

    // Header row
    const headers = rows[0].map(h => h.trim().toLowerCase());

    // Cari index untuk setiap column
    const idx = {
      title: headers.indexOf("title"),
      displayTitle: headers.indexOf("displaytitle"),
      images: headers.indexOf("images"),
      price: headers.indexOf("price"),
      type: headers.indexOf("type"),
      specs: headers.indexOf("specs"),
      details: headers.indexOf("details"),
      map: headers.indexOf("map"),
      hot: headers.indexOf("hot"),
    };

    const listingsContainer = document.getElementById("listings");
    listingsContainer.innerHTML = "";

    rows.slice(1).forEach(row => {
      if (!row[idx.title]) return;

      const displayTitle = row[idx.displayTitle] || row[idx.title];
      const price = row[idx.price] ? "RM" + parseFloat(row[idx.price]).toLocaleString() : "-";
      const type = row[idx.type] || "";
      const specs = row[idx.specs] || "";
      const details = row[idx.details] || "";
      const map = row[idx.map] || "";

      // Handle multiple images
      let images = [];
      if (row[idx.images]) {
        images = row[idx.images].split(/[,;\s]+/).map(img => img.trim()).filter(img => img);
      }
      const firstImage = images.length > 0 ? images[0] : "assets/no-image.png";

      // Card HTML
      const card = document.createElement("div");
      card.className = "property-card";
      card.innerHTML = `
        <img src="${firstImage}" alt="${displayTitle}" class="property-img" />
        <h3>${displayTitle}</h3>
        <p>${type}</p>
        <p><b>${price}</b></p>
        <button onclick="viewDetails('${displayTitle}', '${price}', '${specs}', '${details}', '${map}', '${images.join('|')}')">View Details</button>
      `;
      listingsContainer.appendChild(card);
    });

  } catch (error) {
    console.error("Error loading sheet:", error);
  }
}

function viewDetails(title, price, specs, details, map, images) {
  const gallery = images.split("|").map(img => `<img src="${img}" class="gallery-img" />`).join("");
  document.getElementById("modal").innerHTML = `
    <h2>${title}</h2>
    <p><b>${price}</b></p>
    <p>${specs}</p>
    <p>${details}</p>
    <div class="gallery">${gallery}</div>
    <a href="${map}" target="_blank">View on Map</a>
    <button onclick="closeModal()">Close</button>
  `;
  document.getElementById("modal").style.display = "block";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

window.onload = loadProperties;
