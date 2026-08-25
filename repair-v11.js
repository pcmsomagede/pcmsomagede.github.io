(()=>{
'use strict';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];

function dedupePrayer(){
  const hero=$('.hero');
  const widgets=$$('.prayer');
  if(!hero || !widgets.length)return;
  let keeper=widgets.find(w=>hero.contains(w))||widgets[0];
  if(!hero.contains(keeper))hero.appendChild(keeper);
  widgets.forEach(w=>{if(w!==keeper)w.remove()});
  keeper.hidden=false;
  keeper.style.removeProperty('display');
  keeper.style.removeProperty('visibility');
}

function repairTicker(){
  const ticker=$('.ticker');
  const track=$('.ticker-track');
  if(!ticker||!track)return;
  const first=track.firstElementChild;
  if(!first)return;

  const text=first.textContent.trim();
  track.innerHTML='';
  const a=document.createElement('span');
  const b=document.createElement('span');
  a.textContent=text;
  b.textContent=text;
  b.setAttribute('aria-hidden','true');
  track.append(a,b);

  const styleId='pcm-ticker-v11-style';
  if(!document.getElementById(styleId)){
    const s=document.createElement('style');
    s.id=styleId;
    s.textContent=`
      .ticker{overflow:hidden!important;contain:paint!important;position:relative!important}
      .ticker-track{display:flex!important;width:max-content!important;min-width:max-content!important;animation:none!important;animation-play-state:running!important;transform:translate3d(0,0,0)!important;will-change:transform!important}
      .ticker-track span{display:block!important;flex:0 0 auto!important;width:max-content!important;min-width:max-content!important}
    `;
    document.head.appendChild(s);
  }

  let half=0;
  let x=0;
  let last=performance.now();
  let running=true;

  const measure=()=>{
    half=Math.max(1,Math.ceil(a.getBoundingClientRect().width));
    x=((x%half)+half)%half;
    x=-x;
    track.style.transform=`translate3d(${x}px,0,0)`;
  };
  const frame=now=>{
    const dt=Math.min(50,Math.max(0,now-last));
    last=now;
    if(running&&half>1){
      x-=0.075*dt;
      if(x<=-half)x+=half;
      track.style.transform=`translate3d(${x}px,0,0)`;
    }
    requestAnimationFrame(frame);
  };
  measure();
  addEventListener('resize',measure,{passive:true});
  if('ResizeObserver'in window)new ResizeObserver(measure).observe(a);
  document.addEventListener('visibilitychange',()=>{running=document.visibilityState==='visible';last=performance.now()});
  requestAnimationFrame(frame);
}

function start(){
  dedupePrayer();
  repairTicker();
  const observer=new MutationObserver(()=>{
    dedupePrayer();
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
