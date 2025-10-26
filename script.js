const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vShnLuLipWzmMjEWVuDS5hRqDnV57kMDrqsKsyfCJSIIvOH4xNleKM6PoXniSBvFnmfPF86jX1jydvh/pub?output=csv";

async function loadProperties() {
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

    // Format harga
    let priceValue = r[idx.price] ? r[idx.price].replace(/[^\d]/g, "") : "0";
    let price = parseInt(priceValue) || 0;
    let priceFormatted = price ? "RM" + price.toLocaleString("en-MY") : "N/A";

    // Format gambar
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

loadProperties();
