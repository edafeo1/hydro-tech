const page = document.querySelector('#page');
const width = document.querySelector('#width');
const frame = document.querySelector('#preview');
const result = document.querySelector('#result');
const pages = await fetch('./pages.json').then(r=>r.json());
for(const item of pages){const option=document.createElement('option');option.value=item.url;option.textContent=item.title;page.append(option);}
function measure(){
  const doc=frame.contentDocument;
  if(!doc?.querySelector('h1')||doc.location.pathname!==page.value)return;
  const viewport=frame.contentWindow.innerWidth;
  const overflow=[...doc.querySelectorAll('body *')].filter(el=>{
    const box=el.getBoundingClientRect();
    return box.width>0 && box.right>viewport+1 && !el.closest('.rail,.lightbox,.sr-only,.enquiry-trap');
  }).slice(0,8).map(el=>({tag:el.tagName,class:el.className,right:Math.round(el.getBoundingClientRect().right)}));
  result.textContent=JSON.stringify({page:doc.location.pathname,viewport,documentWidth:doc.documentElement.scrollWidth,horizontalOverflow:doc.documentElement.scrollWidth>viewport,heading:doc.querySelector('h1').innerText,overflow},null,2);
}
function load(){frame.width=Number(width.value);frame.src=page.value;result.textContent='Loading…';}
page.addEventListener('change',load);width.addEventListener('change',load);frame.addEventListener('load',measure);document.querySelector('#measure').addEventListener('click',measure);load();
