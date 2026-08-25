(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const panels=new Set(['beranda','berita','pustaka','kta','arsip','suara','kontak']);
const beritaTabs=['profil','kajian','agenda','struktur'];
let beritaState='profil';

function injectUI(){
 if($('#pcm-ui-enhance'))return;
 const s=document.createElement('style');s.id='pcm-ui-enhance';s.textContent=`
  .panel{display:none!important}.panel.active{display:block!important;animation:pcmIn .12s ease-out both}
  @keyframes pcmIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}
  .nav-item,.berita-tab,button{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .nav-item:hover,.berita-tab:hover{filter:brightness(1.08);transform:translateY(-1px)}
  .main-nav{background:linear-gradient(100deg,#073777 0%,#0a6ba8 46%,#0b8b89 100%)}
  .nav-item{box-shadow:0 6px 18px rgba(8,59,120,.12);transition:transform .12s ease,filter .12s ease,box-shadow .12s ease}
  .berita-shell{position:relative;padding:26px 0 34px}
  .berita-head{margin:0 auto 22px;max-width:920px;text-align:center;padding:26px 18px;border-radius:24px;background:linear-gradient(135deg,#062653,#075aa4 55%,#0b8b89);color:#fff;box-shadow:0 18px 40px rgba(6,38,83,.18)}
  .berita-head .bm-kicker{color:#ffe15a}.berita-head h2{color:#fff!important;font-size:clamp(2rem,5vw,3rem);margin:4px 0}.berita-head p{margin:0;color:#eaf7ff}
  .berita-tabs{display:flex;justify-content:center;flex-wrap:wrap;gap:9px;margin:0 auto 18px}
  .berita-tab{border:1px solid #cbdceb;background:#fff;color:#163b62;padding:11px 16px;border-radius:999px;font:inherit;font-weight:900;cursor:pointer;transition:transform .12s ease,background .12s ease,color .12s ease,box-shadow .12s ease}
  .berita-tab.active{background:linear-gradient(135deg,#075aa4,#0b8b89);color:#fff;border-color:transparent;box-shadow:0 9px 22px rgba(7,90,164,.2)}
  #bmContent{min-height:120px}
  .bm-profile-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
  .bm-card{background:linear-gradient(180deg,#fff,#f7fbff);border:1px solid #dce6ef;border-radius:20px;padding:16px;text-align:center;box-shadow:0 10px 28px rgba(14,55,93,.08);contain:layout paint;transition:transform .12s ease,box-shadow .12s ease}
  .bm-card:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(14,55,93,.12)}
  .leader-photo{height:250px;border:1px solid #edf2f7;border-radius:15px;overflow:hidden;background:#fff;display:grid;place-items:center}
  .leader-photo img{width:100%;height:100%;object-fit:contain}
  .leader-role,.bm-kicker{margin-top:11px;color:#0a7091;text-transform:uppercase;letter-spacing:.08em;font-size:.74rem;font-weight:900}
  .bm-card h3{color:#092b55;margin:5px 0 4px;line-height:1.35}.bm-card p{color:#355773}
  .bm-info-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-top:18px}.bm-info-grid>div{padding:14px;border:1px solid #dfebf3;border-radius:13px;background:#fbfdff}.bm-info-grid span,.bm-highlight span{display:block;color:#6f8192;font-size:.74rem}.bm-info-grid strong,.bm-highlight strong{display:block;margin-top:4px;color:#123e69}
  .bm-highlight{margin-top:18px;padding:18px;border:1px solid #c8e1e9;border-radius:15px;background:linear-gradient(135deg,#f4fbff,#ecffff)}
  .org-shell{display:grid;gap:18px}.org-root{padding:24px;border-radius:22px;color:#fff;text-align:center;background:linear-gradient(135deg,#062653,#075aa4 58%,#0b8b89);box-shadow:0 18px 38px rgba(6,38,83,.18)}.org-root span{font-size:.72rem;letter-spacing:.12em;font-weight:900;color:#ffe15a}.org-root h3{margin:5px 0 2px;font-size:1.55rem}.org-root p{margin:0;color:#eaf7ff}
  .org-leaders{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.org-node{padding:15px;border:1px solid #dbe7ef;border-radius:15px;background:#fff;box-shadow:0 8px 22px rgba(14,55,93,.07);font-weight:800;color:#123e69;text-align:center}
  .org-title{text-align:center;color:#092b55;margin:2px 0 0}.org-units{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.org-unit{padding:15px;border:1px solid #dce6ef;border-radius:15px;background:linear-gradient(180deg,#fff,#f7fbff);box-shadow:0 8px 22px rgba(14,55,93,.06)}.org-unit h4{margin:0 0 9px;color:#075aa4}.org-unit span{display:block;margin:5px 0;padding:7px 9px;border-radius:9px;background:#eef6fb;color:#294f6d;font-size:.86rem}
  @media(max-width:900px){.bm-profile-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.org-leaders{grid-template-columns:repeat(2,minmax(0,1fr))}.org-units{grid-template-columns:repeat(2,minmax(0,1fr))}.bm-info-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:560px){.panel.active{animation:none}.nav-inner{padding:9px 8px;gap:7px}.nav-item{padding:10px 11px;font-size:.9rem}.berita-shell{padding-top:16px}.berita-head{border-radius:18px;padding:20px 14px}.berita-tabs{position:sticky;top:0;padding:7px 0;background:rgba(245,249,253,.94);backdrop-filter:blur(10px);z-index:30}.berita-tab{padding:10px 13px;font-size:.88rem}.bm-profile-grid,.org-leaders,.org-units{grid-template-columns:1fr}.leader-photo{height:230px}.bm-info-grid{grid-template-columns:1fr}.org-node,.org-unit{padding:13px}.org-root{padding:20px 14px}}
  @media(prefers-reduced-motion:reduce){.panel.active,.nav-item,.berita-tab,.bm-card{animation:none;transition:none}}
 `;document.head.appendChild(s);
}

function showPanel(id){
 const target=document.getElementById(id)||document.getElementById('beranda');
 $$('.panel').forEach(p=>p.classList.toggle('active',p===target));
 $$('.nav-item[href^="#"]').forEach(a=>a.removeAttribute('aria-current'));
 const active=$(`.nav-item[href="#${target.id}"]`);if(active)active.setAttribute('aria-current','page');
 window.scrollTo(0,0);
}

function renderBeritaShell(){
 const sec=$('#berita');if(!sec)return;
 sec.innerHTML=`<div class="berita-shell"><div class="berita-head"><div class="bm-kicker">PCM SOMAGEDE • BANYUMAS</div><h2>BeritaMu</h2><p>Informasi kepemimpinan, kajian, agenda dan struktur persyarikatan.</p></div><div id="bmTabs" class="berita-tabs" role="tablist">${[['profil','Profil Pimpinan'],['kajian','Kajian Rutin'],['agenda','Agenda Persyarikatan'],['struktur','Susunan Lengkap PCM Somagede']].map((x,i)=>`<button type="button" class="berita-tab${i===0?' active':''}" data-bm="${x[0]}" role="tab" aria-selected="${i===0}">${x[1]}</button>`).join('')}</div><div id="bmContent"></div></div>`;
 $$('#bmTabs [data-bm]').forEach(b=>b.addEventListener('click',()=>{beritaState=b.dataset.bm;setBeritaTab(beritaState)}));
 setBeritaTab(beritaState);
}

const people=[['Ketua 1','Drs. Bambang Budiarso','665.636','pimpinan-1.png'],['Ketua 2','H. Hari Indra Kustiwa, S.IP, S.Pd.','665.640','pimpinan-2.png'],['Ketua 3','H. Moch El Badrun, S.Pd.I','660.987','pimpinan-3.png'],['Sekretaris 1','Sunarso, S.Pd.I, Gr.','1030.113','pimpinan-4.png'],['Sekretaris 2','Sukirman, S.Pd.M.Pd.','-','pimpinan-5.png'],['Bendahara 1','H. Haris Cahyadi','-','pimpinan-6.jpeg'],['Bendahara 2','H. Arief Ritade Aswas, S.Pd.I, M.Pd.I.','1030.180','pimpinan-7.jpeg']];
function setBeritaTab(name){
 const c=$('#bmContent');if(!c)return;
 $$('#bmTabs [data-bm]').forEach(b=>{const on=b.dataset.bm===name;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on))});
 if(name==='profil')c.innerHTML=`<div class="bm-profile-grid">${people.map(p=>`<article class="bm-card"><div class="leader-photo"><img src="${p[3]}" alt="${p[1]}" loading="eager" decoding="async"></div><div class="leader-role">${p[0]}</div><h3>${p[1]}</h3><p>NBM : ${p[2]}</p></article>`).join('')}</div>`;
 else if(name==='kajian')c.innerHTML=`<article class="bm-card" style="text-align:left"><div class="bm-kicker">Majelis Tabligh • Pengajian Rutin</div><h3>Pengajian Rutin Ahad Wage PCM Somagede</h3><p>Ruang pembinaan keislaman, penguatan silaturahmi, dan pendalaman pemahaman agama yang dilaksanakan secara berkala oleh Majelis Tabligh PCM Somagede.</p><div class="bm-info-grid">${[['Hari','Ahad Wage'],['Tanggal','30 Agustus 2026'],['Waktu','08.30 WIB s.d. selesai'],['Tempat','Masjid Baitul Arqom SMK Muhammadiyah Somagede'],['Pembicara','Ust. Drs. H. M. Sunhaji'],['Penyelenggara','Majelis Tabligh PCM Somagede']].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}</div></article>`;
 else if(name==='agenda')c.innerHTML=`<article class="bm-card" style="text-align:left"><div class="bm-kicker">Agenda Persyarikatan</div><h3>Rapat Periodik PDM Banyumas di PCM Somagede</h3><p>PCM Somagede menjadi tuan rumah Rapat Periodik Pimpinan Daerah Muhammadiyah Banyumas sebagai ruang koordinasi, evaluasi program, penyelarasan agenda, dan penguatan sinergi persyarikatan dari tingkat daerah hingga cabang dan ranting.</p><div class="bm-highlight"><span>Tempat</span><strong>PCM Somagede • Kabupaten Banyumas</strong></div></article>`;
 else c.innerHTML=`<div class="org-shell"><div class="org-root"><span>PCM SOMAGEDE</span><h3>Susunan Lengkap PCM Somagede</h3><p>Periode 2020–2026</p></div><div class="org-leaders">${['Ketua — Drs. Bambang Budiarso','Ketua 1 — H. Moch El Badrun, S.Pd.I','Ketua 2 — H. Hari Indra Kustiwa, S.IP, S.Pd.','Sekretaris — Sunarso, S.Pd.I, Gr.','Wakil Sekretaris — Sukirman, S.Pd.M.Pd.','Bendahara — H. Haris Cahyadi','Wakil Bendahara — H. Arief Ritade Aswas, S.Pd.I, M.Pd.I.'].map(x=>`<div class="org-node">${x}</div>`).join('')}</div><h4 class="org-title">Majelis dan Unsur Pelaksana</h4><div class="org-units">${[['Tarjih dan Tajdid',['Muh. Prakoso, S.Pd.I','Pangarso Aminudin','Zaenal Musrofi']],['Tabligh',['Drs. H. Sumuyut','H. Paryono, S.Pd.','Marino, S.Pd.']],['Disdasmen',['Sartim, S.Pd.','H. Sayudi, S.Pd.','Sarjono, S.Pd.']],['Pend. Kader',['Aji Gunadi, BA','Danang Demas']],['Pelayanan Kesehatan',['H. Yulianto B.P, M.Kep (Alm)','H. Triyono','Gandar A., S.Kep']],['Pelayanan Sosial',['Saring Mulyadi','Pujo Mashuri','Nurdi']],['Ekonomi/Kewirausahaan',['Ardila Nugroho, S.Apt','Syahrir','Salud']],['Wakaf/Kehartabendaan',['Sulam','Budi Waluyo','Suwito']],['Penanggulangan Bencana',['Sutarjo','Ir. Udiarto, M.T','Kholid Ismawan, S.Sos']],['LAZISMU',['Muh. Anggun','Sumari']],['Seni & Olahraga',['Sudarno, S.Pd.','Andy Suyadi, S.Pd.','Rekarso, S.Pd.']]].map(([n,m])=>`<div class="org-unit"><h4>${n}</h4>${m.map(x=>`<span>${x}</span>`).join('')}</div>`).join('')}</div></div>`;
}

function installNavigation(){
 document.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="#"]');
  if(!link)return;
  e.preventDefault();
  const sub=link.closest('.nav-drop');
  const id=(link.getAttribute('href')||'').slice(1);
  if(sub){
   const parentId=(sub.querySelector('.nav-parent')?.getAttribute('href')||'').slice(1);
   if(parentId==='berita'&&beritaTabs.includes(id)){showPanel('berita');beritaState=id;setBeritaTab(id);return}
   if(panels.has(parentId)){showPanel(parentId);return}
  }
  if(id==='berita'){showPanel('berita');beritaState='profil';setBeritaTab('profil');return}
  if(panels.has(id))showPanel(id);
 },true);
}

function installClock(){const el=$('#clock');if(!el)return;const tick=()=>{el.textContent=new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())+' WIB · '+new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())};tick();setInterval(tick,1000)}
function installTicker(){const t=$('.ticker-track'),f=t?.firstElementChild;if(!t||!f)return;const sync=()=>t.style.setProperty('--ticker-distance',Math.ceil(f.getBoundingClientRect().width)+'px');sync();addEventListener('resize',sync,{passive:true});if('ResizeObserver'in window)new ResizeObserver(sync).observe(f)}
function installPrayer(){const ps=$('#ps'),names=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];const load=async(lat=-7.527,lon=109.334,label='Somagede')=>{try{const d=new Date(),k=String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear();const r=await fetch(`https://api.aladhan.com/v1/timings/${k}?latitude=${lat}&longitude=${lon}&method=20`);const j=await r.json();names.forEach(n=>{const el=$(`[data-p="${n}"]`);if(el)el.textContent=(j?.data?.timings?.[n]||'--:--').split(' ')[0]});if(ps)ps.textContent='Lokasi '+label+' · jadwal diperbarui'}catch{if(ps)ps.textContent='Jadwal Somagede'}};load();$('#gps')?.addEventListener('click',()=>navigator.geolocation?.getCurrentPosition(p=>load(p.coords.latitude,p.coords.longitude,'GPS')))}
function boot(){injectUI();renderBeritaShell();installNavigation();installClock();installTicker();installPrayer();showPanel('beranda')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();