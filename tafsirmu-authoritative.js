(()=>{'use strict';
/* TAFSIRMU-AUTHORITATIVE-20260829
   One renderer, exact-title matching, no heuristic fallback to unrelated books. */
const API='https://api.quranpedia.net/v1';
const BOOKS=[
['Tafsir Ath-Thabari','جامع البيان في تأويل آي القرآن','أبو جعفر محمد بن جرير الطبري'],
['Tafsir Bahrul Ulum','بحر العلوم','أبو الليث السمرقندي'],
['Tafsir Al-Baghawi','معالم التنزيل','الحسين بن مسعود البغوي'],
['Tafsir Al-Muharrar','المحرر الوجيز في تفسير الكتاب العزيز','ابن عطية'],
['Tafsir Al-Qur’an Al-Azhim','تفسير القرآن العظيم ابن كثير','ابن كثير'],
['Tafsir Ats-Tsa’labi','الكشف والبيان عن تفسير القرآن','الثعلبي'],
['Tafsir Ad-Dur Al-Mantsur','الدر المنثور في التأويل بالمأثور','السيوطي'],
['Tafsir Fathul Qadir','فتح القدير الجامع بين فني الرواية والدراية','الشوكاني'],
['Tafsir Adhwa’ Al-Bayan','أضواء البيان','محمد الأمين الشنقيطي'],
['Tafsir Ar-Razi','مفاتيح الغيب','فخر الدين الرازي'],
['Tafsir Al-Baidhawi','أنوار التنزيل وأسرار التأويل','البيضاوي'],
['Tafsir An-Nasafi','مدارك التنزيل وحقائق التأويل','النسفي'],
['Tafsir Al-Khazin','لباب التأويل في معاني التنزيل','الخازن'],
['Tafsir Bahrul Muhith','البحر المحيط في التفسير','أبو حيان الأندلسي'],
['Tafsir Gharaib Al-Quran','غرائب القرآن ورغائب الفرقان','النيسابوري'],
['Tafsir Ma’ani Al-Quran','معاني القرآن للفراء','الفراء'],
['Kitab Majaz Al-Quran','مجاز القرآن','أبو عبيدة معمر بن المثنى'],
['Tafsir Ma’ani Al-Quran Wa I’rabuhu','معاني القرآن وإعرابه للزجاج','الزجاج'],
['Tafsir Muqatil Bin Sulaiman','تفسير مقاتل بن سليمان','مقاتل بن سليمان'],
['Tafsir Al-Quran Al-Karim','تفسير القرآن الكريم','حسن'],
['Al-Ibriz Li Ma’rifati Al-Quran','الإبريز','بِسري مصطفى'],
['Tafsir Raudhatul Irfan Fi Ma’rifati Al-Quran','روضات العرفان','أحمد سانوسي'],
['Tafsir Al-Azhar','تفسير الأزهر','حَمْكَة'],
['Tafsir Ibnu Katsir','تفسير القرآن العظيم ابن كثير','ابن كثير'],
['Tafsir Ath-Thabari (Edisi Lain)','جامع البيان في تأويل آي القرآن','الطبري'],
['Tafsir Al-Qurthubi','الجامع لأحكام القرآن','القرطبي'],
['Tafsir Jalalain','تفسير الجلالين','المحلي والسيوطي'],
['Ahkam Al-Quran — Al-Jashash','أحكام القرآن الجصاص','الجصاص'],
['Ahkam Al-Quran — Al-Harras','أحكام القرآن الحراس','الحراس'],
['Ahkam Al-Quran — Ibnul Arabi','أحكام القرآن ابن العربي','ابن العربي'],
['Al-Jami’ Li Ahkam Al-Quran — Al-Qurthubi','الجامع لأحكام القرآن القرطبي','القرطبي'],
['Al-Iklil Fi Istinbath At-Tanzil','الإكليل في استنباط التنزيل','السيوطي'],
['Tafsir Ayat Al-Ahkam — As-Sayus','تفسير آيات الأحكام للسايس','السايس'],
['Tafsir Ayat Al-Ahkam — Manna’ Al-Qathan','تفسير آيات الأحكام مناع القطان','مناع القطان'],
['Adhwa’ Al-Bayan — Asy-Syinqithi','أضواء البيان','الشنقيطي'],
['Rawa’i’ Al-Bayan Tafsir Ayat Al-Ahkam','روائع البيان تفسير آيات الأحكام','محمد علي الصابوني'],
['At-Tafsir Wa Al-Bayan','التفسير والبيان','الطريفي'],
['Tafsir Al-Muyassar','التفسير الميسر','مجمع الملك فهد'],
['Al-Mukhtashar Fi At-Tafsir','المختصر في تفسير القرآن الكريم','مركز تفسير'],
['Tafsir As-Sa’di','تيسير الكريم الرحمن','السعدي']
];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[^a-z0-9\u0600-\u06ff]+/g,'');
const get=async u=>{const r=await fetch(u,{cache:'no-store'});if(!r.ok)throw Error(String(r.status));return r.json()};
const root=()=>document.getElementById('tafsir');
function css(){if(document.getElementById('tfm-auth-css'))return;const s=document.createElement('style');s.id='tfm-auth-css';s.textContent=`#tafsir .tfma{max-width:1320px;margin:auto;padding:18px 12px 55px}.tfma-head{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px}.tfma-head h2{margin:0;color:#082d58}.tfma-badge{font-size:11px;font-weight:900;padding:5px 8px;border-radius:99px;background:#e8f2fb;color:#0a5ba5}.tfma-search{width:100%;padding:12px 14px;border:1px solid #c8d9e5;border-radius:12px;box-sizing:border-box;font:inherit}.tfma-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px;margin-top:14px}.tfma-card{background:#fff;border:1px solid #d5e2ea;border-radius:16px;padding:9px;box-shadow:0 5px 16px rgba(6,38,83,.08);min-width:0}.tfma-cover{aspect-ratio:2/3;border-radius:11px;background:linear-gradient(145deg,#083b6c,#0b8b82);color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:14px;box-sizing:border-box;font-weight:900;line-height:1.35}.tfma-cover.off{background:#edf2f5;color:#6c7d89}.tfma-title{font-weight:1000;color:#082d58;line-height:1.35;margin:9px 2px 3px}.tfma-author{font-size:.72rem;color:#687e90;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tfma-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}.tfma-actions button,.tfma-actions a{border:0;border-radius:8px;padding:8px 4px;text-align:center;text-decoration:none;font:inherit;font-size:.65rem;font-weight:1000;cursor:pointer}.tfma-read{background:#0a5ba5;color:#fff}.tfma-pdf{background:#c83d3d;color:#fff}.tfma-disabled{background:#e7ecef;color:#74818a;cursor:not-allowed!important}.tfma-note{margin:12px 0;color:#5d7283;font-size:.8rem}.tfma-modal{position:fixed;inset:0;background:#222;z-index:999999;display:none;flex-direction:column}.tfma-modal.open{display:flex}.tfma-bar{display:flex;gap:8px;align-items:center;padding:8px;background:#182028;color:#fff}.tfma-bar strong{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tfma-bar button{border:0;border-radius:8px;padding:9px 12px;font-weight:900;cursor:pointer}.tfma-close{background:#eee;color:#222}.tfma-open{background:#ffc33d;color:#082d58}.tfma-frame{flex:1;border:0;width:100%;background:#fff}@media(max-width:1050px){.tfma-grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:800px){.tfma-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:560px){.tfma-grid{grid-template-columns:repeat(2,1fr);gap:8px}.tfma-card{padding:6px}.tfma-actions button,.tfma-actions a{font-size:.57rem}.tfma-title{font-size:.85rem}}`;document.head.appendChild(s)}
function modal(){let m=document.getElementById('tfma-modal');if(m)return m;document.body.insertAdjacentHTML('beforeend','<div id="tfma-modal" class="tfma-modal"><div class="tfma-bar"><button class="tfma-close" id="tfma-close">Tutup</button><strong id="tfma-name"></strong><button class="tfma-open" id="tfma-open">Buka Quranpedia</button></div><iframe id="tfma-frame" class="tfma-frame" title="Pembaca TafsirMu"></iframe></div>');m=document.getElementById('tfma-modal');document.getElementById('tfma-close').onclick=()=>{m.classList.remove('open');document.getElementById('tfma-frame').src='about:blank'};return m}
function exact(c,t){const n=norm(c.name),q=norm(t[1]),a=norm(typeof c.author==='object'?c.author.full_name:c.author||'');const wanted=norm(t[2]);return n===q && (!wanted || !a || a.includes(wanted) || wanted.includes(a));}
async function resolve(t){let candidates=[];for(const q of [t[1],t[0]]){try{const x=await get(`${API}/search/${encodeURIComponent(q)}/books`);for(const i of (x.items||[])){const b=i.book_info||i;if(!candidates.some(x=>x.id===b.id))candidates.push(b)}}catch{}}const hit=candidates.find(c=>exact(c,t));if(!hit)return null;try{const d=await get(`${API}/book/${hit.id}`);const ats=(d.book_attachments||[]).map(a=>({url:a.url||'',name:a.name||'',part:Number(a.part||1)}));const pdf=ats.filter(a=>/pdf/i.test(a.name)||/\.pdf(?:\?|$)/i.test(a.url)).sort((a,b)=>a.part-b.part)[0]?.url||'';return{...d,pdf}}catch{return{...hit,pdf:''}}}
let data=[];
function card(t,i){const b=data[i];if(!b)return `<article class="tfma-card"><div class="tfma-cover off">Memuat…</div><div class="tfma-title">${esc(t[0])}</div></article>`;return `<article class="tfma-card"><div class="tfma-cover ${b.missing?'off':''}">${b.missing?'Buku persis tidak ditemukan':'تفسير'}<br><small>${esc(t[1])}</small></div><div class="tfma-title">${esc(t[0])}</div><div class="tfma-author">${esc(b.missing?t[2]:(b.author?.full_name||t[2]))}</div><div class="tfma-actions"><button class="tfma-read ${b.missing?'tfma-disabled':''}" data-i="${i}" ${b.missing?'disabled':''}>Baca</button>${b.pdf?`<a class="tfma-pdf" href="${esc(b.pdf)}" target="_blank" rel="noopener">PDF</a>`:'<button class="tfma-disabled" disabled>PDF tidak ada</button>'}</div></article>`}
async function render(){const r=root();if(!r)return;css();r.innerHTML='<div class="tfma"><div class="tfma-head"><h2>TafsirMu</h2><span class="tfma-badge">RENDERER OTORITATIF • 2026-08-29</span></div><div class="tfma-note">Pencocokan buku memakai judul Arab yang tepat. Jika buku persis tidak tersedia di Quranpedia, kartu ditandai dan tidak diganti dengan buku lain.</div><input id="tfma-search" class="tfma-search" placeholder="Cari judul tafsir atau penulis…" autocomplete="off"><div id="tfma-grid" class="tfma-grid"></div></div>';
const grid=()=>document.getElementById('tfma-grid');
data=BOOKS.map(()=>null);grid().innerHTML=BOOKS.map(card).join('');
for(let i=0;i<BOOKS.length;i++){resolve(BOOKS[i]).then(b=>{data[i]=b||{missing:true};const q=document.getElementById('tfma-grid');if(q)q.innerHTML=BOOKS.map(card).join('')}).catch(()=>{data[i]={missing:true};const q=document.getElementById('tfma-grid');if(q)q.innerHTML=BOOKS.map(card).join('')})}
r.onclick=e=>{const btn=e.target.closest('.tfma-read');if(!btn||btn.disabled)return;const b=data[Number(btn.dataset.i)],t=BOOKS[Number(btn.dataset.i)];if(!b?.id)return;const m=modal(),url=`https://quranpedia.net/book/${b.id}`;document.getElementById('tfma-name').textContent=t[0];document.getElementById('tfma-frame').src=url;document.getElementById('tfma-open').onclick=()=>window.open(url,'_blank','noopener');m.classList.add('open')};
document.getElementById('tfma-search').oninput=e=>{const q=norm(e.target.value);document.querySelectorAll('#tfma-grid .tfma-card').forEach((el,i)=>{const hay=norm(BOOKS[i].join(' ')+(data[i]?.author?.full_name||''));el.style.display=!q||hay.includes(q)?'':'none'})};
}
function active(){return location.hash.replace('#','').toLowerCase()==='tafsir'}
function ensure(){if(active()){const r=root();if(r&&!r.querySelector('.tfma'))render()}}
window.addEventListener('hashchange',()=>setTimeout(ensure,0));
document.addEventListener('DOMContentLoaded',()=>setTimeout(ensure,0));
const observer=new MutationObserver(()=>{if(active()){const r=root();if(r&&!r.querySelector('.tfma'))render()}});observer.observe(document.body,{childList:true,subtree:false});
setTimeout(ensure,100);setTimeout(ensure,500);setTimeout(ensure,1200);
})();
