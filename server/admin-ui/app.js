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
  const ocrRecordId = document.getElementById('ocrRecordId');
  const loadOcrRecordBtn = document.getElementById('loadOcrRecord');

  const setVipBtn = document.getElementById('setVipBtn');
  const vipForm = document.getElementById('vipForm');
  const vipUserId = document.getElementById('vipUserId');
  const vipDays = document.getElementById('vipDays');
  const confirmVipBtn = document.getElementById('confirmVipBtn');
  const userData = document.getElementById('userData');

  const loadStatsBtn = document.getElementById('loadStats');
  const statsEl = document.getElementById('stats');

  const checkServicesBtn = document.getElementById('checkServices');
  const servicesEl = document.getElementById('services');

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

  // 用户管理相关
  setVipBtn.addEventListener('click', () => {
    vipForm.style.display = vipForm.style.display === 'none' ? 'flex' : 'none';
  });

  confirmVipBtn.addEventListener('click', async () => {
    const userId = vipUserId.value.trim();
    const days = vipDays.value.trim();
    
    if (!userId || !days) {
      userData.textContent = '请输入用户ID和天数';
      return;
    }

    userData.textContent = '设置中...';
    try {
      await apiPost('/set_vip', { user_id: userId, days: days });
      userData.textContent = 'VIP设置成功';
      vipUserId.value = '';
      vipDays.value = '';
      vipForm.style.display = 'none';
    } catch (e) {
      userData.textContent = e.message;
    }
  });

  // 数据查看
  document.querySelectorAll('[data-endpoint]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const ep = btn.getAttribute('data-endpoint');
      const targetEl = ep === 'users' ? userData : dataView;
      targetEl.textContent = '加载中...';
      try {
        const data = await apiGet('/' + ep);
        pretty(targetEl, data);
      } catch (e) {
        targetEl.textContent = e.message;
      }
    });
  });

  loadOcrRecordBtn.addEventListener('click', async () => {
    const id = (ocrRecordId.value || '').trim();
    if (!id) {
      dataView.textContent = '请先输入 OCR 记录 ID';
      return;
    }
    dataView.textContent = '加载中...';
    try {
      const data = await apiGet(`/medication_ocr_record/${encodeURIComponent(id)}`);
      pretty(dataView, data);
    } catch (e) {
      dataView.textContent = e.message;
    }
  });

  // 系统统计
  loadStatsBtn.addEventListener('click', async () => {
    statsEl.textContent = '加载中...';
    try {
      const data = await apiGet('/stats');
      pretty(statsEl, data);
    } catch (e) {
      statsEl.textContent = e.message;
    }
  });

  // 服务状态检查
  checkServicesBtn.addEventListener('click', async () => {
    servicesEl.textContent = '检查中...';
    try {
      // 检查各个服务的状态
      const services = {
        api: '正常',
        database: '正常',
        ai: '未配置',
        ocr: '未配置'
      };

      // 检查API状态
      await apiGet('/overview');
      services.api = '正常';

      // 检查设置中的服务配置
      const settings = await apiGet('/settings');
      const settingKeys = settings.map(s => s.key);
      
      if (settingKeys.includes('AI_API_KEY')) {
        services.ai = '已配置';
      }
      
      if (settingKeys.includes('BAIDU_OCR_API_KEY')) {
        services.ocr = '已配置';
      }

      pretty(servicesEl, services);
    } catch (e) {
      servicesEl.textContent = e.message;
    }
  });

  // 初始化加载
  loadOverviewBtn.click();
  loadStatsBtn.click();
  checkServicesBtn.click();
}

wire();
