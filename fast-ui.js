(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const PANELS=new Set(['beranda','berita','pustaka','quran','kta','arsip','suara','kontak','struktur']);
const V='20260828-09';
function load(src,id,onReady){
  const old=document.getElementById(id);
  if(old){ if(onReady) setTimeout(onReady,0); return old; }
  const s=document.createElement('script'); s.src=src; s.id=id; s.defer=true;
  s.onload=()=>{window.dispatchEvent(new CustomEvent('pcm:script-ready',{detail:{id}}));onReady&&onReady()};
  s.onerror=()=>{window.dispatchEvent(new CustomEvent('pcm:script-error',{detail:{id}}));};
  document.body.appendChild(s); return s;
}
function ensurePanel(id){let p=$('#'+id);if(!p){p=document.createElement('section');p.id=id;p.className='panel';$('main')?.appendChild(p)}return p}
function core(){load('quran-modern.js?v='+V,'quran-modern-loader');load('hadits-ui.js?v='+V,'hadits-modern-loader');load('site-v6.js?v='+V,'site-v6-loader');load('document-viewer-v7.js?v='+V,'document-viewer-loader')}
function pustaka(){load('pustaka-final-v4.js?v=20260828-44','pustaka-final-loader');load('document-viewer-v7.js?v=20260828-02','document-viewer-loader')}
function tafsir(){
  ensurePanel('pustaka');
  const run=()=>{if(window.PCMTafsirFinal?.mount){active('pustaka');window.PCMTafsirFinal.mount();return true}return false};
  load('pustaka-tafsir-live-v3.js?v=20260828-04','pustaka-tafsir-live-loader',run);
  if(!run()) window.addEventListener('pcm:script-ready',e=>{if(e.detail?.id==='pustaka-tafsir-live-loader')run()},{once:true});
}
function archives(){load('arsip-ui.js?v='+V,'arsip-v28-loader')}
function active(id){const p=ensurePanel(id);$$('.panel').forEach(x=>x.classList.toggle('active',x===p));window.scrollTo(0,0);return p}
function tickerLock(){const t=$('.ticker-track');if(!t||t.__pcmTickerLock)return;t.__pcmTickerLock=true;const st=document.createElement('style');st.id='pcm-ticker-final';st.textContent=`.ticker{height:35px!important;overflow:hidden!important;position:relative!important;white-space:nowrap!important}.ticker-track{display:flex!important;width:max-content!important;min-width:max-content!important;height:35px!important;will-change:transform!important;animation:pcmTickerFinal 28s linear infinite!important}.ticker-track>*{flex:0 0 auto!important}@keyframes pcmTickerFinal{from{transform:translate3d(0,0,0)}to{transform:translate3d(-50%,0,0)}}`;document.head.appendChild(st)}
function ensureHadits(){return ensurePanel('hadits')}
function mountPustaka(route){if(route==='tafsir'){tafsir();return}pustaka();const f=()=>{if(window.PCMPustakaFinal4?.mount){active('pustaka');window.PCMPustakaFinal4.mount(route);return true}return false};if(!f())window.addEventListener('pcm:script-ready',e=>{if(e.detail?.id==='pustaka-final-loader')f()},{once:true})}
function mountHadits(){core();const f=()=>{if(window.PCMHadits?.mount){ensureHadits();active('hadits');window.PCMHadits.mount();return true}return false};if(!f())window.addEventListener('pcm:script-ready',e=>{if(e.detail?.id==='hadits-modern-loader')f()},{once:true})}
function mountQuran(){active('quran');core();const f=()=>window.PCMQuran?.mount?.()||false;if(!f())window.addEventListener('pcm:script-ready',e=>{if(e.detail?.id==='quran-modern-loader')f()},{once:true})}
function menus(){const cfg=[['berita',[['Profil Pimpinan','profil'],['Kajian Rutin','kajian'],['Agenda Persyarikatan','agenda'],['Susunan Lengkap PCM Somagede','struktur']]],['pustaka',[['KhutbahMu','khutbah'],['KultumMu','kultum'],['BukuMu','buku'],['HaditsMu','hadits'],['Al-Qur’anMu','quran'],['TafsirMu','tafsir']]],['arsip',[['Pedoman Surat','pedoman'],['Surat Masuk','masuk'],['Surat Keluar','keluar'],['Lampiran Surat Keluar','lampiran-keluar'],['Dokumen Lainnya','dokumen-lainnya'],['Data Wakaf','wakaf']]]];for(const [parent,links] of cfg){const sub=$(`.nav-parent[href="#${parent}"]`)?.parentElement?.querySelector('.submenu');if(sub)sub.innerHTML=links.map(([t,id])=>`<a href="#${id}" data-pcm-route="${id}">${t}</a>`).join('')}}
function route(a){const id=(a.getAttribute('data-pcm-route')||(a.getAttribute('href')||'').slice(1));if(!id)return false;if(id==='pustaka'){a.closest('.nav-drop')?.classList.toggle('v6-open');return true}if(id==='hadits'){mountHadits();return true}if(id==='quran'){mountQuran();return true}if(['khutbah','kultum','buku','tafsir'].includes(id)){mountPustaka(id);return true}if(['pedoman','masuk','keluar','lampiran-keluar','dokumen-lainnya','wakaf'].includes(id)){active('arsip');core();archives();return true}if(PANELS.has(id)){active(id);if(id==='arsip'){core();archives()}return true}return false}
function bindTafsirMenu(){const links=$$('a[data-pcm-route="tafsir"]');links.forEach(a=>{if(a.__pcmTafsirBound)return;a.__pcmTafsirBound=true;a.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();mountPustaka('tafsir')},{capture:true});});}
function style(){if($('#pcm-fast-ui-v78'))return;const s=document.createElement('style');s.id='pcm-fast-ui-v78';s.textContent=`html{scroll-behavior:auto!important}body{overscroll-behavior-x:none}.panel.active{display:block!important;animation:none!important;transition:none!important}.main-nav{position:relative;z-index:5000}.nav-drop .submenu{z-index:5100!important}@media(max-width:700px){.main-nav{position:sticky!important;top:0}.nav-inner{display:flex!important;gap:7px!important;padding:8px!important;overflow-x:auto!important}.nav-drop{flex:0 0 auto}.nav-drop .submenu{position:fixed!important;left:10px!important;right:10px!important;top:58px!important;max-height:calc(100dvh - 70px)!important;overflow:auto!important;z-index:5100!important}}`;document.head.appendChild(s)}
function install(){style();menus();bindTafsirMenu();core();pustaka();archives();tickerLock();window.addEventListener('click',e=>{const a=e.target.closest?.('a[href^="#"],a[data-pcm-route]');if(!a)return;if(route(a)){e.preventDefault();e.stopImmediatePropagation()}},{capture:true});window.addEventListener('pcm:script-ready',()=>{menus();bindTafsirMenu()});window.addEventListener('hashchange',()=>{const a=$(`a[href="${location.hash}"]`);if(a)route(a)});if(location.hash){const a=$(`a[href="${location.hash}"]`);if(a)route(a)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install()})();