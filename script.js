(()=>{
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const panels=['beranda','berita','pustaka','kta','arsip','suara','kontak'];
const beritaTabs=['profil','kajian','agenda','struktur'];
let activePanel='beranda';
let activeBerita='profil';

function panel(id){
  const target=document.getElementById(id)||document.getElementById('beranda');
  $$('.panel').forEach(p=>p.classList.toggle('active',p===target));
  activePanel=target.id;
  window.scrollTo({top:0,left:0,behavior:'auto'});
}

function paintTopNav(){
  $$('.nav-item').forEach(a=>a.removeAttribute('aria-current'));
  const a=$(`.nav-item[href="#${activePanel}"]`);
  if(a)a.setAttribute('aria-current','page');
}

function setBeritaTab(name){
  if(!beritaTabs.includes(name))name='profil';
  activeBerita=name;
  $$('#bmTabs [data-bm]').forEach(b=>{
    const on=b.dataset.bm===name;
    b.classList.toggle('active',on);
    b.setAttribute('aria-selected',String(on));
  });
  renderBerita(name);
}

function open(id,sub){
  if(id==='berita'){
    panel('berita');
    renderBerita(activeBerita=sub||'profil');
  }else{
    panel(panels.includes(id)?id:'beranda');
  }
  paintTopNav();
}

function installNavigation(){
  document.addEventListener('click',e=>{
    const link=e.target.closest('a');
    if(!link)return;
    const href=link.getAttribute('href')||'';
    if(!href.startsWith('#'))return;
    e.preventDefault();
    e.stopPropagation();
    const id=href.slice(1);
    const parent=link.closest('.nav-drop');
    if(parent){
      const parentLink=parent.querySelector('.nav-parent');
      const parentId=(parentLink?.getAttribute('href')||'').slice(1);
      if(parentId==='berita' && beritaTabs.includes(id)) open('berita',id);
      else if(panels.includes(parentId)) open(parentId);
      return;
    }
    if(id==='berita')open('berita','profil');
    else if(panels.includes(id))open(id);
  },true);
}

function normalizePanelState(){
  const hash=(location.hash||'').slice(1);
  if(hash.startsWith('berita-')){
    const tab=hash.slice(7);
    open('berita',beritaTabs.includes(tab)?tab:'profil');
  }else if(panels.includes(hash)){
    open(hash);
  }else{
    open('beranda');
  }
}

function installHistory(){
  addEventListener('popstate',normalizePanelState);
}

function renderBerita(name){
  const content=$('#bmContent');
  if(!content)return;
  setTimeout(()=>{
    if(name==='profil')renderProfil(content);
    else if(name==='kajian')renderKajian(content);
    else if(name==='agenda')renderAgenda(content);
    else renderStruktur(content);
    setBeritaButtonOnly(name);
  },0);
}

function setBeritaButtonOnly(name){
  $$('#bmTabs [data-bm]').forEach(b=>{
    const on=b.dataset.bm===name;
    b.classList.toggle('active',on);
    b.setAttribute('aria-selected',String(on));
  });
}

const people=[
 ['Ketua 1','Drs. Bambang Budiarso','665.636','pimpinan-1.png'],
 ['Ketua 2','H. Hari Indra Kustiwa, S.IP, S.Pd.','665.640','pimpinan-2.png'],
 ['Ketua 3','H. Moch El Badrun, S.Pd.I','660.987','pimpinan-3.png'],
 ['Sekretaris 1','Sunarso, S.Pd.I, Gr.','1030.113','pimpinan-4.png'],
 ['Sekretaris 2','Sukirman, S.Pd.M.Pd.','-','pimpinan-5.png'],
 ['Bendahara 1','H. Haris Cahyadi','-','pimpinan-6.jpeg'],
 ['Bendahara 2','H. Arief Ritade Aswas, S.Pd.I, M.Pd.I.','1030.180','pimpinan-7.jpeg']
];

function card(t){return `<article class="bm-card">${t}</article>`}
function renderProfil(c){
  c.innerHTML=`<div class="bm-profile-grid">${people.map(p=>card(`<div class="leader-photo"><img src="${p[3]}" alt="${p[1]}" loading="eager" decoding="async"></div><div class="leader-role">${p[0]}</div><h3>${p[1]}</h3><p>NBM : ${p[2]}</p>`)).join('')}</div>`;
}
function renderKajian(c){
  c.innerHTML=card(`<div class="bm-kicker">Majelis Tabligh • Pengajian Rutin</div><h3>Pengajian Rutin Ahad Wage PCM Somagede</h3><p>Ruang pembinaan keislaman, penguatan silaturahmi, dan pendalaman pemahaman agama yang dilaksanakan secara berkala oleh Majelis Tabligh PCM Somagede.</p><div class="bm-info-grid">${[['Hari','Ahad Wage'],['Tanggal','30 Agustus 2026'],['Waktu','08.30 WIB s.d. selesai'],['Tempat','Masjid Baitul Arqom SMK Muhammadiyah Somagede'],['Pembicara','Ust. Drs. H. M. Sunhaji'],['Penyelenggara','Majelis Tabligh PCM Somagede']].map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}</div>`);
}
function renderAgenda(c){
  c.innerHTML=card(`<div class="bm-kicker">Agenda Persyarikatan</div><h3>Rapat Periodik PDM Banyumas di PCM Somagede</h3><p>PCM Somagede menjadi tuan rumah Rapat Periodik Pimpinan Daerah Muhammadiyah Banyumas sebagai ruang koordinasi, evaluasi program, penyelarasan agenda, dan penguatan sinergi persyarikatan dari tingkat daerah hingga cabang dan ranting.</p><div class="bm-highlight"><span>Tempat</span><strong>PCM Somagede • Kabupaten Banyumas</strong></div>`);
}
function renderStruktur(c){
  const units=[
   ['Tarjih dan Tajdid',['Muh. Prakoso, S.Pd.I','Pangarso Aminudin','Zaenal Musrofi']],
   ['Tabligh',['Drs. H. Sumuyut','H. Paryono, S.Pd.','Marino, S.Pd.']],
   ['Disdasmen',['Sartim, S.Pd.','H. Sayudi, S.Pd.','Sarjono, S.Pd.']],
   ['Pend. Kader',['Aji Gunadi, BA','Danang Demas']],
   ['Pelayanan Kesehatan',['H. Yulianto B.P, M.Kep (Alm)','H. Triyono','Gandar A., S.Kep']],
   ['Pelayanan Sosial',['Saring Mulyadi','Pujo Mashuri','Nurdi']],
   ['Ekonomi/Kewirausahaan',['Ardila Nugroho, S.Apt','Syahrir','Salud']],
   ['Wakaf/Kehartabendaan',['Sulam','Budi Waluyo','Suwito']],
   ['Penanggulangan Bencana',['Sutarjo','Ir. Udiarto, M.T','Kholid Ismawan, S.Sos']],
   ['LAZISMU',['Muh. Anggun','Sumari']],
   ['Seni & Olahraga',['Sudarno, S.Pd.','Andy Suyadi, S.Pd.','Rekarso, S.Pd.']]
  ];
  c.innerHTML=`<div class="org-shell"><div class="org-root"><span>PCM SOMAGEDE</span><h3>Susunan Lengkap PCM Somagede</h3><p>Periode 2020–2026</p></div><div class="org-leaders">${['Ketua — Drs. Bambang Budiarso','Ketua 1 — H. Moch El Badrun, S.Pd.I','Ketua 2 — H. Hari Indra Kustiwa, S.IP, S.Pd.','Sekretaris — Sunarso, S.Pd.I, Gr.','Wakil Sekretaris — Sukirman, S.Pd.M.Pd.','Bendahara — H. Haris Cahyadi','Wakil Bendahara — H. Arief Ritade Aswas, S.Pd.I, M.Pd.I.'].map(x=>`<div class="org-node">${x}</div>`).join('')}</div><h4 class="org-title">Majelis dan Unsur Pelaksana</h4><div class="org-units">${units.map(([n,m])=>`<div class="org-unit"><h4>${n}</h4>${m.map(x=>`<span>${x}</span>`).join('')}</div>`).join('')}</div></div>`;
}

function renderBeritaShell(){
  const sec=$('#berita');
  if(!sec)return;
  sec.innerHTML=`<div class="berita-shell"><header class="berita-head"><div class="bm-kicker">PCM SOMAGEDE • BANYUMAS</div><h2>BeritaMu</h2><p>Informasi kepemimpinan, kajian, agenda dan struktur persyarikatan.</p></header><div id="bmTabs" class="berita-tabs" role="tablist">${[['profil','Profil Pimpinan'],['kajian','Kajian Rutin'],['agenda','Agenda Persyarikatan'],['struktur','Susunan Lengkap PCM Somagede']].map((x,i)=>`<button type="button" class="berita-tab${i===0?' active':''}" data-bm="${x[0]}" role="tab" aria-selected="${i===0}">${x[1]}</button>`).join('')}</div><div id="bmContent"></div></div>`;
  $$('#bmTabs [data-bm]').forEach(b=>b.addEventListener('click',()=>{activeBerita=b.dataset.bm;renderBerita(activeBerita)}));
  renderBerita(activeBerita);
}

function setClock(){const el=$('#clock');if(!el)return;el.textContent=new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())+' WIB · '+new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date())}
function installClock(){setClock();setInterval(setClock,1000)}
function installTicker(){const track=$('.ticker-track');if(!track)return;const sync=()=>{const first=track.firstElementChild;if(!first)return;track.style.setProperty('--ticker-distance',Math.ceil(first.getBoundingClientRect().width)+'px')};sync();addEventListener('resize',sync,{passive:true});if('ResizeObserver'in window)new ResizeObserver(sync).observe(track.firstElementChild)}
function installPrayer(){const names=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];const ps=$('#ps');const fallback={lat:-7.527,lon:109.334};async function load(lat,lon,label){try{const d=new Date(),k=String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear();const r=await fetch(`https://api.aladhan.com/v1/timings/${k}?latitude=${lat}&longitude=${lon}&method=20`);const j=await r.json();names.forEach(n=>{const el=$(`[data-p="${n}"]`);if(el)el.textContent=(j?.data?.timings?.[n]||'--:--').split(' ')[0]});if(ps)ps.textContent='Lokasi '+label+' · jadwal diperbarui';}catch{if(ps)ps.textContent='Jadwal Somagede'}}load(fallback.lat,fallback.lon,'Somagede');$('#gps')?.addEventListener('click',()=>navigator.geolocation?.getCurrentPosition(p=>load(p.coords.latitude,p.coords.longitude,'GPS')))}

if(document.readyState==='loading')addEventListener('DOMContentLoaded',boot,{once:true});else boot();
function boot(){
  renderBeritaShell();
  installNavigation();
  installHistory();
  installClock();
  installTicker();
  installPrayer();
  normalizePanelState();
  paintTopNav();
}
})();