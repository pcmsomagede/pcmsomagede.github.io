(() => {
  const clock=document.querySelector('[data-clock]');
  const update=()=>{if(clock)clock.textContent=new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date())+' WIB'};
  update();setInterval(update,1000);
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
})();
