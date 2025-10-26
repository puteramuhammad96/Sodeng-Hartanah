const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vShnLuLipWzmMjEWVuDS5hRqDnV57kMDrqsKsyfCJSIIvOH4xNleKM6PoXniSBvFnmfPF86jX1jydvh/pub?output=csv";

let properties = [];

async function fetchData() {
  const res = await fetch(sheetUrl);
  const text = await res.text();
  const rows = text.split("\n").map(r => r.split(","));
  const headers = rows[0].map(h => h.trim().toLowerCase());

  const idx = {
    title: headers.indexOf("title"),
    displayTitle: headers.indexOf("displaytitle"),
    images: headers.indexOf("images"),
    price: headers.indexOf("price"),
    type: headers.indexOf("type"),
    specs: headers.indexOf("specs"),
    details: headers.indexOf("details"),
    map: headers.indexOf("map"),
    hot: headers.indexOf("hot")
  };

  properties = rows.slice(1).map((r, i) => ({
    id: i,
    title: r[idx.title],
    displayTitle: r[idx.displayTitle],
    images: r[idx.images],
    price: parseFloat(r[idx.price]) || 0,
    type: r[idx.type],
    specs: r[idx.specs],
    details: r[idx.details],
    map: r[idx.map],
    hot: r[idx.hot] == "1"
  }));

  renderProperties(properties);
  renderHot(properties);
  renderDetail();
}

function formatDriveImage(url) {
  if (!url) return "";
  const match = url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?export=view&id=${match[1]}` : url;
}

function renderProperties(list) {
  const container = document.getElementById("propertyList");
  if (!container) return;
  container.innerHTML = "";
  list.forEach(p => {
    const img = formatDriveImage(p.images);
    container.innerHTML += `
      <div class="card">
        <a href="details.html?id=${p.id}">
          <img src="${img}" alt="${p.displayTitle}">
          <h3>${p.displayTitle}</h3>
          <p>RM${p.price.toLocaleString()}</p>
        </a>
      </div>
    `;
  });
}

function renderHot(list) {
  const container = document.getElementById("hotCarousel");
  if (!container) return;
  container.innerHTML = "";
  list.filter(p => p.hot).forEach(p => {
    const img = formatDriveImage(p.images);
    container.innerHTML += `<a href="details.html?id=${p.id}"><img src="${img}" alt="${p.displayTitle}"></a>`;
  });
  setInterval(() => { container.scrollBy({left: 320, behavior: 'smooth'}); }, 4000);
}

function renderDetail() {
  const container = document.getElementById("detailContainer");
  if (!container) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const p = properties.find(x => x.id == id);
  if (!p) return;
  container.innerHTML = `
    <h2>${p.displayTitle}</h2>
    <img src="${formatDriveImage(p.images)}">
    <p><strong>Price:</strong> RM${p.price.toLocaleString()}</p>
    <p><strong>Type:</strong> ${p.type}</p>
    <p><strong>Specs:</strong> ${p.specs}</p>
    <p><strong>Details:</strong> ${p.details}</p>
    ${p.map ? `<iframe src="${p.map}" width="100%" height="300" style="border:0;" allowfullscreen="" loading="lazy"></iframe>` : ""}
  `;
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const min = parseFloat(document.getElementById("minPrice").value) || 0;
  const max = parseFloat(document.getElementById("maxPrice").value) || Infinity;
  const sort = document.getElementById("sortFilter").value;

  let filtered = properties.filter(p => 
    (!search || (p.displayTitle && p.displayTitle.toLowerCase().includes(search))) &&
    (!type || p.type === type) &&
    (p.price >= min && p.price <= max)
  );

  if (sort === "priceAsc") filtered.sort((a,b) => a.price - b.price);
  if (sort === "priceDesc") filtered.sort((a,b) => b.price - a.price);

  renderProperties(filtered);
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("typeFilter").value = "";
  document.getElementById("minPrice").value = "";
  document.getElementById("maxPrice").value = "";
  document.getElementById("sortFilter").value = "default";
  renderProperties(properties);
}

window.onload = fetchData;