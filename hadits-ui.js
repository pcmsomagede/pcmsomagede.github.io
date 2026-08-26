(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
let mounted=false,active='bukhari',page=1,perPage=30,total=0,cache=new Map(),loading=false;
const API='https://api.hadith.gading.dev/books/';
const books=[
 ['bukhari','Shahih Bukhari'],['muslim','Shahih Muslim'],['tirmidzi','Sunan Tirmidzi'],
 ['abudawud','Sunan Abu Dawud'],['nasai','Sunan an-Nasa’i'],['ibnumajah','Sunan Ibnu Majah'],
 ['ahmad','Musnad Ahmad'],['malik','Al-Muwatta'],['darimi','Sunan ad-Darimi']
];
const totals={bukhari:7563,muslim:7453,tirmidzi:3956,abudawud:5274,nasai:5758,ibnumajah:4341,ahmad:26363,malik:1594,darimi:3367};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function styles(){
 if($('#hadits-v14-style'))return;
 const s=document.createElement('style');s.id='hadits-v14-style';s.textContent=`
 #hadits .hd-wrap{max-width:1220px;margin:auto;padding:18px 0 60px;position:relative}
 #hadits .hd-wrap:before{content:'';position:absolute;inset:0;background:url('motif-sudut-somagede.svg') left top/180px auto no-repeat,url('motif-sudut-somagede.svg') right bottom/210px auto no-repeat;opacity:.045;pointer-events:none}
 #hadits .hd-wrap>*{position:relative;z-index:1}.hd-hero{padding:34px 28px;border-radius:28px;color:#fff;background:linear-gradient(135deg,#062653,#075aa4 55%,#0b8f87);box-shadow:0 20px 55px #06265320}
 .hd-kicker{color:#ffd84a;font-weight:1000;font-size:.72rem;letter-spacing:.15em}.hd-hero h1{margin:5px 0;color:#fff;font-size:clamp(2rem,5vw,3.6rem)}
 .hd-hero p{max-width:820px;color:#e9f8ff}.hd-tools{display:flex;gap:9px;flex-wrap:wrap;margin:17px 0}
 .hd-search{flex:1 1 280px;padding:13px 15px;border:1px solid #cbdde8;border-radius:14px;font:inherit}.hd-bookgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
 .hd-book{border:1px solid #d8e6ee;background:#fff;border-radius:15px;padding:15px;text-align:left;cursor:pointer;box-shadow:0 7px 20px #0626530b}
 .hd-book.active{border-color:#0b8f87;box-shadow:0 10px 25px #0b8f8722;background:#f1fbfa}.hd-book strong{display:block;color:#082d58}.hd-book small{display:block;color:#6c8293;margin-top:4px}
 .hd-book-actions{display:flex;gap:7px;margin-top:11px}.hd-btn{border:1px solid #cbdde8;background:#fff;color:#174563;border-radius:10px;padding:8px 10px;font:inherit;font-weight:900;cursor:pointer}
 .hd-btn.primary{background:#075aa4;color:#fff;border-color:#075aa4}.hd-btn:disabled{opacity:.55;cursor:wait}
 .hd-reader{margin-top:16px;border:1px solid #d8e6ee;border-radius:22px;background:rgba(255,255,255,.92);overflow:hidden;box-shadow:0 15px 38px #06265310}
 .hd-reader-head{padding:20px 22px;background:linear-gradient(135deg,#f0fbff,#fff9ea);border-bottom:1px solid #dfeaf0}
 .hd-reader-head h2{margin:0;color:#082d58}.hd-reader-head p{margin:5px 0;color:#60788b}.hd-list{padding:8px 22px 28px}
 .hd-item{padding:20px 0;border-bottom:1px solid #e2ebf0}.hd-item:last-child{border-bottom:0}.hd-num{font-size:.74rem;color:#0b8f87;font-weight:1000}
 .hd-item h3{margin:4px 0;color:#082d58}.hd-arab{direction:rtl;text-align:right;font-family:serif;font-size:1.35rem;line-height:2.05;color:#172f46;margin:10px 0}
 .hd-item p{margin:7px 0;color:#294d68;line-height:1.85}.hd-empty{padding:30px;text-align:center;color:#60788b}.hd-status{color:#60788b;font-size:.85rem;margin:6px 0}
 .hd-pager{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:14px 22px;border-top:1px solid #e2ebf0;background:#fbfdfe}
 .hd-pager span{color:#60788b;font-size:.85rem;text-align:center}.hd-download{margin-left:auto}
 @media(max-width:850px){.hd-bookgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:560px){.hd-hero{padding:26px 18px}.hd-bookgrid{grid-template-columns:1fr}.hd-list{padding-left:16px;padding-right:16px}.hd-pager{padding-left:16px;padding-right:16px}.hd-item{padding:17px 0}.hd-arab{font-size:1.2rem}}
 `;document.head.appendChild(s)
}
function bookName(id){return books.find(x=>x[0]===id)?.[1]||id}
function normalizeHadith(x){return {number:x.number||'',arab:x.arab||'',id:x.id||x.text||'',perawi:x.perawi||x.grades?.[0]?.name||''}}
async function fetchRange(id,start,end){const key=id+':'+start+'-'+end;if(cache.has(key))return cache.get(key);const r=await fetch(API+encodeURIComponent(id)+'?range='+start+'-'+end,{cache:'force-cache'});if(!r.ok)throw new Error('Gagal memuat hadis');const d=await r.json();const arr=(d?.data?.hadiths||[]).map(normalizeHadith);cache.set(key,arr);return arr}
function renderBooks(){const q=($('#hdSearch')?.value||'').trim().toLowerCase();$('#hdBooks').innerHTML=books.filter(b=>!q||b[1].toLowerCase().includes(q)).map(b=>`<article class="hd-book ${b[0]===active?'active':''}"><strong>${esc(b[1])}</strong><small>${(totals[b[0]]||0).toLocaleString('id-ID')} hadis</small><div class="hd-book-actions"><button class="hd-btn primary" data-open="${b[0]}">Baca</button><button class="hd-btn" data-download="${b[0]}">Unduh</button></div></article>`).join('')||'<div class="hd-empty">Kitab tidak ditemukan.</div>'}
function renderReader(items){const title=bookName(active),start=(page-1)*perPage+1,end=Math.min(page*perPage,total);$('#hdReader').innerHTML=`<div class="hd-reader-head"><div class="hd-kicker">KITAB HADIS</div><h2>${esc(title)}</h2><p>Menampilkan hadis ${start.toLocaleString('id-ID')}–${end.toLocaleString('id-ID')} dari ${total.toLocaleString('id-ID')}.</p></div><div class="hd-list">${items.map(x=>`<article class="hd-item"><div class="hd-num">HADIS NO. ${esc(x.number)}</div>${x.arab?`<div class="hd-arab">${esc(x.arab)}</div>`:''}<p>${esc(x.id)}</p>${x.perawi?`<div class="hd-status">${esc(x.perawi)}</div>`:''}</article>`).join('')||'<div class="hd-empty">Belum ada data pada halaman ini.</div>'}</div><div class="hd-pager"><button class="hd-btn" data-prev ${page<=1?'disabled':''}>Sebelumnya</button><span>Halaman ${page.toLocaleString('id-ID')} / ${Math.ceil(total/perPage).toLocaleString('id-ID')}</span><button class="hd-btn" data-next ${end>=total?'disabled':''}>Berikutnya</button></div>`}
async function openBook(id,p=1){if(loading)return;active=id;page=p;total=totals[id]||0;renderBooks();$('#hdReader').innerHTML='<div class="hd-empty">Memuat kitab…</div>';loading=true;try{const start=(page-1)*perPage+1,end=Math.min(page*perPage,total);const items=await fetchRange(id,start,end);renderReader(items);$('#hdReader').scrollIntoView({block:'start',behavior:'smooth'})}catch(e){$('#hdReader').innerHTML='<div class="hd-empty">Kitab belum dapat dimuat. Coba lagi.</div>'}finally{loading=false}}
async function downloadBook(id){const btn=document.querySelector(`[data-download="${CSS.escape(id)}"]`);if(btn){btn.disabled=true;btn.textContent='Menyiapkan…'}try{const all=[],chunk=300;for(let start=1;start<=totalFor(id);start+=chunk){const end=Math.min(start+chunk-1,totalFor(id));const part=await fetchRange(id,start,end);all.push(...part);if(btn)btn.textContent=`${Math.min(end,totalFor(id)).toLocaleString('id-ID')}/${totalFor(id).toLocaleString('id-ID')}`}const payload={kitab:bookName(id),jumlah:all.length,hadis:all.map(x=>({nomor:x.number,arab:x.arab,terjemahan:x.id}))};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=slug(id)+'-hadits.json';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}catch(e){alert('Unduhan kitab belum selesai. Silakan coba lagi.')}finally{if(btn){btn.disabled=false;btn.textContent='Unduh'}}}
function totalFor(id){return totals[id]||0}function slug(id){return id.replace(/[^a-z0-9]+/gi,'-')}
function bind(){$('#hdSearch').oninput=renderBooks;$('#hdBooks').onclick=e=>{const open=e.target.closest('[data-open]'),down=e.target.closest('[data-download]');if(open)openBook(open.dataset.open,1);if(down)downloadBook(down.dataset.download)};$('#hdReader').onclick=e=>{if(e.target.closest('[data-prev]')&&!e.target.disabled)openBook(active,page-1);if(e.target.closest('[data-next]')&&!e.target.disabled)openBook(active,page+1)}}
async function mount(){const sec=$('#hadits');if(!sec||mounted)return;mounted=true;styles();sec.innerHTML=`<div class="hd-wrap"><section class="hd-hero"><div class="hd-kicker">HADITSMU • RUANG BACA</div><h1>HaditsMu</h1><p>Kitab-kitab hadis siap dibaca langsung di sini. Pilih kitab untuk membuka teks Arab dan terjemahannya, atau unduh seluruh koleksi kitab sebagai berkas.</p></section><div class="hd-tools"><input id="hdSearch" class="hd-search" placeholder="Cari nama kitab…"></div><div id="hdBooks" class="hd-bookgrid"></div><section id="hdReader" class="hd-reader"><div class="hd-empty">Pilih kitab hadis untuk mulai membaca.</div></section></div>`;renderBooks();bind();openBook(active,1)}
window.PCMHadits={mount,openBook,downloadBook};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{if(location.hash==='#hadits')mount()},{once:true});else if(location.hash==='#hadits')mount();
})();