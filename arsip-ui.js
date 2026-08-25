(()=>{
'use strict';

const YEARS=Array.from({length:13},(_,i)=>2004+i);
const state={year:2026};
const records={};
for(const y of YEARS) records[y]=[];

function esc(v){return String(v).replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));}
function qs(s,r=document){return r.querySelector(s)}
function isArsipHash(){const h=(location.hash||'').slice(1);return ['arsip','masuk','keluar','pedoman','wakaf'].includes(h)}

const yearButtons=()=>YEARS.map(y=>`<button type="button" class="am-year${y===2016?' active':''}" data-am-year="${y}">${y}</button>`).join('');

function cardForYear(y){
 const list=records[y]||[];
 if(!list.length){
  return `<article class="am-year-card">
    <div class="am-year-top"><div><div class="am-eyebrow">ARSIP SURAT MASUK</div><h3>Agenda Surat Masuk ${y}</h3></div><span class="am-count">Belum terisi</span></div>
    <div class="am-empty"><div class="am-empty-icon">✉</div><strong>Belum ada dokumen untuk tahun ${y}</strong><p>Arsip resmi dapat ditambahkan oleh admin beserta pratinjau dan berkas PDF/DOCX.</p></div>
    <div class="am-actions"><button type="button" class="am-btn primary" data-am-preview="${y}">Pratinjau</button><button type="button" class="am-btn ghost" disabled>Download PDF</button><button type="button" class="am-btn ghost" disabled>Download DOCX</button></div>
  </article>`;
 }
 return `<article class="am-year-card"><div class="am-year-top"><div><div class="am-eyebrow">ARSIP SURAT MASUK</div><h3>Agenda Surat Masuk ${y}</h3></div><span class="am-count">${list.length} dokumen</span></div><div class="am-record-list">${list.map((r,i)=>`<div class="am-record"><div><strong>${esc(r.title||`Surat Masuk ${i+1}`)}</strong><small>${esc(r.date||'')}</small></div><div class="am-record-actions"><button type="button" class="am-btn mini primary" data-am-doc="${y}:${i}">Pratinjau</button>${r.pdf?`<a class="am-btn mini ghost" href="${esc(r.pdf)}" download>PDF</a>`:''}${r.docx?`<a class="am-btn mini ghost" href="${esc(r.docx)}" download>DOCX</a>`:''}</div></div>`).join('')}</div></article>`;
}

function render(){
 const sec=qs('#arsip'); if(!sec)return;
 sec.innerHTML=`<div class="arsip-mu-shell">
  <div class="arsip-hero"><div class="arsip-badge">ARSIPMU</div><h2>Arsip Administrasi PCM Somagede</h2><p>Arsip tertata menurut tahun, mudah ditelusuri, cepat dipratinjau, dan siap dihubungkan ke penyimpanan dokumen resmi.</p></div>
  <div class="arsip-nav"><button type="button" class="arsip-tab active" data-am-tab="masuk">Surat Masuk</button><button type="button" class="arsip-tab" data-am-tab="keluar">Surat Keluar</button><button type="button" class="arsip-tab" data-am-tab="pedoman">Pedoman Surat Menyurat</button><button type="button" class="arsip-tab" data-am-tab="wakaf">Data Wakaf</button></div>
  <section class="am-panel active" data-am-panel="masuk"><div class="am-year-strip">${yearButtons()}</div><div id="amYearContent"></div></section>
  <section class="am-panel" data-am-panel="keluar"><div class="am-placeholder"><h3>Surat Keluar</h3><p>Ruang arsip surat keluar PCM Somagede dengan pola penyimpanan dan pratinjau yang sama.</p></div></section>
  <section class="am-panel" data-am-panel="pedoman"><div class="am-placeholder"><h3>Pedoman Baku Surat Menyurat Muhammadiyah</h3><p>Tempat penyimpanan pedoman baku, kode indeks, contoh surat, dan dokumen turunannya.</p></div></section>
  <section class="am-panel" data-am-panel="wakaf"><div class="am-placeholder"><h3>Data Wakaf</h3><p>Ruang arsip data wakaf, sertifikat, dan dokumen pendukung yang tersimpan secara resmi.</p></div></section>
 </div>`;
 bind(); selectYear(2016);
}

function selectYear(y){
 state.year=y;
 document.querySelectorAll('.am-year').forEach(b=>b.classList.toggle('active',Number(b.dataset.amYear)===y));
 const c=qs('#amYearContent');if(c)c.innerHTML=cardForYear(y);
}
function bind(){
 document.querySelectorAll('[data-am-year]').forEach(b=>b.addEventListener('click',()=>selectYear(Number(b.dataset.amYear)),{passive:true}));
 document.querySelectorAll('[data-am-tab]').forEach(b=>b.addEventListener('click',()=>{
  const name=b.dataset.amTab;
  document.querySelectorAll('.arsip-tab').forEach(x=>x.classList.toggle('active',x===b));
  document.querySelectorAll('.am-panel').forEach(x=>x.classList.toggle('active',x.dataset.amPanel===name));
 }));
 document.addEventListener('click',onPreview,true);
}
function onPreview(e){
 const btn=e.target.closest('[data-am-preview],[data-am-doc]');if(!btn)return;
 e.preventDefault();e.stopImmediatePropagation();
 const key=btn.dataset.amDoc; const y=btn.dataset.amPreview||key?.split(':')[0];
 const title=y?`Agenda Surat Masuk ${y}`:'Dokumen Arsip';
 showModal(`<div class="am-modal-head"><div class="am-eyebrow">PRATINJAU ARSIP</div><h3>${esc(title)}</h3><button type="button" class="am-close" data-am-close>×</button></div><div class="am-preview-box"><div class="am-preview-page"><div class="am-page-mark">PCM SOMAGEDE</div><h4>${esc(title)}</h4><p>Pratinjau dokumen resmi akan tampil di area ini setelah berkas arsip PDF/DOCX ditambahkan.</p><div class="am-sim-line"></div><div class="am-sim-line short"></div></div></div><div class="am-modal-foot"><span>Dokumen belum tersedia di arsip digital.</span><button type="button" class="am-btn ghost" data-am-close>Tutup</button></div>`);
}
function showModal(inner){
 let m=qs('#amModal');if(!m){m=document.createElement('div');m.id='amModal';m.className='am-modal';document.body.appendChild(m)}
 m.innerHTML=`<div class="am-modal-backdrop" data-am-close></div><div class="am-modal-dialog" role="dialog" aria-modal="true">${inner}</div>`;m.hidden=false;
 m.querySelectorAll('[data-am-close]').forEach(x=>x.addEventListener('click',()=>m.hidden=true));
}

function styles(){
 if(qs('#arsip-mu-style'))return;
 const s=document.createElement('style');s.id='arsip-mu-style';s.textContent=`
 .arsip-mu-shell{max-width:1180px;margin:0 auto;padding:22px 0 46px}.arsip-hero{padding:26px 24px;border-radius:24px;background:linear-gradient(135deg,#071f49,#075aa4 55%,#0b8b89);color:#fff;box-shadow:0 20px 44px rgba(6,38,83,.16)}.arsip-badge{display:inline-block;padding:6px 10px;border:1px solid rgba(255,255,255,.25);border-radius:999px;color:#ffe45d;font-weight:900;font-size:.72rem;letter-spacing:.12em}.arsip-hero h2{margin:9px 0 5px;font-size:clamp(1.8rem,4vw,2.6rem)}.arsip-hero p{margin:0;color:#e8f7ff;max-width:820px;line-height:1.65}.arsip-nav{display:flex;gap:9px;flex-wrap:wrap;justify-content:center;margin:18px 0}.arsip-tab{border:1px solid #d8e5ef;background:#fff;color:#173e66;padding:11px 15px;border-radius:999px;font:inherit;font-weight:900;cursor:pointer}.arsip-tab.active{border-color:transparent;background:linear-gradient(135deg,#075aa4,#0b8b89);color:#fff;box-shadow:0 9px 22px rgba(7,90,164,.18)}.am-panel{display:none}.am-panel.active{display:block}.am-year-strip{display:flex;gap:7px;overflow:auto;padding:8px 2px 14px;scrollbar-width:thin}.am-year{flex:0 0 auto;border:1px solid #d8e5ef;background:#fff;color:#244a6a;padding:9px 12px;border-radius:12px;font-weight:900;cursor:pointer}.am-year.active{background:#092b55;color:#fff;border-color:#092b55}.am-year-card,.am-placeholder{background:linear-gradient(180deg,#fff,#f7fbff);border:1px solid #dce6ef;border-radius:22px;box-shadow:0 12px 32px rgba(14,55,93,.07);padding:20px}.am-year-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.am-eyebrow{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:#0a7091;font-weight:900}.am-year-top h3{margin:5px 0 0;color:#092b55;font-size:1.45rem}.am-count{padding:7px 10px;border-radius:999px;background:#eef6fb;color:#075aa4;font-size:.76rem;font-weight:900}.am-empty{margin:18px 0;padding:26px;border-radius:18px;border:1px dashed #cbdde9;background:#fbfdff;text-align:center;color:#62798d}.am-empty-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;margin:0 auto 10px;background:#eaf6fb;color:#075aa4;font-size:1.35rem}.am-empty strong{display:block;color:#163f62}.am-empty p{margin:7px auto 0;max-width:650px}.am-actions,.am-record-actions{display:flex;gap:8px;flex-wrap:wrap}.am-btn{border:0;border-radius:11px;padding:10px 13px;font:inherit;font-weight:900;cursor:pointer}.am-btn.primary{background:linear-gradient(135deg,#075aa4,#0b8b89);color:#fff}.am-btn.ghost{background:#fff;border:1px solid #cfdfeb;color:#163f62;text-decoration:none}.am-btn:disabled{opacity:.45;cursor:not-allowed}.am-btn.mini{padding:8px 10px;font-size:.82rem}.am-record-list{display:grid;gap:8px;margin-top:17px}.am-record{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:13px;border-radius:13px;background:#f7fbff;border:1px solid #e0ebf2}.am-record strong{display:block;color:#163f62}.am-record small{color:#6f8192}.am-placeholder{min-height:180px;text-align:center;display:grid;place-items:center}.am-placeholder h3{margin:0;color:#092b55}.am-placeholder p{max-width:680px;color:#61788d}.am-modal[hidden]{display:none}.am-modal{position:fixed;inset:0;z-index:9999}.am-modal-backdrop{position:absolute;inset:0;background:rgba(4,18,36,.55);backdrop-filter:blur(5px)}.am-modal-dialog{position:relative;max-width:780px;margin:5vh auto;background:#fff;border-radius:24px;box-shadow:0 30px 90px rgba(0,0,0,.3);overflow:hidden}.am-modal-head{display:flex;align-items:flex-start;gap:10px;padding:20px 22px;border-bottom:1px solid #e6eef3}.am-modal-head h3{margin:4px 0 0;color:#092b55;flex:1}.am-close{border:0;background:#eef5f9;width:36px;height:36px;border-radius:50%;font-size:1.3rem;cursor:pointer}.am-preview-box{background:#e9eef3;padding:24px;min-height:450px;display:grid;place-items:center}.am-preview-page{width:min(100%,560px);min-height:390px;background:#fff;padding:42px;box-shadow:0 12px 28px rgba(9,43,85,.12);text-align:left}.am-page-mark{font-size:.7rem;letter-spacing:.1em;font-weight:900;color:#075aa4}.am-preview-page h4{font-size:1.35rem;color:#102e4f;margin-top:30px}.am-preview-page p{color:#657a8e;line-height:1.65}.am-sim-line{height:9px;background:#edf3f7;border-radius:99px;margin:28px 0 0}.am-sim-line.short{width:70%;margin-top:10px}.am-modal-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 22px;color:#6a8093;font-size:.84rem}@media(max-width:640px){.arsip-mu-shell{padding:14px 0 32px}.arsip-hero{border-radius:18px;padding:20px 16px}.am-year-card,.am-placeholder{padding:15px}.am-year-top{flex-direction:column}.am-count{align-self:flex-start}.am-record{flex-direction:column;align-items:flex-start}.am-modal-dialog{margin:0;height:100%;border-radius:0}.am-preview-box{min-height:0;flex:1;padding:12px}.am-modal-dialog{display:flex;flex-direction:column}.am-modal-foot{padding:12px 16px}.am-preview-page{min-height:0;padding:25px}}
 `;document.head.appendChild(s);
}
function boot(){styles(); if(location.hash==='#arsip'||isArsipHash()||document.querySelector('.main-nav .nav-parent[href="#arsip"]')){render();} }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('hashchange',()=>{if(isArsipHash())render()},{passive:true});
})();
