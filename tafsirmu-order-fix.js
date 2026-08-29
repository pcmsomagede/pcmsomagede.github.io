(()=>{'use strict';
const root=()=>document.getElementById('tfml-grid');
function reorder(){const g=root();if(!g)return;const cards=[...g.children];cards.sort((a,b)=>{const bad=x=>/PDF kitab asli belum tersedia|Menyiapkan PDF kitab asli|belum tersedia/i.test(x.textContent||'');return Number(bad(a))-Number(bad(b))});cards.forEach(c=>g.appendChild(c))}
const mo=new MutationObserver(()=>reorder());
function start(){const g=root();if(g)mo.observe(g,{childList:true});reorder()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
window.addEventListener('hashchange',()=>setTimeout(start,50));
})();