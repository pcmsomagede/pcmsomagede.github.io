/* PCM Somagede — login bridge */
(() => {
  'use strict';
  const EMAIL_KEY = 'pcm_login_email';
  function setup() {
    const view = document.getElementById('login');
    if (!view || view.dataset.loginFixed) return;
    const inputs = [...view.querySelectorAll('input')];
    const email = inputs[0];
    const password = inputs[1];
    const button = [...view.querySelectorAll('button')].find(b => /masuk|login/i.test(b.textContent));
    if (!email || !password || !button) return;
    view.dataset.loginFixed = '1';
    email.type = 'email';
    email.name = 'email';
    email.autocomplete = 'username';
    email.placeholder = 'Email';
    password.name = 'password';
    password.autocomplete = 'current-password';
    const saved = localStorage.getItem(EMAIL_KEY);
    if (saved && !email.value) email.value = saved;
    email.addEventListener('input', () => localStorage.setItem(EMAIL_KEY, email.value.trim()));
    button.removeAttribute('onclick');
    button.onclick = null;
    if (!view.querySelector('.pcm-pass-toggle')) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;gap:8px;align-items:center;margin:5px 0 10px';
      password.style.marginBottom = '0';
      password.style.flex = '1';
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'btn pcm-pass-toggle';
      toggle.textContent = 'Preview password';
      toggle.addEventListener('click', () => {
        const shown = password.type === 'text';
        password.type = shown ? 'password' : 'text';
        toggle.textContent = shown ? 'Preview password' : 'Sembunyikan password';
      });
      password.parentNode.insertBefore(wrap, password.nextSibling);
      wrap.appendChild(toggle);
    }
    const old = view.querySelector('.pcm-auth-message');
    if (old) old.remove();
  }
  document.addEventListener('DOMContentLoaded', setup);
  document.addEventListener('click', () => setTimeout(setup, 0));
  setup();
})();
