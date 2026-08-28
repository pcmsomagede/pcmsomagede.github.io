(()=>{'use strict';
const API='https://api.quranpedia.net/v1';
const GP='https://www.googleapis.com/books/v1/volumes';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
let state={items:[],q:'',page:1};
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const short=v=>{const s=String(v||'').replace(/\s+/g,' ').trim();return s.length>54?s.slice(0,54).replace(/\s+\S*$/,'')+'…':s};
async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(String(r.status));return r.json()}
function score(book,t){const n=String(book?.name||'').toLowerCase(),a=String(book?.author?.full_name||book?.author||'').toLowerCase(),q=String(t.query||'').toLowerCase(),au=String(t.author||'').toLowerCase();return (n===q?100:0)+(n.includes(q)||q.includes(n)?35:0)+(au&&a&&(a.includes(au)||au.includes(a))?25:0)+(String(book?.type||'').toLowerCase()==='tafsir'?20:0)}
async function resolve(t){
 const d=await get(`${API}/search/${encodeURIComponent(t.query)}/books`);
 const arr=d?.books?.items||d?.items||[];
 const cand=[...arr].sort((a,b)=>score(b.book_info||b,t)-score(a.book_info||a,t));
 let last='not-found';
 for(const hit of cand.slice(0,12)){
  const b=hit.book_info||hit;
  if(!b?.id)continue;
  try{
   const detail=await get(`${API}/book/${b.id}`);
   const at=(detail.book_attachments||[]).map(a=>({id:a.id,url:String(a.url||''),name:a.name||'',part:a.part||1})).filter(a=>a.id||/^https?:/i.test(a.url));
   const pdfs=at.filter(a=>/pdf/i.test(a.name)||/\.pdf(?:\?|$)/i.test(a.url)).sort((a,b)=>a.part-b.part);
   const docs=at.filter(a=>/docx?/i.test(a.name)||/\.(?:docx?)(?:\?|$)/i.test(a.url));
   const first=pdfs[0]||at[0]||null;
   if(!first)continue;
   const bookId=detail.id||b.id;
   const attachmentId=first.id||'';
   const viewer=attachmentId?`https://quranpedia.net/book/${bookId}?attachment=${attachmentId}`:`https://quranpedia.net/book/${bookId}`;
   return {target:t,book:detail,pdf:first.url||'',pdfs:pdfs.map(x=>x.url).filter(Boolean),docx:docs[0]?.url||'',contents:detail.contents_url||'',id:bookId,language:detail.language?.code||'',attachmentId,viewer,cover:''};
  }catch(e){last=e}
 }
 throw last||Error('not-found');
}
async function findGoogleCover(x){
 const q=`intitle:${x.target.query} inauthor:${x.target.author}`;
 try{
  const d=await get(`${GP}?q=${encodeURIComponent(q)}&maxResults=8&printType=books&projection=full`);
  const items=d?.items||[];
  const wanted=String(x.target.query||'').toLowerCase();
  const hit=items.find(v=>{const t=String(v.volumeInfo?.title||'').toLowerCase();return v.volumeInfo?.imageLinks&&(!wanted||t.includes(wanted.slice(0,18))||wanted.includes(t.slice(0,18)))})||items.find(v=>v.volumeInfo?.imageLinks);
  let u=hit?.volumeInfo?.imageLinks?.extraLarge||hit?.volumeInfo?.imageLinks?.large||hit?.volumeInfo?.imageLinks?.medium||hit?.volumeInfo?.imageLinks?.thumbnail||'';
  if(u)u=u.replace(/^http:/,'https:');
  return u;
 }catch(e){return ''}
}
async function load(){
 const targets=await get('data/tafsir-40-targets.json?v=20260828-06');
 const ts=targets.items||[];const out=[];
 for(let i=0;i<ts.length;i+=4){
  const batch=await Promise.all(ts.slice(i,i+4).map(async t=>{try{return await resolve(t)}catch(e){return {target:t,book:null,pdf:'',pdfs:[],docx:'',contents:'',id:0,language:'',attachmentId:'',viewer:'',cover:''}}}));
  out.push(...batch);
 }
 state.items=out;
 for(let i=0;i<state.items.length;i+=5){
  await Promise.all(state.items.slice(i,i+5).map(async x=>{if(x.id)x.cover=await findGoogleCover(x)}));
 }
}
function sort(){state.items.sort((a,b)=>{const ai=/^(id|indonesian|indonesia)$/i.test(a.language),bi=/^(id|indonesian|indonesia)$/i.test(b.language);return Number(bi)-Number(ai)||String(a.target.title).localeCompare(String(b.target.title),'id')})}
function openViewer(x){if(!x?.viewer)return;const w=window.open(x.viewer,'_blank','noopener');if(!w)location.href=x.viewer}
function downloadUrl(url,name){if(!url)return;const a=document.createElement('a');a.href=url;a.download=name;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}
async function makeDocx(x){
 if(x.docx){downloadUrl(x.docx,short(x.target.title)+'.docx');return}
 if(!x.contents){openViewer(x);return}
 try{
  const pkg=await import('https://cdn.jsdelivr.net/npm/docx@9.5.1/+esm');
  const d=await get(x.contents);const rows=Array.isArray(d)?d:(d.items||d.content||[]);
  const children=rows.map(r=>new pkg.Paragraph({text:String(r.text||r.content||''),bidirectional:/[\u0600-\u06ff]/.test(String(r.text||r.content||''))}));
  const doc=new pkg.Document({sections:[{properties:{},children}]});const blob=await pkg.Packer.toBlob(doc);const u=URL.createObjectURL(blob);downloadUrl(u,short(x.target.title)+'.docx');setTimeout(()=>URL.revokeObjectURL(u),15000);
 }catch(e){openViewer(x)}
}
function coverHtml(x,i){
 const label=esc(short(x.target.title));
 if(x.cover)return `<div class="tmf-cover real-cover"><img src="${esc(x.cover)}" alt="Cover ${label}" loading="lazy"><button class="tmf-cover-open" data-view="${i}" aria-label="Buka pratinjau ${label}"></button></div>`;
 if(x.viewer)return `<div class="tmf-cover real-cover real-scan"><iframe src="${esc(x.viewer)}" title="Pratinjau ${label}" loading="lazy"></iframe><button class="tmf-cover-open" data-view="${i}" aria-label="Buka pratinjau ${label}"></button></div>`;
 return `<div class="tmf-cover unavailable"><strong>Cover belum tersedia</strong><small>Sumber kitab tidak menyediakan lampiran yang dapat ditampilkan.</small></div>`;
}
function draw(){
 const g=$('#tmfGrid');if(!g)return;
 let rows=state.items.filter(x=>{const q=state.q.trim().toLowerCase();return !q||[x.target.title,x.target.author,x.book?.name,x.book?.publish_year].join(' ').toLowerCase().includes(q)});
 const pages=Math.max(1,Math.ceil(rows.length/20));state.page=Math.min(state.page,pages);rows=rows.slice((state.page-1)*20,state.page*20);
 g.innerHTML=rows.map((x,i)=>`<article class="tmf-card">${coverHtml(x,i)}<h3>${esc(short(x.target.title))}</h3><p>${esc(x.target.author||x.book?.author?.full_name||'')}</p>${x.book?.publish_year?`<small>${esc(x.book.publish_year)}</small>`:''}<div class="tmf-actions"><button data-open="${i}" ${x.viewer?'':'disabled'}>Pratinjau</button><button data-pdf="${i}" ${x.pdf?'':'disabled'}>PDF</button><button data-docx="${i}" ${x.contents||x.docx?'':'disabled'}>DOCX</button></div></article>`).join('');
 $$('[data-view]',g).forEach(b=>b.onclick=()=>openViewer(rows[+b.dataset.view]));
 $$('[data-open]',g).forEach(b=>b.onclick=()=>openViewer(rows[+b.dataset.open]));
 $$('[data-pdf]',g).forEach(b=>b.onclick=()=>downloadUrl(rows[+b.dataset.pdf].pdf,short(rows[+b.dataset.pdf].target.title)+'.pdf'));
 $$('[data-docx]',g).forEach(b=>b.onclick=()=>makeDocx(rows[+b.dataset.docx]));
 const p=$('#tmfPages');p.innerHTML=Array.from({length:Math.min(4,pages)},(_,i)=>`<button class="${i+1===state.page?'on':''}" data-p="${i+1}">${i+1}</button>`).join('')+(state.page<pages?'<button data-next>Next</button>':'');
 $$('[data-p]',p).forEach(b=>b.onclick=()=>{state.page=+b.dataset.p;draw()});$('[data-next]',p)?.addEventListener('click',()=>{state.page++;draw()});
}
function css(){if($('#tmfCss'))return;const s=document.createElement('style');s.id='tmfCss';s.textContent=`#pustaka .tmf{max-width:1320px;margin:auto;padding:10px 0 60px}.tmf-search{width:100%;box-sizing:border-box;padding:13px 15px;border:1px solid #cbdde8;border-radius:13px;font:inherit;margin-bottom:15px}.tmf-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.tmf-card{background:#fff;border:1px solid #d7e4eb;border-radius:17px;padding:9px;min-width:0;box-shadow:0 7px 20px #06265312}.tmf-cover{width:100%;aspect-ratio:2/3;border:0;border-radius:11px;overflow:hidden;background:#f4efe5;position:relative;padding:0;display:block}.tmf-cover img{width:100%;height:100%;display:block;object-fit:cover}.tmf-cover.real-scan iframe{width:100%;height:100%;border:0;display:block;background:#fff}.tmf-cover-open{position:absolute;inset:0;border:0;background:transparent;cursor:pointer}.tmf-cover.unavailable{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;box-sizing:border-box;text-align:center;color:#45677e;background:#eef4f7}.tmf-cover.unavailable strong{font-size:.8rem}.tmf-cover.unavailable small{margin-top:7px;font-size:.65rem;line-height:1.4}.tmf-card h3{font-size:.9rem;line-height:1.35;color:#082d58;margin:8px 2px 2px}.tmf-card p{margin:0 2px;font-size:.72rem;color:#637b8d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tmf-card small{display:block;margin:3px 2px;color:#7890a0;font-size:.68rem}.tmf-actions{display:flex;gap:5px;margin-top:9px}.tmf-actions button{flex:1;border:0;border-radius:9px;padding:8px 3px;font:inherit;font-size:.64rem;font-weight:1000;cursor:pointer;background:#ffbf32;color:#08335e}.tmf-actions button:disabled{opacity:.45;cursor:not-allowed}.tmf-pages{display:flex;justify-content:center;gap:6px;margin-top:20px;flex-wrap:wrap}.tmf-pages button{border:1px solid #cbdde8;background:#fff;color:#174563;border-radius:9px;padding:8px 12px;font:inherit;font-weight:900;cursor:pointer}.tmf-pages button.on{background:#075aa4;color:#fff}@media(max-width:1050px){.tmf-grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:800px){.tmf-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:560px){.tmf-grid{grid-template-columns:repeat(2,1fr);gap:8px}.tmf-card{padding:7px}.tmf-actions button{font-size:.57rem;padding:7px 2px}}`;document.head.appendChild(s)}
async function mount(){css();const sec=$('#pustaka');if(!sec)return;sec.innerHTML='<div class="tmf"><input class="tmf-search" id="tmfSearch" placeholder="Cari kitab tafsir…"><div class="tmf-grid" id="tmfGrid"></div><div class="tmf-pages" id="tmfPages"></div></div>';$('#tmfSearch').oninput=e=>{state.q=e.target.value;state.page=1;draw()};await load();sort();draw()}
window.PCMTafsirFinal={mount};})();
