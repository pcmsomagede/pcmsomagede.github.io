(()=>{
'use strict';
async function load(src,id){
 const old=document.getElementById(id); if(old && window[id+'__loaded']) return;
 if(old) old.remove();
 await new Promise((ok,no)=>{const s=document.createElement('script');s.id=id;s.src=src;s.onload=()=>{window[id+'__loaded']=true;ok()};s.onerror=no;document.head.appendChild(s)});
}
async function mount(){
 const p=document.querySelector('#tafsir'); if(!p)return;
 await load('tafsirmu-rescue-v2.js?v=20260828-01','tafsirmu-rescue-v2-loader');
 if(window.PCMTafsirRescueV2?.mount) return window.PCMTafsirRescueV2.mount();
}
window.PCMTafsirRescue={mount};
})();
