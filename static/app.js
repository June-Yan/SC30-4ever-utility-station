/* ===== SAKURA ===== */
function createSakura() {
  const container = $('#sakuraContainer');
  if (!container) return;
  const petals = ['🌸', '🎀', '✨', '💗', '🌷'];
  for (let i = 0; i < 15; i++) {
    const petal = document.createElement('span');
    petal.className = 'sakura';
    petal.textContent = petals[Math.floor(Math.random() * petals.length)];
    petal.style.left = Math.random() * 100 + '%';
    petal.style.fontSize = (.6 + Math.random() * .8) + 'rem';
    petal.style.animationDuration = (8 + Math.random() * 12) + 's';
    petal.style.animationDelay = Math.random() * 15 + 's';
    container.appendChild(petal);
  }
}

/* ===== UTILS ===== */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(msg, type = 'info') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 2500);
}

function copyText(text) {
  // navigator.clipboard only works in HTTPS or localhost
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback: use textarea trick (works in HTTP/LAN)
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); resolve(); }
    catch (e) { reject(e); }
    finally { document.body.removeChild(ta); }
  });
}

function showConfirm(msg) {
  return new Promise(resolve => {
    const o = $('#confirmOverlay');
    $('#confirmMsg').textContent = msg;
    o.classList.remove('hidden');
    const yes = $('#confirmYes');
    const no = $('#confirmNo');
    const cleanup = (val) => { o.classList.add('hidden'); resolve(val); };
    yes.onclick = () => cleanup(true);
    no.onclick = () => cleanup(false);
  });
}

function genId() { return 'custom_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function formatTime(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/* ===== STORAGE ===== */
const storage = {
  _prefix() {
    const user = auth.getUser();
    if (user && auth.getToken()) return 'u_' + user.id + '_';
    if (auth.isGuest()) return 'guest_';
    return '';
  },
  get(key, def) {
    try { const v = localStorage.getItem(this._prefix() + key); return v ? JSON.parse(v) : def; }
    catch { return def; }
  },
  set(key, val) {
    try { localStorage.setItem(this._prefix() + key, JSON.stringify(val)); } catch(e) { showToast('存储空间不足', 'error'); }
  },
  clearUserData() {
    const prefix = this._prefix();
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  },
  clearAllDataKeys() {
    const dataKeys = ['memo_list', 'countdown_list', 'countdown_target', 'weather_history', 'widget_config'];
    dataKeys.forEach(k => {
      localStorage.removeItem(k);
      // Also remove any user-prefixed versions
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const lk = localStorage.key(i);
        if (lk && (lk.endsWith('_' + k) || lk === k)) toRemove.push(lk);
      }
      toRemove.forEach(lk => localStorage.removeItem(lk));
    });
  }
};

/* ===== AUTH ===== */
const auth = {
  getToken() { return localStorage.getItem('utility_token') || ''; },
  getUser() { try { return JSON.parse(localStorage.getItem('utility_user') || 'null'); } catch { return null; } },
  setAuth(token, user) {
    localStorage.setItem('utility_token', token);
    localStorage.setItem('utility_user', JSON.stringify(user));
    localStorage.removeItem('utility_guest');
    this.updateNav();
  },
  clearAuth() {
    storage.clearUserData();
    localStorage.removeItem('utility_token');
    localStorage.removeItem('utility_user');
    localStorage.removeItem('utility_guest');
    this.updateNav();
  },
  isLoggedIn() { return !!this.getToken() || this.isGuest(); },
  isGuest() { return localStorage.getItem('utility_guest') === '1'; },
  isAdmin() { const u = this.getUser(); return u && u.is_admin === true; },
  setGuest() {
    localStorage.setItem('utility_guest', '1');
    this.updateNav();
  },
  updateNav() {
    const navUser = $('#navUser');
    const navEmail = $('#navUserEmail');
    const navMobileUser = $('#navMobileUser');
    const navMobileEmail = $('#navMobileEmail');
    const navAdminLink = $('#navAdminLink');
    const user = this.getUser();
    if (user && !!this.getToken()) {
      navUser.style.display = '';
      navEmail.textContent = user.email;
      navEmail.style.display = '';
      $('#navLogout').textContent = '退出';
      navMobileUser.style.display = '';
      navMobileEmail.textContent = user.email;
      $('#navMobileLogout').textContent = '🚪 退出登录';
      if (navAdminLink) navAdminLink.style.display = user.is_admin ? '' : 'none';
    } else if (this.isGuest()) {
      navUser.style.display = '';
      navEmail.style.display = 'none';
      $('#navLogout').textContent = '🔑 登录';
      navMobileUser.style.display = 'none';
      navMobileEmail.textContent = '🧑 游客模式';
      $('#navMobileLogout').textContent = '🔑 登录账号';
      if (navAdminLink) navAdminLink.style.display = 'none';
    } else {
      navUser.style.display = 'none';
      navEmail.textContent = '';
      navMobileUser.style.display = 'none';
      navMobileEmail.textContent = '';
      if (navAdminLink) navAdminLink.style.display = 'none';
    }
  },
  async api(path, options = {}) {
    const headers = options.headers || {};
    if (this.getToken()) headers['Authorization'] = 'Bearer ' + this.getToken();
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    const res = await fetch('/api/auth' + path, { ...options, headers });
    if (res.status === 401) { this.clearAuth(); showLoginPage(); }
    return res.json();
  },
  async sendCode(email) {
    return this.api('/send-code', { method: 'POST', body: JSON.stringify({ email }) });
  },
  async register(email, password, code) {
    const res = await this.api('/register', { method: 'POST', body: JSON.stringify({ email, password, code }) });
    if (res.code === 0) this.setAuth(res.data.token, res.data.user);
    return res;
  },
  async loginPassword(email, password) {
    const res = await this.api('/login-password', { method: 'POST', body: JSON.stringify({ email, password }) });
    if (res.code === 0) this.setAuth(res.data.token, res.data.user);
    return res;
  },
  async loginCode(email, code) {
    const res = await this.api('/login-code', { method: 'POST', body: JSON.stringify({ email, code }) });
    if (res.code === 0) this.setAuth(res.data.token, res.data.user);
    return res;
  },
  async getMe() {
    return this.api('/me');
  },
  async resetPassword(email, code, password) {
    return this.api('/reset-password', { method: 'POST', body: JSON.stringify({ email, code, password }) });
  }
};

/* ===== USAGE ===== */
const usageApi = {
  async record(toolId) {
    if (!auth.isLoggedIn()) return;
    try {
      const headers = { 'Authorization': 'Bearer ' + auth.getToken(), 'Content-Type': 'application/json' };
      await fetch('/api/usage/record', { method: 'POST', headers, body: JSON.stringify({ tool_id: toolId }) });
    } catch(e) {}
  },
  async getTop(limit = 6) {
    if (!auth.isLoggedIn()) return [];
    try {
      const headers = { 'Authorization': 'Bearer ' + auth.getToken() };
      const res = await fetch('/api/usage/top?limit=' + limit, { headers });
      const data = await res.json();
      return data.code === 0 ? data.data : [];
    } catch(e) { return []; }
  },
  async getRanking(limit = 50) {
    try {
      const res = await fetch('/api/usage/ranking?limit=' + limit);
      const data = await res.json();
      return data.code === 0 ? data.data : [];
    } catch(e) { return []; }
  }
};

/* ===== USER DATA API ===== */
const userdataApi = {
  async request(path, options = {}) {
    const headers = options.headers || {};
    if (auth.isLoggedIn()) headers['Authorization'] = 'Bearer ' + auth.getToken();
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    const res = await fetch('/api/userdata' + path, { ...options, headers });
    if (res.status === 401) { auth.clearAuth(); showLoginPage(); }
    return res.json();
  },
  // Memos
  async getMemos() { return this.request('/memos'); },
  async createMemo(data) { return this.request('/memos', { method: 'POST', body: JSON.stringify(data) }); },
  async updateMemo(id, data) { return this.request('/memos/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteMemo(id) { return this.request('/memos/' + id, { method: 'DELETE' }); },
  // Countdown
  async getCountdown() { return this.request('/countdown'); },
  async setCountdown(data) { return this.request('/countdown', { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteCountdown() { return this.request('/countdown', { method: 'DELETE' }); },
  // Countdown list (multi-target)
  async getCountdowns() { return this.request('/countdowns'); },
  async createCountdown(data) { return this.request('/countdowns', { method: 'POST', body: JSON.stringify(data) }); },
  async updateCountdown(id, data) { return this.request('/countdowns/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteCountdownItem(id) { return this.request('/countdowns/' + id, { method: 'DELETE' }); },
  // Weather history
  async getWeatherHistory() { return this.request('/weather-history'); },
  async addWeatherCity(city) { return this.request('/weather-history', { method: 'POST', body: JSON.stringify({ city }) }); },
  // Widget config
  async getWidgetConfig() { return this.request('/widget-config'); },
  async saveWidgetConfig(config) { return this.request('/widget-config', { method: 'PUT', body: JSON.stringify(config) }); },
  // Sync
  async sync(localData) { return this.request('/sync', { method: 'POST', body: JSON.stringify(localData) }); }
};

/* ===== SEARCH API ===== */
const searchApi = {
  async search(q) {
    try {
      const res = await fetch('/api/search?q=' + encodeURIComponent(q) + '&_t=' + Date.now());
      return res.json();
    } catch(e) { return { code: -1, data: [] }; }
  }
};

/* ===== RATING API ===== */
const ratingApi = {
  async submit(widget_id, rating) {
    const headers = { 'Authorization': 'Bearer ' + auth.getToken(), 'Content-Type': 'application/json' };
    const res = await fetch('/api/rating/', { method: 'POST', headers, body: JSON.stringify({ widget_id, rating }) });
    return res.json();
  },
  async get(widget_id) {
    try {
      const headers = {};
      if (auth.getToken()) headers['Authorization'] = 'Bearer ' + auth.getToken();
      const res = await fetch('/api/rating/?widget_id=' + encodeURIComponent(widget_id) + '&_t=' + Date.now(), { headers });
      return res.json();
    } catch(e) { return { code: -1, data: null }; }
  },
  async getRanking() {
    try {
      const res = await fetch('/api/rating/ranking?_t=' + Date.now());
      return res.json();
    } catch(e) { return { code: -1, data: [] }; }
  }
};

/* ===== STATS API ===== */
const statsApi = {
  async get() {
    try {
      const res = await fetch('/api/stats?_t=' + Date.now());
      return res.json();
    } catch(e) { return { code: -1, data: null }; }
  }
};

/* ===== ADMIN API ===== */
const adminApi = {
  async getDashboard() {
    const headers = { 'Authorization': 'Bearer ' + auth.getToken() };
    const res = await fetch('/api/admin/dashboard?_t=' + Date.now(), { headers });
    return res.json();
  }
};

/* ===== WORKSHOP API ===== */
const workshopApi = {
  async request(path, options = {}) {
    const headers = options.headers || {};
    if (auth.getToken()) headers['Authorization'] = 'Bearer ' + auth.getToken();
    if (options.body) headers['Content-Type'] = 'application/json';
    const res = await fetch('/api/workshop' + path, { ...options, headers });
    return res.json();
  },
  async getList() { return this.request('/'); },
  async getPending() { return this.request('/pending'); },
  async upload(data) { return this.request('/upload', { method: 'POST', body: JSON.stringify(data) }); },
  async review(id, action) { return this.request('/' + id + '/review', { method: 'POST', body: JSON.stringify({ action }) }); },
  async addToMyWidgets(id) { return this.request('/' + id + '/add', { method: 'POST' }); },
  async deleteWidget(id) { return this.request('/' + id, { method: 'DELETE' }); },
};

// Module-level cache
let _memoList = [];
let _countdownTarget = null;
let _countdownList = [];
let _weatherCities = [];
let _widgetConfig = null;

let _loginCountdown = 0;
let _loginCountdownTimer = null;

function showLoginPage() {
  const navbar = $('#navbar');
  navbar.style.display = 'none';
  const appEl = $('#app');
  appEl.innerHTML = renderLoginPage();
  initLoginPage();
}

function renderLoginPage() {
  return `
  <div class="login-page">
    <div class="login-header">
      <div class="login-logo">🌸</div>
      <h1>实用工具聚合站</h1>
      <p>登录后数据云端同步，也可游客模式快速使用 ♪</p>
    </div>
    <div class="login-card card">
      <div class="login-tab-bar">
        <div class="login-tab active" data-tab="password">密码登录</div>
        <div class="login-tab" data-tab="code">验证码登录</div>
        <div class="login-tab" data-tab="register">注册</div>
      </div>
      <div class="login-form">
        <div class="login-field">
          <input type="email" id="loginEmail" class="input" placeholder="请输入邮箱" />
        </div>
        <div class="login-field" id="loginPasswordField">
          <input type="password" id="loginPassword" class="input" placeholder="请输入密码" />
        </div>
        <div id="loginForgotLink" style="text-align:right;margin-top:-6px;margin-bottom:8px"><a href="#" id="loginForgotBtn" style="font-size:.82rem;color:var(--purple);text-decoration:none">忘记密码？</a></div>
        <div id="loginResetSection" style="display:none">
          <div class="login-field login-code-row">
            <input type="text" id="loginResetCode" class="input login-code-input" placeholder="6位验证码" maxlength="6" />
            <button class="btn btn-secondary login-code-btn" id="loginResetSendCodeBtn">获取验证码</button>
          </div>
          <div class="login-field">
            <input type="password" id="loginResetPassword" class="input" placeholder="设置新密码（至少6位）" />
          </div>
          <div id="loginResetError" class="login-error"></div>
          <button class="btn btn-primary" id="loginResetSubmitBtn" style="width:100%">重置密码</button>
          <div style="text-align:center;margin-top:8px"><a href="#" id="loginResetBackBtn" style="font-size:.82rem;color:var(--fg2);text-decoration:none">← 返回登录</a></div>
        </div>
        <div class="login-field login-code-row" id="loginCodeRow" style="display:none">
          <input type="text" id="loginCode" class="input login-code-input" placeholder="6位验证码" maxlength="6" />
          <button class="btn btn-secondary login-code-btn" id="loginSendCodeBtn">获取验证码</button>
        </div>
        <div class="login-field" id="loginRegPasswordField" style="display:none">
          <input type="password" id="loginRegPassword" class="input" placeholder="设置密码（至少6位）" />
        </div>
        <div id="loginDevCodeTip" class="login-dev-code" style="display:none"></div>
        <div id="loginError" class="login-error"></div>
        <button class="btn btn-primary login-submit-btn" id="loginSubmitBtn">登录</button>
        <div class="login-guest-row">
          <button class="btn btn-ghost" id="guestBtn">🧑 游客模式进入</button>
        </div>
      </div>
    </div>
  </div>`;
}

function initLoginPage() {
  let activeTab = 'password';
  let resetMode = false;
  const tabs = $$('.login-tab');
  const passwordField = $('#loginPasswordField');
  const forgotLink = $('#loginForgotLink');
  const resetSection = $('#loginResetSection');
  const codeRow = $('#loginCodeRow');
  const regPasswordField = $('#loginRegPasswordField');
  const submitBtn = $('#loginSubmitBtn');

  function updateTabUI() {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
    passwordField.style.display = activeTab === 'password' ? '' : 'none';
    forgotLink.style.display = activeTab === 'password' ? '' : 'none';
    resetSection.style.display = 'none';
    resetMode = false;
    codeRow.style.display = activeTab === 'code' || activeTab === 'register' ? 'flex' : 'none';
    regPasswordField.style.display = activeTab === 'register' ? '' : 'none';
    submitBtn.textContent = activeTab === 'register' ? '注册' : '登录';
  }

  function showResetMode() {
    resetMode = true;
    passwordField.style.display = 'none';
    forgotLink.style.display = 'none';
    resetSection.style.display = '';
    submitBtn.style.display = 'none';
    $('#loginResetError').textContent = '';
  }

  function hideResetMode() {
    resetMode = false;
    passwordField.style.display = '';
    forgotLink.style.display = '';
    resetSection.style.display = 'none';
    submitBtn.style.display = '';
  }

  tabs.forEach(t => t.addEventListener('click', () => { activeTab = t.dataset.tab; updateTabUI(); }));

  // Forgot password
  $('#loginForgotBtn').addEventListener('click', (e) => { e.preventDefault(); showResetMode(); });
  $('#loginResetBackBtn').addEventListener('click', (e) => { e.preventDefault(); hideResetMode(); });

  // Guest mode
  $('#guestBtn').addEventListener('click', () => {
    auth.setGuest();
    showToast('已进入游客模式，数据仅保存在本地', 'info');
    $('#navbar').style.display = '';
    auth.updateNav();
    navigate('home');
  });

  // Send code (for login/register)
  $('#loginSendCodeBtn').addEventListener('click', async () => {
    const email = $('#loginEmail').value.trim();
    if (!email || !email.includes('@')) { $('#loginError').textContent = '请输入有效的邮箱地址'; return; }
    const res = await auth.sendCode(email);
    if (res.code === 0) {
      _loginCountdown = 60;
      const btn = $('#loginSendCodeBtn');
      btn.disabled = true;
      btn.textContent = _loginCountdown + 's';
      clearInterval(_loginCountdownTimer);
      _loginCountdownTimer = setInterval(() => {
        _loginCountdown--;
        if (_loginCountdown <= 0) { clearInterval(_loginCountdownTimer); btn.disabled = false; btn.textContent = '获取验证码'; }
        else btn.textContent = _loginCountdown + 's';
      }, 1000);
      if (res.data && res.data.code) {
        const tip = $('#loginDevCodeTip');
        tip.textContent = '验证码：' + res.data.code;
        tip.style.display = '';
      }
      $('#loginError').textContent = '';
    } else {
      $('#loginError').textContent = res.message;
    }
  });

  // Send code (for reset password)
  $('#loginResetSendCodeBtn').addEventListener('click', async () => {
    const email = $('#loginEmail').value.trim();
    const errorEl = $('#loginResetError');
    if (!email || !email.includes('@')) { errorEl.textContent = '请输入有效的邮箱地址'; return; }
    const res = await auth.sendCode(email);
    if (res.code === 0) {
      const btn = $('#loginResetSendCodeBtn');
      btn.disabled = true;
      let cd = 60;
      btn.textContent = cd + 's';
      const timer = setInterval(() => {
        cd--;
        if (cd <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = '获取验证码'; }
        else btn.textContent = cd + 's';
      }, 1000);
      if (res.data && res.data.code) {
        const tip = $('#loginDevCodeTip');
        tip.textContent = '验证码：' + res.data.code;
        tip.style.display = '';
      }
      errorEl.textContent = '';
    } else {
      errorEl.textContent = res.message;
    }
  });

  // Reset password submit
  $('#loginResetSubmitBtn').addEventListener('click', async () => {
    const email = $('#loginEmail').value.trim();
    const code = $('#loginResetCode').value.trim();
    const pwd = $('#loginResetPassword').value;
    const errorEl = $('#loginResetError');
    errorEl.textContent = '';

    if (!email || !email.includes('@')) { errorEl.textContent = '请输入有效的邮箱地址'; return; }
    if (!code || code.length !== 6) { errorEl.textContent = '请输入6位验证码'; return; }
    if (!pwd || pwd.length < 6) { errorEl.textContent = '密码至少6位'; return; }

    const btn = $('#loginResetSubmitBtn');
    btn.disabled = true; btn.textContent = '处理中...';
    const res = await auth.resetPassword(email, code, pwd);
    btn.disabled = false; btn.textContent = '重置密码';

    if (res.code === 0) {
      showToast('密码重置成功，请使用新密码登录 ♪', 'success');
      hideResetMode();
      $('#loginPassword').focus();
    } else {
      errorEl.textContent = res.message;
    }
  });

  submitBtn.addEventListener('click', async () => {
    const email = $('#loginEmail').value.trim();
    const password = activeTab === 'register' ? $('#loginRegPassword').value : $('#loginPassword').value;
    const code = $('#loginCode').value.trim();
    const errorEl = $('#loginError');
    errorEl.textContent = '';

    if (!email || !email.includes('@')) { errorEl.textContent = '请输入有效的邮箱地址'; return; }

    let res;
    if (activeTab === 'password') {
      if (!password) { errorEl.textContent = '请输入密码'; return; }
      submitBtn.disabled = true; submitBtn.textContent = '处理中...';
      res = await auth.loginPassword(email, password);
    } else if (activeTab === 'code') {
      if (!code || code.length !== 6) { errorEl.textContent = '请输入6位验证码'; return; }
      submitBtn.disabled = true; submitBtn.textContent = '处理中...';
      res = await auth.loginCode(email, code);
    } else {
      if (!code || code.length !== 6) { errorEl.textContent = '请输入6位验证码'; return; }
      if (!password || password.length < 6) { errorEl.textContent = '密码至少6位'; return; }
      submitBtn.disabled = true; submitBtn.textContent = '处理中...';
      res = await auth.register(email, password, code);
    }

    submitBtn.disabled = false; submitBtn.textContent = activeTab === 'register' ? '注册' : '登录';

    if (res.code === 0) {
      showToast('登录成功 ♪', 'success');
      // Clear old cached data, then sync from server
      _memoList = [];
      _countdownTarget = null;
      _countdownList = [];
      _weatherCities = [];
      _widgetConfig = null;
      try {
        const syncRes = await userdataApi.sync({});
        if (syncRes.code === 0) {
          const d = syncRes.data;
          if (d.memo_list) { _memoList = d.memo_list; storage.set('memo_list', d.memo_list); }
          if (d.countdown_target !== undefined && d.countdown_target !== null) { _countdownTarget = d.countdown_target; storage.set('countdown_target', d.countdown_target); }
          if (d.weather_history) { _weatherCities = d.weather_history; storage.set('weather_history', d.weather_history); }
          if (d.widget_config) { _widgetConfig = d.widget_config; storage.set('widget_config', d.widget_config); }
        }
      } catch(e) {}
      $('#navbar').style.display = '';
      auth.updateNav();
      navigate('home');
    } else {
      errorEl.textContent = res.message;
    }
  });
}

/* ===== WIDGET CONFIG ===== */
const PRESET_WIDGETS = [
  { id: 'calculator', icon: '🧮', name: '计算器', desc: '加减乘除快速计算~' },
  { id: 'pomodoro', icon: '🍅', name: '番茄钟', desc: '25分钟专注，5分钟休息♪' },
  { id: 'bmi', icon: '📊', name: 'BMI计算', desc: '输入身高体重，一键计算♡' },
  { id: 'colorpicker', icon: '🎨', name: '取色器', desc: '颜色选取与格式转换✦' },
  { id: 'stopwatch', icon: '⏱️', name: '秒表', desc: '精确计时，记录圈数☆' },
  { id: 'charcount', icon: '📏', name: '字数统计', desc: '文本字数与字符统计~' },
  { id: 'random', icon: '🎲', name: '随机工具', desc: '随机数、抽签、掷骰子~' },
  { id: 'password', icon: '🔐', name: '密码生成器', desc: '自定义复杂度安全密码✦' },
  { id: 'converter', icon: '📐', name: '单位换算器', desc: '长度/重量/温度换算♡' },
];

function getDefaultWidgetConfig() {
  const enabledDefaults = ['calculator', 'bmi', 'charcount'];
  return {
    presets: PRESET_WIDGETS.map(p => ({ id: p.id, enabled: enabledDefaults.includes(p.id) })),
    customs: [],
    order: [...enabledDefaults]
  };
}

function getWidgetConfig() {
  if (_widgetConfig) {
    // Merge new presets that don't exist in saved config
    for (const p of PRESET_WIDGETS) {
      if (!_widgetConfig.presets.find(x => x.id === p.id)) {
        _widgetConfig.presets.push({ id: p.id, enabled: false });
      }
    }
    return _widgetConfig;
  }
  const saved = storage.get('widget_config', null);
  if (!saved) return getDefaultWidgetConfig();
  for (const p of PRESET_WIDGETS) {
    if (!saved.presets.find(x => x.id === p.id)) {
      saved.presets.push({ id: p.id, enabled: false });
    }
  }
  return saved;
}

async function saveWidgetConfig(config) {
  _widgetConfig = config;
  storage.set('widget_config', config);
  if (!auth.isGuest()) { try { await userdataApi.saveWidgetConfig(config); } catch(e) {} }
}

/* ===== SNAPSHOT SHARING ===== */
let _lastShareUrl = '';

function generateShareLink(type) {
  let base = window.location.origin + window.location.pathname;
  if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
    const lanIp = window._lanIp || '';
    if (lanIp) base = base.replace(/127\.0\.0\.1|localhost/, lanIp);
  }
  let params = [];
  let cardData = { type, icon: '🌸', title: '实用工具聚合站', sections: [], url: '' };

  if (type === 'weather') {
    const cities = _weatherCities.length ? _weatherCities : storage.get('weather_history', []);
    const lastResult = storage.get('weather_last_result', null);
    cardData.icon = '🌤️';
    cardData.title = '天气查询';
    if (lastResult) {
      params.push('city=' + encodeURIComponent(lastResult.city));
      cardData.sections.push({ label: '城市', value: lastResult.city });
      cardData.sections.push({ label: '温度', value: lastResult.temp + '°C（体感 ' + lastResult.feelsLike + '°C）', highlight: true });
      cardData.sections.push({ label: '天气', value: lastResult.description });
      cardData.sections.push({ label: '湿度', value: lastResult.humidity + '%' });
      cardData.sections.push({ label: '风力', value: lastResult.windDir + ' ' + lastResult.windSpeed });
      if (lastResult.forecast && lastResult.forecast.length) {
        const f = lastResult.forecast[0];
        cardData.sections.push({ label: '明日', value: f.description + ' ' + f.maxTemp + '°/' + f.minTemp + '°' });
      }
    } else if (cities.length) {
      params.push('city=' + encodeURIComponent(cities[0]));
      cardData.sections.push({ label: '城市', value: cities[0] });
      cardData.sections.push({ label: '提示', value: '先查询天气再分享，可展示完整数据~' });
    } else {
      cardData.sections.push({ label: '提示', value: '先查询天气再分享，可展示完整数据~' });
    }
  } else if (type === 'countdown') {
    const list = _countdownList.length ? _countdownList : storage.get('countdown_list', []);
    const target = list.length ? list[0] : null;
    cardData.icon = '⏳';
    cardData.title = '倒计时';
    if (target) {
      const tt = target.target_time || target.targetTime || '';
      params.push('countdown=' + encodeURIComponent(tt));
      if (target.label) params.push('cdlabel=' + encodeURIComponent(target.label));
      if (target.label) cardData.sections.push({ label: '目标', value: target.label });
      cardData.sections.push({ label: '目标时间', value: tt.replace('T', ' ') });
      // Calculate remaining
      const diff = new Date(tt).getTime() - Date.now();
      if (diff > 0) {
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor((diff % 86400000) / 3600000);
        cardData.sections.push({ label: '剩余', value: days + ' 天 ' + hours + ' 小时', highlight: true });
      } else {
        cardData.sections.push({ label: '状态', value: '已到达！🎉', highlight: true });
      }
    } else {
      cardData.sections.push({ label: '提示', value: '先设置倒计时再分享~' });
    }
  } else if (type === 'memo' || type === 'memo_selected') {
    const selected = type === 'memo_selected' ? storage.get('memo_share_selected', null) : null;
    const memos = _memoList.length ? _memoList : storage.get('memo_list', []);
    const memo = selected || (memos.length ? memos[0] : null);
    cardData.icon = '📝';
    cardData.title = '备忘录';
    if (memo) {
      params.push('memo_title=' + encodeURIComponent(memo.title));
      if (memo.content) params.push('memo_content=' + encodeURIComponent(memo.content));
      cardData.sections.push({ label: '标题', value: memo.title });
      if (memo.content) {
        const lines = memo.content.split('\n');
        lines.forEach((l, i) => {
          if (i < 4) cardData.sections.push({ label: i === 0 ? '内容' : '', value: l || ' ' });
        });
        if (lines.length > 4) cardData.sections.push({ label: '', value: '...还有更多内容' });
      }
      cardData.sections.push({ label: '时间', value: memo.createTime || '' });
      if (memos.length > 1 && type !== 'memo_selected') cardData.sections.push({ label: '合计', value: '共 ' + memos.length + ' 条备忘' });
    } else {
      cardData.sections.push({ label: '提示', value: '先添加备忘再分享~' });
    }
  } else if (type.startsWith('widget:')) {
    const widgetId = type.slice(7);
    const preset = PRESET_WIDGETS.find(p => p.id === widgetId);
    const config = getWidgetConfig();
    const custom = config.customs.find(c => c.id === widgetId);
    if (preset) {
      params.push('widget=' + encodeURIComponent(widgetId));
      cardData.icon = preset.icon;
      cardData.title = preset.name;
      cardData.sections.push({ label: '功能', value: preset.desc });
      // Try to get widget result from modal
      const modalContent = document.querySelector('#widgetModalContent');
      if (modalContent) {
        const resultTexts = [];
        const results = modalContent.querySelectorAll('.tool-result, .bmi-value, .password-display, .stat-value, .dice-total');
        results.forEach(r => { if (r.textContent.trim()) resultTexts.push(r.textContent.trim()); });
        if (resultTexts.length) {
          cardData.sections.push({ label: '结果', value: resultTexts.slice(0, 3).join(' / ') });
        }
      }
    } else if (custom) {
      params.push('custom=' + encodeURIComponent(widgetId));
      if (custom.type === 'url') params.push('curl=' + encodeURIComponent(custom.url));
      else if (custom.type === 'content') params.push('ctext=' + encodeURIComponent(custom.content));
      else if (custom.type === 'code') params.push('ccode=' + encodeURIComponent(custom.content));
      cardData.icon = custom.icon;
      cardData.title = custom.name;
      if (custom.type === 'url') {
        cardData.sections.push({ label: '链接', value: custom.url });
      } else if (custom.type === 'content') {
        const lines = custom.content.split('\n');
        lines.slice(0, 4).forEach((l, i) => {
          cardData.sections.push({ label: i === 0 ? '内容' : '', value: l || ' ' });
        });
      } else {
        cardData.sections.push({ label: '类型', value: '自定义交互代码' });
      }
    }
  }

  const url = params.length ? base + '?' + params.join('&') : base;
  cardData.url = url;
  _lastShareUrl = url;
  showShareCard(cardData);
}

function showShareCard(cardData) {
  const modal = $('#shareCardModal');
  modal.classList.remove('hidden');
  drawShareCard(cardData);
}

function closeShareCard() {
  $('#shareCardModal').classList.add('hidden');
}

function drawShareCard(data) {
  const canvas = $('#shareCardCanvas');
  const ctx = canvas.getContext('2d');
  // Dynamic height based on content
  const W = 400;
  const contentRows = data.sections.filter(s => s.value).length;
  const H = Math.max(480, 260 + contentRows * 38 + 80);
  canvas.width = W;
  canvas.height = H;

  // Background
  ctx.fillStyle = '#fef6f9';
  ctx.fillRect(0, 0, W, H);

  // Top gradient banner
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, '#ff7eb3');
  topGrad.addColorStop(0.4, '#c084fc');
  topGrad.addColorStop(1, '#7cc4f5');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 90);

  // Decorative circles on banner
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(50, 30, 40, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(360, 60, 30, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(200, 85, 25, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Icon on banner
  ctx.font = '42px serif';
  ctx.textAlign = 'center';
  ctx.fillText(data.icon, 46, 62);

  // Title on banner
  ctx.font = 'bold 26px "Zen Maru Gothic", "Noto Sans SC", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(data.title, 82, 58);

  // Subtitle
  ctx.font = '13px "Noto Sans SC", sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('实用工具聚合站 ✿', 82, 78);

  // Content card area
  const cardY = 106;
  const cardH = H - cardY - 20;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255,126,179,0.1)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, 16, cardY, W - 32, cardH, 16);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Sections (label: value rows)
  let y = cardY + 30;
  ctx.textAlign = 'left';
  for (const sec of data.sections) {
    if (!sec.value) continue;

    // Label
    if (sec.label) {
      ctx.font = 'bold 13px "Noto Sans SC", sans-serif';
      ctx.fillStyle = '#9b6b8e';
      const labelY = y + 14;
      ctx.fillText(sec.label, 36, labelY);

      // Value
      ctx.font = sec.highlight ? 'bold 22px "Zen Maru Gothic", "Noto Sans SC", sans-serif' : '16px "Noto Sans SC", "Zen Maru Gothic", sans-serif';
      ctx.fillStyle = sec.highlight ? '#ff7eb3' : '#4a2040';
      const maxW = W - 80;
      const val = sec.value;
      if (ctx.measureText(val).width > maxW) {
        // Truncate
        let truncated = val;
        while (ctx.measureText(truncated + '…').width > maxW && truncated.length > 0) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(truncated + '…', 36, y + (sec.highlight ? 46 : 38));
      } else {
        ctx.fillText(val, 36, y + (sec.highlight ? 46 : 38));
      }
      y += sec.highlight ? 62 : 48;
    } else {
      // No label, continuation line
      ctx.font = '16px "Noto Sans SC", "Zen Maru Gothic", sans-serif';
      ctx.fillStyle = '#4a2040';
      ctx.fillText(sec.value, 36, y + 22);
      y += 32;
    }
  }

  // Bottom-right QR code (small)
  const qrSize = 64;
  const qrX = W - 32 - qrSize - 12;
  const qrY = H - 20 - qrSize - 12;
  try {
    const qr = qrcode(0, 'L');
    qr.addData(data.url);
    qr.make();
    const moduleCount = qr.getModuleCount();
    const cellSize = qrSize / moduleCount;

    // QR background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillStyle = '#6b3f5e';
          ctx.fillRect(qrX + c * cellSize, qrY + r * cellSize, Math.max(cellSize - 0.3, 0.5), Math.max(cellSize - 0.3, 0.5));
        }
      }
    }
  } catch (e) {}

  // "扫码访问" text under QR
  ctx.font = '10px "Noto Sans SC", sans-serif';
  ctx.fillStyle = '#9b6b8e';
  ctx.textAlign = 'center';
  ctx.fillText('扫码访问', qrX + qrSize / 2, qrY + qrSize + 14);

  // Bottom-left decoration
  ctx.font = '16px serif';
  ctx.globalAlpha = 0.2;
  ctx.fillText('🌸', 30, H - 28);
  ctx.fillText('✨', 60, H - 22);
  ctx.globalAlpha = 1;

  // Card border
  ctx.strokeStyle = '#f0c6d8';
  ctx.lineWidth = 2;
  roundRect(ctx, 1, 1, W - 2, H - 2, 16);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectTop(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function parseShareParams() {
  // Support query params (?city=...) — works with chat apps that strip hash fragments
  const search = window.location.search;
  let params;
  if (search && search.startsWith('?')) {
    params = new URLSearchParams(search.slice(1));
  } else {
    // Fallback: old hash format (#/?city=...)
    const hash = window.location.hash;
    if (!hash || !hash.startsWith('#/?')) return null;
    params = new URLSearchParams(hash.slice(3));
  }
  const result = {};
  if (params.get('city')) result.city = params.get('city');
  if (params.get('countdown')) {
    result.countdown = params.get('countdown');
    result.cdlabel = params.get('cdlabel') || '';
  }
  if (params.get('memo_title')) {
    result.memo_title = params.get('memo_title');
    result.memo_content = params.get('memo_content') || '';
  }
  if (params.get('widget')) result.widget = params.get('widget');
  if (params.get('custom')) {
    result.custom = params.get('custom');
    result.customType = params.has('curl') ? 'url' : params.has('ctext') ? 'content' : params.has('ccode') ? 'code' : 'content';
    result.customUrl = params.get('curl') || '';
    result.customContent = params.get('ctext') || params.get('ccode') || '';
  }
  return Object.keys(result).length ? result : null;
}

/* ===== STAR RATING ===== */
async function loadWidgetStars(widgetId, containerEl) {
  const res = await ratingApi.get(widgetId);
  const d = res.code === 0 ? res.data : { avg: 0, count: 0, user_rating: null };

  // Average rating (read-only display)
  let html = '<div style="display:flex;align-items:center;gap:6px;justify-content:center;margin-bottom:4px">';
  html += '<span class="star-display">';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(d.avg);
    html += `<span class="star-icon ${filled ? 'filled' : ''}">★</span>`;
  }
  html += `</span><span class="star-count">${d.avg > 0 ? d.avg.toFixed(1) : '暂无'} (${d.count})</span>`;
  html += '</div>';

  // Interactive user rating stars
  html += '<div class="widget-user-stars" style="display:flex;justify-content:center"></div>';
  containerEl.innerHTML = html;

  const interactiveEl = containerEl.querySelector('.widget-user-stars');
  if (interactiveEl) renderStarInteractive(interactiveEl, widgetId, d.user_rating);
}

function renderStarDisplay(el, avg, count, userRating, widgetId) {
  let html = '<span class="star-display">';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= Math.round(avg);
    html += `<span class="star-icon ${filled ? 'filled' : ''}">★</span>`;
  }
  html += `</span><span class="star-count">${avg > 0 ? avg.toFixed(1) : '暂无'} (${count})</span>`;
  el.innerHTML = html;
}

function renderStarInteractive(el, widgetId, userRating) {
  let html = '<span class="star-interactive">';
  for (let i = 1; i <= 5; i++) {
    const filled = i <= (userRating || 0);
    html += `<span class="star-btn ${filled ? 'filled' : ''}" data-val="${i}">★</span>`;
  }
  html += '</span>';
  el.innerHTML = html;
  el.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      const val = parseInt(btn.dataset.val);
      el.querySelectorAll('.star-btn').forEach((b, idx) => {
        b.classList.toggle('filled', idx < val);
      });
    });
    btn.addEventListener('click', async () => {
      const val = parseInt(btn.dataset.val);
      if (!auth.isLoggedIn() || auth.isGuest()) {
        showConfirm('⭐ 评分需要登录~\n\n点击"确定"前往登录').then(ok => {
          if (ok) { auth.clearAuth(); showLoginPage(); }
        });
        return;
      }
      const res = await ratingApi.submit(widgetId, val);
      if (res.code === 0) {
        showToast('评分已保存 ♪', 'success');
        const updated = await ratingApi.get(widgetId);
        if (updated.code === 0) {
          const d = updated.data;
          renderStarInteractive(el, widgetId, d.user_rating);
        }
      } else {
        showToast(res.message || '评分失败', 'error');
      }
    });
  });
  el.addEventListener('mouseleave', () => {
    const res = ratingApi.get(widgetId).then(res => {
      if (res.code === 0) {
        const ur = res.data.user_rating;
        el.querySelectorAll('.star-btn').forEach((b, idx) => {
          b.classList.toggle('filled', idx < (ur || 0));
        });
      }
    });
  });
}

/* ===== WIDGET MODAL ===== */
let widgetTimers = [];

function openWidgetModal(widgetId) {
  const config = getWidgetConfig();
  if (!auth.isGuest()) usageApi.record(widgetId);
  let preset = PRESET_WIDGETS.find(p => p.id === widgetId);
  let custom = config.customs.find(c => c.id === widgetId);

  // If custom widget not found locally but we have share params, create temp entry
  if (!preset && !custom && window._shareParams && window._shareParams.custom === widgetId) {
    custom = { id: widgetId, name: '分享的工具', icon: '🔗', type: window._shareParams.customType, url: window._shareParams.customUrl, content: window._shareParams.customContent };
  }

  if (!preset && !custom) return;

  const modal = $('#widgetModal');
  const title = $('#widgetModalTitle');
  const content = $('#widgetModalContent');

  if (preset) {
    title.textContent = preset.icon + ' ' + preset.name;
    const renderers = {
      calculator: renderCalculator, pomodoro: renderPomodoro, bmi: renderBmi,
      colorpicker: renderColorPicker, stopwatch: renderStopwatch, charcount: renderCharCount,
      random: renderRandomWidget, password: renderPasswordWidget, converter: renderConverterWidget
    };
    const panelHtml = (renderers[widgetId] || (() => ''))();
    const ratingFooter = `<div class="widget-rating-footer" id="widgetRatingFooter"><div class="widget-rating-stars" data-widget-id="${widgetId}"></div><div class="widget-rating-hint">点击星星评分~</div></div>`;
    content.innerHTML = panelHtml + ratingFooter;
    modal.classList.remove('hidden');
    const inits = {
      calculator: initCalculator, pomodoro: initPomodoro, bmi: initBmi,
      colorpicker: initColorPicker, stopwatch: initStopwatch, charcount: initCharCount,
      random: initRandomWidget, password: initPasswordWidget, converter: initConverterWidget
    };
    if (inits[widgetId]) inits[widgetId]();
    // Init stars
    (async () => {
      const res = await ratingApi.get(widgetId);
      const d = res.code === 0 ? res.data : { user_rating: null };
      const starsEl = $(`.widget-rating-stars[data-widget-id="${widgetId}"]`);
      if (starsEl) renderStarInteractive(starsEl, widgetId, d.user_rating);
    })();
  } else if (custom) {
    title.textContent = custom.icon + ' ' + custom.name;
    if (custom.type === 'url') {
      // URL widget: show link preview + open button + rating
      content.innerHTML = `
        <div style="text-align:center;padding:16px 0">
          <div style="font-size:1.2rem;margin-bottom:12px">🔗</div>
          <div style="color:var(--fg2);font-size:.85rem;margin-bottom:20px;word-break:break-all;padding:0 12px">${escapeHtml(custom.url || '')}</div>
          <button class="btn btn-primary" id="modalOpenUrlBtn">🔗 打开链接</button>
        </div>`;
      $('#modalOpenUrlBtn').addEventListener('click', () => {
        if (custom.url) window.open(custom.url, '_blank');
      });
    } else if (custom.type === 'code') {
      const iframe = document.createElement('iframe');
      iframe.sandbox = 'allow-scripts allow-same-origin';
      iframe.style.cssText = 'width:100%;min-height:200px;border:none;border-radius:var(--radius-sm);';
      // Inject widgetStore API + pass saved data for this widget
      const widgetDataKey = 'widget_data_' + custom.id;
      const savedData = storage.get(widgetDataKey, {});
      const savedJson = JSON.stringify(savedData);
      const storeScript = '<scr' + 'ipt>' +
        'window.widgetStore={' +
        '_data:' + savedJson + ',' +
        'get(k,d){return k in this._data?this._data[k]:d;},' +
        'set(k,v){this._data[k]=v;parent.postMessage({type:"widgetStore.save",widgetId:"' + custom.id + '",key:k,value:v},"*");},' +
        'getAll(){return JSON.parse(JSON.stringify(this._data));},' +
        'remove(k){delete this._data[k];parent.postMessage({type:"widgetStore.remove",widgetId:"' + custom.id + '",key:k},"*");},' +
        'clear(){this._data={};parent.postMessage({type:"widgetStore.clear",widgetId:"' + custom.id + '"},"*");}' +
        '};' +
        '</scr' + 'ipt>';
      iframe.srcdoc = `<!DOCTYPE html><html><head><style>body{font-family:'Zen Maru Gothic','Noto Sans SC',sans-serif;margin:12px;color:#4a2040}</style>${storeScript}</head><body>${custom.content}</body></html>`;
      content.innerHTML = '';
      content.appendChild(iframe);
      iframe.onload = () => {
        try { iframe.style.height = iframe.contentDocument.body.scrollHeight + 24 + 'px'; } catch(e) {}
      };
    } else {
      content.innerHTML = `<div class="custom-content-display">${escapeHtml(custom.content)}</div>`;
    }
    // Append rating footer
    const ratingFooter = document.createElement('div');
    ratingFooter.className = 'widget-rating-footer';
    ratingFooter.innerHTML = `<div class="widget-rating-stars" data-widget-id="${widgetId}"></div><div class="widget-rating-hint">点击星星评分~</div>`;
    content.appendChild(ratingFooter);
    modal.classList.remove('hidden');
    // Init stars
    (async () => {
      const res = await ratingApi.get(widgetId);
      const d = res.code === 0 ? res.data : { user_rating: null };
      const starsEl = $(`.widget-rating-stars[data-widget-id="${widgetId}"]`);
      if (starsEl) renderStarInteractive(starsEl, widgetId, d.user_rating);
    })();
  }
}

function closeWidgetModal() {
  widgetTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
  widgetTimers = [];
  $('#widgetModal').classList.add('hidden');
  $('#widgetModalContent').innerHTML = '';
}

// Listen for widgetStore messages from iframe
window.addEventListener('message', function(e) {
  if (!e.data || !e.data.type || !e.data.type.startsWith('widgetStore.')) return;
  const widgetId = e.data.widgetId;
  if (!widgetId) return;
  const widgetDataKey = 'widget_data_' + widgetId;
  const current = storage.get(widgetDataKey, {});
  if (e.data.type === 'widgetStore.save') {
    current[e.data.key] = e.data.value;
    storage.set(widgetDataKey, current);
    // Sync to server if logged in
    if (!auth.isGuest()) { try { userdataApi.saveWidgetConfig(getWidgetConfig()); } catch(e) {} }
  } else if (e.data.type === 'widgetStore.remove') {
    delete current[e.data.key];
    storage.set(widgetDataKey, current);
  } else if (e.data.type === 'widgetStore.clear') {
    storage.set(widgetDataKey, {});
  }
});

/* ===== ROUTER ===== */
let currentPage = 'home';
let countdownTimer = null;

function navigate(page) {
  const guestAllowed = ['home', 'memo', 'weather'];
  if (!auth.isLoggedIn() && !guestAllowed.includes(page)) { showLoginPage(); return; }
  if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  closeWidgetModal();
  currentPage = page;
  if (!auth.isGuest() && !['home', 'widgets', 'ranking', 'user', 'workshop', 'admin'].includes(page)) usageApi.record(page);
  $$('.nav-links a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
  $('#navLinks').classList.remove('open');
  renderPage(page);
}

/* ===== PAGES ===== */
function renderPage(page) {
  const app = $('#app');
  const renderers = { home: renderHome, weather: renderWeather, memo: renderMemo, countdown: renderCountdown, widgets: renderWidgets, ranking: renderRanking, user: renderUser, workshop: renderWorkshop, admin: renderAdmin };
  app.innerHTML = `<div class="page-enter">${(renderers[page] || renderHome)()}</div>`;
  initPage(page);
}

/* ===== HOME ===== */
function renderHome() {
  return `
    <div class="home-hero">
      <h1>✿ 实用工具聚合站 ✿</h1>
      <p>一站式聚合多款高频轻量工具，打开即用${auth.isGuest() ? '（游客模式，数据仅存本地）' : ''}</p>
    </div>
    <div class="home-search-box">
      <input type="text" id="homeSearchInput" placeholder="🔍 搜索工具、社区作品..." autocomplete="off" />
      <div id="homeSearchResults" class="home-search-results hidden"></div>
    </div>
    <div id="topToolsArea"></div>
    <div id="recentWidgetsArea"></div>
    <div id="homeStatsArea"></div>
  `;
}

function initHome() {
  // Search
  const searchInput = $('#homeSearchInput');
  const searchResults = $('#homeSearchResults');
  let searchTimer = null;

  async function doSearch() {
    const q = searchInput.value.trim();
    if (!q) {
      searchResults.classList.add('hidden');
      searchResults.innerHTML = '';
      return;
    }
    const res = await searchApi.search(q);
    const items = (res.code === 0 ? res.data : []).slice(0, 8);
    if (!items.length) {
      searchResults.innerHTML = '<div class="home-search-empty">没有找到匹配结果 ~</div>';
      searchResults.classList.remove('hidden');
      return;
    }
    searchResults.innerHTML = items.map(item => {
      const icon = item.icon || '🔧';
      const label = item.kind === 'page' ? '页面' : item.kind === 'widget' ? '预设工具' : '社区作品';
      return `<div class="home-search-item" data-kind="${item.kind}" data-id="${item.id}" data-widget-id="${item.widget_id || ''}">
        <span class="home-search-icon">${escapeHtml(icon)}</span>
        <div class="home-search-info">
          <div class="home-search-name">${escapeHtml(item.name)} <span class="home-search-tag">${label}</span></div>
          <div class="home-search-desc">${escapeHtml(item.desc || '')}</div>
        </div>
      </div>`;
    }).join('');
    searchResults.classList.remove('hidden');

    searchResults.querySelectorAll('.home-search-item').forEach(el => {
      el.addEventListener('click', () => {
        const kind = el.dataset.kind;
        const id = el.dataset.id;
        searchResults.classList.add('hidden');
        searchInput.value = '';
        if (kind === 'page') {
          navigate(id);
        } else if (kind === 'widget') {
          openWidgetModal(id);
        } else if (kind === 'community') {
          const widgetId = parseInt(el.dataset.widgetId);
          const config = getWidgetConfig();
          const already = (config.customs || []).some(c => c.id === id);
          if (already) {
            const custom = config.customs.find(c => c.id === id);
            if (custom && custom.type === 'url') window.open(custom.url, '_blank');
            else openWidgetModal(id);
          } else {
            // Add to my widgets then open
            workshopApi.addToMyWidgets(widgetId).then(res => {
              if (res.code === 0) {
                _widgetConfig = res.data;
                showToast('已添加到工具箱', 'success');
                openWidgetModal(id);
              } else {
                showToast(res.message || '添加失败', 'error');
              }
            });
          }
        }
      });
    });
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(doSearch, 250);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { searchResults.classList.add('hidden'); searchInput.value = ''; }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.home-search-box')) searchResults.classList.add('hidden');
  });

  // Load stats (total tools + recent widgets)
  (async () => {
    const res = await statsApi.get();
    const d = res.code === 0 ? res.data : null;
    if (d) {
      const statsEl = $('#homeStatsArea');
      statsEl.innerHTML = `
        <div class="home-stats-footer">
          <span class="home-stats-dot">●</span>
          <span>共 ${d.total_tools} 款工具</span>
          <span class="home-stats-sep">|</span>
          <span>${d.core_pages} 个页面</span>
          <span class="home-stats-sep">|</span>
          <span>${d.preset_widgets} 个预设工具</span>
          <span class="home-stats-sep">|</span>
          <span>${d.community_widgets} 个社区工具</span>
          <span class="home-stats-dot">●</span>
        </div>`;

      // Render recent community widgets
      const recentEl = $('#recentWidgetsArea');
      if (d.recent_widgets && d.recent_widgets.length) {
        const config = getWidgetConfig();
        const cards = d.recent_widgets.map(w => {
          const communityId = w.widget_id;
          const isUrl = w.type === 'url';
          const desc = isUrl ? '快捷链接' : w.type === 'code' ? '自定义代码' : '自定义内容';
          return `
            <div class="home-tool-card" data-recent-id="${w.id}" data-community-id="${communityId}" data-type="${w.type}" data-url="${escapeHtml(w.url || '')}">
              <span class="home-tool-icon">${escapeHtml(w.icon)}</span>
              <h3>${escapeHtml(w.name)}</h3>
              <p>${desc} · by ${escapeHtml(w.author_email)}</p>
            </div>`;
        }).join('');
        recentEl.innerHTML = `
          <div class="home-tools-section">
            <h2 class="home-tools-title">🆕 最近新增社区工具</h2>
            <div class="home-tools-grid">${cards}</div>
          </div>`;

        $$('[data-recent-id]').forEach(card => {
          card.addEventListener('click', () => {
            const cid = card.dataset.communityId;
            const wtype = card.dataset.type;
            const wurl = card.dataset.url;
            const config = getWidgetConfig();
            const already = (config.customs || []).some(c => c.id === cid);
            if (already) {
              const custom = config.customs.find(c => c.id === cid);
              if (custom && custom.type === 'url') window.open(custom.url, '_blank');
              else openWidgetModal(cid);
            } else {
              // Add to my widgets then open/use
              workshopApi.addToMyWidgets(parseInt(card.dataset.recentId)).then(res => {
                if (res.code === 0) {
                  _widgetConfig = res.data;
                  showToast('已添加到工具箱', 'success');
                  if (wtype === 'url') window.open(wurl, '_blank');
                  else openWidgetModal(cid);
                } else {
                  showToast(res.message || '添加失败', 'error');
                }
              });
            }
          });
        });
      } else {
        recentEl.innerHTML = '';
      }
    }
  })();

  // Load top tools
  (async () => {
    const topList = await usageApi.getTop(6);
    // Ensure widget config is loaded
    if (!_widgetConfig && !auth.isGuest()) {
      try {
        const res = await userdataApi.getWidgetConfig();
        if (res.code === 0 && res.data) { _widgetConfig = res.data; storage.set('widget_config', res.data); }
      } catch(e) {}
    }
    const config = getWidgetConfig();
    const allTools = [
      { id: 'weather', icon: '🌤️', name: '天气查询', desc: '实时天气与3天预报' },
      { id: 'memo', icon: '📝', name: '备忘录', desc: '随时记录，本地保存' },
      { id: 'countdown', icon: '⏳', name: '倒计时', desc: '设定目标，实时提醒' },
      ...PRESET_WIDGETS.map(p => ({ id: p.id, icon: p.icon, name: p.name, desc: p.desc })),
      ...(config.customs || []).map(c => ({ id: c.id, icon: c.icon, name: c.name, desc: c.type === 'url' ? '快捷链接' : c.type === 'code' ? '自定义代码' : '自定义内容' }))
    ];
    const SLOTS = 6;
    const usedIds = new Set();
    const filled = [];

    // Fill from usage data
    for (const item of topList) {
      const info = allTools.find(t => t.id === item.tool_id);
      if (info && filled.length < SLOTS) {
        filled.push(info);
        usedIds.add(info.id);
      }
    }
    // Fill remaining slots with unused tools
    for (const t of allTools) {
      if (filled.length >= SLOTS) break;
      if (!usedIds.has(t.id)) {
        filled.push(t);
        usedIds.add(t.id);
      }
    }

    const cards = filled.map(info => `
      <div class="home-tool-card" data-tool-id="${info.id}">
        <span class="home-tool-icon">${escapeHtml(info.icon)}</span>
        <h3>${escapeHtml(info.name)}</h3>
        <p>${info.desc}</p>
      </div>
    `).join('');

    // Pad empty slots
    for (let i = filled.length; i < SLOTS; i++) {
      cards.concat(''); // no-op, grid handles empty
    }

    const area = $('#topToolsArea');
    area.innerHTML = `
      <div class="home-tools-section">
        <h2 class="home-tools-title">🔥 常用工具</h2>
        <div class="home-tools-grid">${cards}</div>
      </div>`;
    $$('.home-tool-card').forEach(card => {
      card.addEventListener('click', () => {
        const tid = card.dataset.toolId;
        const corePages = ['weather', 'memo', 'countdown'];
        if (corePages.includes(tid)) navigate(tid);
        else if (PRESET_WIDGETS.some(p => p.id === tid)) openWidgetModal(tid);
        else {
          // Custom/community widget
          const custom = (config.customs || []).find(c => c.id === tid);
          if (custom) {
            if (custom.type === 'url') window.open(custom.url, '_blank');
            else openWidgetModal(tid);
          }
        }
      });
    });
  })();
}

/* ===== WEATHER ===== */
function renderWeather() {
  return `
    <h1 class="page-title"><span>🌤️</span> 天气查询</h1>
    <div class="weather-search">
      <input type="text" id="weatherCity" placeholder="请输入城市名，如：海口、北京" />
      <button class="btn btn-primary" id="weatherSearch">查询天气</button>
      <button class="btn btn-secondary" id="weatherClear">清空</button>
    </div>
    <div class="history-cities" id="historyCities"></div>
    <div id="weatherResult"></div>
    <div id="weatherShareArea" style="margin-top:16px;text-align:center;display:none">
      <button class="btn btn-primary" id="weatherShareBtn">🔗 分享天气卡片</button>
    </div>
  `;
}

async function initWeather() {
  const input = $('#weatherCity');

  // Load weather history: guest uses localStorage, logged-in uses API
  if (auth.isGuest()) {
    _weatherCities = storage.get('weather_history', []);
  } else {
    try {
      const res = await userdataApi.getWeatherHistory();
      if (res.code === 0) { _weatherCities = res.data || []; storage.set('weather_history', _weatherCities); }
    } catch(e) { _weatherCities = storage.get('weather_history', []); }
  }

  renderHistoryCities(_weatherCities);

  $('#weatherSearch').addEventListener('click', () => searchWeather());
  $('#weatherClear').addEventListener('click', () => { input.value = ''; $('#weatherResult').innerHTML = ''; $('#weatherShareArea').style.display = 'none'; });
  input.addEventListener('keydown', e => { if (e.key === 'Enter') searchWeather(); });

  // Share button in weather page
  $('#weatherShareBtn').addEventListener('click', () => generateShareLink('weather'));

  // Show share button if there's last result
  const lastResult = storage.get('weather_last_result', null);
  if (lastResult) $('#weatherShareArea').style.display = '';

  if (window._shareParams && window._shareParams.city) {
    input.value = window._shareParams.city;
    searchWeather();
    delete window._shareParams.city;
  }
}

function renderHistoryCities(cities) {
  const el = $('#historyCities');
  if (!cities.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<span style="color:var(--fg2);font-size:.8rem;">历史：</span>` +
    cities.map(c => `<span class="history-city">${escapeHtml(c)}</span>`).join('');
  el.querySelectorAll('.history-city').forEach(s => {
    s.addEventListener('click', () => {
      $('#weatherCity').value = s.textContent;
      searchWeather();
    });
  });
}

let weatherDebounce = null;
async function searchWeather() {
  clearTimeout(weatherDebounce);
  weatherDebounce = setTimeout(async () => {
    const city = $('#weatherCity').value.trim();
    if (!city) { showToast('请输入城市名称', 'error'); return; }

    const result = $('#weatherResult');
    result.innerHTML = '<div style="text-align:center;padding:40px;color:var(--fg2)">查询中...</div>';

    try {
      const resp = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      const data = await resp.json();

      if (!data.success) {
        result.innerHTML = `<div class="card" style="text-align:center;color:var(--accent)">${escapeHtml(data.error)}</div>`;
        return;
      }

      const d = data.data;
      // Update weather history
      if (auth.isGuest()) {
        const cities = storage.get('weather_history', []);
        _weatherCities = [city, ...cities.filter(c => c !== city)].slice(0, 10);
        storage.set('weather_history', _weatherCities);
      } else {
        try {
          const whRes = await userdataApi.addWeatherCity(city);
          if (whRes.code === 0) { _weatherCities = whRes.data; storage.set('weather_history', _weatherCities); }
        } catch(e) {
          const cities = storage.get('weather_history', []);
          _weatherCities = [city, ...cities.filter(c => c !== city)].slice(0, 10);
          storage.set('weather_history', _weatherCities);
        }
      }
      // Save last weather result for share card
      storage.set('weather_last_result', { city: d.city, temp: d.current.temp, feelsLike: d.current.feelsLike, description: d.current.description, icon: d.current.icon, humidity: d.current.humidity, windDir: d.current.windDir, windSpeed: d.current.windSpeed, forecast: d.forecast });
      // Show share button
      $('#weatherShareArea').style.display = '';
      renderHistoryCities(_weatherCities);

      result.innerHTML = `
        <div class="weather-current">
          <div class="weather-icon-big">${d.current.icon}</div>
          <div class="weather-info">
            <h2>${escapeHtml(d.city)}</h2>
            <div class="weather-temp">${d.current.temp}°C</div>
            <div class="weather-desc">${escapeHtml(d.current.description)} · 体感 ${d.current.feelsLike}°C</div>
            <div class="weather-details">
              <div class="weather-detail"><span>💧</span> 湿度 ${d.current.humidity}%</div>
              <div class="weather-detail"><span>🌬️</span> ${d.current.windDir} ${d.current.windSpeed}</div>
            </div>
          </div>
        </div>
        <h2 style="font-family:'Outfit',sans-serif;font-weight:700;margin-bottom:16px;">3天预报</h2>
        <div class="forecast-grid">
          ${d.forecast.map(f => `
            <div class="forecast-card">
              <div class="forecast-date">${f.date}</div>
              <span class="forecast-icon">${f.icon}</span>
              <div class="forecast-desc">${escapeHtml(f.description)}</div>
              <div class="forecast-temp">
                <span class="hi">${f.maxTemp}°</span> / <span class="lo">${f.minTemp}°</span>
              </div>
              <div class="forecast-rain">🌧 降水概率 ${f.precipitation}</div>
            </div>
          `).join('')}
        </div>
      `;
    } catch {
      const cached = storage.get('weather_last_result', null);
      if (cached && cached.city) {
        result.innerHTML = `
          <div class="weather-cache-notice">⚠️ 网络异常，以下为缓存数据</div>
          <div class="weather-current">
            <div class="weather-icon-big">${cached.icon || '🌤️'}</div>
            <div class="weather-info">
              <h2>${escapeHtml(cached.city)}</h2>
              <div class="weather-temp">${cached.temp}°C</div>
              <div class="weather-desc">${escapeHtml(cached.description)} · 体感 ${cached.feelsLike}°C</div>
              <div class="weather-details">
                <div class="weather-detail"><span>💧</span> 湿度 ${cached.humidity}%</div>
                <div class="weather-detail"><span>🌬️</span> ${cached.windDir} ${cached.windSpeed}</div>
              </div>
            </div>
          </div>`;
      } else {
        result.innerHTML = '<div class="card" style="text-align:center;color:var(--accent)">网络异常，请稍后重试</div>';
      }
    }
  }, 300);
}

/* ===== MEMO ===== */
function renderMemo() {
  return `
    <h1 class="page-title"><span>📝</span> 备忘录</h1>
    <div class="memo-form">
      <div class="form-row">
        <label>标题（必填）</label>
        <input type="text" id="memoTitle" placeholder="备忘标题" />
      </div>
      <div class="form-row">
        <label>内容</label>
        <textarea id="memoContent" placeholder="详细内容..." rows="3"></textarea>
      </div>
      <button class="btn btn-primary" id="memoSave">保存备忘</button>
    </div>
    <div class="memo-search">
      <input type="text" id="memoSearch" placeholder="搜索备忘..." />
    </div>
    <div class="memo-list" id="memoList"></div>
  `;
}

async function initMemo() {
  // Load memos: guest uses localStorage, logged-in uses API
  if (auth.isGuest()) {
    _memoList = storage.get('memo_list', []);
  } else {
    try {
      const res = await userdataApi.getMemos();
      if (res.code === 0) { _memoList = res.data; storage.set('memo_list', res.data); }
    } catch(e) { _memoList = storage.get('memo_list', []); }
  }
  renderMemoList();

  $('#memoSave').addEventListener('click', addMemo);
  $('#memoSearch').addEventListener('input', () => renderMemoList());

  if (window._shareParams && window._shareParams.memo_title) {
    const exists = _memoList.some(m => m.title === window._shareParams.memo_title);
    if (!exists) {
      const newMemo = { client_id: genId(), title: window._shareParams.memo_title, content: window._shareParams.memo_content || '' };
      try {
        const res = await userdataApi.createMemo(newMemo);
        if (res.code === 0) { _memoList.unshift(res.data); storage.set('memo_list', _memoList); }
      } catch(e) {
        _memoList.unshift({ ...newMemo, id: newMemo.client_id, createTime: formatTime(new Date()) });
        storage.set('memo_list', _memoList);
      }
      renderMemoList();
      showToast('已从快照恢复备忘', 'success');
    }
    delete window._shareParams.memo_title;
    delete window._shareParams.memo_content;
  }
}

async function addMemo() {
  const title = $('#memoTitle').value.trim();
  const content = $('#memoContent').value.trim();
  if (!title) { showToast('请输入备忘标题', 'error'); return; }

  const clientId = genId();
  if (auth.isGuest()) {
    // Save to localStorage first so data isn't lost after login
    const tempMemo = { id: clientId, client_id: clientId, title, content, createTime: formatTime(new Date()) };
    _memoList.unshift(tempMemo);
    storage.set('memo_list', _memoList);
    renderMemoList();
    $('#memoTitle').value = '';
    $('#memoContent').value = '';
    showToast('备忘已暂存本地', 'success');
    const ok = await showConfirm('💾 如需云端同步，请登录账号~\n\n点击"确定"前往登录');
    if (ok) { auth.clearAuth(); showLoginPage(); }
    return;
  } else {
    try {
      const res = await userdataApi.createMemo({ client_id: clientId, title, content });
      if (res.code === 0) { _memoList.unshift(res.data); storage.set('memo_list', _memoList); }
    } catch(e) {
      _memoList.unshift({ id: clientId, client_id: clientId, title, content, createTime: formatTime(new Date()) });
      storage.set('memo_list', _memoList);
    }
  }
  $('#memoTitle').value = '';
  $('#memoContent').value = '';
  renderMemoList();
  showToast('备忘已保存', 'success');
}

function shareMemo(id) {
  const memo = _memoList.find(m => String(m.id || m.client_id) === String(id));
  if (!memo) return;
  storage.set('memo_share_selected', memo);
  generateShareLink('memo_selected');
}

async function deleteMemo(id) {
  const ok = await showConfirm('确定删除这条备忘？删除后无法恢复');
  if (!ok) return;
  if (!auth.isGuest()) { try { await userdataApi.deleteMemo(id); } catch(e) {} }
  _memoList = _memoList.filter(m => String(m.id || m.client_id) !== String(id));
  storage.set('memo_list', _memoList);
  renderMemoList();
  showToast('已删除', 'success');
}

async function editMemo(id) {
  const memo = _memoList.find(m => String(m.id || m.client_id) === String(id));
  if (!memo) return;
  const newTitle = prompt('修改标题：', memo.title);
  if (newTitle === null) return;
  if (!newTitle.trim()) { showToast('标题不能为空', 'error'); return; }
  const newContent = prompt('修改内容：', memo.content);
  if (newContent === null) return;
  memo.title = newTitle.trim();
  memo.content = newContent.trim();
  if (!auth.isGuest()) {
    try {
      if (memo.id && typeof memo.id === 'number') await userdataApi.updateMemo(memo.id, { title: memo.title, content: memo.content });
    } catch(e) {}
  }
  storage.set('memo_list', _memoList);
  renderMemoList();
  showToast('已更新', 'success');
}

function renderMemoList() {
  const keyword = ($('#memoSearch')?.value || '').trim().toLowerCase();
  let memos = _memoList;
  if (keyword) {
    memos = memos.filter(m => m.title.toLowerCase().includes(keyword) || m.content.toLowerCase().includes(keyword));
  }
  const el = $('#memoList');
  if (!memos.length) {
    el.innerHTML = `<div class="memo-empty">${keyword ? '没有找到匹配备忘~' : '暂无备忘，快来添加第一条吧 ♪'}</div>`;
    return;
  }
  el.innerHTML = memos.map(m => `
    <div class="memo-item">
      <div class="memo-item-header">
        <div class="memo-item-title">${escapeHtml(m.title)}</div>
        <div class="memo-item-time">${m.createTime || m.created_at || ''}</div>
      </div>
      ${m.content ? `<div class="memo-item-content">${escapeHtml(m.content)}</div>` : ''}
      <div class="memo-item-actions">
        <button class="btn btn-primary btn-sm" onclick="shareMemo('${m.id || m.client_id}')">🔗 分享</button>
        <button class="btn btn-secondary btn-sm" onclick="editMemo('${m.id || m.client_id}')">编辑</button>
        <button class="btn btn-danger btn-sm" onclick="deleteMemo('${m.id || m.client_id}')">删除</button>
      </div>
    </div>
  `).join('');
}

/* ===== COUNTDOWN ===== */
function renderCountdown() {
  return `
    <h1 class="page-title"><span>⏳</span> 倒计时</h1>
    <div class="countdown-add card" style="margin-bottom:20px">
      <div class="section-title">➕ 新增倒计时</div>
      <div class="countdown-form">
        <div class="countdown-field">
          <label>目标日期</label>
          <input type="date" id="cdDate" />
        </div>
        <div class="countdown-field">
          <label>目标时间</label>
          <input type="time" id="cdTime" value="00:00" />
        </div>
        <div class="countdown-field">
          <label>备注</label>
          <input type="text" id="cdLabel" placeholder="如：期末考试" />
        </div>
        <button class="btn btn-primary" id="cdAdd">添加倒计时</button>
      </div>
    </div>
    <div id="cdList"></div>
  `;
}

async function initCountdown() {
  // Handle share params (legacy single target)
  if (window._shareParams && window._shareParams.countdown) {
    const target = { target_time: window._shareParams.countdown, label: window._shareParams.cdlabel || '' };
    if (auth.isGuest()) {
      const list = storage.get('countdown_list', []);
      list.push(target);
      storage.set('countdown_list', list);
    } else {
      try { await userdataApi.createCountdown(target); } catch(e) {}
    }
    delete window._shareParams.countdown;
    delete window._shareParams.cdlabel;
  }

  // Load countdowns
  if (auth.isGuest()) {
    // Migrate old single target to list
    const oldTarget = storage.get('countdown_target', null);
    _countdownList = storage.get('countdown_list', []);
    if (oldTarget && !_countdownList.length) {
      _countdownList.push({ target_time: oldTarget.targetTime, label: oldTarget.label || '' });
      storage.set('countdown_list', _countdownList);
    }
  } else {
    try {
      const res = await userdataApi.getCountdowns();
      if (res.code === 0) {
        _countdownList = res.data || [];
        storage.set('countdown_list', _countdownList);
      }
    } catch(e) { _countdownList = storage.get('countdown_list', []); }
  }

  renderCountdownList();

  $('#cdAdd').addEventListener('click', async () => {
    const date = $('#cdDate').value;
    const time = $('#cdTime').value || '00:00';
    const label = $('#cdLabel').value.trim();
    if (!date) { showToast('请选择目标日期', 'error'); return; }
    const target_time = `${date}T${time}:00`;
    const item = { target_time, label };

    if (auth.isGuest()) {
      _countdownList.push({ ...item, id: genId() });
      storage.set('countdown_list', _countdownList);
    } else {
      try {
        const res = await userdataApi.createCountdown(item);
        if (res.code === 0) _countdownList.push(res.data);
        storage.set('countdown_list', _countdownList);
      } catch(e) {
        _countdownList.push({ ...item, id: genId() });
        storage.set('countdown_list', _countdownList);
      }
    }
    $('#cdDate').value = '';
    $('#cdTime').value = '00:00';
    $('#cdLabel').value = '';
    renderCountdownList();
    showToast('倒计时已添加', 'success');
  });
}

function renderCountdownList() {
  const el = $('#cdList');
  if (!_countdownList.length) {
    el.innerHTML = '<div class="card" style="text-align:center;color:var(--fg2);padding:32px">暂无倒计时，点击上方添加 ♪</div>';
    return;
  }
  el.innerHTML = '<div class="countdown-list">' + _countdownList.map(item => {
    const targetTs = new Date(item.target_time).getTime();
    const diff = targetTs - Date.now();
    const ended = diff <= 0;
    let timeStr = '';
    if (ended) {
      timeStr = '🎉 已到达！';
    } else {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      timeStr = ended ? '🎉 已到达！' : `${days}天 ${hours}时 ${mins}分 ${secs}秒`;
    }
    return `
      <div class="countdown-list-item" data-id="${item.id}" data-target="${item.target_time}">
        <div class="countdown-item-header">
          <span class="countdown-item-label">${escapeHtml(item.label || '未命名倒计时')}</span>
          <div class="countdown-item-actions">
            <button class="btn btn-sm btn-secondary cd-edit-btn" data-id="${item.id}">编辑</button>
            <button class="btn btn-sm btn-danger cd-del-btn" data-id="${item.id}">删除</button>
          </div>
        </div>
        <div class="countdown-item-time">${item.target_time.replace('T', ' ')}</div>
        <div class="countdown-item-remaining">${timeStr}</div>
      </div>`;
  }).join('') + '</div>';

  // Bind edit/delete
  el.querySelectorAll('.cd-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const ok = await showConfirm('确定删除这个倒计时？');
      if (!ok) return;
      const id = btn.dataset.id;
      if (!auth.isGuest()) { try { await userdataApi.deleteCountdownItem(id); } catch(e) {} }
      _countdownList = _countdownList.filter(c => String(c.id) !== String(id));
      storage.set('countdown_list', _countdownList);
      renderCountdownList();
      showToast('已删除', 'success');
    });
  });
  el.querySelectorAll('.cd-edit-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const item = _countdownList.find(c => String(c.id) === String(id));
      if (!item) return;
      const newLabel = prompt('修改备注：', item.label || '');
      if (newLabel === null) return;
      item.label = newLabel.trim();
      if (!auth.isGuest()) {
        try { await userdataApi.updateCountdown(id, { label: item.label }); } catch(e) {}
      }
      storage.set('countdown_list', _countdownList);
      renderCountdownList();
      showToast('已更新', 'success');
    });
  });

  // Start timer to update remaining
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = setInterval(updateCountdownList, 1000);
}

function updateCountdownList() {
  $$('.countdown-list-item').forEach(el => {
    const targetTs = new Date(el.dataset.target).getTime();
    const diff = targetTs - Date.now();
    const remaining = el.querySelector('.countdown-item-remaining');
    if (!remaining) return;
    if (diff <= 0) {
      remaining.textContent = '🎉 已到达！';
    } else {
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      remaining.textContent = `${days}天 ${hours}时 ${mins}分 ${secs}秒`;
    }
  });
}

/* ===== TOOLS (removed, now in preset widgets) ===== */

/* ===== WIDGETS (预设 + 我的) ===== */
function renderWidgets() {
  const config = getWidgetConfig();
  const isGuest = auth.isGuest();

  return `
    <h1 class="page-title"><span>🧩</span> 工具箱</h1>
    <div class="tools-tabs">
      <button class="tools-tab active" data-tab="presets">📦 预设工具</button>
      <button class="tools-tab" data-tab="mywidgets">✨ 我的自定义</button>
    </div>

    <!-- 预设工具 -->
    <div class="tool-panel active" id="panelPresets">
      <div class="widget-quick-grid">
        ${PRESET_WIDGETS.map(p => {
          return `
            <div class="widget-quick-card" data-preset-id="${p.id}">
              <span class="tool-card-icon">${p.icon}</span>
              <h3>${p.name}</h3>
              <p>${p.desc}</p>
              <div class="widget-stars" data-widget-id="${p.id}" style="margin-top:6px"></div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- 我的自定义 -->
    <div class="tool-panel" id="panelMyWidgets">
      ${isGuest ? `
        <div class="guest-prompt" style="padding:48px 24px">
          <div class="guest-prompt-icon">🔒</div>
          <h2>需要登录才能使用自定义工具</h2>
          <p>登录后即可创建、管理和同步你的自定义工具</p>
          <button class="btn btn-primary" id="widgetsGuestLoginBtn">🔑 登录</button>
        </div>
      ` : `
      <div class="card" style="margin-bottom:16px">
        <button class="btn btn-primary btn-sm" id="addWidgetBtn">+ 添加自定义工具</button>
        <div id="addWidgetForm" class="add-widget-form" style="display:none;margin-top:16px">
          <div class="form-row">
            <label>名称 *</label>
            <input type="text" id="cwName" placeholder="工具名称" />
          </div>
          <div class="form-row">
            <label>图标</label>
            <input type="text" id="cwIcon" placeholder="输入emoji，如 🐙" value="🔗" style="max-width:80px" />
          </div>
          <div class="form-row">
            <label>类型</label>
            <div class="radio-group">
              <label class="radio-item"><input type="radio" name="cwType" value="url" checked /> 快捷链接</label>
              <label class="radio-item"><input type="radio" name="cwType" value="content" /> 自定义内容</label>
              <label class="radio-item"><input type="radio" name="cwType" value="code" /> 自定义代码</label>
            </div>
          </div>
          <div class="form-row cw-url-row">
            <label>URL *</label>
            <input type="text" id="cwUrl" placeholder="https://example.com" />
          </div>
          <div class="form-row cw-content-row" style="display:none">
            <label>内容</label>
            <textarea id="cwContent" placeholder="自定义内容..." rows="4"></textarea>
          </div>
          <div class="form-row cw-code-row" style="display:none">
            <label>HTML/JS 代码 <span style="font-weight:400;font-size:.75rem">（可用 showToast() 提示、storage 读存数据）</span></label>
            <textarea id="cwCode" rows="8" placeholder='<button onclick="showToast(&quot;打卡成功&quot;,&quot;success&quot;)" style="padding:10px 24px;border-radius:12px;background:linear-gradient(135deg,#ff7eb3,#c084fc);color:#fff;border:none;font-size:1rem;font-weight:700;cursor:pointer">打卡</button>'></textarea>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" id="cwSave">保存</button>
            <button class="btn btn-ghost btn-sm" id="cwCancel">取消</button>
          </div>
        </div>
      </div>
      ${config.customs.length ? `
        <div class="widget-quick-grid">
          ${config.customs.map(c => {
            const isCommunity = c.id.startsWith('community_');
            const isUrl = c.type === 'url';
            return `
            <div class="widget-quick-card" data-custom-id="${c.id}" data-is-url="${isUrl ? '1' : '0'}" style="cursor:${isUrl ? 'default' : 'pointer'}">
              <span class="tool-card-icon">${escapeHtml(c.icon)}</span>
              <h3>${escapeHtml(c.name)}</h3>
              <p>${isUrl ? '快捷链接' : c.type === 'code' ? '自定义代码' : (c.content || '').slice(0, 20)}</p>
              <div class="widget-stars" data-widget-id="${c.id}" style="margin-top:6px"></div>
              <div class="widget-card-actions">
                ${isUrl ? `<button class="btn btn-sm btn-secondary custom-open-url-btn" data-id="${c.id}" data-url="${escapeHtml(c.url || '')}">🔗 打开链接</button>` : ''}
                ${!isCommunity ? '<button class="btn btn-sm btn-primary custom-upload-btn" data-id="' + c.id + '">📤 上传</button>' : ''}
                <button class="btn btn-sm btn-danger custom-delete-btn" data-id="${c.id}">🗑️</button>
              </div>
            </div>`;
          }).join('')}
        </div>
        <p style="text-align:center;color:var(--fg2);font-size:.82rem;margin-top:12px">💡 点击卡片使用工具，点击 📤 上传 分享到创意工坊</p>
      ` : '<p style="text-align:center;color:var(--fg2);padding:24px">还没有自定义工具，点击上方按钮添加~</p>'}
      `}
    </div>
  `;
}

async function initWidgets() {
  // Load widget config: guest uses localStorage, logged-in uses API
  if (auth.isGuest()) {
    _widgetConfig = storage.get('widget_config', null);
  } else {
    try {
      const res = await userdataApi.getWidgetConfig();
      if (res.code === 0 && res.data) { _widgetConfig = res.data; storage.set('widget_config', res.data); }
    } catch(e) {}
  }

  // Tab switching
  const tabMap = { presets: 'panelPresets', mywidgets: 'panelMyWidgets' };
  $$('.tools-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Guest cannot access mywidgets
      if (auth.isGuest() && tab.dataset.tab === 'mywidgets') {
        showConfirm('💾 使用自定义工具需要登录，登录后数据可云端同步~\n\n点击"确定"前往登录').then(ok => {
          if (ok) { auth.clearAuth(); showLoginPage(); }
        });
        return;
      }
      $$('.tools-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.tool-panel').forEach(p => p.classList.remove('active'));
      $(`#${tabMap[tab.dataset.tab]}`).classList.add('active');
    });
  });

  // Guest login button in mywidgets
  const guestLoginBtn = $('#widgetsGuestLoginBtn');
  if (guestLoginBtn) {
    guestLoginBtn.addEventListener('click', () => { auth.clearAuth(); showLoginPage(); });
  }

  // Preset tools: click to open directly
  $$('[data-preset-id]').forEach(card => {
    card.addEventListener('click', () => {
      openWidgetModal(card.dataset.presetId);
    });
  });

  // Custom widget: click card to use (non-URL types only; URL types have explicit "open link" button)
  $$('[data-custom-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // ignore button clicks
      if (card.dataset.isUrl === '1') return; // URL cards don't auto-open
      const id = card.dataset.customId;
      const config = getWidgetConfig();
      const custom = config.customs.find(c => c.id === id);
      if (!custom) return;
      openWidgetModal(id);
    });
  });

  // Custom widget: open URL button
  $$('.custom-open-url-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const url = btn.dataset.url;
      if (!url) return;
      if (!auth.isGuest()) usageApi.record(id);
      window.open(url, '_blank');
    });
  });

  // Custom widget: delete button
  $$('.custom-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCustomWidget(btn.dataset.id);
    });
  });

  // Custom widget: upload to workshop
  $$('.custom-upload-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const config = getWidgetConfig();
      const custom = config.customs.find(c => c.id === id);
      if (!custom) return;
      const ok = await showConfirm(`📤 确认将「${custom.name}」上传到创意工坊？\n上传后需管理员审核，其他用户才能看到`);
      if (!ok) return;
      btn.disabled = true;
      btn.textContent = '...';
      try {
        const res = await workshopApi.upload({
          name: custom.name,
          icon: custom.icon || '🔗',
          type: custom.type,
          url: custom.url || '',
          content: custom.content || '',
        });
        if (res.code === 0) {
          showToast('上传成功，等待管理员审核 ♪', 'success');
          btn.textContent = '⏳';
          btn.disabled = true;
        } else {
          btn.textContent = '📤';
          btn.disabled = false;
          showToast(res.message || '上传失败', 'error');
        }
      } catch(e) {
        btn.textContent = '📤';
        btn.disabled = false;
        showToast('网络错误', 'error');
      }
    });
  });

  // Add custom widget form
  const addBtn = $('#addWidgetBtn');
  const form = $('#addWidgetForm');
  const cancelBtn = $('#cwCancel');

  if (addBtn) addBtn.addEventListener('click', () => { form.style.display = 'block'; addBtn.style.display = 'none'; });
  if (cancelBtn) cancelBtn.addEventListener('click', () => { form.style.display = 'none'; addBtn.style.display = 'inline-flex'; });

  // Type toggle
  $$('input[name="cwType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const val = document.querySelector('input[name="cwType"]:checked')?.value || 'url';
      const urlRow = document.querySelector('.cw-url-row');
      const contentRow = document.querySelector('.cw-content-row');
      const codeRow = document.querySelector('.cw-code-row');
      if (urlRow) urlRow.style.display = val === 'url' ? '' : 'none';
      if (contentRow) contentRow.style.display = val === 'content' ? '' : 'none';
      if (codeRow) codeRow.style.display = val === 'code' ? '' : 'none';
    });
  });

  // Save custom widget
  const saveBtn = $('#cwSave');
  if (saveBtn) saveBtn.addEventListener('click', async () => {
    const name = $('#cwName').value.trim();
    const icon = $('#cwIcon').value.trim() || '🔗';
    const type = document.querySelector('input[name="cwType"]:checked')?.value || 'url';
    const url = $('#cwUrl').value.trim();
    const content = type === 'code' ? $('#cwCode').value : $('#cwContent').value.trim();

    if (!name) { showToast('请输入工具名称', 'error'); return; }
    if (type === 'url' && !url) { showToast('请输入URL', 'error'); return; }
    if (type === 'code' && !content) { showToast('请输入代码', 'error'); return; }

    const config = getWidgetConfig();
    const id = genId();
    config.customs.push({ id, name, icon, type, url, content });
    config.order.push(id);
    await saveWidgetConfig(config);
    showToast('工具已添加', 'success');
    renderPage('widgets');
  });

  // Load stars for widget cards
  $$('.widget-stars').forEach(el => {
    const widgetId = el.dataset.widgetId;
    loadWidgetStars(widgetId, el);
  });
}

async function deleteCustomWidget(id) {
  const ok = await showConfirm('确定删除这个自定义工具？');
  if (!ok) return;
  const config = getWidgetConfig();
  config.customs = config.customs.filter(c => c.id !== id);
  config.order = config.order.filter(x => x !== id);
  await saveWidgetConfig(config);
  showToast('已删除', 'success');
  renderPage('widgets');
}

/* ===== RANKING ===== */
function renderRanking() {
  return `
    <h1 class="page-title"><span>🏆</span> 排行榜</h1>
    <div class="tools-tabs">
      <button class="tools-tab active" data-rank-tab="clicks">🔥 点击排行</button>
      <button class="tools-tab" data-rank-tab="stars">⭐ 星级排行</button>
    </div>
    <div id="rankingContent">
      <div style="text-align:center;padding:40px;color:var(--fg2)">加载中...</div>
    </div>`;
}

async function initRanking() {
  const tabMap = { clicks: loadClickRanking, stars: loadStarRanking };
  $$('.tools-tab[data-rank-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tools-tab[data-rank-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      tabMap[tab.dataset.rankTab]();
    });
  });
  await loadClickRanking();
}

async function loadClickRanking() {
  const rankingData = await usageApi.getRanking();
  const config = getWidgetConfig();
  const hiddenIds = ['home', 'widgets', 'ranking', 'user', 'workshop', 'admin'];
  const allTools = [
    { id: 'weather', icon: '🌤️', name: '天气查询' },
    { id: 'memo', icon: '📝', name: '备忘录' },
    { id: 'countdown', icon: '⏳', name: '倒计时' },
    ...PRESET_WIDGETS.map(p => ({ id: p.id, icon: p.icon, name: p.name })),
    ...(config.customs || []).map(c => ({ id: c.id, icon: c.icon, name: c.name }))
  ];

  const filtered = rankingData.filter(item => !hiddenIds.includes(item.tool_id) && allTools.some(t => t.id === item.tool_id));

  if (!filtered.length) {
    $('#rankingContent').innerHTML = '<div class="ranking-empty">🌸 还没有任何使用记录哦 🌸</div>';
    return;
  }

  const maxCount = filtered[0].total_count;
  const totalCount = filtered.reduce((sum, item) => sum + item.total_count, 0);

  const items = filtered.map((item, index) => {
    const tool = allTools.find(t => t.id === item.tool_id);
    const icon = tool ? tool.icon : '🔧';
    const name = tool ? tool.name : item.tool_id;
    const rank = index + 1;
    const barWidth = Math.max(Math.round(item.total_count / maxCount * 100), 5);
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    return `
      <div class="ranking-item" data-tool-id="${item.tool_id}">
        <div class="ranking-rank">${medal || rank}</div>
        <div class="ranking-info">
          <div class="ranking-header">
            <span class="ranking-icon">${icon}</span>
            <span class="ranking-name">${escapeHtml(name)}</span>
            <span class="ranking-count">${item.total_count} 次点击</span>
          </div>
          <div class="ranking-bar-bg">
            <div class="ranking-bar" style="width:${barWidth}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');

  $('#rankingContent').innerHTML = `
    <div class="ranking-summary">
      <div class="ranking-stat">
        <div class="ranking-stat-value">${totalCount}</div>
        <div class="ranking-stat-label">总点击次数</div>
      </div>
      <div class="ranking-stat">
        <div class="ranking-stat-value">${filtered.length}</div>
        <div class="ranking-stat-label">工具数量</div>
      </div>
    </div>
    <div class="ranking-list">${items}</div>`;

  // Click to open tool
  $$('.ranking-item').forEach(el => {
    el.addEventListener('click', () => {
      const tid = el.dataset.toolId;
      const corePages = ['weather', 'memo', 'countdown'];
      if (corePages.includes(tid)) navigate(tid);
      else if (PRESET_WIDGETS.some(p => p.id === tid)) openWidgetModal(tid);
      else openWidgetModal(tid);
    });
  });
}

async function loadStarRanking() {
  const res = await ratingApi.getRanking();
  const config = getWidgetConfig();
  const allTools = [
    { id: 'weather', icon: '🌤️', name: '天气查询' },
    { id: 'memo', icon: '📝', name: '备忘录' },
    { id: 'countdown', icon: '⏳', name: '倒计时' },
    ...PRESET_WIDGETS.map(p => ({ id: p.id, icon: p.icon, name: p.name })),
    ...(config.customs || []).map(c => ({ id: c.id, icon: c.icon, name: c.name }))
  ];

  const data = res.code === 0 ? res.data : [];
  const filtered = data.map(item => {
    const tool = allTools.find(t => t.id === item.widget_id);
    return { ...item, tool };
  }).filter(item => item.tool);

  if (!filtered.length) {
    $('#rankingContent').innerHTML = '<div class="ranking-empty">🌸 还没有任何评分记录哦 🌸</div>';
    return;
  }

  const maxAvg = filtered[0].avg_rating;
  const totalRatings = filtered.reduce((sum, item) => sum + item.rating_count, 0);

  const items = filtered.map((item, index) => {
    const tool = item.tool;
    const rank = index + 1;
    const barWidth = Math.max(Math.round(item.avg_rating / 5 * 100), 5);
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    const stars = '★'.repeat(Math.round(item.avg_rating)) + '☆'.repeat(5 - Math.round(item.avg_rating));
    return `
      <div class="ranking-item" data-tool-id="${item.widget_id}">
        <div class="ranking-rank">${medal || rank}</div>
        <div class="ranking-info">
          <div class="ranking-header">
            <span class="ranking-icon">${tool.icon}</span>
            <span class="ranking-name">${escapeHtml(tool.name)}</span>
            <span class="ranking-count">${stars} ${item.avg_rating}分 (${item.rating_count}人)</span>
          </div>
          <div class="ranking-bar-bg">
            <div class="ranking-bar" style="width:${barWidth}%"></div>
          </div>
        </div>
      </div>`;
  }).join('');

  $('#rankingContent').innerHTML = `
    <div class="ranking-summary">
      <div class="ranking-stat">
        <div class="ranking-stat-value">${totalRatings}</div>
        <div class="ranking-stat-label">总评分次数</div>
      </div>
      <div class="ranking-stat">
        <div class="ranking-stat-value">${filtered.length}</div>
        <div class="ranking-stat-label">已评星工具</div>
      </div>
    </div>
    <div class="ranking-list">${items}</div>`;

  // Click to open tool
  $$('.ranking-item').forEach(el => {
    el.addEventListener('click', () => {
      const tid = el.dataset.toolId;
      const corePages = ['weather', 'memo', 'countdown'];
      if (corePages.includes(tid)) navigate(tid);
      else if (PRESET_WIDGETS.some(p => p.id === tid)) openWidgetModal(tid);
      else openWidgetModal(tid);
    });
  });
}

/* ===== USER CENTER ===== */
function renderUser() {
  if (auth.isGuest()) {
    return `
      <div class="guest-prompt">
        <div class="guest-prompt-icon">🔒</div>
        <h2>需要登录才能查看个人中心</h2>
        <p>登录后即可管理账户、查看常用工具</p>
        <button class="btn btn-primary" id="guestLoginBtn">🔑 登录</button>
      </div>`;
  }
  return `
    <h1 class="page-title"><span>👤</span> 我的</h1>
    <div class="card" style="margin-bottom:20px">
      <div class="section-title">📋 用户信息</div>
      <div class="user-info-row">
        <span class="user-info-label">📧 邮箱</span>
        <span class="user-info-value" id="userEmail">加载中...</span>
      </div>
      <div class="user-info-row">
        <span class="user-info-label">🔒 密码</span>
        <span class="user-info-value" id="userPassword">加载中...</span>
      </div>
      <div style="margin-top:12px;display:none" id="userPwdForm">
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="password" id="userPwdInput" placeholder="输入新密码（至少6位）" style="flex:1;min-width:160px" />
          <button class="btn btn-primary btn-sm" id="userPwdConfirm">确认</button>
          <button class="btn btn-ghost btn-sm" id="userPwdCancel">取消</button>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" id="userSetPwd">🔑 设置/修改密码</button>
    </div>
    <div class="card" style="margin-bottom:20px">
      <div class="section-title">⚙️ 账户操作</div>
      <div class="user-actions">
        <button class="btn btn-ghost" id="userLogout">🚪 退出登录</button>
        <button class="btn btn-danger" id="userDelete">⚠️ 注销账户</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:20px">
      <div class="section-title">🔥 常用工具</div>
      <div id="userTopTools"><div style="color:var(--fg2)">加载中...</div></div>
    </div>
    <div class="card" style="margin-bottom:20px">
      <div class="section-title">🧑‍🎨 创意工坊</div>
      <p style="color:var(--fg2);margin-bottom:12px">浏览社区工具，一键添加到你的工具箱 ♪</p>
      <button class="btn btn-primary" id="userWorkshop">🧑‍🎨 进入创意工坊</button>
    </div>
    <div class="user-bottom-links">
      <a href="#" id="userFeedbackLink" class="user-bottom-link">💬 遇到问题，联系我们？</a>
    </div>`;
}

async function initUser() {
  if (auth.isGuest()) {
    $('#guestLoginBtn').addEventListener('click', () => { auth.clearAuth(); showLoginPage(); });
    return;
  }

  // Load user info
  try {
    const res = await auth.getMe();
    if (res.code === 0) {
      $('#userEmail').textContent = res.data.email;
      $('#userPassword').textContent = res.data.has_password ? '已设置' : '未设置';
    }
  } catch(e) {}

  // Set password
  $('#userSetPwd').addEventListener('click', () => {
    $('#userPwdForm').style.display = '';
    $('#userSetPwd').style.display = 'none';
    $('#userPwdInput').focus();
  });
  $('#userPwdCancel').addEventListener('click', () => {
    $('#userPwdForm').style.display = 'none';
    $('#userSetPwd').style.display = '';
    $('#userPwdInput').value = '';
  });
  const doSetPassword = async () => {
    const pwd = $('#userPwdInput').value;
    if (pwd.length < 6) { showToast('密码至少6位', 'error'); return; }
    try {
      const res = await auth.api('/set-password', { method: 'POST', body: JSON.stringify({ password: pwd }) });
      if (res.code === 0) {
        showToast('密码设置成功', 'success');
        $('#userPassword').textContent = '已设置';
        $('#userPwdForm').style.display = 'none';
        $('#userSetPwd').style.display = '';
        $('#userPwdInput').value = '';
      } else {
        showToast(res.message || '设置失败', 'error');
      }
    } catch(e) { showToast('网络错误', 'error'); }
  };
  $('#userPwdConfirm').addEventListener('click', doSetPassword);
  $('#userPwdInput').addEventListener('keydown', e => { if (e.key === 'Enter') doSetPassword(); });

  // Logout
  $('#userLogout').addEventListener('click', () => {
    auth.clearAuth();
    showToast('已退出登录', 'info');
    showLoginPage();
  });

  // Delete account
  $('#userDelete').addEventListener('click', async () => {
    const ok = await showConfirm('⚠️ 注销后所有数据将被永久删除且无法恢复，确认注销？');
    if (!ok) return;
    try {
      const headers = { 'Authorization': 'Bearer ' + auth.getToken() };
      await fetch('/api/auth/account', { method: 'DELETE', headers });
      auth.clearAuth();
      showToast('账户已注销', 'info');
      showLoginPage();
    } catch(e) { showToast('网络错误', 'error'); }
  });

  // Top tools
  (async () => {
    const topList = await usageApi.getTop(6);
    const config = getWidgetConfig();
    const allTools = [
      { id: 'weather', icon: '🌤️', name: '天气查询' },
      { id: 'memo', icon: '📝', name: '备忘录' },
      { id: 'countdown', icon: '⏳', name: '倒计时' },
      ...PRESET_WIDGETS.map(p => ({ id: p.id, icon: p.icon, name: p.name })),
      ...(config.customs || []).map(c => ({ id: c.id, icon: c.icon, name: c.name }))
    ];
    const el = $('#userTopTools');
    if (!topList.length) {
      el.innerHTML = '<div style="color:var(--fg2)">暂无使用记录</div>';
      return;
    }
    el.innerHTML = topList.map(item => {
      const tool = allTools.find(t => t.id === item.tool_id);
      return `<div class="user-top-item">
        <span>${tool ? tool.icon : '🔧'} ${tool ? tool.name : item.tool_id}</span>
        <span style="color:var(--accent2);font-weight:700">${item.count} 次</span>
      </div>`;
    }).join('');
  })();

  // Workshop button
  $('#userWorkshop').addEventListener('click', () => navigate('workshop'));

  // Feedback link
  $('#userFeedbackLink').addEventListener('click', (e) => {
    e.preventDefault();
    showFeedbackModal();
  });
}

/* ===== FEEDBACK ===== */
const feedbackApi = {
  async submit(content) {
    const headers = { 'Authorization': 'Bearer ' + auth.getToken(), 'Content-Type': 'application/json' };
    const res = await fetch('/api/feedback/submit', { method: 'POST', headers, body: JSON.stringify({ content }) });
    return res.json();
  },
  async mine() {
    const headers = { 'Authorization': 'Bearer ' + auth.getToken() };
    const res = await fetch('/api/feedback/mine', { headers });
    return res.json();
  },
  async adminList(status = '') {
    const headers = { 'Authorization': 'Bearer ' + auth.getToken() };
    const res = await fetch('/api/feedback/admin/list' + (status ? '?status=' + status : ''), { headers });
    return res.json();
  },
  async adminReply(id, reply) {
    const headers = { 'Authorization': 'Bearer ' + auth.getToken(), 'Content-Type': 'application/json' };
    const res = await fetch('/api/feedback/admin/reply', { method: 'POST', headers, body: JSON.stringify({ id, reply }) });
    return res.json();
  }
};

function showFeedbackModal() {
  let modal = $('#feedbackModal');
  if (modal) modal.remove();

  document.body.insertAdjacentHTML('beforeend', `
    <div id="feedbackModal" class="modal-overlay" style="display:flex">
      <div class="modal" style="max-width:580px;width:94%;max-height:85vh;overflow-y:auto;padding:24px 28px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h2 style="font-size:1.1rem;font-weight:700;margin:0">💬 反馈与建议</h2>
          <button class="btn btn-ghost btn-sm" id="fbClose">✕</button>
        </div>
        <div id="fbContent">
          <div class="tools-tabs" style="margin-bottom:16px">
            <button class="tools-tab active" data-fb-tab="submit">📝 提交反馈</button>
            <button class="tools-tab" data-fb-tab="history">📋 我的反馈</button>
            ${auth.isAdmin() ? '<button class="tools-tab" data-fb-tab="admin">🔍 管理反馈</button>' : ''}
          </div>
          <!-- Submit -->
          <div class="tool-panel active" id="fbPanelSubmit">
            <textarea id="fbInput" placeholder="请描述你遇到的问题或建议..." rows="5" maxlength="2000" style="width:100%;resize:vertical;font-size:.9rem;padding:12px;border:2px solid var(--border);border-radius:var(--radius);box-sizing:border-box"></textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">
              <span id="fbCharCount" style="font-size:.75rem;color:var(--fg2)">0/2000</span>
              <button class="btn btn-primary" id="fbSubmit">📤 提交反馈</button>
            </div>
          </div>
          <!-- History -->
          <div class="tool-panel" id="fbPanelHistory">
            <div id="fbHistoryList" style="color:var(--fg2)">点击加载...</div>
          </div>
          ${auth.isAdmin() ? `
          <!-- Admin -->
          <div class="tool-panel" id="fbPanelAdmin">
            <div style="display:flex;gap:6px;margin-bottom:14px">
              <button class="btn btn-sm btn-secondary fb-admin-filter active" data-status="">全部</button>
              <button class="btn btn-sm btn-ghost fb-admin-filter" data-status="pending">待回复</button>
              <button class="btn btn-sm btn-ghost fb-admin-filter" data-status="replied">已回复</button>
            </div>
            <div id="fbAdminList" style="color:var(--fg2)">点击加载...</div>
          </div>` : ''}
        </div>
      </div>
    </div>
  `);

  const fbModal = $('#feedbackModal');

  // Close
  $('#fbClose').addEventListener('click', () => fbModal.remove());
  fbModal.addEventListener('click', (e) => { if (e.target === fbModal) fbModal.remove(); });

  // Tab switching
  const fbTabMap = { submit: 'fbPanelSubmit', history: 'fbPanelHistory', admin: 'fbPanelAdmin' };
  fbModal.querySelectorAll('.tools-tab[data-fb-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      fbModal.querySelectorAll('.tools-tab[data-fb-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      fbModal.querySelectorAll('.tool-panel[id^="fbPanel"]').forEach(p => p.classList.remove('active'));
      const panel = $(`#${fbTabMap[tab.dataset.fbTab]}`);
      if (panel) panel.classList.add('active');
      if (tab.dataset.fbTab === 'history') loadMyFeedbacks();
      if (tab.dataset.fbTab === 'admin') loadAdminFeedbacks();
    });
  });

  // Char count
  $('#fbInput').addEventListener('input', () => {
    $('#fbCharCount').textContent = $('#fbInput').value.length + '/2000';
  });

  // Submit
  $('#fbSubmit').addEventListener('click', async () => {
    const content = $('#fbInput').value.trim();
    if (!content) { showToast('请输入反馈内容', 'error'); return; }
    const btn = $('#fbSubmit');
    btn.disabled = true; btn.textContent = '提交中...';
    try {
      const res = await feedbackApi.submit(content);
      if (res.code === 0) {
        showToast('反馈提交成功，感谢你的反馈 ♪', 'success');
        $('#fbInput').value = '';
        $('#fbCharCount').textContent = '0/2000';
      } else {
        showToast(res.message || '提交失败', 'error');
      }
    } catch(e) { showToast('网络错误', 'error'); }
    btn.disabled = false; btn.textContent = '📤 提交';
  });
}

async function loadMyFeedbacks() {
  const el = $('#fbHistoryList');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--fg2)">加载中...</div>';
  try {
    const res = await feedbackApi.mine();
    if (res.code !== 0) { el.innerHTML = '<p style="color:var(--fg2)">加载失败</p>'; return; }
    if (!res.data.length) { el.innerHTML = '<p style="color:var(--fg2);text-align:center;padding:20px">暂无反馈记录</p>'; return; }
    el.innerHTML = res.data.map(fb => `
      <div class="fb-item">
        <div class="fb-header">
          <span class="fb-status ${fb.status === 'replied' ? 'fb-status-replied' : 'fb-status-pending'}">${fb.status === 'replied' ? '✅ 已回复' : '⏳ 待回复'}</span>
          <span class="fb-time">${fb.created_at ? new Date(fb.created_at).toLocaleString('zh-CN') : ''}</span>
        </div>
        <div class="fb-content">${escapeHtml(fb.content)}</div>
        ${fb.reply ? `<div class="fb-reply"><span style="color:var(--purple);font-weight:700">管理员回复：</span>${escapeHtml(fb.reply)}</div>` : ''}
      </div>
    `).join('');
  } catch(e) { el.innerHTML = '<p style="color:var(--fg2)">网络错误</p>'; }
}

async function loadAdminFeedbacks(status = '') {
  const el = $('#fbAdminList');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--fg2)">加载中...</div>';
  try {
    const res = await feedbackApi.adminList(status);
    if (res.code !== 0) { el.innerHTML = '<p style="color:var(--fg2)">加载失败</p>'; return; }
    if (!res.data.length) { el.innerHTML = '<p style="color:var(--fg2);text-align:center;padding:20px">暂无反馈</p>'; return; }
    el.innerHTML = res.data.map(fb => `
      <div class="fb-item">
        <div class="fb-header">
          <span class="fb-status ${fb.status === 'replied' ? 'fb-status-replied' : 'fb-status-pending'}">${fb.status === 'replied' ? '✅ 已回复' : '⏳ 待回复'}</span>
          <span class="fb-author">${escapeHtml(fb.user_email)}</span>
          <span class="fb-time">${fb.created_at ? new Date(fb.created_at).toLocaleString('zh-CN') : ''}</span>
        </div>
        <div class="fb-content">${escapeHtml(fb.content)}</div>
        ${fb.reply ? `<div class="fb-reply"><span style="color:var(--purple);font-weight:700">已回复：</span>${escapeHtml(fb.reply)}</div>` : ''}
        ${fb.status === 'pending' ? `
          <div class="fb-reply-form" data-fb-id="${fb.id}">
            <input type="text" class="fb-reply-input" placeholder="输入回复内容..." maxlength="1000" style="flex:1;padding:8px 10px;border:2px solid var(--border);border-radius:var(--radius);font-size:.85rem" />
            <button class="btn btn-primary btn-sm fb-reply-btn" data-id="${fb.id}">回复</button>
          </div>` : ''}
      </div>
    `).join('');

    // Reply buttons
    el.querySelectorAll('.fb-reply-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const form = btn.closest('.fb-reply-form');
        const input = form.querySelector('.fb-reply-input');
        const reply = input.value.trim();
        if (!reply) { showToast('请输入回复内容', 'error'); return; }
        btn.disabled = true; btn.textContent = '...';
        try {
          const res = await feedbackApi.adminReply(parseInt(btn.dataset.id), reply);
          if (res.code === 0) {
            showToast('回复成功', 'success');
            loadAdminFeedbacks(status);
          } else {
            showToast(res.message || '回复失败', 'error');
            btn.disabled = false; btn.textContent = '回复';
          }
        } catch(e) { showToast('网络错误', 'error'); btn.disabled = false; btn.textContent = '回复'; }
      });
    });
  } catch(e) { el.innerHTML = '<p style="color:var(--fg2)">网络错误</p>'; }
}

/* ===== ADMIN ===== */
function renderAdmin() {
  if (!auth.isAdmin()) {
    return `
      <div class="guest-prompt">
        <div class="guest-prompt-icon">🚫</div>
        <h2>需要管理员权限</h2>
        <p>你没有权限访问管理面板</p>
        <button class="btn btn-primary" id="adminBackHome">🏠 返回首页</button>
      </div>`;
  }
  return `
    <h1 class="page-title"><span>⚙️</span> 管理面板</h1>

    <!-- Stats Cards -->
    <div class="admin-stats-grid" id="adminStats">
      <div class="admin-stat-card skeleton" style="min-height:80px"></div>
      <div class="admin-stat-card skeleton" style="min-height:80px"></div>
      <div class="admin-stat-card skeleton" style="min-height:80px"></div>
      <div class="admin-stat-card skeleton" style="min-height:80px"></div>
      <div class="admin-stat-card skeleton" style="min-height:80px"></div>
    </div>

    <div class="tools-tabs" style="margin-top:28px">
      <button class="tools-tab active" data-admin-tab="overview">📊 数据概览</button>
      <button class="tools-tab" data-admin-tab="workshop">🧑‍🎨 作品审核</button>
      <button class="tools-tab" data-admin-tab="feedback">💬 反馈处理</button>
    </div>

    <!-- Overview -->
    <div class="tool-panel active" id="adminPanelOverview">
      <div class="card" style="margin-bottom:20px">
        <div class="section-title">🔥 热门工具 Top 5</div>
        <div id="adminTopTools"><div style="color:var(--fg2)">加载中...</div></div>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div class="section-title">📈 最近待处理</div>
        <div id="adminRecentPending"><div style="color:var(--fg2)">加载中...</div></div>
      </div>
    </div>

    <!-- Workshop Review -->
    <div class="tool-panel" id="adminPanelWorkshop">
      <div class="card">
        <div class="section-title">🔍 待审核作品</div>
        <div id="adminWorkshopList"><div style="color:var(--fg2)">加载中...</div></div>
      </div>
    </div>

    <!-- Feedback -->
    <div class="tool-panel" id="adminPanelFeedback">
      <div class="card">
        <div style="display:flex;gap:6px;margin-bottom:14px">
          <button class="btn btn-sm btn-secondary fb-admin-filter active" data-status="">全部</button>
          <button class="btn btn-sm btn-ghost fb-admin-filter" data-status="pending">待回复</button>
          <button class="btn btn-sm btn-ghost fb-admin-filter" data-status="replied">已回复</button>
        </div>
        <div id="adminFeedbackList"><div style="color:var(--fg2)">加载中...</div></div>
      </div>
    </div>
  `;
}

async function initAdmin() {
  if (!auth.isAdmin()) {
    $('#adminBackHome').addEventListener('click', () => navigate('home'));
    return;
  }

  const tabMap = { overview: 'adminPanelOverview', workshop: 'adminPanelWorkshop', feedback: 'adminPanelFeedback' };
  $$('.tools-tab[data-admin-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tools-tab[data-admin-tab]').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.tool-panel[id^="adminPanel"]').forEach(p => p.classList.remove('active'));
      const panel = $(`#${tabMap[tab.dataset.adminTab]}`);
      if (panel) panel.classList.add('active');
      if (tab.dataset.adminTab === 'workshop') loadAdminWorkshop();
      if (tab.dataset.adminTab === 'feedback') loadAdminFeedback();
    });
  });

  // Load dashboard data
  (async () => {
    const res = await adminApi.getDashboard();
    if (res.code !== 0) return;
    const d = res.data;
    const stats = d.stats;
    $('#adminStats').innerHTML = `
      <div class="admin-stat-card">
        <div class="admin-stat-value">${stats.pending_widgets}</div>
        <div class="admin-stat-label">待审核作品</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-value">${stats.pending_feedbacks}</div>
        <div class="admin-stat-label">待回复反馈</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-value">${stats.total_users}</div>
        <div class="admin-stat-label">注册用户</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-value">${stats.week_clicks}</div>
        <div class="admin-stat-label">本周点击</div>
      </div>
      <div class="admin-stat-card">
        <div class="admin-stat-value">${stats.total_clicks}</div>
        <div class="admin-stat-label">总点击次数</div>
      </div>
    `;

    // Top tools
    const topEl = $('#adminTopTools');
    if (d.top_tools && d.top_tools.length) {
      const allTools = [
        { id: 'weather', icon: '🌤️', name: '天气查询' },
        { id: 'memo', icon: '📝', name: '备忘录' },
        { id: 'countdown', icon: '⏳', name: '倒计时' },
        ...PRESET_WIDGETS.map(p => ({ id: p.id, icon: p.icon, name: p.name })),
      ];
      topEl.innerHTML = d.top_tools.map((item, idx) => {
        const tool = allTools.find(t => t.id === item.tool_id);
        return `<div class="user-top-item">
          <span>${idx + 1}. ${tool ? tool.icon : '🔧'} ${tool ? tool.name : item.tool_id}</span>
          <span style="color:var(--accent2);font-weight:700">${item.total_count} 次</span>
        </div>`;
      }).join('');
    } else {
      topEl.innerHTML = '<div style="color:var(--fg2)">暂无使用数据</div>';
    }

    // Recent pending summary
    const recentEl = $('#adminRecentPending');
    const parts = [];
    if (d.recent_feedbacks && d.recent_feedbacks.length) {
      parts.push(`<div style="margin-bottom:12px"><strong>💬 最新反馈</strong></div>` +
        d.recent_feedbacks.map(f => `
          <div class="admin-recent-item">
            <span class="admin-recent-meta">${escapeHtml(f.user_email)} · ${f.created_at ? new Date(f.created_at).toLocaleString('zh-CN') : ''}</span>
            <div class="admin-recent-content">${escapeHtml(f.content)}</div>
          </div>
        `).join(''));
    }
    if (d.recent_widgets && d.recent_widgets.length) {
      parts.push(`<div style="margin:16px 0 12px"><strong>🧑‍🎨 最新待审作品</strong></div>` +
        d.recent_widgets.map(w => `
          <div class="admin-recent-item">
            <span class="admin-recent-meta">${escapeHtml(w.icon)} ${escapeHtml(w.name)} · by ${escapeHtml(w.author_email)} · ${w.created_at}</span>
            <div class="admin-recent-content">${w.type === 'url' ? '快捷链接' : w.type === 'code' ? '自定义代码' : '自定义内容'}</div>
          </div>
        `).join(''));
    }
    recentEl.innerHTML = parts.length ? parts.join('') : '<div style="color:var(--fg2)">暂无待处理事项 ♪</div>';
  })();

  // Initial loads
  loadAdminWorkshop();
  loadAdminFeedback();
}

async function loadAdminWorkshop() {
  const el = $('#adminWorkshopList');
  if (!el || el.dataset.loaded === '1') return;
  el.dataset.loaded = '1';
  try {
    const res = await workshopApi.getPending();
    if (res.code === 0 && res.data.length) {
      el.innerHTML = res.data.map(w => `
        <div class="workshop-pending-item">
          <div class="workshop-pending-info">
            <span style="font-size:1.5rem">${escapeHtml(w.icon)}</span>
            <div>
              <div style="font-weight:700">${escapeHtml(w.name)}</div>
              <div style="font-size:.8rem;color:var(--fg2)">${w.type === 'url' ? '快捷链接' : w.type === 'code' ? '自定义代码' : '自定义内容'} · by ${escapeHtml(w.author_email)} · ${w.created_at}</div>
              ${w.url ? `<div style="font-size:.75rem;color:var(--fg2);word-break:break-all">URL: ${escapeHtml(w.url)}</div>` : ''}
              ${w.content ? `<div style="font-size:.75rem;color:var(--fg2);max-height:60px;overflow:auto">内容: ${escapeHtml(w.content.slice(0, 200))}</div>` : ''}
            </div>
          </div>
          <div class="workshop-pending-actions">
            <button class="btn btn-sm btn-primary ws-approve-btn" data-id="${w.id}">✅ 通过</button>
            <button class="btn btn-sm btn-danger ws-reject-btn" data-id="${w.id}">❌ 拒绝</button>
            <button class="btn btn-sm btn-ghost ws-pending-del-btn" data-id="${w.id}">🗑️</button>
          </div>
        </div>`).join('');

      el.querySelectorAll('.ws-approve-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await workshopApi.review(parseInt(btn.dataset.id), 'approve');
            if (res.code === 0) { showToast('已通过', 'success'); btn.closest('.workshop-pending-item').remove(); }
            else { showToast(res.message || '操作失败', 'error'); btn.disabled = false; }
          } catch(e) { showToast('网络错误', 'error'); btn.disabled = false; }
        });
      });
      el.querySelectorAll('.ws-reject-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            const res = await workshopApi.review(parseInt(btn.dataset.id), 'reject');
            if (res.code === 0) { showToast('已拒绝', 'info'); btn.closest('.workshop-pending-item').remove(); }
            else { showToast(res.message || '操作失败', 'error'); btn.disabled = false; }
          } catch(e) { showToast('网络错误', 'error'); btn.disabled = false; }
        });
      });
      el.querySelectorAll('.ws-pending-del-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const ok = await showConfirm('🗑️ 确认删除该作品？此操作不可撤销');
          if (!ok) return;
          btn.disabled = true;
          try {
            const res = await workshopApi.deleteWidget(parseInt(btn.dataset.id));
            if (res.code === 0) { showToast('已删除', 'success'); btn.closest('.workshop-pending-item').remove(); }
            else { showToast(res.message || '删除失败', 'error'); btn.disabled = false; }
          } catch(e) { showToast('网络错误', 'error'); btn.disabled = false; }
        });
      });
    } else {
      el.innerHTML = '<p style="text-align:center;color:var(--fg2);padding:24px">暂无待审核作品 ♪</p>';
    }
  } catch(e) {
    el.innerHTML = '<p style="color:var(--fg2)">加载失败</p>';
  }
}

async function loadAdminFeedback(status = '') {
  const el = $('#adminFeedbackList');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--fg2)">加载中...</div>';

  // Filter buttons
  $$('.fb-admin-filter').forEach(btn => {
    btn.onclick = () => {
      $$('.fb-admin-filter').forEach(b => b.classList.remove('active', 'btn-secondary'));
      $$('.fb-admin-filter').forEach(b => b.classList.add('btn-ghost'));
      btn.classList.remove('btn-ghost');
      btn.classList.add('active', 'btn-secondary');
      loadAdminFeedback(btn.dataset.status);
    };
  });

  try {
    const res = await feedbackApi.adminList(status);
    if (res.code !== 0) { el.innerHTML = '<p style="color:var(--fg2)">加载失败</p>'; return; }
    if (!res.data.length) { el.innerHTML = '<p style="text-align:center;color:var(--fg2);padding:20px">暂无反馈</p>'; return; }
    el.innerHTML = res.data.map(fb => `
      <div class="fb-item">
        <div class="fb-header">
          <span class="fb-status ${fb.status === 'replied' ? 'fb-status-replied' : 'fb-status-pending'}">${fb.status === 'replied' ? '✅ 已回复' : '⏳ 待回复'}</span>
          <span class="fb-author">${escapeHtml(fb.user_email)}</span>
          <span class="fb-time">${fb.created_at ? new Date(fb.created_at).toLocaleString('zh-CN') : ''}</span>
        </div>
        <div class="fb-content">${escapeHtml(fb.content)}</div>
        ${fb.reply ? `<div class="fb-reply"><span style="color:var(--purple);font-weight:700">已回复：</span>${escapeHtml(fb.reply)}</div>` : ''}
        ${fb.status === 'pending' ? `
          <div class="fb-reply-form" data-fb-id="${fb.id}">
            <input type="text" class="fb-reply-input" placeholder="输入回复内容..." maxlength="1000" style="flex:1;padding:8px 10px;border:2px solid var(--border);border-radius:var(--radius);font-size:.85rem" />
            <button class="btn btn-primary btn-sm fb-reply-btn" data-id="${fb.id}">回复</button>
          </div>` : ''}
      </div>
    `).join('');

    el.querySelectorAll('.fb-reply-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const form = btn.closest('.fb-reply-form');
        const input = form.querySelector('.fb-reply-input');
        const reply = input.value.trim();
        if (!reply) { showToast('请输入回复内容', 'error'); return; }
        btn.disabled = true; btn.textContent = '...';
        try {
          const res = await feedbackApi.adminReply(parseInt(btn.dataset.id), reply);
          if (res.code === 0) {
            showToast('回复成功', 'success');
            loadAdminFeedback(status);
          } else {
            showToast(res.message || '回复失败', 'error');
            btn.disabled = false; btn.textContent = '回复';
          }
        } catch(e) { showToast('网络错误', 'error'); btn.disabled = false; btn.textContent = '回复'; }
      });
    });
  } catch(e) { el.innerHTML = '<p style="color:var(--fg2)">网络错误</p>'; }
}

/* ===== WORKSHOP ===== */
function renderWorkshop() {
  if (auth.isGuest()) {
    return `
      <div class="guest-prompt">
        <div class="guest-prompt-icon">🔒</div>
        <h2>需要登录才能使用创意工坊</h2>
        <p>登录后即可浏览和上传社区工具</p>
        <button class="btn btn-primary" id="guestLoginBtn">🔑 登录</button>
      </div>`;
  }
  const isAdmin = auth.isAdmin();
  return `
    <h1 class="page-title"><span>🧑‍🎨</span> 创意工坊</h1>
    ${isAdmin ? `<div class="tools-tabs">
      <button class="tools-tab active" data-ws-tab="community">🌐 社区作品</button>
      <button class="tools-tab" data-ws-tab="pending">🔍 待审核</button>
    </div>` : ''}

    <!-- 社区作品 -->
    <div class="tool-panel active" id="wsPanelCommunity">
      <div style="margin-bottom:16px">
        <input type="text" id="wsSearch" placeholder="🔍 搜索工具名称..." style="width:100%;padding:10px 14px;border:2px solid var(--border);border-radius:var(--radius);font-size:.9rem;outline:none;transition:border-color .2s" onfocus="this.style.borderColor='var(--purple)'" onblur="this.style.borderColor='var(--border)'" />
      </div>
      <div id="wsCommunityList" style="color:var(--fg2)">加载中...</div>
    </div>

    ${isAdmin ? `
    <!-- 待审核 -->
    <div class="tool-panel" id="wsPanelPending">
      <div id="wsPendingList" style="color:var(--fg2)">加载中...</div>
    </div>` : ''}`;
}

async function initWorkshop() {
  if (auth.isGuest()) {
    $('#guestLoginBtn').addEventListener('click', () => { auth.clearAuth(); showLoginPage(); });
    return;
  }

  const isAdmin = auth.isAdmin();

  // Tab switching (admin only)
  const tabMap = { community: 'wsPanelCommunity', pending: 'wsPanelPending' };
  if (isAdmin) {
    $$('.tools-tab[data-ws-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.tools-tab[data-ws-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.tool-panel[id^="wsPanel"]').forEach(p => p.classList.remove('active'));
        const panel = $(`#${tabMap[tab.dataset.wsTab]}`);
        if (panel) panel.classList.add('active');
      });
    });
  }

  // Load community widgets
  (async () => {
    const el = $('#wsCommunityList');
    try {
      const res = await workshopApi.getList();
      if (res.code === 0) {
        const allWidgets = res.data || [];
        const config = getWidgetConfig();
        const myIds = new Set((config.customs || []).map(c => c.id));

        const renderList = (keyword) => {
          const filtered = keyword
            ? allWidgets.filter(w => w.name.toLowerCase().includes(keyword.toLowerCase()) || w.author_email.toLowerCase().includes(keyword.toLowerCase()))
            : allWidgets;

          if (!filtered.length) {
            el.innerHTML = keyword
              ? '<p style="text-align:center;color:var(--fg2);padding:24px">没有找到匹配的工具~</p>'
              : '<p style="text-align:center;color:var(--fg2);padding:24px">暂无社区作品，快来上传第一个吧~</p>';
            return;
          }

          el.innerHTML = `<div class="workshop-grid">${filtered.map(w => {
            const communityId = `community_${w.id}`;
            const added = myIds.has(communityId);
            const isUrl = w.type === 'url';
            return `<div class="workshop-card" data-ws-id="${w.id}" data-community-id="${communityId}" data-is-url="${isUrl ? '1' : '0'}" style="cursor:default">
              <span class="workshop-card-icon">${escapeHtml(w.icon)}</span>
              <div class="workshop-card-name">${escapeHtml(w.name)}</div>
              <div class="workshop-card-type">${isUrl ? '快捷链接' : w.type === 'code' ? '自定义代码' : '自定义内容'}</div>
              <div class="workshop-card-author">by ${escapeHtml(w.author_email)}</div>
              <div class="widget-stars" data-widget-id="${communityId}" style="margin-top:6px"></div>
              <div class="widget-card-actions">
                ${isUrl && added ? `<button class="btn btn-sm btn-secondary ws-open-url-btn" data-url="${escapeHtml(w.url || '')}">🔗 打开链接</button>` : ''}
                <button class="btn btn-sm ${added ? 'btn-ghost' : 'btn-primary'} ws-add-btn" data-id="${w.id}" ${added ? 'disabled' : ''}>
                  ${added ? '✓ 已添加' : '+ 添加到工具箱'}
                </button>
                ${isAdmin ? '<button class="btn btn-sm btn-danger ws-del-btn" data-id="' + w.id + '">🗑️</button>' : ''}
              </div>
            </div>`;
          }).join('')}</div>`;

          el.querySelectorAll('.ws-add-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', async () => {
              btn.disabled = true;
              btn.textContent = '...';
              try {
                const res = await workshopApi.addToMyWidgets(parseInt(btn.dataset.id));
                if (res.code === 0) {
                  btn.textContent = '✓ 已添加';
                  btn.className = 'btn btn-sm btn-ghost ws-add-btn';
                  _widgetConfig = res.data;
                  showToast('已添加到工具箱', 'success');
                } else {
                  btn.disabled = false;
                  btn.textContent = '+ 添加到工具箱';
                  showToast(res.message || '添加失败', 'error');
                }
              } catch(e) {
                btn.disabled = false;
                btn.textContent = '+ 添加到工具箱';
                showToast('网络错误', 'error');
              }
            });
          });

          // Open URL button for community URL widgets
          el.querySelectorAll('.ws-open-url-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const url = btn.dataset.url;
              if (url) window.open(url, '_blank');
            });
          });

          // Admin: delete community widget
          el.querySelectorAll('.ws-del-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              const ok = await showConfirm('🗑️ 确认删除该社区作品？此操作不可撤销');
              if (!ok) return;
              btn.disabled = true;
              try {
                const res = await workshopApi.deleteWidget(parseInt(btn.dataset.id));
                if (res.code === 0) {
                  showToast('已删除', 'success');
                  renderList($('#wsSearch').value);
                } else {
                  btn.disabled = false;
                  showToast(res.message || '删除失败', 'error');
                }
              } catch(e) { btn.disabled = false; showToast('网络错误', 'error'); }
            });
          });

          // Load star ratings for community widgets
          $$('.workshop-card .widget-stars').forEach(starsEl => {
            const wid = starsEl.dataset.widgetId;
            if (wid) loadWidgetStars(wid, starsEl);
          });
        };

        renderList('');

        // Search input
        const searchInput = $('#wsSearch');
        let searchTimer = null;
        searchInput.addEventListener('input', () => {
          clearTimeout(searchTimer);
          searchTimer = setTimeout(() => renderList(searchInput.value.trim()), 200);
        });
      } else {
        el.innerHTML = '<p style="text-align:center;color:var(--fg2);padding:24px">暂无社区作品，快来上传第一个吧~</p>';
      }
    } catch(e) {
      el.innerHTML = '<p style="color:var(--fg2)">加载失败</p>';
    }
  })();

  // Load pending (admin only)
  if (isAdmin) {
    (async () => {
      const el = $('#wsPendingList');
      try {
        const res = await workshopApi.getPending();
        if (res.code === 0 && res.data.length) {
          el.innerHTML = res.data.map(w => `
            <div class="workshop-pending-item">
              <div class="workshop-pending-info">
                <span style="font-size:1.5rem">${escapeHtml(w.icon)}</span>
                <div>
                  <div style="font-weight:700">${escapeHtml(w.name)}</div>
                  <div style="font-size:.8rem;color:var(--fg2)">${w.type === 'url' ? '快捷链接' : w.type === 'code' ? '自定义代码' : '自定义内容'} · by ${escapeHtml(w.author_email)} · ${w.created_at}</div>
                  ${w.url ? `<div style="font-size:.75rem;color:var(--fg2);word-break:break-all">URL: ${escapeHtml(w.url)}</div>` : ''}
                  ${w.content ? `<div style="font-size:.75rem;color:var(--fg2);max-height:60px;overflow:auto">内容: ${escapeHtml(w.content.slice(0, 200))}</div>` : ''}
                </div>
              </div>
              <div class="workshop-pending-actions">
                <button class="btn btn-sm btn-primary ws-approve-btn" data-id="${w.id}">✅ 通过</button>
                <button class="btn btn-sm btn-danger ws-reject-btn" data-id="${w.id}">❌ 拒绝</button>
                <button class="btn btn-sm btn-ghost ws-pending-del-btn" data-id="${w.id}">🗑️</button>
              </div>
            </div>`).join('');

          el.querySelectorAll('.ws-approve-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              btn.disabled = true;
              try {
                const res = await workshopApi.review(parseInt(btn.dataset.id), 'approve');
                if (res.code === 0) {
                  showToast('已通过', 'success');
                  btn.closest('.workshop-pending-item').remove();
                } else { showToast(res.message || '操作失败', 'error'); btn.disabled = false; }
              } catch(e) { showToast('网络错误', 'error'); btn.disabled = false; }
            });
          });
          el.querySelectorAll('.ws-reject-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              btn.disabled = true;
              try {
                const res = await workshopApi.review(parseInt(btn.dataset.id), 'reject');
                if (res.code === 0) {
                  showToast('已拒绝', 'info');
                  btn.closest('.workshop-pending-item').remove();
                } else { showToast(res.message || '操作失败', 'error'); btn.disabled = false; }
              } catch(e) { showToast('网络错误', 'error'); btn.disabled = false; }
            });
          });
          el.querySelectorAll('.ws-pending-del-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              const ok = await showConfirm('🗑️ 确认删除该作品？此操作不可撤销');
              if (!ok) return;
              btn.disabled = true;
              try {
                const res = await workshopApi.deleteWidget(parseInt(btn.dataset.id));
                if (res.code === 0) {
                  showToast('已删除', 'success');
                  btn.closest('.workshop-pending-item').remove();
                } else { showToast(res.message || '删除失败', 'error'); btn.disabled = false; }
              } catch(e) { showToast('网络错误', 'error'); btn.disabled = false; }
            });
          });
        } else {
          el.innerHTML = '<p style="text-align:center;color:var(--fg2);padding:24px">暂无待审核作品</p>';
        }
      } catch(e) {
        el.innerHTML = '<p style="color:var(--fg2)">加载失败</p>';
      }
    })();
  }
}

/* ===== PRESET WIDGET: CALCULATOR ===== */
function renderCalculator() {
  return `
    <div class="calc-display">
      <input type="text" id="calcExpr" placeholder="输入表达式，如 2+3*4" readonly />
      <div class="calc-result" id="calcResult">0</div>
    </div>
    <div class="calc-grid">
      <button class="calc-btn" data-val="C">C</button>
      <button class="calc-btn" data-val="(">(</button>
      <button class="calc-btn" data-val=")">)</button>
      <button class="calc-btn calc-op" data-val="/">÷</button>
      <button class="calc-btn" data-val="7">7</button>
      <button class="calc-btn" data-val="8">8</button>
      <button class="calc-btn" data-val="9">9</button>
      <button class="calc-btn calc-op" data-val="*">×</button>
      <button class="calc-btn" data-val="4">4</button>
      <button class="calc-btn" data-val="5">5</button>
      <button class="calc-btn" data-val="6">6</button>
      <button class="calc-btn calc-op" data-val="-">−</button>
      <button class="calc-btn" data-val="1">1</button>
      <button class="calc-btn" data-val="2">2</button>
      <button class="calc-btn" data-val="3">3</button>
      <button class="calc-btn calc-op" data-val="+">+</button>
      <button class="calc-btn calc-zero" data-val="0">0</button>
      <button class="calc-btn" data-val=".">.</button>
      <button class="calc-btn calc-eq" data-val="=">=</button>
    </div>
  `;
}

function initCalculator() {
  let expr = '';
  const exprEl = $('#calcExpr');
  const resultEl = $('#calcResult');

  $$('.calc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.val;
      if (val === 'C') {
        expr = '';
        exprEl.value = '';
        resultEl.textContent = '0';
      } else if (val === '=') {
        try {
          const safe = expr.replace(/[^0-9+\-*/.()%]/g, '');
          if (!safe) return;
          const result = Function('"use strict";return (' + safe + ')')();
          resultEl.textContent = parseFloat(result.toPrecision(12));
          expr = String(result);
          exprEl.value = expr;
        } catch {
          resultEl.textContent = '表达式错误';
        }
      } else {
        expr += val;
        exprEl.value = expr;
      }
    });
  });
}

/* ===== PRESET WIDGET: POMODORO ===== */
function renderPomodoro() {
  return `
    <div class="pomodoro-display">
      <div class="pomodoro-phase" id="pomoPhase">🍅 专注时间</div>
      <div class="pomodoro-time" id="pomoTime">25:00</div>
      <div class="pomodoro-round">第 <span id="pomoRound">1</span> 轮</div>
    </div>
    <div class="pomodoro-btns">
      <button class="btn btn-primary" id="pomoStart">开始</button>
      <button class="btn btn-secondary" id="pomoReset">重置</button>
    </div>
  `;
}

function initPomodoro() {
  let totalSec = 25 * 60;
  let running = false;
  let isBreak = false;
  let round = 1;
  let timer = null;

  function updateDisplay() {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    $('#pomoTime').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    $('#pomoPhase').textContent = isBreak ? '☕ 休息时间' : '🍅 专注时间';
    $('#pomoRound').textContent = round;
  }

  $('#pomoStart').addEventListener('click', () => {
    if (running) {
      clearInterval(timer);
      running = false;
      $('#pomoStart').textContent = '继续';
    } else {
      running = true;
      $('#pomoStart').textContent = '暂停';
      timer = setInterval(() => {
        totalSec--;
        if (totalSec <= 0) {
          clearInterval(timer);
          running = false;
          if (isBreak) {
            isBreak = false;
            totalSec = 25 * 60;
            round++;
          } else {
            isBreak = true;
            totalSec = 5 * 60;
          }
          showToast(isBreak ? '专注结束，休息5分钟 ♪' : '休息结束，继续专注！', 'success');
          $('#pomoStart').textContent = '开始';
        }
        updateDisplay();
      }, 1000);
      widgetTimers.push(timer);
    }
  });

  $('#pomoReset').addEventListener('click', () => {
    clearInterval(timer);
    running = false;
    isBreak = false;
    round = 1;
    totalSec = 25 * 60;
    $('#pomoStart').textContent = '开始';
    updateDisplay();
  });

  updateDisplay();
}

/* ===== PRESET WIDGET: BMI ===== */
function renderBmi() {
  return `
    <div class="bmi-form">
      <div class="form-row" style="display:flex;gap:12px">
        <div style="flex:1"><label>身高 (cm)</label><input type="number" id="bmiHeight" placeholder="170" /></div>
        <div style="flex:1"><label>体重 (kg)</label><input type="number" id="bmiWeight" placeholder="65" /></div>
      </div>
      <button class="btn btn-primary" id="bmiCalc">计算 BMI</button>
    </div>
    <div id="bmiResult"></div>
  `;
}

function initBmi() {
  $('#bmiCalc').addEventListener('click', () => {
    const h = parseFloat($('#bmiHeight').value) / 100;
    const w = parseFloat($('#bmiWeight').value);
    if (!h || !w || h <= 0 || w <= 0) { showToast('请输入有效的身高和体重', 'error'); return; }
    const bmi = w / (h * h);
    let level, color;
    if (bmi < 18.5) { level = '偏瘦'; color = 'var(--info)'; }
    else if (bmi < 24) { level = '正常'; color = 'var(--success)'; }
    else if (bmi < 28) { level = '偏胖'; color = 'var(--warning)'; }
    else { level = '肥胖'; color = 'var(--accent2)'; }

    const pct = Math.min(Math.max((bmi - 10) / 30 * 100, 0), 100);
    $('#bmiResult').innerHTML = `
      <div class="bmi-value" style="color:${color}">${bmi.toFixed(1)}</div>
      <div class="bmi-bar">
        <div class="bmi-pointer" style="left:${pct}%"></div>
      </div>
      <div class="bmi-labels">
        <span>偏瘦</span><span>正常</span><span>偏胖</span><span>肥胖</span>
      </div>
      <div class="bmi-level" style="color:${color}">体型：${level}</div>
    `;
  });
}

/* ===== PRESET WIDGET: COLOR PICKER ===== */
function renderColorPicker() {
  return `
    <div class="colorpicker-area">
      <div class="color-preview" id="colorPreview" style="background:#ff7eb3"></div>
      <div class="form-row">
        <label>选择颜色</label>
        <input type="color" id="colorInput" value="#ff7eb3" />
      </div>
      <div class="form-row">
        <label>HEX</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="colorHex" value="#ff7eb3" />
          <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('colorHex').value);showToast('已复制','success')">复制</button>
        </div>
      </div>
      <div class="form-row">
        <label>RGB</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="colorRgb" value="rgb(255, 126, 179)" readonly />
          <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('colorRgb').value);showToast('已复制','success')">复制</button>
        </div>
      </div>
      <div class="form-row">
        <label>HSL</label>
        <div style="display:flex;gap:8px">
          <input type="text" id="colorHsl" value="" readonly />
          <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('colorHsl').value);showToast('已复制','success')">复制</button>
        </div>
      </div>
    </div>
  `;
}

function initColorPicker() {
  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }

  function updateColor(hex) {
    hex = hex.startsWith('#') ? hex : '#' + hex;
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    const { r, g, b } = hexToRgb(hex);
    $('#colorPreview').style.background = hex;
    $('#colorInput').value = hex;
    $('#colorHex').value = hex;
    $('#colorRgb').value = `rgb(${r}, ${g}, ${b})`;
    $('#colorHsl').value = rgbToHsl(r, g, b);
  }

  updateColor('#ff7eb3');

  $('#colorInput').addEventListener('input', e => updateColor(e.target.value));
  $('#colorHex').addEventListener('input', e => updateColor(e.target.value));
}

/* ===== PRESET WIDGET: STOPWATCH ===== */
function renderStopwatch() {
  return `
    <div class="stopwatch-display" id="swTime">00:00.00</div>
    <div class="stopwatch-btns">
      <button class="btn btn-primary" id="swStart">开始</button>
      <button class="btn btn-secondary" id="swLap" disabled>记圈</button>
      <button class="btn btn-ghost" id="swReset">重置</button>
    </div>
    <div class="lap-list" id="lapList"></div>
  `;
}

function initStopwatch() {
  let running = false;
  let startTime = 0;
  let elapsed = 0;
  let timer = null;
  let laps = [];

  function format(ms) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  function tick() {
    const now = Date.now();
    const total = elapsed + (now - startTime);
    $('#swTime').textContent = format(total);
  }

  $('#swStart').addEventListener('click', () => {
    if (running) {
      elapsed += Date.now() - startTime;
      clearInterval(timer);
      running = false;
      $('#swStart').textContent = '继续';
      $('#swLap').disabled = true;
    } else {
      startTime = Date.now();
      running = true;
      $('#swStart').textContent = '暂停';
      $('#swLap').disabled = false;
      timer = setInterval(tick, 10);
      widgetTimers.push(timer);
    }
  });

  $('#swLap').addEventListener('click', () => {
    if (!running) return;
    const now = Date.now();
    const total = elapsed + (now - startTime);
    const prevLap = laps.length ? laps[laps.length - 1].total : 0;
    laps.push({ total, lap: total - prevLap });
    const el = $('#lapList');
    el.innerHTML = laps.map((l, i) => `
      <div class="lap-item">
        <span>圈 ${i + 1}</span>
        <span>${format(l.lap)}</span>
        <span style="color:var(--fg2)">累计 ${format(l.total)}</span>
      </div>
    `).reverse().join('');
  });

  $('#swReset').addEventListener('click', () => {
    clearInterval(timer);
    running = false;
    elapsed = 0;
    laps = [];
    $('#swTime').textContent = '00:00.00';
    $('#swStart').textContent = '开始';
    $('#swLap').disabled = true;
    $('#lapList').innerHTML = '';
  });
}

/* ===== PRESET WIDGET: CHAR COUNT ===== */
function renderCharCount() {
  return `
    <div class="form-row">
      <label>输入文本</label>
      <textarea id="ccInput" rows="6" placeholder="在这里输入文本..."></textarea>
    </div>
    <div class="stat-grid" id="ccStats">
      <div class="stat-item"><div class="stat-value" id="ccChinese">0</div><div class="stat-label">中文字数</div></div>
      <div class="stat-item"><div class="stat-value" id="ccEnglish">0</div><div class="stat-label">英文词数</div></div>
      <div class="stat-item"><div class="stat-value" id="ccChars">0</div><div class="stat-label">总字符</div></div>
      <div class="stat-item"><div class="stat-value" id="ccCharsNs">0</div><div class="stat-label">不含空格</div></div>
      <div class="stat-item"><div class="stat-value" id="ccLines">0</div><div class="stat-label">行数</div></div>
      <div class="stat-item"><div class="stat-value" id="ccBytes">0</div><div class="stat-label">字节数</div></div>
    </div>
  `;
}

function initCharCount() {
  function count() {
    const text = $('#ccInput').value;
    const chinese = (text.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const english = text.trim() ? (text.match(/[a-zA-Z]+/g) || []).length : 0;
    const chars = text.length;
    const charsNs = text.replace(/\s/g, '').length;
    const lines = text ? text.split('\n').length : 0;
    const bytes = new Blob([text]).size;
    $('#ccChinese').textContent = chinese;
    $('#ccEnglish').textContent = english;
    $('#ccChars').textContent = chars;
    $('#ccCharsNs').textContent = charsNs;
    $('#ccLines').textContent = lines;
    $('#ccBytes').textContent = bytes;
  }
  $('#ccInput').addEventListener('input', count);
  count();
}

/* ===== RANDOM WIDGET ===== */
function renderRandomWidget() {
  return `
    <div class="tool-section">
      <div class="section-title">🔢 随机数生成</div>
      <div class="form-row" style="display:flex;gap:12px">
        <div style="flex:1"><label>最小值</label><input type="number" id="randMin" value="1" /></div>
        <div style="flex:1"><label>最大值</label><input type="number" id="randMax" value="100" /></div>
      </div>
      <button class="btn btn-primary" id="randGen">生成随机数</button>
      <div class="tool-result" id="randResult">点击按钮生成</div>
    </div>
    <div class="tool-section">
      <div class="section-title">🎯 随机抽签</div>
      <div class="form-row">
        <label>参与者（每行一个）</label>
        <textarea id="drawList" rows="4" placeholder="张三&#10;李四&#10;王五"></textarea>
      </div>
      <button class="btn btn-primary" id="drawGo">开始抽签</button>
      <div class="tool-result" id="drawResult">等待抽签</div>
    </div>
    <div class="tool-section">
      <div class="section-title">🎲 掷骰子</div>
      <div class="form-row" style="display:flex;gap:12px;align-items:end">
        <div style="flex:1"><label>骰子数量（1~6）</label><input type="number" id="diceCount" value="2" min="1" max="6" /></div>
        <button class="btn btn-primary" id="diceRoll">摇骰子</button>
      </div>
      <div id="diceResult"></div>
    </div>
  `;
}

function initRandomWidget() {
  $('#randGen').addEventListener('click', () => {
    const min = parseInt($('#randMin').value) || 0;
    const max = parseInt($('#randMax').value) || 100;
    if (min > max) { showToast('最小值不能大于最大值', 'error'); return; }
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    const randId = 'rand_' + Date.now();
    $('#randResult').innerHTML = `<span id="${randId}" style="font-size:2rem;font-family:'Outfit',sans-serif;font-weight:800;color:var(--accent)">${result}</span>
      <button class="btn btn-sm btn-secondary" onclick="navigator.clipboard.writeText(document.getElementById('${randId}').textContent);showToast('已复制','success')">复制</button>`;
  });
  $('#drawGo').addEventListener('click', () => {
    const list = $('#drawList').value.trim().split('\n').map(s => s.trim()).filter(Boolean);
    if (!list.length) { showToast('请输入参与者', 'error'); return; }
    const picked = list[Math.floor(Math.random() * list.length)];
    $('#drawResult').innerHTML = `<span class="draw-result">🎉 ${escapeHtml(picked)}</span>`;
  });
  $('#diceRoll').addEventListener('click', () => {
    let count = parseInt($('#diceCount').value) || 1;
    count = Math.max(1, Math.min(6, count));
    const results = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
    const total = results.reduce((a, b) => a + b, 0);
    $('#diceResult').innerHTML = `
      <div class="dice-container">${results.map(r => `<div class="dice">${r}</div>`).join('')}</div>
      <div class="dice-total">总计：${total}</div>
    `;
  });
}

/* ===== PASSWORD WIDGET ===== */
function renderPasswordWidget() {
  return `
    <div class="form-row">
      <label>密码长度</label>
      <div class="range-row">
        <input type="range" id="pwLen" min="6" max="32" value="16" />
        <span class="range-val" id="pwLenVal">16</span>
      </div>
    </div>
    <div class="form-row">
      <label>字符类型</label>
      <div class="checkbox-group">
        <label class="checkbox-item"><input type="checkbox" id="pwUpper" checked /> 大写字母 A-Z</label>
        <label class="checkbox-item"><input type="checkbox" id="pwLower" checked /> 小写字母 a-z</label>
        <label class="checkbox-item"><input type="checkbox" id="pwDigit" checked /> 数字 0-9</label>
        <label class="checkbox-item"><input type="checkbox" id="pwSymbol" checked /> 特殊符号 !@#$</label>
      </div>
    </div>
    <button class="btn btn-primary" id="pwGen">生成密码</button>
    <div class="tool-result" id="pwResult">点击按钮生成密码</div>
  `;
}

function initPasswordWidget() {
  const pwLen = $('#pwLen');
  const pwLenVal = $('#pwLenVal');
  pwLen.addEventListener('input', () => { pwLenVal.textContent = pwLen.value; });
  $('#pwGen').addEventListener('click', () => {
    const len = parseInt(pwLen.value);
    const upper = $('#pwUpper').checked;
    const lower = $('#pwLower').checked;
    const digit = $('#pwDigit').checked;
    const symbol = $('#pwSymbol').checked;
    if (!upper && !lower && !digit && !symbol) { showToast('请至少勾选一种字符类型', 'error'); return; }
    let chars = '';
    if (upper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (lower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (digit) chars += '0123456789';
    if (symbol) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';
    let pw = '';
    for (let i = 0; i < len; i++) pw += chars[Math.floor(Math.random() * chars.length)];
    const pwId = 'pw_' + Date.now();
    $('#pwResult').innerHTML = `<span class="password-display" id="${pwId}">${escapeHtml(pw)}</span>
      <button class="btn btn-sm btn-success" onclick="navigator.clipboard.writeText(document.getElementById('${pwId}').textContent);showToast('密码已复制','success')">复制密码</button>`;
  });
}

/* ===== CONVERTER WIDGET ===== */
function renderConverterWidget() {
  return `
    <div class="tool-section">
      <div class="section-title">📏 长度换算</div>
      <div class="converter-row">
        <div><label>数值</label><input type="number" id="lenVal" value="1" /></div>
        <div><label>原单位</label>
          <select id="lenFrom"><option value="m">米</option><option value="cm">厘米</option><option value="km">千米</option><option value="in">英寸</option><option value="ft">英尺</option></select>
        </div>
        <div class="converter-arrow">→</div>
        <div><label>目标单位</label>
          <select id="lenTo"><option value="cm">厘米</option><option value="m">米</option><option value="km">千米</option><option value="in">英寸</option><option value="ft">英尺</option></select>
        </div>
      </div>
      <div class="tool-result" id="lenResult">1 米 = 100 厘米</div>
    </div>
    <div class="tool-section">
      <div class="section-title">⚖️ 重量换算</div>
      <div class="converter-row">
        <div><label>数值</label><input type="number" id="wtVal" value="1" /></div>
        <div><label>原单位</label>
          <select id="wtFrom"><option value="kg">千克</option><option value="g">克</option><option value="jin">斤</option><option value="lb">磅</option></select>
        </div>
        <div class="converter-arrow">→</div>
        <div><label>目标单位</label>
          <select id="wtTo"><option value="jin">斤</option><option value="kg">千克</option><option value="g">克</option><option value="lb">磅</option></select>
        </div>
      </div>
      <div class="tool-result" id="wtResult">1 千克 = 2 斤</div>
    </div>
    <div class="tool-section">
      <div class="section-title">🌡️ 温度换算</div>
      <div class="converter-row">
        <div><label>数值</label><input type="number" id="tmpVal" value="0" /></div>
        <div><label>原单位</label>
          <select id="tmpFrom"><option value="C">摄氏度</option><option value="F">华氏度</option></select>
        </div>
        <div class="converter-arrow">→</div>
        <div><label>目标单位</label>
          <select id="tmpTo"><option value="F">华氏度</option><option value="C">摄氏度</option></select>
        </div>
      </div>
      <div class="tool-result" id="tmpResult">0°C = 32°F</div>
    </div>
  `;
}

function initConverterWidget() {
  const lenFactors = { m: 1, cm: 0.01, km: 1000, 'in': 0.0254, ft: 0.3048 };
  const lenNames = { m: '米', cm: '厘米', km: '千米', 'in': '英寸', ft: '英尺' };
  function convLen() {
    const val = parseFloat($('#lenVal').value) || 0;
    const from = $('#lenFrom').value;
    const to = $('#lenTo').value;
    const result = val * lenFactors[from] / lenFactors[to];
    $('#lenResult').innerHTML = `<span style="color:var(--accent);font-family:'Outfit',sans-serif;font-weight:700">${val} ${lenNames[from]} = ${parseFloat(result.toPrecision(8))} ${lenNames[to]}</span>`;
  }
  $('#lenVal').addEventListener('input', convLen);
  $('#lenFrom').addEventListener('change', convLen);
  $('#lenTo').addEventListener('change', convLen);

  const wtFactors = { kg: 1, g: 0.001, jin: 0.5, lb: 0.453592 };
  const wtNames = { kg: '千克', g: '克', jin: '斤', lb: '磅' };
  function convWt() {
    const val = parseFloat($('#wtVal').value) || 0;
    const from = $('#wtFrom').value;
    const to = $('#wtTo').value;
    const result = val * wtFactors[from] / wtFactors[to];
    $('#wtResult').innerHTML = `<span style="color:var(--accent);font-family:'Outfit',sans-serif;font-weight:700">${val} ${wtNames[from]} = ${parseFloat(result.toPrecision(8))} ${wtNames[to]}</span>`;
  }
  $('#wtVal').addEventListener('input', convWt);
  $('#wtFrom').addEventListener('change', convWt);
  $('#wtTo').addEventListener('change', convWt);

  const tmpNames = { C: '°C', F: '°F' };
  function convTmp() {
    const val = parseFloat($('#tmpVal').value) || 0;
    const from = $('#tmpFrom').value;
    const to = $('#tmpTo').value;
    let result;
    if (from === 'C' && to === 'F') result = val * 9 / 5 + 32;
    else if (from === 'F' && to === 'C') result = (val - 32) * 5 / 9;
    else result = val;
    $('#tmpResult').innerHTML = `<span style="color:var(--accent);font-family:'Outfit',sans-serif;font-weight:700">${val}${tmpNames[from]} = ${parseFloat(result.toPrecision(8))}${tmpNames[to]}</span>`;
  }
  $('#tmpVal').addEventListener('input', convTmp);
  $('#tmpFrom').addEventListener('change', convTmp);
  $('#tmpTo').addEventListener('change', convTmp);
}

/* ===== INIT ===== */
function initPage(page) {
  const inits = { home: initHome, weather: initWeather, memo: initMemo, countdown: initCountdown, widgets: initWidgets, ranking: initRanking, user: initUser, workshop: initWorkshop, admin: initAdmin };
  if (inits[page]) inits[page]();
}

// Navbar events
document.addEventListener('DOMContentLoaded', () => {
  // Migrate old unprefixed localStorage data keys
  storage.clearAllDataKeys();

  createSakura();
  $$('.nav-links a').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.page); });
  });
  $('#hamburger').addEventListener('click', () => {
    $('#navLinks').classList.toggle('open');
  });
  $('#widgetModalClose').addEventListener('click', closeWidgetModal);
  $('#widgetModal').addEventListener('click', e => { if (e.target.id === 'widgetModal') closeWidgetModal(); });

  // Logout / Login button
  $('#navLogout').addEventListener('click', () => {
    if (auth.isGuest()) {
      auth.clearAuth();
      showLoginPage();
    } else {
      auth.clearAuth();
      showToast('已退出登录', 'info');
      showLoginPage();
    }
  });
  $('#navMobileLogout').addEventListener('click', () => {
    if (auth.isGuest()) {
      auth.clearAuth();
      $('#navLinks').classList.remove('open');
      showLoginPage();
    } else {
      auth.clearAuth();
      showToast('已退出登录', 'info');
      $('#navLinks').classList.remove('open');
      showLoginPage();
    }
  });

  // Share card modal events
  $('#shareCardClose').addEventListener('click', closeShareCard);
  $('#shareCardModal').addEventListener('click', e => { if (e.target.id === 'shareCardModal') closeShareCard(); });
  $('#shareCardDownload').addEventListener('click', () => {
    const canvas = $('#shareCardCanvas');
    const link = document.createElement('a');
    link.download = '分享卡片_工具站.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('卡片已保存 ♪', 'success');
  });
  $('#shareCardCopyLink').addEventListener('click', () => {
    if (_lastShareUrl) {
      copyText(_lastShareUrl).then(() => {
        showToast('链接已复制 ♪', 'success');
      }).catch(() => {
        showToast('复制失败', 'error');
      });
    }
  });

  // Auth check
  if (auth.isLoggedIn()) {
    auth.updateNav();
    // Parse share params from URL
    const shareParams = parseShareParams();
    if (shareParams) {
      window._shareParams = shareParams;
      if (shareParams.city) navigate('weather');
      else if (shareParams.countdown) navigate('countdown');
      else if (shareParams.memo_title) navigate('memo');
      else {
        navigate('home');
        setTimeout(() => {
          if (shareParams.widget) openWidgetModal(shareParams.widget);
          else if (shareParams.custom) openWidgetModal(shareParams.custom);
        }, 100);
      }
      const cleanUrl = window.location.origin + window.location.pathname;
      history.replaceState(null, '', cleanUrl);
    } else {
      navigate('home');
    }
  } else {
    showLoginPage();
  }
});
