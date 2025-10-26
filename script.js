const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vShnLuLipWzmMjEWVuDS5hRqDnV57kMDrqsKsyfCJSIIvOH4xNleKM6PoXniSBvFnmfPF86jX1jydvh/pub?output=csv";

  const res = await fetch(sheetUrl);
  const text = await res.text();
  const rows = text.split("\n").map(r => r.split(","));
  const headers = rows[0].map(h => h.trim().toLowerCase());
  
  const idx = {
    displayTitle: headers.indexOf("displaytitle"),
    images: headers.indexOf("images"),
    price: headers.indexOf("price"),
    type: headers.indexOf("type")
  };

  const listings = document.getElementById("listings");
  listings.innerHTML = "";

  rows.slice(1).forEach(r => {
    if (!r[idx.displayTitle]) return;
    const title = r[idx.displayTitle];
    let price = parseInt(r[idx.price]) || 0;
    let priceFormatted = price ? "RM" + price.toLocaleString() : "RM0";

    // Handle images
    let imgUrl = "assets/no-image.png";
    if (r[idx.images]) {
      let rawLink = r[idx.images].split(",")[0].trim();
      let match = rawLink.match(/id=([a-zA-Z0-9_-]+)/);
      if (match) {
        imgUrl = `https://drive.google.com/uc?export=view&id=${match[1]}`;
      }
    }

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${imgUrl}" alt="${title}" onerror="this.src='assets/no-image.png'" />
      <div class="card-content">
        <h3>${title}</h3>
        <p>${priceFormatted}</p>
      </div>
    `;
    listings.appendChild(card);
  });
}

function applyFilters() {
  loadProperties(); // filter logic can be expanded later
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
