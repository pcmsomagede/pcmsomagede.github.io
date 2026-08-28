(()=>{
'use strict';
async function loadV4(){
 const id='tafsirmu-live-v4';
 if(window.PCMTafsirV4&&window.PCMTafsirV4.mount)return;
 const old=document.getElementById(id);
 if(old)old.remove();
 await new Promise((ok,no)=>{
  const s=document.createElement('script');
  s.id=id;
  s.src='pustaka-tafsir-live-v4.js?v=20260828-02';
  s.onload=ok;
  s.onerror=no;
  document.head.appendChild(s);
 });
}
async function mount(){
 await loadV4();
 if(window.PCMTafsirV4&&window.PCMTafsirV4.mount)return window.PCMTafsirV4.mount();
}
window.PCMTafsirRescue={mount};
})();