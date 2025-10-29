const els = {
  search: document.getElementById("search"),
  type: document.getElementById("typeFilter"),
  location: document.getElementById("locationFilter"),
  pmin: document.getElementById("pmin"),
  pmax: document.getElementById("pmax"),
  reset: document.getElementById("resetBtn"),
  hotListings: document.getElementById("hotListings"),
  allListings: document.getElementById("allListings"),
};

let listings = [];

// Format RM
function formatRM(input) {
  let val = input.value.replace(/[^\d]/g, "");
  if (!val) {
    input.value = "";
    return;
  }
  const num = parseInt(val, 10);
  input.value = "RM " + num.toLocaleString("en-MY");
}

function parseRM(val) {
  return parseFloat(String(val).replace(/[^\d]/g, "")) || 0;
}

els.pmin.addEventListener("input", () => formatRM(els.pmin));
els.pmax.addEventListener("input", () => formatRM(els.pmax));

function render() {
  const q = els.search.value.toLowerCase();
  const t = els.type.value;
  const l = els.location.value;
  const minP = parseRM(els.pmin.value) || 0;
  const maxP = parseRM(els.pmax.value) || Infinity;

  const filtered = listings.filter(x =>
    (!q || x.title.toLowerCase().includes(q) || x.location.toLowerCase().includes(q)) &&
    (!t || x.type === t) &&
    (!l || x.location === l) &&
    x.price >= minP &&
    x.price <= maxP
  );

  els.hotListings.innerHTML = "";
  els.allListings.innerHTML = "";

  filtered.forEach(x => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="assets/listings/${x.folder}/thumb.jpg" alt="${x.title}">
      <div class="card-body">
        <div class="price">RM ${x.price.toLocaleString("en-MY")}</div>
        <div class="title">${x.title}</div>
        <div class="meta">${x.type} • ${x.location}</div>
      </div>
    `;
    if (x.hot === "yes") els.hotListings.appendChild(card);
    els.allListings.appendChild(card);
  });
}

els.reset.addEventListener("click", () => {
  els.search.value = "";
  els.type.value = "";
  els.location.value = "";
  els.pmin.value = "";
  els.pmax.value = "";
  render();
});

fetch("https://docs.google.com/spreadsheets/d/e/2PACX-1vQNxseyugYylsAgoCbCRQruAKzk6fxLIyg_dhF9JvhbVgVX2ryQqHwIz4a2OUT8asciB1iSI7dQg1Uo/pub?gid=0&single=true&output=csv")
  .then(res => res.text())
  .then(text => {
    const rows = text.split("\n").map(r => r.split(","));
    const header = rows.shift();
    listings = rows.map(r => {
      return {
        title: r[0],
        price: parseFloat(r[1]) || 0,
        type: r[2],
        location: r[3],
        specs: r[4],
        hot: r[5],
        folder: r[6] || ""
      };
    });
    render();
  });
