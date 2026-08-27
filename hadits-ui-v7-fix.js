(()=>{'use strict';
function patch(){const api=window.PCMHaditsV7;if(!api||api.__metaFix)return false;const open=api.openBook;api.openBook=function(key){const out=open(key);const r=document.querySelector('#h7reader');if(r&&!r.querySelector('#h7metaReader')){const m=document.createElement('div');m.id='h7metaReader';m.style.cssText='font-size:.72rem;color:#60788b;padding:0 16px 8px';const head=r.querySelector('.h7head');if(head)head.appendChild(m)}return out};api.__metaFix=true;return true}
if(!patch()){let n=0;const t=setInterval(()=>{if(patch()||++n>100)clearInterval(t)},20)}
})();
