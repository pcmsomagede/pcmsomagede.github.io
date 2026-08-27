(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
function loadPreview(){if(document.getElementById('pcm-document-preview-loader'))return;const s=document.createElement('script');s.id='pcm-document-preview-loader';s.src='document-preview.js?v=20260827-02';s.defer=true;document.body.appendChild(s)}
function dedupePrayer(){const hero=$('.hero');const widgets=$$('.prayer');if(!hero)return;let keeper=widgets.find(w=>hero.contains(w))||widgets[0];if(!keeper)return;if(!hero.contains(keeper))hero.appendChild(keeper);widgets.forEach(w=>{if(w!==keeper)w.remove()});keeper.hidden=false;keeper.style.display='block';keeper.style.visibility='visible'}
function start(){loadPreview();dedupePrayer();const observer=new MutationObserver(()=>dedupePrayer());observer.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
