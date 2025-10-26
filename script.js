/***** SODENG v5.3 HOTFIX – CSV robust, gambar & harga *****/

// 1) CSV link (Publish to web)
const sheetUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vShnLuLipWzmMjEWVuDS5hRqDnV57kMDrqsKsyfCJSIIvOH4xNleKM6PoXniSBvFnmfPF86jX1jydvh/pub?output=csv";

let properties = [];

/* ---------------- CSV PARSER (respect quotes) ----------------
   - Google Sheets akan bungkus cell yang ada koma di dalam "quotes".
   - Parser ni akan parse baris demi baris, dan "split" hanya koma yang DI LUAR quotes.
---------------------------------------------------------------- */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];

    if (c === '"') {
      if (insideQuotes && next === '"') {
        // escaped quote ""
        cell += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (c === "," && !insideQuotes) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !insideQuotes) {
      // end of row (support \r\n)
      if (cell.length || row.length) {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      }
      // skip \r in \r\n
      if (c === "\r" && next === "\n") i++;
    } else {
      cell += c;
    }
  }
  // last cell
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/* --------- Tukar apa-apa link Google Drive jadi direct view ---------- */
function formatDriveImage(url) {
  if (!url) return "";
  // Cari ID fail dalam pelbagai format (file/d/..., id=..., uc?id=...)
  const idMatch = url.match(/[-\w]{25,}/);
  if (idMatch) {
    return `https://drive.google.com/uc?export=view&id=${idMatch[0]}`;
  }
  return url.trim();
}

/* ------------------------ Fetch & Build Data ------------------------- */
async function fetchData() {
  const res = await fetch(sheetUrl);
  const text = await res.text();

  const rows = parseCSV(text);
  if (!rows.length) return;

  const headers = rows[0].map((h) => h.trim().toLowerCase());

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

  properties = rows.slice(1).map((r, i) => {
    // IMAGES: cell mungkin ada banyak link dipisahkan koma
    let imageList = [];
    if (idx.images >= 0 && r[idx.images]) {
      imageList = r[idx.images]
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean)
        .map(formatDriveImage);
    }
    const thumb = imageList[0] || "assets/no-image.png";

    // PRICE: format RM#,###,###
    const rawPrice = idx.price >= 0 ? (r[idx.price] || "").replace(/[^\d]/g, "") : "";
    const priceNum = rawPrice ? parseInt(rawPrice, 10) : 0;

    return {
      id: i,
      title: idx.title >= 0 ? (r[idx.title] || "").trim() : "",
      displayTitle:
        idx.displayTitle >= 0 ? (r[idx.displayTitle] || "").trim() : "",
      images: imageList,
      thumb,
      price: priceNum,
      type: idx.type >= 0 ? (r[idx.type] || "").trim() : "",
      specs: idx.specs >= 0 ? (r[idx.specs] || "").trim() : "",
      details: idx.details >= 0 ? (r[idx.details] || "").trim() : "",
      map: idx.map >= 0 ? (r[idx.map] || "").trim() : "",
      hot: idx.hot >= 0 ? (String(r[idx.hot]).trim() === "1") : false,
    };
  });

  renderProperties(properties);
  renderHot(properties);
  renderDetail();
}

/* --------------------------- Rendering --------------------------- */
function renderProperties(list) {
  const container = document.getElementById("propertyList");
  if (!container) return;
  container.innerHTML = "";

  list.forEach((p) => {
    const title = p.displayTitle || p.title || "Untitled";
    const price = `RM${(p.price || 0).toLocaleString()}`;

    container.innerHTML += `
      <div class="card">
        <a href="details.html?id=${p.id}">
          <img src="${p.thumb}" alt="${title}">
          <h3>${title}</h3>
          <p>${price}</p>
        </a>
      </div>
    `;
  });
}

function renderHot(list) {
  const container = document.getElementById("hotCarousel");
  if (!container) return;
  container.innerHTML = "";

  list.filter((p) => p.hot).forEach((p) => {
    const title = p.displayTitle || p.title || "Untitled";
    container.innerHTML += `
      <a href="details.html?id=${p.id}">
        <img src="${p.thumb}" alt="${title}">
      </a>`;
  });

  // autoplay scroll
  setInterval(() => container.scrollBy({ left: 320, behavior: "smooth" }), 4000);
}

function renderDetail() {
  const container = document.getElementById("detailContainer");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const p = properties.find((x) => String(x.id) === String(id));
  if (!p) return;

  const title = p.displayTitle || p.title || "Untitled";
  const price = `RM${(p.price || 0).toLocaleString()}`;
  const waMessage = encodeURIComponent(`Hai, boleh saya tahu tentang property ${title}?`);

  // galeri (side scroll) – guna semua images
  const gallery = (p.images.length ? p.images : [p.thumb])
    .map((url) => `<img src="${url}" style="width:100%;max-height:300px;object-fit:cover;border-radius:8px;margin-bottom:10px;">`)
    .join("");

  container.innerHTML = `
    <h2>${title}</h2>
    ${gallery}
    <p><strong>Price:</strong> ${price}</p>
    <p><strong>Type:</strong> ${p.type || "-"}</p>
    <p><strong>Specs:</strong> ${p.specs || "-"}</p>
    <p><strong>Details:</strong> ${p.details || "-"}</p>
    ${p.map ? `<iframe src="${p.map}" width="100%" height="300" style="border:0;border-radius:8px;" allowfullscreen="" loading="lazy"></iframe>` : ""}

    <div class="contact-options">
      <a href="https://wa.me/601169429832?text=${waMessage}" class="btn-wa">Chat WhatsApp</a>
      <a href="tel:+601169429832" class="btn-call">Call Now</a>
    </div>
  `;
}

/* -------------------------- Filters UI -------------------------- */
function applyFilters() {
  const search = (document.getElementById("searchInput").value || "").toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const min = parseFloat(document.getElementById("minPrice").value) || 0;
  const max = parseFloat(document.getElementById("maxPrice").value) || Infinity;
  const sort = document.getElementById("sortFilter").value;

  let filtered = properties.filter((p) => {
    const t = (p.displayTitle || p.title || "").toLowerCase();
    return (!search || t.includes(search)) &&
           (!type || p.type === type) &&
           (p.price >= min && p.price <= max);
  });

  if (sort === "priceAsc") filtered.sort((a, b) => a.price - b.price);
  if (sort === "priceDesc") filtered.sort((a, b) => b.price - a.price);

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
