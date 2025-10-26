
(function(){
  const SHEET_ID = window.SHEET_ID;
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
  const grid = document.getElementById('grid');
  document.getElementById('year').textContent = new Date().getFullYear();

  function fixImageUrl(u){
    if(!u) return "";
    u = u.trim();
    if(u.includes("drive.google.com")){
      const m = u.match(/[-\w]{25,}/);
      if(m) return `https://drive.google.com/uc?export=view&id=${m[0]}`;
    }
    return u;
  }
  const priceNum = v => Number(String(v||"").replace(/[^0-9.]/g,""))||0;
  const priceFmt = v => {const n=priceNum(v);return n? "RM"+n.toLocaleString("en-MY",{minimumFractionDigits:2}):"";};
  const parseGViz = txt=>JSON.parse(txt.slice(txt.indexOf("(")+1, txt.lastIndexOf(")")));
  const normalize = obj=>{
    const cols=obj.table.cols.map(c=>(c.label||"").toLowerCase().trim());
    return (obj.table.rows||[]).map(r=>{
      const o={};(r.c||[]).forEach((cell,i)=> o[cols[i]||`col${i}`]=cell?cell.v:"");return o;
    });
  };

  function makeCard(item,i){
    const title=item.displaytitle||item['display_title']||item.title||'Untitled';
    const img=(String(item.image||item.images||'').split(',')[0]||'').trim();
    const imgUrl=fixImageUrl(img);
    return `<article class="card">
      ${imgUrl? `<img src="${imgUrl}" style="width:100%;height:160px;object-fit:cover;border-radius:6px"/>`:''}
      <h3>${title}</h3>
      <div>${item.location||''}</div>
      <div>${item.type||''}</div>
      <div>${priceFmt(item.price)}</div>
    </article>`;
  }

  function render(list){grid.innerHTML=list.map(makeCard).join("");}

  async function load(){
    try{
      const res=await fetch(url);
      const text=await res.text();
      const data=normalize(parseGViz(text));
      render(data);
    }catch(e){grid.innerHTML="<p>Error loading data</p>";}
  }
  load();
})();