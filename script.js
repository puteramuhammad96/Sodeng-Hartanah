
(function(){
  const SHEET_ID = window.SHEET_ID;
  const WHATSAPP_NUMBER = window.WHATSAPP_NUMBER;
  const grid = document.getElementById('grid');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

  function encode(text){ return encodeURIComponent(text); }

  function typeBadge(type){
    return `<span class="badge">${type || 'N/A'}</span>`;
  }

  function makeCard(item){
    const title = item.title || 'Untitled';
    const loc = item.location || '';
    const price = item.price || '';
    const type = item.type || 'Other';
    const image = item.image || '';
    const link = item.link || window.location.href;

    const waMsg = `Hi Putera, saya berminat dengan ${title}`;
    const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encode(waMsg)}`;

    const callHref = `tel:${WHATSAPP_NUMBER}`;

    const shareText = `Hi, tengok ni! Property menarik dari Sodeng Hartanah — ${title}: ${link}`;
    const shareWa = `https://wa.me/?text=${encode(shareText)}`;
    const shareFb = `https://www.facebook.com/sharer/sharer.php?u=${encode(link)}`;

    return `
      <article class="card">
        <img class="card-img" src="${image}" alt="${title}" onerror="this.src='https://picsum.photos/seed/placeholder/600/400'"/>
        <div class="card-body">
          <h3 class="card-title">${title}</h3>
          <div class="row">📍 ${loc}</div>
          <div class="row">${typeBadge(type)}</div>
          <div class="price">${price}</div>
        </div>
        <div class="card-actions">
          <div style="display:flex; gap:8px;">
            <a href="${waHref}" target="_blank" rel="noopener" class="icon-btn icon-wa" title="WhatsApp">
              <svg viewBox="0 0 32 32" width="18" height="18" aria-hidden="true"><path d="M19.11 17.17c-.28-.14-1.64-.81-1.9-.9-.26-.1-.45-.14-.64.14-.19.29-.74.9-.9 1.08-.17.19-.33.21-.61.07-.28-.14-1.17-.43-2.24-1.38-.83-.74-1.39-1.65-1.55-1.93-.16-.29-.02-.45.12-.59.12-.12.28-.31.42-.47.14-.16.19-.26.28-.45.09-.19.05-.36-.02-.5-.07-.14-.64-1.54-.88-2.12-.23-.55-.47-.48-.64-.49-.16-.01-.35-.01-.54-.01-.19 0-.5.07-.76.36-.26.29-1 1-1 2.42 0 1.41 1.03 2.77 1.18 2.96.14.19 2.03 3.11 4.92 4.36.69.3 1.23.48 1.65.61.69.22 1.31.19 1.8.12.55-.08 1.64-.67 1.87-1.31.23-.64.23-1.19.16-1.31-.07-.12-.26-.19-.54-.33zM16 3C8.83 3 3 8.83 3 16c0 2.3.62 4.46 1.7 6.32L3 29l6.85-1.79C11.62 28.37 13.74 29 16 29c7.17 0 13-5.83 13-13S23.17 3 16 3zM16 26.9c-2.24 0-4.32-.73-6.02-1.97l-.43-.31-4.06 1.06 1.09-3.96-.32-.45A10.91 10.91 0 0 1 5.1 16C5.1 10 10 5.1 16 5.1S26.9 10 26.9 16 22 26.9 16 26.9z" fill="currentColor"/></svg>
            </a>
            <a href="${callHref}" class="icon-btn icon-call" title="Call">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h2.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.2 2.2z" fill="currentColor"/></svg>
            </a>
          </div>
          <div style="display:flex; gap:8px;">
            <a href="${shareWa}" target="_blank" rel="noopener" class="icon-btn icon-share" title="Share via WhatsApp">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M18 16.08c-.76 0-1.48-.3-2.02-.84l-7.17-7.17a2.86 2.86 0 114.05-4.04l7.17 7.16A2.86 2.86 0 0118 16.08z" fill="currentColor"/></svg>
            </a>
            <a href="${shareFb}" target="_blank" rel="noopener" class="icon-btn icon-share" title="Share on Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M22 12a10 10 0 10-11.5 9.95v-7.04H7.9V12h2.6V9.8c0-2.57 1.53-3.99 3.87-3.99 1.12 0 2.29.2 2.29.2v2.52h-1.29c-1.27 0-1.66.79-1.66 1.6V12h2.83l-.45 2.91h-2.38v7.04A10 10 0 0022 12z" fill="currentColor"/></svg>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function render(data, filter='All'){
    grid.innerHTML = '';
    const list = (filter==='All') ? data : data.filter(x => (x.type||'').toLowerCase()===filter.toLowerCase());
    if(!list.length){
      grid.innerHTML = `<p class="muted">No properties found for filter: ${filter}</p>`;
      return;
    }
    grid.innerHTML = list.map(makeCard).join('');
  }

  function parseGViz(text){
    // Extract JSON from "google.visualization.Query.setResponse(...)"
    const start = text.indexOf('(') + 1;
    const end = text.lastIndexOf(')');
    const jsonText = text.slice(start, end);
    return JSON.parse(jsonText);
  }

  function normalize(table){
    const cols = table.table.cols.map(c=> (c.label||'').toLowerCase());
    const rows = table.table.rows || [];
    return rows.map(r => {
      const obj = {};
      r.c.forEach((cell,i)=>{
        const key = cols[i] || `col${i}`;
        obj[key] = cell ? cell.v : '';
      });
      return {
        image: obj.image || obj.img || '',
        title: obj.title || '',
        location: obj.location || '',
        price: obj.price || '',
        type: obj.type || '',
        link: obj.link || ''
      };
    });
  }

  async function load(){
    try{
      const res = await fetch(url);
      const text = await res.text();
      const data = normalize(parseGViz(text));
      window._LISTINGS = data;
      render(data);
      setupFilters(data);
    }catch(e){
      console.error(e);
      grid.innerHTML = `<p class="muted">Unable to load listings. Please ensure your Google Sheet is shared as "Anyone with the link - Viewer".</p>`;
    }
  }

  function setupFilters(data){
    const buttons = document.querySelectorAll('.chip');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        render(data, btn.dataset.filter);
      });
    });
  }

  // Smart hide for contact bar on scroll
  let lastY = window.scrollY;
  const bar = document.getElementById('contactBar');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY + 5) {
      bar.classList.add('hide');
    } else if (y < lastY - 5) {
      bar.classList.remove('hide');
    }
    lastY = y;
  }, { passive: true });

  load();
})();
