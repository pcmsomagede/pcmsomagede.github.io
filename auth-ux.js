/* PCM Somagede — login UX: remember email + password visibility */
(() => {
  'use strict';
  const EMAIL_KEY = 'pcm_login_email';
  const fieldKey = el => 'pcm_form_' + (el.id || el.name || el.placeholder || 'field').replace(/\s+/g, '_').toLowerCase();

  function rememberField(el) {
    if (!el || ['password','file','hidden'].includes(el.type)) return;
    const key = fieldKey(el);
    try { if (!el.value) el.value = localStorage.getItem(key) || ''; } catch (_) {}
    if (el.dataset.pcmRemember) return;
    el.dataset.pcmRemember = '1';
    const save = () => { try { localStorage.setItem(key, el.value); } catch (_) {} };
    el.addEventListener('input', save);
    el.addEventListener('change', save);
  }

  function addPasswordToggle(el) {
    if (!el || el.type !== 'password' || el.dataset.pcmPasswordToggle) return;
    el.dataset.pcmPasswordToggle = '1';
    el.autocomplete = 'current-password';
    const wrap = el.parentElement;
    if (!wrap) return;
    wrap.style.position = 'relative';
    el.style.paddingRight = '125px';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pcm-password-toggle';
    btn.textContent = '👁 Lihat';
    btn.setAttribute('aria-label','Tampilkan password');
    btn.style.cssText = 'position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:6px 9px;border:1px solid #dbe7f3;border-radius:8px;background:#fff;color:#062a63;font-weight:800;cursor:pointer;z-index:5;line-height:1.2';
    btn.addEventListener('click', () => {
      const show = el.type === 'password';
      el.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈 Sembunyikan' : '👁 Lihat';
      btn.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password');
    });
    wrap.appendChild(btn);
  }

  function apply() {
    const login = document.getElementById('login');
    if (login) {
      const inputs = [...login.querySelectorAll('input')];
      const email = document.getElementById('loginUser') || inputs.find(x => x.type === 'email') || inputs[0];
      const password = document.getElementById('loginPass') || inputs.find(x => x.type === 'password') || inputs[1];
      if (email) {
        email.id = email.id || 'loginUser';
        email.name = 'email';
        email.type = 'email';
        email.autocomplete = 'username';
        try { if (!email.value) email.value = localStorage.getItem(EMAIL_KEY) || ''; } catch (_) {}
        if (!email.dataset.pcmEmailRemember) {
          email.dataset.pcmEmailRemember = '1';
          email.addEventListener('input', () => { try { localStorage.setItem(EMAIL_KEY, email.value); } catch (_) {} });
          email.addEventListener('change', () => { try { localStorage.setItem(EMAIL_KEY, email.value); } catch (_) {} });
        }
      }
      if (password) addPasswordToggle(password);
    }
    document.querySelectorAll('textarea').forEach(rememberField);
    document.querySelectorAll('input').forEach(el => {
      if (el.type === 'password') addPasswordToggle(el);
      else rememberField(el);
    });
  }

  apply();
  document.addEventListener('DOMContentLoaded', apply);
  document.addEventListener('click', () => setTimeout(apply, 80));
  new MutationObserver(apply).observe(document.documentElement, {childList:true, subtree:true});
})();
