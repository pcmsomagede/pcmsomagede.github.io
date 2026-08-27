(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
function loadScript(src,id){if(document.getElementById(id))return;const s=document.createElement('script');s.id=id;s.src=src;s.defer=true;document.body.appendChild(s)}
function dedupePrayer(){const hero=$('.hero');const widgets=$$('.prayer');if(!hero)return;let keeper=widgets.find(w=>hero.contains(w))||widgets[0];if(!keeper)return;if(!hero.contains(keeper))hero.appendChild(keeper);widgets.forEach(w=>{if(w!==keeper)w.remove()});keeper.hidden=false;keeper.style.display='block';keeper.style.visibility='visible'}
function start(){loadScript('document-preview.js?v=20260827-03','pcm-document-preview-loader');loadScript('hadits-fix.js?v=20260827-01','pcm-hadits-fix-loader');dedupePrayer();const observer=new MutationObserver(()=>dedupePrayer());observer.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
