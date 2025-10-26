const sheetURL = "PASTE_YOUR_GOOGLE_SHEET_JSON_URL"; // <-- ganti dengan URL JSON sheet

let properties = [];

async function fetchData() {
  const res = await fetch(sheetURL);
  const data = await res.json();

  properties = data.feed.entry.map(row => {
    const obj = {};
    row.gsx$title && (obj.title = row.gsx$title.$t);
    obj.displayTitle = row.gsx$displaytitle ? row.gsx$displaytitle.$t : obj.title;
    obj.images = row.gsx$images ? row.gsx$images.$t.split(",").map(x => x.trim()) : [];
    obj.price = parseFloat(row.gsx$price?.$t || 0);
    obj.type = row.gsx$type ? row.gsx$type.$t : "";
    obj.location = row.gsx$location ? row.gsx$location.$t : "";
    obj.hot = row.gsx$hot ? row.gsx$hot.$t : "";

    return obj;
  });

  renderListings(properties);
  renderCarousel(properties.filter(p => p.hot === "1"));
}

function formatPrice(num) {
  return "RM" + num.toLocaleString("en-MY", {minimumFractionDigits: 2});
}

function renderListings(list) {
  const container = document.getElementById("listings");
  container.innerHTML = "";
  list.forEach((p, i) => {
    const img = p.images.length ? p.images[0] : "https://via.placeholder.com/300x200?text=No+Image";
    const card = document.createElement("div");
    card.className = "card";
    card.onclick = () => openModal(p);
    card.innerHTML = `
      <img src="${img}" alt="${p.displayTitle}" />
      <div class="card-content">
        <h3 class="card-title">${p.displayTitle}</h3>
        <p>${p.location || ""}</p>
        <p class="card-price">${formatPrice(p.price)}</p>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderCarousel(list) {
  const container = document.getElementById("carousel");
  container.innerHTML = "";
  list.forEach(p => {
    const img = p.images.length ? p.images[0] : "https://via.placeholder.com/300x200?text=No+Image";
    const card = document.createElement("div");
    card.className = "carousel-card";
    card.innerHTML = `
      <img src="${img}" alt="${p.displayTitle}" />
      <div style="padding:10px"><b>${p.displayTitle}</b><br>${formatPrice(p.price)}</div>
    `;
    container.appendChild(card);
  });

  // autoplay
  setInterval(() => {
    container.scrollBy({left: 260, behavior: "smooth"});
    if (container.scrollLeft + container.clientWidth >= container.scrollWidth) {
      container.scrollLeft = 0;
    }
  }, 3000);
}

// Modal
function openModal(property) {
  const modal = document.getElementById("modal");
  modal.style.display = "block";

  const modalImage = document.getElementById("modalImage");
  const modalThumbnails = document.getElementById("modalThumbnails");
  const modalDetails = document.getElementById("modalDetails");

  let currentIndex = 0;
  function showImage(index) {
    modalImage.src = property.images[index];
    [...modalThumbnails.children].forEach((thumb, i) => {
      thumb.classList.toggle("active", i === index);
    });
  }

  modalThumbnails.innerHTML = "";
  property.images.forEach((img, i) => {
    const thumb = document.createElement("img");
    thumb.src = img;
    thumb.onclick = () => { currentIndex = i; showImage(i); };
    modalThumbnails.appendChild(thumb);
  });

  showImage(currentIndex);

  modalDetails.innerHTML = `
    <h2>${property.displayTitle}</h2>
    <p>${property.location || ""}</p>
    <p>${formatPrice(property.price)}</p>
    <p>Type: ${property.type || ""}</p>
  `;
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

function applyFilters() {
  let list = [...properties];
  const search = document.getElementById("searchInput").value.toLowerCase();
  const type = document.getElementById("typeFilter").value;
  const location = document.getElementById("locationFilter").value;
  const min = parseFloat(document.getElementById("minBudget").value || 0);
  const max = parseFloat(document.getElementById("maxBudget").value || Infinity);
  const sort = document.getElementById("sortFilter").value;

  list = list.filter(p =>
    (!search || p.displayTitle.toLowerCase().includes(search)) &&
    (!type || p.type === type) &&
    (!location || p.location === location) &&
    (p.price >= min && p.price <= max)
  );

  if (sort === "asc") list.sort((a,b) => a.price - b.price);
  if (sort === "desc") list.sort((a,b) => b.price - a.price);

  renderListings(list);
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("typeFilter").value = "";
  document.getElementById("locationFilter").value = "";
  document.getElementById("minBudget").value = "";
  document.getElementById("maxBudget").value = "";
  document.getElementById("sortFilter").value = "";
  renderListings(properties);
}

fetchData();

