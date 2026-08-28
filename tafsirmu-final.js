(()=>{'use strict';
const API='https://api.quranpedia.net/v1';
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs';
const PDFWORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
let state={items:[],q:'',page:1};
let pdfjsPromise=null;
const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
const short=v=>{const s=String(v||'').replace(/\s+/g,' ').trim();return s.length>54?s.slice(0,54).replace(/\s+\S*$/,'')+'…':s};
async function get(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(String(r.status));return r.json()}
async function pdfjs(){if(!pdfjsPromise)pdfjsPromise=import(PDFJS).then(m=>{m.GlobalWorkerOptions.workerSrc=PDFWORKER;return m});return pdfjsPromise}
function score(book,t){const n=String(book?.name||'').toLowerCase(),a=String(book?.author?.full_name||book?.author||'').toLowerCase(),q=String(t.query||'').toLowerCase(),au=String(t.author||'').toLowerCase();return (n===q?100:0)+(n.includes(q)||q.includes(n)?35:0)+(au&&a&&(a.includes(au)||au.includes(a))?25:0)+(String(book?.type||'').toLowerCase()==='tafsir'?20:0)}
async function resolve(t){
 const d=await get(`${API}/search/${encodeURIComponent(t.query)}/books`);
 const arr=d?.books?.items||d?.items||[];
 const cand=[...arr].sort((a,b)=>score(b.book_info||b,t)-score(a.book_info||a,t));
 let last='not-found';
 for(const hit of cand.slice(0,12)){
  const b=hit.book_info||hit;if(!b?.id)continue;
  try{
   const detail=await get(`${API}/book/${b.id}`);
   const at=(detail.book_attachments||[]).map(a=>({id:a.id,url:String(a.url||''),name:a.name||'',part:a.part||1})).filter(a=>a.id||/^https?:/i.test(a.url));
   const pdfs=at.filter(a=>/pdf/i.test(a.name)||/\.pdf(?:\?|$)/i.test(a.url)).sort((a,b)=>a.part-b.part);
   const first=pdfs[0]||at[0]||null;if(!first)continue;
   const bookId=detail.id||b.id,attachmentId=first.id||'';
   const viewer=attachmentId?`https://quranpedia.net/book/${bookId}?attachment=${attachmentId}`:`https://quranpedia.net/book/${bookId}`;
   return {target:t,book:detail,pdf:first.url||'',pdfs:pdfs.map(x=>x.url).filter(Boolean),id:bookId,language:detail.language?.code||'',attachmentId,viewer};
  }catch(e){last=e}
 }
 throw last||Error('not-found');
}
async function load(){
 const targets=await get('data/tafsir-40-targets.json?v=20260828-06');
 const ts=targets.items||[],out=[];
 for(let i=0;i<ts.length;i+=4){
  const batch=await Promise.all(ts.slice(i,i+4).map(async t=>{try{return await resolve(t)}catch(e){return {target:t,book:null,pdf:'',pdfs:[],id:0,language:'',attachmentId:'',viewer:''}}}));
  out.push(...batch);
 }
 state.items=out;
}
function sort(){state.items.sort((a,b)=>{const ai=/^(id|indonesian|indonesia)$/i.test(a.language),bi=/^(id|indonesian|indonesia)$/i.test(b.language);return Number(bi)-Number(ai)||String(a.target.title).localeCompare(String(b.target.title),'id')})}
function downloadPdf(x){if(!x?.pdf)return;const a=document.createElement('a');a.href=x.pdf;a.download=short(x.target.title)+'.pdf';a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove()}
function openPreview(x){if(!x?.pdf)return;const m=$('#tmfPreview');if(!m)return;const frame=$('#tmfPreviewFrame');$('#tmfPreviewTitle').textContent=x.target.title;frame.src=x.pdf+'#page=1&view=FitH';m.classList.add('open');document.body.classList.add('tmf-lock')}
function closePreview(){const m=$('#tmfPreview');if(!m)return;m.classList.remove('open');document.body.classList.remove('tmf-lock');$('#tmfPreviewFrame').src='about:blank'}
async function renderCover(canvas,x){
 if(!x?.pdf){canvas.parentElement.classList.add('no-cover');return}
 try{
  const mod=await pdfjs();const doc=await mod.getDocument({url:x.pdf,withCredentials:false}).promise;const p=await doc.getPage(1);const box=canvas.getBoundingClientRect();const base=p.getViewport({scale:1});const scale=Math.max(.55,Math.min(1.5,(box.width||190)/base.width));const v=p.getViewport({scale});const d=Math.min(devicePixelRatio||1,2);canvas.width=Math.ceil(v.width*d);canvas.height=Math.ceil(v.height*d);canvas.style.width='100%';canvas.style.height='100%';await p.render({canvasContext:canvas.getContext('2d',{alpha:false}),viewport:v,transform:[d,0,0,d,0,0]}).promise;await doc.destroy();
 }catch(e){canvas.parentElement.classList.add('no-cover')}
}
function coverHtml(x,i){return `<button class="tmf-cover" data-view="${i}" aria-label="Pratinjau ${esc(short(x.target.title))}"><canvas></canvas><span>${esc(short(x.target.title))}</span></button>`}
function draw(){
 const g=$('#tmfGrid');if(!g)return;
 let rows=state.items.filter(x=>{const q=state.q.trim().toLowerCase();return !q||[x.target.title,x.target.author,x.book?.name,x.book?.publish_year].join(' ').toLowerCase().includes(q)});
 const pages=Math.max(1,Math.ceil(rows.length/20));state.page=Math.min(state.page,pages);rows=rows.slice((state.page-1)*20,state.page*20);
 g.innerHTML=rows.map((x,i)=>`<article class="tmf-card">${coverHtml(x,i)}<h3>${esc(short(x.target.title))}</h3><p>${esc(x.target.author||x.book?.author?.full_name||'')}</p>${x.book?.publish_year?`<small>${esc(x.book.publish_year)}</small>`:''}<div class="tmf-actions"><button data-open="${i}" ${x.pdf?'':'disabled'}>Pratinjau</button><button data-pdf="${i}" ${x.pdf?'':'disabled'}>Download PDF</button></div></article>`).join('');
 $$('[data-view]',g).forEach(b=>b.onclick=()=>openPreview(rows[+b.dataset.view]));
 $$('[data-open]',g).forEach(b=>b.onclick=()=>openPreview(rows[+b.dataset.open]));
 $$('[data-pdf]',g).forEach(b=>b.onclick=()=>downloadPdf(rows[+b.dataset.pdf]));
 $$('canvas',g).forEach((c,i)=>renderCover(c,rows[i]));
 const p=$('#tmfPages');p.innerHTML=Array.from({length:Math.min(4,pages)},(_,i)=>`<button class="${i+1===state.page?'on':''}" data-p="${i+1}">${i+1}</button>`).join('')+(state.page<pages?'<button data-next>Next</button>':'');
 $$('[data-p]',p).forEach(b=>b.onclick=()=>{state.page=+b.dataset.p;draw()});$('[data-next]',p)?.addEventListener('click',()=>{state.page++;draw()});
}
function css(){if($('#tmfCss'))return;const s=document.createElement('style');s.id='tmfCss';s.textContent=`
#pustaka .tmf{max-width:1320px;margin:auto;padding:10px 0 60px}.tmf-search{width:100%;box-sizing:border-box;padding:13px 15px;border:1px solid #cbdde8;border-radius:13px;font:inherit;margin-bottom:15px}.tmf-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:14px}.tmf-card{background:#fff;border:1px solid #d7e4eb;border-radius:17px;padding:9px;min-width:0;box-shadow:0 7px 20px #06265312}.tmf-cover{width:100%;aspect-ratio:2/3;border:0;border-radius:11px;overflow:hidden;background:#f4efe5;position:relative;padding:0;display:block;cursor:pointer}.tmf-cover canvas{width:100%;height:100%;display:block;object-fit:cover}.tmf-cover span{position:absolute;left:0;right:0;bottom:0;padding:35px 9px 9px;color:#fff;font-weight:1000;text-align:left;background:linear-gradient(transparent,#001d35df);pointer-events:none}.tmf-cover.no-cover{background:linear-gradient(145deg,#0c3c67,#0b847f)}.tmf-cover.no-cover:after{content:'Cover tidak dapat dimuat';position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-weight:900;font-size:.75rem;padding:20px;text-align:center}.tmf-card h3{font-size:.9rem;line-height:1.35;color:#082d58;margin:8px 2px 2px}.tmf-card p{margin:0 2px;font-size:.72rem;color:#637b8d;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tmf-card small{display:block;margin:3px 2px;color:#7890a0;font-size:.68rem}.tmf-actions{display:flex;gap:5px;margin-top:9px}.tmf-actions button{flex:1;border:0;border-radius:9px;padding:8px 3px;font:inherit;font-size:.64rem;font-weight:1000;cursor:pointer;background:#ffbf32;color:#08335e}.tmf-actions button:disabled{opacity:.45;cursor:not-allowed}.tmf-pages{display:flex;justify-content:center;gap:6px;margin-top:20px;flex-wrap:wrap}.tmf-pages button{border:1px solid #cbdde8;background:#fff;color:#174563;border-radius:9px;padding:8px 12px;font:inherit;font-weight:900;cursor:pointer}.tmf-pages button.on{background:#075aa4;color:#fff}.tmf-lock{overflow:hidden!important}.tmf-preview{position:fixed;inset:0;z-index:99999;background:rgba(2,18,36,.82);display:none;align-items:stretch;justify-content:center;padding:14px;box-sizing:border-box}.tmf-preview.open{display:flex}.tmf-preview-panel{width:min(1200px,100%);height:100%;background:#fff;border-radius:14px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(0,0,0,.35)}.tmf-preview-head{height:54px;flex:0 0 54px;display:flex;align-items:center;gap:10px;padding:0 12px;background:#062653;color:#fff}.tmf-preview-title{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}.tmf-preview-close{border:0;background:#ffbf32;color:#08335e;border-radius:9px;padding:8px 13px;font:inherit;font-weight:1000;cursor:pointer}.tmf-preview-frame{width:100%;height:calc(100% - 54px);border:0;background:#e8edf1}@media(max-width:1050px){.tmf-grid{grid-template-columns:repeat(4,1fr)}}@media(max-width:800px){.tmf-grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:560px){.tmf-grid{grid-template-columns:repeat(2,1fr);gap:8px}.tmf-card{padding:7px}.tmf-actions button{font-size:.57rem;padding:7px 2px}.tmf-preview{padding:0}.tmf-preview-panel{border-radius:0}.tmf-preview-head{height:50px;flex-basis:50px}.tmf-preview-frame{height:calc(100% - 50px)}}`;document.head.appendChild(s)}
function mount(){css();const sec=$('#pustaka');if(!sec)return;sec.innerHTML='<div class="tmf"><input class="tmf-search" id="tmfSearch" placeholder="Cari kitab tafsir…"><div class="tmf-grid" id="tmfGrid"></div><div class="tmf-pages" id="tmfPages"></div></div><div class="tmf-preview" id="tmfPreview" role="dialog" aria-modal="true"><div class="tmf-preview-panel"><div class="tmf-preview-head"><div class="tmf-preview-title" id="tmfPreviewTitle">Pratinjau Tafsir</div><button class="tmf-preview-close" type="button" aria-label="Tutup pratinjau">Tutup</button></div><iframe class="tmf-preview-frame" id="tmfPreviewFrame" title="Pratinjau kitab tafsir"></iframe></div></div>';$('#tmfSearch').oninput=e=>{state.q=e.target.value;state.page=1;draw()};$('.tmf-preview-close').onclick=closePreview;$('#tmfPreview').addEventListener('click',e=>{if(e.target.id==='tmfPreview')closePreview()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closePreview()});load().then(()=>{sort();draw()}).catch(()=>draw())}
window.PCMTafsirFinal={mount};})();
