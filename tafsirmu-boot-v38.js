(()=>{'use strict';
const mount=()=>{const p=document.getElementById('pustaka');if(!p)return;document.querySelectorAll('.panel').forEach(x=>x.classList.toggle('active',x===p));p.classList.add('active');if(window.PCMTafsirLive?.mount){window.PCMTafsirLive.mount();return}const s=document.createElement('script');s.src='/tafsirmu-live.js?v=20260830-01';s.onload=()=>window.PCMTafsirLive?.mount?.();document.head.appendChild(s)};
const route=e=>{const a=e.target.closest?.('a[href="#tafsir"],a[data-pcm-route="tafsir"]');if(!a)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();history.replaceState(null,'','#tafsir');mount()};
document.addEventListener('click',route,true);
window.addEventListener('hashchange',()=>{if(location.hash.replace('#','').toLowerCase()==='tafsir')mount()});
if(location.hash.replace('#','').toLowerCase()==='tafsir')setTimeout(mount,0);
window.PCMTafsirBoot={mount};
})();
