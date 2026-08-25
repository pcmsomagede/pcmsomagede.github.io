(()=>{
'use strict';
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const panels=new Set(['beranda','berita','pustaka','kta','arsip','suara','kontak']);
let busyUntil=0;
function activatePanel(id){
  const target=qs('#'+id)||qs('#beranda');
  qsa('.panel').forEach(p=>p.classList.toggle('active',p===target));
  qsa('.nav-item').forEach(a=>a.removeAttribute('aria-current'));
  const main=qs(`.nav-item[href="#${target.id}"]`); if(main) main.setAttribute('aria-current','page');
  document.documentElement.style.setProperty('--pcm-active-panel',`"${target.id}"`);
}
function activateBeritaTab(name){
  activatePanel('berita');
  const b=qs(`#bmTabs [data-bm="${name}"]`);
  if(b){
    const prev=window.__PCM_INTERNAL_CLICK__;
    window.__PCM_INTERNAL_CLICK__=true;
    b.click();
    window.__PCM_INTERNAL_CLICK__=prev;
  }
}
function handleLink(link){
  const href=link.getAttribute('href')||'';
  if(!href.startsWith('#')) return false;
  const id=href.slice(1);
  const drop=link.closest('.nav-drop');
  const parentId=drop ? ((drop.querySelector('.nav-parent')?.getAttribute('href')||'').slice(1)) : '';
  if(drop && parentId==='berita' && ['profil','kajian','agenda','struktur'].includes(id)){
    activateBeritaTab(id); return true;
  }
  const dest=drop && panels.has(parentId) ? parentId : id;
  if(dest==='berita') activatePanel('berita');
  else if(panels.has(dest)) activatePanel(dest);
  else return false;
  return true;
}
function polish(){
  if(qs('#pcm-fast-ui')) return;
  const s=document.createElement('style'); s.id='pcm-fast-ui';
  s.textContent=`
    html{scroll-behavior:auto!important}
    body{--pcm-glow1:#6ef2ff;--pcm-glow2:#7c5cff;--pcm-glow3:#ffd447}
    .panel.active{display:block!important;animation:none!important;transition:none!important}
    .nav-item,.berita-tab,button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
    .nav-item{position:relative;overflow:hidden;transition:transform 60ms linear,filter 60ms linear!important}
    .nav-item::after,.berita-tab::after{content:"";position:absolute;inset:-35%;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,.28),transparent 38%);opacity:0;pointer-events:none}
    .nav-item:hover,.nav-item:focus-visible,.berita-tab:hover,.berita-tab:focus-visible{transform:translateY(-1px);filter:brightness(1.08)}
    .nav-item:active,.berita-tab:active{transform:translateY(1px) scale(.985);filter:brightness(.98)}
    .main-nav{background:linear-gradient(100deg,#071f50,#075aa4 42%,#0b8f87 72%,#6957d8)!important}
    .berita-shell{contain:layout paint}
    .berita-head{position:relative;overflow:hidden;background:linear-gradient(130deg,#071f50 0%,#075aa4 44%,#0b8f87 72%,#6957d8 100%)!important}
    .berita-head::before,.org-root::before{content:"";position:absolute;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(110,242,255,.32),transparent 65%);right:-40px;top:-70px;pointer-events:none}
    .berita-head::after,.org-root::after{content:"";position:absolute;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(255,212,71,.23),transparent 68%);left:-45px;bottom:-75px;pointer-events:none}
    .berita-tabs{contain:layout paint}
    .berita-tab{position:relative;overflow:hidden;box-shadow:0 8px 20px rgba(8,59,120,.10);transition:transform 60ms linear,filter 60ms linear,box-shadow 60ms linear!important}
    .berita-tab.active{background:linear-gradient(135deg,#075aa4,#0b8f87 60%,#6957d8)!important;box-shadow:0 10px 22px rgba(7,90,164,.22),0 0 0 1px rgba(255,255,255,.15) inset}
    .bm-card,.org-node,.org-unit{transition:transform 80ms linear,box-shadow 80ms linear!important}
    .bm-card:hover,.org-node:hover,.org-unit:hover{transform:translateY(-3px);box-shadow:0 18px 38px rgba(7,61,120,.14)}
    .bm-card{background:linear-gradient(180deg,#ffffff 0%,#f6fbff 72%,#eefcff 100%)!important}
    .leader-photo{background:linear-gradient(135deg,#f9fcff,#edfaff)!important}
    .bm-info-grid>div{background:linear-gradient(135deg,#f8fcff,#eefaff)!important}
    .org-root{position:relative;overflow:hidden}
    .org-node{background:linear-gradient(135deg,#fff,#f3fbff)!important}
    .org-unit{background:linear-gradient(135deg,#fff,#f4f9ff 66%,#effdff)!important}
    @media(max-width:560px){
      .nav-inner{gap:6px!important}
      .nav-item{padding:9px 10px!important;font-size:.88rem!important}
      .berita-head{margin-left:2px;margin-right:2px}
      .berita-tabs{overflow-x:auto;justify-content:flex-start!important;flex-wrap:nowrap!important;scrollbar-width:none;padding-left:3px!important;padding-right:3px!important}
      .berita-tabs::-webkit-scrollbar{display:none}
      .berita-tab{flex:0 0 auto}
      .bm-card,.org-node,.org-unit{box-shadow:0 9px 22px rgba(7,61,120,.08)}
    }
  `;
  document.head.appendChild(s);
}
function install(){
  polish();
  // Pointerdown: feedback begins on the physical click/touch, before the browser fires click.
  window.addEventListener('pointerdown',e=>{
    if(e.button!==undefined && e.button!==0 && e.pointerType==='mouse') return;
    const link=e.target.closest?.('a[href^="#"]');
    if(!link) return;
    if(handleLink(link)){
      e.preventDefault();
      e.stopImmediatePropagation();
      busyUntil=performance.now()+450;
    }
  },true);
  // Swallow the trailing native click after an instant pointerdown navigation.
  window.addEventListener('click',e=>{
    if(window.__PCM_INTERNAL_CLICK__) return;
    const link=e.target.closest?.('a[href^="#"]');
    if(link && performance.now()<busyUntil){e.preventDefault();e.stopImmediatePropagation();return;}
    if(link && handleLink(link)){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  // Berita tabs react on pointerdown too.
  window.addEventListener('pointerdown',e=>{
    const b=e.target.closest?.('#bmTabs [data-bm]');
    if(!b) return;
    e.preventDefault();e.stopImmediatePropagation();
    const prev=window.__PCM_INTERNAL_CLICK__;window.__PCM_INTERNAL_CLICK__=true;b.click();window.__PCM_INTERNAL_CLICK__=prev;
    busyUntil=performance.now()+450;
  },true);
  window.addEventListener('click',e=>{
    if(window.__PCM_INTERNAL_CLICK__) return;
    const b=e.target.closest?.('#bmTabs [data-bm]');
    if(b){e.preventDefault();e.stopImmediatePropagation();}
  },true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();