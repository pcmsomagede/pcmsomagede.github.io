(()=>{'use strict';
const load=()=>{if(window.PCMTafsirLive?.mount){window.PCMTafsirLive.mount();return}if(document.getElementById('tfm-live-loader'))return;const s=document.createElement('script');s.id='tfm-live-loader';s.src='/tafsirmu-live.js?v=20260829-01';s.onload=()=>window.PCMTafsirLive?.mount?.();document.head.appendChild(s)};
window.PCMTafsirAuthoritative={mount:load};
document.addEventListener('click',e=>{const a=e.target.closest?.('a[href="#tafsir"],a[data-pcm-route="tafsir"]');if(!a)return;setTimeout(load,0)},true);
if(location.hash.replace('#','').toLowerCase()==='tafsir')document.addEventListener('DOMContentLoaded',load);
})();