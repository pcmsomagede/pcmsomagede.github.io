(()=>{'use strict';
function mount(){
 const p=document.querySelector('#tafsir');
 if(window.PCMTafsirStatic?.mount&&p)return window.PCMTafsirStatic.mount();
 const id='tafsirmu-static-loader';
 let s=document.getElementById(id);
 const run=()=>window.PCMTafsirStatic?.mount?.();
 if(!s){s=document.createElement('script');s.id=id;s.src='tafsirmu-static-v1.js?v=20260828-01';s.onload=run;document.head.appendChild(s)}else if(window.PCMTafsirStatic)run();
}
window.PCMTafsirRescue={mount};
})();