/* PCM Somagede — persistent form input UX + password preview */
(() => {
  'use strict';
  const PREFIX = 'pcm_form_';
  const keyFor = (el) => PREFIX + (el.id || el.name || el.placeholder || 'field').replace(/\s+/g, '_').toLowerCase();

  function remember(el) {
    if (!el || el.type === 'password' || el.type === 'file' || el.type === 'hidden') return;
    const key = keyFor(el);
    try { if (!el.value) el.value = localStorage.getItem(key) || ''; } catch (_) {}
    if (el.dataset.pcmRememberBound) return;
    el.dataset.pcmRememberBound = '1';
    const save = () => { try { localStorage.setItem(key, el.value); } catch (_) {} };
    el.addEventListener('input', save);
    el.addEventListener('change', save);
  }

  function passwordPreview(el) {
    if (!el || el.type !== 'password' || el.dataset.pcmPreviewBound) return;
    el.dataset.pcmPreviewBound = '1';
    el.autocomplete = 'current-password';
    const wrap = el.parentElement;
    if (!wrap) return;
    wrap.style.position = 'relative';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pcm-password-toggle';
    btn.textContent = 'Preview password';
    btn.setAttribute('aria-label', 'Preview password');
    btn.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);padding:7px 10px;border:1px solid #dbe7f3;border-radius:8px;background:#fff;color:#062a63;font-weight:800;cursor:pointer;z-index:2';
    btn.addEventListener('click', () => {
      const hidden = el.type === 'password';
      el.type = hidden ? 'text' : 'password';
      btn.textContent = hidden ? 'Sembunyikan password' : 'Preview password';
    });
    wrap.appendChild(btn);
  }

  function apply() {
    document.querySelectorAll('input, textarea').forEach(el => {
      if (el.type === 'password') passwordPreview(el);
      else remember(el);
    });
    const user = document.getElementById('loginUser');
    const pass = document.getElementById('loginPass');
    if (user) {
      user.type = 'email';
      user.name = 'email';
      user.autocomplete = 'username';
      remember(user);
    }
    if (pass) passwordPreview(pass);
  }

  apply();
  document.addEventListener('click', () => setTimeout(apply, 40));
  new MutationObserver(apply).observe(document.body, { childList: true, subtree: true });
})();
