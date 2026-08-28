(()=>{
'use strict';
async function load(src,id){const old=document.getElementById(id);if(old&&window[id+'__loaded'])return;if(old)old.remove();await new Promise((ok,no)=>{const s=document.createElement('script');s.id=id;s.src=src;s.onload=()=>{window[id+'__loaded']=true;ok()};s.onerror=no;document.head.appendChild(s)})}
async function mount(){const p=document.querySelector('#tafsir');if(!p)return;await load('tafsirmu-static-v1.js?v=20260828-06','tafsirmu-static-loader');if(window.PCMTafsirStatic?.mount)return window.PCMTafsirStatic.mount()}
window.PCMTafsirRescue={mount};
})();
