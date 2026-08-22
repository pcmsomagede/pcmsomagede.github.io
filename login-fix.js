/* PCM Somagede — robust login bridge */
(() => {
  'use strict';
  const EMAIL_KEY = 'pcm_login_email';
  const SUPABASE_URL = 'https://yjergotkwxxrmhtziwo.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_Af1OUCyR5kOMOzXnPGDp5w_ucoze69A';

  const api = async (path, options = {}) => {
    const res = await fetch(SUPABASE_URL + path, {
      ...options,
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    let body = null;
    try { body = await res.json(); } catch (_) {}
    if (!res.ok) throw new Error(body?.msg || body?.message || body?.error_description || body?.error || `HTTP ${res.status}`);
    return body;
  };

  function message(view, text, ok = false) {
    let el = view.querySelector('.pcm-login-message');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pcm-login-message notice';
      el.style.marginTop = '12px';
      view.querySelector('.card')?.appendChild(el);
    }
    el.textContent = text;
    el.style.background = ok ? '#e9f8ef' : '#fff4e5';
    el.style.color = ok ? '#17663b' : '#7a4a00';
  }

  function togglePassword(input, button) {
    if (!input || !button || button.dataset.bound) return;
    button.dataset.bound = '1';
    button.type = 'button';
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.textContent = show ? '🙈 Sembunyikan' : '👁 Lihat';
    });
  }

  async function signIn(view, email, password, button) {
    const e = email.value.trim();
    const p = password.value;
    if (!e || !p) { message(view, 'Email dan password wajib diisi.'); return; }
    button.disabled = true;
    const old = button.textContent;
    button.textContent = 'Memproses…';
    try {
      const session = await api('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email: e, password: p })
      });
      localStorage.setItem(EMAIL_KEY, e);
      localStorage.setItem('pcm_supabase_session', JSON.stringify(session));
      const rows = await api('/rest/v1/profiles?select=role,aktif,nama&id=eq.' + encodeURIComponent(session.user.id) + '&limit=1', {
        headers: { Authorization: 'Bearer ' + session.access_token }
      });
      const profile = Array.isArray(rows) ? rows[0] : null;
      const role = profile?.aktif ? profile.role : null;
      if (!['admin', 'editor'].includes(role)) {
        message(view, 'Login berhasil, tetapi akun ini belum memiliki otoritas Editor.');
        return;
      }
      document.getElementById('editorBtn')?.classList.remove('hidden');
      message(view, 'Login berhasil. Otoritas Editor aktif.', true);
      setTimeout(() => { if (typeof window.go === 'function') window.go('editor'); }, 350);
    } catch (error) {
      message(view, 'Login gagal: ' + error.message);
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  async function sendReset(view, email, button) {
    const e = email.value.trim();
    if (!e) { message(view, 'Isi email terlebih dahulu.'); email.focus(); return; }
    button.disabled = true;
    const old = button.textContent;
    button.textContent = 'Mengirim…';
    try {
      await api('/auth/v1/recover', {
        method: 'POST',
        body: JSON.stringify({
          email: e,
          redirect_to: location.origin + location.pathname + '?reset=1'
        })
      });
      localStorage.setItem(EMAIL_KEY, e);
      message(view, 'Tautan reset password sudah dikirim. Periksa inbox dan folder spam.', true);
    } catch (error) {
      message(view, 'Gagal mengirim tautan reset: ' + error.message);
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  function ensureResetView() {
    let view = document.getElementById('reset');
    if (view) return view;
    view = document.createElement('section');
    view.className = 'view';
    view.id = 'reset';
    view.innerHTML = '<div class="card" style="max-width:520px;margin:auto"><h2>Buat password baru</h2><label class="muted" for="pcmNewPassword">Password baru</label><div style="position:relative"><input class="field" id="pcmNewPassword" type="password" autocomplete="new-password" placeholder="Password baru" style="padding-right:115px"><button type="button" id="pcmShowNewPassword" class="btn" style="position:absolute;right:8px;top:5px">👁 Lihat</button></div><button type="button" id="pcmSaveNewPassword" class="btn primary">Simpan password baru</button><div class="pcm-reset-message notice hidden" style="margin-top:12px"></div></div>';
    document.querySelector('main')?.appendChild(view);
    return view;
  }

  async function updatePassword(view) {
    const token = new URLSearchParams(location.hash.replace(/^#/, '')).get('access_token');
    const input = view.querySelector('#pcmNewPassword');
    const button = view.querySelector('#pcmSaveNewPassword');
    const out = view.querySelector('.pcm-reset-message');
    if (!token) { out.textContent = 'Tautan reset tidak valid atau sudah kedaluwarsa.'; out.classList.remove('hidden'); return; }
    if (!input.value || input.value.length < 8) { out.textContent = 'Gunakan password minimal 8 karakter.'; out.classList.remove('hidden'); return; }
    button.disabled = true;
    try {
      await api('/auth/v1/user', {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + token },
        body: JSON.stringify({ password: input.value })
      });
      out.textContent = 'Password berhasil diperbarui. Silakan login dengan password baru.';
      out.classList.remove('hidden');
      out.style.background = '#e9f8ef';
      out.style.color = '#17663b';
      setTimeout(() => {
        history.replaceState({}, document.title, location.pathname);
        if (typeof window.go === 'function') window.go('login');
      }, 900);
    } catch (error) {
      out.textContent = 'Gagal memperbarui password: ' + error.message;
      out.classList.remove('hidden');
    } finally {
      button.disabled = false;
    }
  }

  function setup() {
    const view = document.getElementById('login');
    if (!view || view.dataset.loginFixed) return;
    const inputs = [...view.querySelectorAll('input')];
    const email = inputs.find(x => x.id === 'loginUser') || inputs.find(x => x.type === 'email') || inputs[0];
    const password = inputs.find(x => x.id === 'loginPass') || inputs.find(x => x.type === 'password') || inputs[1];
    const button = [...view.querySelectorAll('button')].find(b => /masuk|login/i.test(b.textContent));
    if (!email || !password || !button) return;
    view.dataset.loginFixed = '1';

    email.type = 'email';
    email.name = 'email';
    email.autocomplete = 'username';
    email.placeholder = 'Email';
    password.name = 'password';
    password.autocomplete = 'current-password';
    try { if (!email.value) email.value = localStorage.getItem(EMAIL_KEY) || ''; } catch (_) {}
    email.addEventListener('input', () => { try { localStorage.setItem(EMAIL_KEY, email.value.trim()); } catch (_) {} });

    button.removeAttribute('onclick');
    button.onclick = null;
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      signIn(view, email, password, button);
    }, true);

    const wrap = password.parentElement;
    if (wrap) {
      wrap.style.position = 'relative';
      password.style.paddingRight = '115px';
      let toggle = wrap.querySelector('.pcm-pass-toggle');
      if (!toggle) {
        toggle = document.createElement('button');
        toggle.className = 'btn pcm-pass-toggle';
        toggle.textContent = '👁 Lihat';
        toggle.style.cssText = 'position:absolute;right:8px;top:5px;z-index:4';
        wrap.appendChild(toggle);
      }
      togglePassword(password, toggle);
    }

    let forgot = view.querySelector('.pcm-forgot');
    if (!forgot) {
      forgot = document.createElement('button');
      forgot.type = 'button';
      forgot.className = 'btn pcm-forgot';
      forgot.textContent = 'Lupa password?';
      forgot.style.marginLeft = '8px';
      button.parentNode?.appendChild(forgot);
    }
    forgot.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      sendReset(view, email, forgot);
    }, true);

    const resetView = ensureResetView();
    const resetPassword = resetView.querySelector('#pcmNewPassword');
    togglePassword(resetPassword, resetView.querySelector('#pcmShowNewPassword'));
    const saveReset = resetView.querySelector('#pcmSaveNewPassword');
    if (!saveReset.dataset.bound) {
      saveReset.dataset.bound = '1';
      saveReset.addEventListener('click', () => updatePassword(resetView));
    }

    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (params.get('reset') === '1' && hash.get('access_token')) {
      if (typeof window.go === 'function') window.go('reset');
    }
  }

  setup();
  document.addEventListener('DOMContentLoaded', setup);
  document.addEventListener('click', () => setTimeout(setup, 50));
  new MutationObserver(() => setTimeout(setup, 0)).observe(document.documentElement, { childList: true, subtree: true });
})();
