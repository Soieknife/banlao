const API_BASE = '/api/admin';

function getToken() {
  const t = localStorage.getItem('admin_token') || '';
  return t.trim();
}

function setToken(t) {
  localStorage.setItem('admin_token', (t || '').trim());
}

async function apiGet(path) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || `请求失败: ${res.status}`);
  }
  return data.data;
}

async function apiPost(path, body) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.code !== 200) {
    throw new Error(data.message || `请求失败: ${res.status}`);
  }
  return data.data;
}

function pretty(el, obj) {
  el.textContent = JSON.stringify(obj, null, 2);
}

function wire() {
  const tokenInput = document.getElementById('tokenInput');
  const saveTokenBtn = document.getElementById('saveToken');
  const clearTokenBtn = document.getElementById('clearToken');
  const loadOverviewBtn = document.getElementById('loadOverview');
  const overviewEl = document.getElementById('overview');

  const loadSettingsBtn = document.getElementById('loadSettings');
  const saveSettingBtn = document.getElementById('saveSetting');
  const settingsEl = document.getElementById('settings');
  const setKey = document.getElementById('setKey');
  const setValue = document.getElementById('setValue');

  const dataView = document.getElementById('dataView');

  tokenInput.value = getToken();

  saveTokenBtn.addEventListener('click', () => {
    setToken(tokenInput.value);
    alert('Token 已保存');
  });

  clearTokenBtn.addEventListener('click', () => {
    setToken('');
    tokenInput.value = '';
    alert('已清除');
  });

  loadOverviewBtn.addEventListener('click', async () => {
    overviewEl.textContent = '加载中...';
    try {
      const data = await apiGet('/overview');
      pretty(overviewEl, data);
    } catch (e) {
      overviewEl.textContent = e.message;
    }
  });

  loadSettingsBtn.addEventListener('click', async () => {
    settingsEl.textContent = '加载中...';
    try {
      const data = await apiGet('/settings');
      pretty(settingsEl, data);
    } catch (e) {
      settingsEl.textContent = e.message;
    }
  });

  saveSettingBtn.addEventListener('click', async () => {
    settingsEl.textContent = '保存中...';
    try {
      await apiPost('/settings/set', { key: setKey.value, value: setValue.value });
      setValue.value = '';
      const data = await apiGet('/settings');
      pretty(settingsEl, data);
    } catch (e) {
      settingsEl.textContent = e.message;
    }
  });

  document.querySelectorAll('[data-endpoint]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ep = btn.getAttribute('data-endpoint');
      dataView.textContent = '加载中...';
      try {
        const data = await apiGet('/' + ep);
        pretty(dataView, data);
      } catch (e) {
        dataView.textContent = e.message;
      }
    });
  });
}

wire();

