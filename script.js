(() => {
  const clock=document.querySelector('[data-clock]');
  const date=document.querySelector('[data-date]');
  const tick=()=>{
    const now=new Date();
    if(clock) clock.textContent=new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now)+' WIB';
    if(date) date.textContent=new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now);
  };
  tick(); setInterval(tick,1000);
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());

  const prayerStatus=document.querySelector('#prayerStatus');
  const gps=document.querySelector('#gpsPrayer');
  const fallback={lat:-7.527,lon:109.334,label:'Somagede'};
  const names=['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];

  function setStatus(text){if(prayerStatus) prayerStatus.textContent=text;}
  function showTimes(timings,label){
    names.forEach(name=>{
      const el=document.querySelector(`[data-prayer="${name}"]`);
      if(el) el.textContent=(timings[name]||'--:--').split(' ')[0];
    });
    setStatus(`Lokasi ${label} • jadwal diperbarui`);
  }
  async function loadPrayer(lat,lon,label){
    setStatus('Memuat jadwal sholat…');
    const d=new Date();
    const dateKey=String(d.getDate()).padStart(2,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+d.getFullYear();
    const url=`https://api.aladhan.com/v1/timings/${dateKey}?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&method=20`;
    try{
      const res=await fetch(url,{cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const json=await res.json();
      if(!json.data?.timings) throw new Error('Data jadwal tidak tersedia');
      showTimes(json.data.timings,label);
    }catch(err){
      setStatus('Jadwal belum dapat dimuat. Coba GPS lagi.');
    }
  }
  loadPrayer(fallback.lat,fallback.lon,fallback.label);
  gps?.addEventListener('click',()=>{
    if(!navigator.geolocation){setStatus('GPS tidak tersedia di perangkat ini.');return;}
    setStatus('Meminta lokasi GPS…');
    navigator.geolocation.getCurrentPosition(
      p=>loadPrayer(p.coords.latitude,p.coords.longitude,'lokasi GPS'),
      ()=>setStatus('GPS ditolak. Menampilkan Somagede.')
    );
  });
})();
