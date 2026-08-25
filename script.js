(()=>{
  'use strict';

  const LEGACY='https://raw.githubusercontent.com/pcmsomagede/pcmsomagede.github.io/3b2322635ce06e956de78a411584373ff95b86e8/script.js';
  const panelIds=['beranda','berita','pustaka','kta','arsip','suara','kontak'];
  const beritaTabs=['profil','kajian','agenda','struktur'];

  function openPanel(id){
    const target=document.getElementById(id)||document.getElementById('beranda');
    document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p===target));
    window.scrollTo({top:Math.max(0,(document.querySelector('main')?.offsetTop||0)-8),behavior:'instant'});
  }

  function selectBerita(name){
    const btn=document.querySelector(`[data-bm="${name}"]`);
    if(btn){btn.click();return true;}
    return false;
  }

  function go(hash,tab){
    const clean=hash.replace(/^#/,'');
    history.pushState({tab:tab||null},'',tab?`#${hash.replace(/^#/,'')}`:`#${clean}`);
    if(tab){
      openPanel('berita');
      selectBerita(tab);
    }else if(panelIds.includes(clean)){
      openPanel(clean);
    }else{
      openPanel('beranda');
    }
  }

  function installNavigation(){
    document.addEventListener('click',e=>{
      const submenuLink=e.target.closest('.submenu a');
      if(submenuLink){
        const href=submenuLink.getAttribute('href')||'';
        const id=href.replace(/^#/,'');
        if(beritaTabs.includes(id)){
          e.preventDefault();
          e.stopImmediatePropagation();
          history.pushState({tab:id},'',`#berita-${id}`);
          openPanel('berita');
          selectBerita(id);
          return;
        }
        const parent=submenuLink.closest('.nav-drop')?.querySelector('.nav-parent');
        const parentHref=parent?.getAttribute('href')||'';
        const parentId=parentHref.replace(/^#/,'');
        if(panelIds.includes(parentId)){
          e.preventDefault();
          e.stopImmediatePropagation();
          history.pushState(null,'',`#${parentId}`);
          openPanel(parentId);
        }
      }

      const top=e.target.closest('.nav-item.nav-parent');
      if(top){
        const id=(top.getAttribute('href')||'').replace(/^#/,'');
        if(panelIds.includes(id)){
          e.preventDefault();
          e.stopImmediatePropagation();
          history.pushState(null,'',`#${id}`);
          openPanel(id);
          if(id==='berita')selectBerita('profil');
        }
      }
    },true);

    addEventListener('hashchange',()=>{
      const raw=(location.hash||'#beranda').slice(1);
      const m=raw.match(/^berita-(profil|kajian|agenda|struktur)$/);
      if(m){openPanel('berita');selectBerita(m[1]);return;}
      if(beritaTabs.includes(raw)){openPanel('berita');selectBerita(raw);history.replaceState({tab:raw},'',`#berita-${raw}`);return;}
      openPanel(raw);
    },true);

    if(location.hash){
      const raw=location.hash.slice(1);
      const m=raw.match(/^berita-(profil|kajian|agenda|struktur)$/);
      if(m){setTimeout(()=>{openPanel('berita');selectBerita(m[1]);},0);}
    }else{
      setTimeout(()=>openPanel('beranda'),0);
    }
  }

  function normalizeImages(){
    document.querySelectorAll('#bmContent img').forEach(img=>{
      const src=img.getAttribute('src')||'';
      const m=src.match(/https?:\/\/raw\.githubusercontent\.com\/pcmsomagede\/pcmsomagede\.github\.io\/[^/]+\/(.+)$/);
      if(m) img.src='/'+m[1];
      img.decoding='async';
      img.loading='eager';
    });
  }

  function installVisualPolish(){
    if(document.getElementById('pcm-runtime-style')) return;
    const s=document.createElement('style');
    s.id='pcm-runtime-style';
    s.textContent=`
      .panel.active{animation:pcmPanelIn .16s ease-out both}
      @keyframes pcmPanelIn{from{opacity:.72;transform:translateY(4px)}to{opacity:1;transform:none}}
      .nav-item:focus-visible,.berita-tab:focus-visible{outline:3px solid rgba(255,211,61,.75);outline-offset:2px}
      .nav-item,.berita-tab{touch-action:manipulation;-webkit-tap-highlight-color:transparent}
      #bmContent img{content-visibility:auto}
      @media(max-width:560px){.nav-inner{overflow:visible}.berita-tabs{position:sticky;top:0;z-index:20;padding:6px 0;background:rgba(245,249,253,.94);backdrop-filter:blur(8px)}}
      @media(prefers-reduced-motion:reduce){.panel.active{animation:none}}
    `;
    document.head.appendChild(s);
  }

  function registerOffline(){
    if(!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }

  const legacy=document.createElement('script');
  legacy.src=LEGACY;
  legacy.async=false;
  legacy.onload=()=>{
    normalizeImages();
    installVisualPolish();
    installNavigation();
    registerOffline();
    setTimeout(normalizeImages,120);
    setTimeout(normalizeImages,700);
  };
  legacy.onerror=()=>{
    installNavigation();
    installVisualPolish();
    registerOffline();
    openPanel('beranda');
  };
  document.head.appendChild(legacy);
})();