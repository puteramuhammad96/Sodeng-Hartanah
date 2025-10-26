
document.getElementById('year').textContent = new Date().getFullYear();

// Example: simulate fetching property data from sheet
const properties = [
  {title: "(550K) TERES 2 TINGKAT (ASH)", displayTitle: "Teres 2 Tingkat Renovated", price: 550000},
  {title: "(370K) SEMI D BUKIT ISTANA", displayTitle: "Semi D Bukit Istana", price: 370000}
];

const list = document.getElementById('property-list');

properties.forEach(p => {
  const div = document.createElement('div');
  div.className = "property";
  div.innerHTML = `<h2>${p.displayTitle || p.title || "Untitled"}</h2><p>Price: RM${p.price.toLocaleString()}</p>`;
  list.appendChild(div);
});
