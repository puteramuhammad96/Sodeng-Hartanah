const listings = [
  {
    title: "DEMO PROPERTY",
    type: "Subsale",
    location: "Kuantan",
    price: 175000,
    images: ["assets/listings/DEMO PROPERTY/1.jpg"],
  }
];
function renderListings(data) {
  const container = document.getElementById('listings');
  container.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.innerHTML = `
      <img src="${item.images[0]}" alt="${item.title}" />
      <h3>${item.title}</h3>
      <p class="price">RM${item.price.toLocaleString()}</p>
      <p class="type">${item.type}</p>
      <a href="https://wa.me/601169429832?text=Hai%20boleh%20saya%20tahu%20tentang%20property%20${encodeURIComponent(item.title)}" target="_blank">WhatsApp</a>
    `;
    container.appendChild(card);
  });
}
function applyFilters(){ renderListings(listings); }
function resetFilters(){ renderListings(listings); }
document.addEventListener('DOMContentLoaded',()=>renderListings(listings));
