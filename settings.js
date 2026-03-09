/* ============================================================
   settings.js — 设置 App 全部逻辑（完整终极修复版）
   核心修复：wallpaper2Src 提前声明，消除 TDZ 崩溃
   ============================================================ */

function sSave(key, val) {
  try {
    localStorage.setItem('halo9_' + key, JSON.stringify(val));
  } catch (e) {
    console.warn('[sSave] 存储失败，key:', key, e);
    alert('保存失败：本地存储空间不足。图片已自动压缩但仍超限，请尝试使用图片 URL 代替本地上传。');
  }
}
function sLoad(key, def) {
  try {
    const v = localStorage.getItem('halo9_' + key);
    return v !== null ? JSON.parse(v) : def;
  } catch (e) { return def; }
}

/* ============================================================
   图片压缩工具函数
   maxSize: 图片最大边长（px）
   quality: jpeg 压缩质量 0~1
   ============================================================ */
function compressImage(dataUrl, maxSize, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function () {
      let w = img.width;
      let h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w >= h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else        { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function () { resolve(dataUrl); };
    img.src = dataUrl;
  });
}

window.initSettings = function () {

  /* ============================================================
     两个壁纸变量必须最先声明，避免 applyWallpaper 调用
     applyWallpaper2Fallback 时 wallpaper2Src 处于 TDZ 崩溃
     ============================================================ */
  let wallpaperSrc  = sLoad('wallpaper',  '');
  let wallpaper2Src = sLoad('wallpaper2', '');

  /* ============================================================
     层级导航
     ============================================================ */
  function showLayer(id) {
    document.querySelectorAll('.settings-layer').forEach(el => { el.style.display = 'none'; });
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  }
  function hideAllSettings() {
    document.querySelectorAll('.settings-layer').forEach(el => { el.style.display = 'none'; });
  }

  const dockSettings = document.getElementById('dock-settings');
  if (dockSettings) dockSettings.addEventListener('click', () => showLayer('settings-root'));
  document.querySelectorAll('[data-app="settings"]').forEach(el => {
    el.addEventListener('click', () => showLayer('settings-root'));
  });

  const rootClose = document.getElementById('settings-root-close');
  if (rootClose) rootClose.addEventListener('click', hideAllSettings);

  document.querySelectorAll('.settings-back-btn[data-back]').forEach(btn => {
    btn.addEventListener('click', function () { showLayer(this.dataset.back); });
  });

  const gotoApi = document.getElementById('goto-api');
  if (gotoApi) gotoApi.addEventListener('click', () => {
    renderApiArchiveList();
    showLayer('settings-api');
  });

  const gotoTheme = document.getElementById('goto-theme');
  if (gotoTheme) gotoTheme.addEventListener('click', () => {
    renderIconReplaceList();
    renderColorFields();
    renderAppNameFields();
    initWallpaper2Preview();
    showLayer('settings-theme');
  });

  const gotoData = document.getElementById('goto-data');
  if (gotoData) gotoData.addEventListener('click', () => showLayer('settings-data'));

  const gotoPrivacyBtn = document.getElementById('goto-privacy');
  if (gotoPrivacyBtn) gotoPrivacyBtn.addEventListener('click', () => {
    const saved = sLoad('pinAvatar', null);
    const prev  = document.getElementById('privacy-pin-avatar-preview');
    if (prev) prev.src = saved || DEFAULT_PIN_AVATAR;
    setPinAvatarTab('url');
    const urlInput = document.getElementById('privacy-pin-avatar-url');
    if (urlInput) urlInput.value = '';
    showLayer('settings-privacy');
  });

  const gotoDevtools = document.getElementById('goto-devtools');
  if (gotoDevtools) gotoDevtools.addEventListener('click', () => {
    refreshAllKeysList();
    showLayer('settings-devtools');
  });

  /* ============================================================
     ① API 设置
     ============================================================ */
  let apiArchives = sLoad('apiArchives', []);

  function renderApiArchiveList() {
    const container = document.getElementById('api-archive-list');
    if (!container) return;
    if (!apiArchives.length) {
      container.innerHTML = '<div class="settings-desc" style="padding:4px 0;">暂无存档，保存后显示在这里</div>';
      return;
    }
    container.innerHTML = '';
    apiArchives.forEach((arc, idx) => {
      const row  = document.createElement('div');
      row.className = 'api-archive-item';
      const info = document.createElement('div');
      info.className   = 'api-archive-info';
      info.dataset.idx = idx;
      const nameDiv = document.createElement('div');
      nameDiv.className   = 'api-archive-name';
      nameDiv.textContent = arc.name || '未命名';
      const urlDiv = document.createElement('div');
      urlDiv.className   = 'api-archive-url';
      urlDiv.textContent = arc.url || '';
      info.appendChild(nameDiv);
      info.appendChild(urlDiv);
      const delBtn = document.createElement('button');
      delBtn.className   = 'api-archive-del';
      delBtn.dataset.del = idx;
      delBtn.textContent = '删除';
      row.appendChild(info);
      row.appendChild(delBtn);
      container.appendChild(row);
    });
    container.querySelectorAll('.api-archive-info').forEach(info => {
      info.addEventListener('click', function () {
        const arc = apiArchives[parseInt(this.dataset.idx)];
        const nE = document.getElementById('api-config-name');
        const uE = document.getElementById('api-url');
        const kE = document.getElementById('api-key');
        if (nE) nE.value = arc.name || '';
        if (uE) uE.value = arc.url  || '';
        if (kE) kE.value = arc.key  || '';
        setApiModelVisible(false);
        setApiStatus('');
      });
    });
    container.querySelectorAll('.api-archive-del').forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        apiArchives.splice(parseInt(this.dataset.del), 1);
        sSave('apiArchives', apiArchives);
        renderApiArchiveList();
      });
    });
  }

  function setApiStatus(msg, type) {
    const el = document.getElementById('api-fetch-status');
    if (!el) return;
    el.textContent = msg || '';
    el.className   = 'api-status-text' + (type ? ' ' + type : '');
  }

  function setApiModelVisible(show) {
    const label  = document.getElementById('api-model-label');
    const select = document.getElementById('api-model-select');
    const btn    = document.getElementById('api-model-confirm-btn');
    if (label)  label.style.display  = show ? '' : 'none';
    if (select) select.style.display = show ? '' : 'none';
    if (btn)    btn.style.display    = show ? '' : 'none';
  }

  const apiFetchBtn = document.getElementById('api-fetch-models-btn');
  if (apiFetchBtn) {
    apiFetchBtn.addEventListener('click', async function () {
      const urlEl = document.getElementById('api-url');
      const keyEl = document.getElementById('api-key');
      const url = urlEl ? urlEl.value.trim() : '';
      const key = keyEl ? keyEl.value.trim() : '';
      if (!url) { setApiStatus('请先填写 API 地址', 'error'); return; }
      setApiStatus('正在请求模型列表…');
      this.disabled = true;
      try {
        const endpoint = url.replace(/\/$/, '') + '/models';
        const headers  = { 'Content-Type': 'application/json' };
        if (key) headers['Authorization'] = 'Bearer ' + key;
        const res = await fetch(endpoint, { headers });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        let models = [];
        if (Array.isArray(json.data))        models = json.data.map(m => m.id || m.name).filter(Boolean);
        else if (Array.isArray(json.models)) models = json.models.map(m => m.name || m.id).filter(Boolean);
        else if (Array.isArray(json))        models = json.map(m => m.id || m.name).filter(Boolean);
        if (!models.length) throw new Error('未获取到模型列表');
        const sel = document.getElementById('api-model-select');
        if (sel) {
          sel.innerHTML = '';
          models.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m; opt.textContent = m;
            sel.appendChild(opt);
          });
        }
        setApiModelVisible(true);
        setApiStatus('获取到 ' + models.length + ' 个模型', 'success');
      } catch (err) {
        setApiStatus('请求失败：' + err.message, 'error');
        setApiModelVisible(false);
      } finally {
        this.disabled = false;
      }
    });
  }

  const apiModelConfirmBtn = document.getElementById('api-model-confirm-btn');
  if (apiModelConfirmBtn) {
    apiModelConfirmBtn.addEventListener('click', function () {
      const sel = document.getElementById('api-model-select');
      if (!sel) return;
      sSave('apiCurrentModel', sel.value);
      setApiStatus('已选择模型：' + sel.value, 'success');
    });
  }

  const apiSaveBtn = document.getElementById('api-save-btn');
  if (apiSaveBtn) {
    apiSaveBtn.addEventListener('click', function () {
      const nE   = document.getElementById('api-config-name');
      const uE   = document.getElementById('api-url');
      const kE   = document.getElementById('api-key');
      const name = (nE ? nE.value.trim() : '') || ('配置' + (apiArchives.length + 1));
      const url  = uE ? uE.value.trim() : '';
      const key  = kE ? kE.value.trim() : '';
      if (!url) { setApiStatus('API 地址不能为空', 'error'); return; }
      const existing = apiArchives.findIndex(a => a.name === name);
      if (existing >= 0) apiArchives[existing] = { name, url, key };
      else apiArchives.push({ name, url, key });
      sSave('apiArchives', apiArchives);
      sSave('apiActiveConfig', { name, url, key });
      renderApiArchiveList();
      setApiStatus('配置已保存', 'success');
    });
  }

  /* 恢复上次 API 配置 */
  (function () {
    const active = sLoad('apiActiveConfig', null);
    if (!active) return;
    const nE = document.getElementById('api-config-name');
    const uE = document.getElementById('api-url');
    const kE = document.getElementById('api-key');
    if (nE) nE.value = active.name || '';
    if (uE) uE.value = active.url  || '';
    if (kE) kE.value = active.key  || '';
  })();

  /* ============================================================
     ② 美化 / 主题
     ============================================================ */

  /* ---- 暗色模式 ---- */
  (function () {
    const DARK_KEY = 'halo9_darkMode';
    function applyDarkMode(on) {
      document.body.classList.toggle('dark-mode', on);
    }
    const on     = localStorage.getItem(DARK_KEY) === 'true';
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = on;
    applyDarkMode(on);
    if (toggle) {
      toggle.addEventListener('change', function () {
        localStorage.setItem(DARK_KEY, this.checked ? 'true' : 'false');
        applyDarkMode(this.checked);
      });
    }
  })();

  /* ---- 壁纸工具函数 ---- */
  function setPage2Wallpaper(src) {
    const p2 = document.getElementById('page2');
    if (!p2) return;
    p2.style.backgroundImage    = src ? 'url(' + src + ')' : '';
    p2.style.backgroundSize     = src ? 'cover' : '';
    p2.style.backgroundPosition = src ? 'center' : '';
  }

  function applyWallpaper2Fallback() {
    if (!wallpaper2Src) setPage2Wallpaper(wallpaperSrc);
  }

  function applyWallpaper(src) {
    wallpaperSrc = src;
    sSave('wallpaper', src);
    document.body.style.backgroundImage    = src ? 'url(' + src + ')' : '';
    document.body.style.backgroundSize     = src ? 'cover' : '';
    document.body.style.backgroundPosition = src ? 'center' : '';
    const preview = document.getElementById('wallpaper-preview');
    if (preview) {
      preview.style.backgroundImage = src ? 'url(' + src + ')' : '';
      preview.style.border          = src ? 'none' : '';
    }
    applyWallpaper2Fallback();
  }

  function applyWallpaper2(src) {
    wallpaper2Src = src;
    sSave('wallpaper2', src);
    setPage2Wallpaper(src || wallpaperSrc);
    const preview = document.getElementById('wallpaper2-preview');
    if (preview) {
      const ds = src || wallpaperSrc;
      preview.style.backgroundImage = ds ? 'url(' + ds + ')' : '';
      preview.style.border          = ds ? 'none' : '';
    }
  }

  function initWallpaper2Preview() {
    const preview = document.getElementById('wallpaper2-preview');
    if (!preview) return;
    const ds = wallpaper2Src || wallpaperSrc;
    preview.style.backgroundImage = ds ? 'url(' + ds + ')' : '';
    preview.style.border          = ds ? 'none' : '';
  }

  /* 启动时应用壁纸 */
  applyWallpaper(wallpaperSrc);
  applyWallpaper2(wallpaper2Src);

  /* ---- 主页壁纸按钮 ---- */
  const wpUrlBtn = document.getElementById('wallpaper-url-btn');
  if (wpUrlBtn) wpUrlBtn.addEventListener('click', function () {
    const inp = document.getElementById('wallpaper-url-input');
    if (inp) inp.value = wallpaperSrc || '';
    const modal = document.getElementById('wallpaper-url-modal');
    if (modal) modal.classList.add('show');
  });
  const wpUrlConfirm = document.getElementById('wallpaper-url-confirm');
  if (wpUrlConfirm) wpUrlConfirm.addEventListener('click', function () {
    const inp = document.getElementById('wallpaper-url-input');
    if (inp) applyWallpaper(inp.value.trim());
    const modal = document.getElementById('wallpaper-url-modal');
    if (modal) modal.classList.remove('show');
  });
  const wpUrlCancel = document.getElementById('wallpaper-url-cancel');
  if (wpUrlCancel) wpUrlCancel.addEventListener('click', function () {
    const modal = document.getElementById('wallpaper-url-modal');
    if (modal) modal.classList.remove('show');
  });
  const wpLocalBtn = document.getElementById('wallpaper-local-btn');
  if (wpLocalBtn) wpLocalBtn.addEventListener('click', function () {
    const fi = document.getElementById('wallpaper-file-input');
    if (fi) fi.click();
  });
  const wpFileInput = document.getElementById('wallpaper-file-input');
  if (wpFileInput) wpFileInput.addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const compressed = await compressImage(e.target.result, 1200, 0.75);
      applyWallpaper(compressed);
    };
    reader.readAsDataURL(file);
    this.value = '';
  });
  const wpClearBtn = document.getElementById('wallpaper-clear-btn');
  if (wpClearBtn) wpClearBtn.addEventListener('click', () => applyWallpaper(''));

  /* ---- 第二页壁纸按钮 ---- */
  const wp2UrlBtn = document.getElementById('wallpaper2-url-btn');
  if (wp2UrlBtn) wp2UrlBtn.addEventListener('click', function () {
    const inp = document.getElementById('wallpaper2-url-input');
    if (inp) inp.value = wallpaper2Src || '';
    const modal = document.getElementById('wallpaper2-url-modal');
    if (modal) modal.classList.add('show');
  });
  const wp2UrlConfirm = document.getElementById('wallpaper2-url-confirm');
  if (wp2UrlConfirm) wp2UrlConfirm.addEventListener('click', function () {
    const inp = document.getElementById('wallpaper2-url-input');
    if (inp) applyWallpaper2(inp.value.trim());
    const modal = document.getElementById('wallpaper2-url-modal');
    if (modal) modal.classList.remove('show');
  });
  const wp2LocalBtn = document.getElementById('wallpaper2-url-cancel');
  if (wp2UrlCancel) wp2UrlCancel.addEventListener('click', function () {
    const modal = document.getElementById('wallpaper2-url-modal');
    if (modal) modal.classList.remove('show');
  });
  const wp2LocalBtn = document.getElementById('wallpaper2-local-btn');
  if (wp2LocalBtn) wp2LocalBtn.addEventListener('click', function () {
    const fi = document.getElementById('wallpaper2-file-input');
    if (fi) fi.click();
  });
  const wp2FileInput = document.getElementById('wallpaper2-file-input');
  if (wp2FileInput) wp2FileInput.addEventListener('change', async function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const compressed = await compressImage(e.target.result, 1200, 0.75);
      applyWallpaper2(compressed);
    };
    reader.readAsDataURL(file);
    this.value = '';
  });
  const wp2ClearBtn = document.getElementById('wallpaper2-clear-btn');
  if (wp2ClearBtn) wp2ClearBtn.addEventListener('click', () => applyWallpaper2(''));

  /* ---- App 名称修改 ---- */
  const appNameRegistry = [
    { key: 'app-name-dock-chat',     selector: '#dock-chat .app-name',            default: '了了'   },
    { key: 'app-name-dock-home',     selector: '#dock-home .app-name',            default: '家园'   },
    { key: 'app-name-dock-settings', selector: '#dock-settings .app-name',        default: '设置'   },
    { key: 'app-name-chat',          selector: '[data-app="chat"] .app-name',     default: '了了'   },
    { key: 'app-name-settings',      selector: '[data-app="settings"] .app-name', default: '设置'   },
    { key: 'app-name-music',         selector: '[data-app="0"] .app-name',        default: '音乐'   },
    { key: 'app-name-worldbook',     selector: '[data-app="worldbook"] .app-name',default: '世界书' },
    { key: 'app-name-calendar',      selector: '[data-app="2"] .app-name',        default: '日历'   },
    { key: 'app-name-gallery',       selector: '[data-app="3"] .app-name',        default: '相册'   },
    { key: 'app-name-p2-app-0',      selector: '[data-app="p2-app-0"] .app-name', default: '备忘录' },
    { key: 'app-name-p2-app-1',      selector: '[data-app="p2-app-1"] .app-name', default: '闹钟'   },
    { key: 'app-name-p2-app-2',      selector: '[data-app="p2-app-2"] .app-name', default: '地图'   },
    { key: 'app-name-p2-app-3',      selector: '[data-app="p2-app-3"] .app-name', default: '收藏'   },
  ];
  let customAppNames = sLoad('customAppNames', {});

  function applyAllAppNames() {
    appNameRegistry.forEach(reg => {
      const val = customAppNames[reg.key];
      if (val !== undefined) {
        document.querySelectorAll(reg.selector).forEach(el => { el.textContent = val; });
      }
    });
  }
  applyAllAppNames();

  function renderAppNameFields() {
    const container = document.getElementById('app-name-fields');
    if (!container) return;
    container.innerHTML = '';
    appNameRegistry.forEach(reg => {
      const currentVal = customAppNames[reg.key] !== undefined ? customAppNames[reg.key] : reg.default;
      const iconEl = document.querySelector(reg.selector.replace('.app-name', '.app-icon'));

      const row = document.createElement('div');
      row.className = 'app-name-row';

      const img = document.createElement('img');
      img.className = 'app-name-row-icon';
      img.alt = '';
      if (iconEl) img.src = iconEl.src;

      const label = document.createElement('span');
      label.className   = 'app-name-row-label';
      label.textContent = reg.default;

      const input = document.createElement('input');
      input.className       = 'app-name-row-input';
      input.dataset.key     = reg.key;
      input.value           = currentVal;
      input.placeholder     = reg.default;

      row.appendChild(img);
      row.appendChild(label);
      row.appendChild(input);
      container.appendChild(row);
    });
  }

  const appNameSaveBtn = document.getElementById('app-name-save-btn');
  if (appNameSaveBtn) {
    appNameSaveBtn.addEventListener('click', function () {
      const container = document.getElementById('app-name-fields');
      if (!container) return;
      container.querySelectorAll('.app-name-row-input').forEach(input => {
        const val = input.value.trim();
        if (val) customAppNames[input.dataset.key] = val;
        else delete customAppNames[input.dataset.key];
      });
      sSave('customAppNames', customAppNames);
      applyAllAppNames();
      alert('App名称已保存');
    });
  }

  const appNameResetBtn = document.getElementById('app-name-reset-btn');
  if (appNameResetBtn) {
    appNameResetBtn.addEventListener('click', function () {
      customAppNames = {};
      sSave('customAppNames', {});
      appNameRegistry.forEach(reg => {
        document.querySelectorAll(reg.selector).forEach(el => { el.textContent = reg.default; });
      });
      renderAppNameFields();
      alert('已恢复默认名称');
    });
  }

  /* ---- App 图标替换 ---- */
  const iconRegistry = [
    { key: 'dock-chat',     label: 'Dock · 了了',    selector: '#dock-chat .app-icon'              },
    { key: 'dock-home',     label: 'Dock · 家园',    selector: '#dock-home .app-icon'              },
    { key: 'dock-settings', label: 'Dock · 设置',    selector: '#dock-settings .app-icon'          },
    { key: 'app2-chat',     label: '了了 App',        selector: '[data-app="chat"] .app-icon'       },
    { key: 'app2-settings', label: '设置 App',        selector: '[data-app="settings"] .app-icon'   },
    { key: 'app4-0',        label: '音乐',            selector: '[data-app="0"] .app-icon'          },
    { key: 'app4-wb',       label: '世界书',          selector: '[data-app="worldbook"] .app-icon'  },
    { key: 'app4-2',        label: '日历',            selector: '[data-app="2"] .app-icon'          },
    { key: 'app4-3',        label: '相册',            selector: '[data-app="3"] .app-icon'          },
    { key: 'p2-app-0',      label: '第二页 · 备忘录',  selector: '[data-app="p2-app-0"] .app-icon'  },
    { key: 'p2-app-1',      label: '第二页 · 闹钟',   selector: '[data-app="p2-app-1"] .app-icon'  },
    { key: 'p2-app-2',      label: '第二页 · 地图',   selector: '[data-app="p2-app-2"] .app-icon'  },
    { key: 'p2-app-3',      label: '第二页 · 收藏',   selector: '[data-app="p2-app-3"] .app-icon'  },
  ];
  let customIcons = sLoad('customIcons', {});
  let iconEditKey = '';
  let iconTab     = 'url';

  function restoreAllIcons() {
    iconRegistry.forEach(reg => {
      if (customIcons[reg.key]) {
        document.querySelectorAll(reg.selector).forEach(el => { el.src = customIcons[reg.key]; });
      }
    });
  }
  restoreAllIcons();

  function renderIconReplaceList() {
    const container = document.getElementById('icon-replace-list');
    if (!container) return;
    container.innerHTML = '';
    iconRegistry.forEach(reg => {
      const iconEl     = document.querySelector(reg.selector);
      const currentSrc = customIcons[reg.key] || (iconEl ? iconEl.src : '');

      const row = document.createElement('div');
      row.className = 'icon-replace-row';

      const img = document.createElement('img');
      img.className = 'icon-replace-preview';
      img.alt = '';
      img.src = currentSrc;

      const nameDiv = document.createElement('div');
      nameDiv.className   = 'icon-replace-name';
      nameDiv.textContent = reg.label;

      const hintDiv = document.createElement('div');
      hintDiv.className   = 'icon-replace-hint';
      hintDiv.textContent = '点击替换 ›';

      row.appendChild(img);
      row.appendChild(nameDiv);
      row.appendChild(hintDiv);
      row.addEventListener('click', () => openIconReplaceModal(reg.key, reg.label));
      container.appendChild(row);
    });
  }

  function openIconReplaceModal(key, label) {
    iconEditKey = key;
    iconTab     = 'url';
    const titleEl = document.getElementById('icon-replace-modal-title');
    if (titleEl) titleEl.textContent = '替换：' + label;
    const urlInput  = document.getElementById('icon-url-input');
    const fileInput = document.getElementById('icon-file-input');
    if (urlInput)  urlInput.value  = '';
    if (fileInput) fileInput.value = '';
    setIconTab('url');
    const modal = document.getElementById('icon-replace-modal');
    if (modal) modal.classList.add('show');
  }

  function setIconTab(tab) {
    iconTab = tab;
    document.querySelectorAll('[data-icon-tab]').forEach(b => {
      b.classList.toggle('active', b.dataset.iconTab === tab);
    });
    const urlPanel   = document.getElementById('icon-url-panel');
    const localPanel = document.getElementById('icon-local-panel');
    if (urlPanel)   urlPanel.style.display   = tab === 'url'   ? '' : 'none';
    if (localPanel) localPanel.style.display = tab === 'local' ? '' : 'none';
  }

  document.querySelectorAll('[data-icon-tab]').forEach(btn => {
    btn.addEventListener('click', function () { setIconTab(this.dataset.iconTab); });
  });

  function applyIconSrc(key, src) {
    customIcons[key] = src;
    sSave('customIcons', customIcons);
    const reg = iconRegistry.find(r => r.key === key);
    if (reg) document.querySelectorAll(reg.selector).forEach(el => { el.src = src; });
    renderIconReplaceList();
  }

  const iconReplaceConfirm = document.getElementById('icon-replace-confirm');
  if (iconReplaceConfirm) {
    iconReplaceConfirm.addEventListener('click', function () {
      if (iconTab === 'url') {
        const urlEl = document.getElementById('icon-url-input');
        const url   = urlEl ? urlEl.value.trim() : '';
        if (!url) return;
        applyIconSrc(iconEditKey, url);
        const modal = document.getElementById('icon-replace-modal');
        if (modal) modal.classList.remove('show');
      } else {
        const fileEl = document.getElementById('icon-file-input');
        const file   = fileEl ? fileEl.files[0] : null;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async e => {
          const compressed = await compressImage(e.target.result, 300, 0.85);
          applyIconSrc(iconEditKey, compressed);
          const modal = document.getElementById('icon-replace-modal');
          if (modal) modal.classList.remove('show');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const iconReplaceCancel = document.getElementById('icon-replace-cancel');
  if (iconReplaceCancel) {
    iconReplaceCancel.addEventListener('click', function () {
      const modal = document.getElementById('icon-replace-modal');
      if (modal) modal.classList.remove('show');
    });
  }

  /* ---- 整体配色 ---- */
  const colorDefs = [
    { key: '--primary',    label: '主色调',   default: '#99C8ED' },
    { key: '--light-blue', label: '亮蓝色',   default: '#B3D8F4' },
    { key: '--mid-blue',   label: '中蓝色',   default: '#7a9abf' },
    { key: '--bg',         label: '背景色',   default: '#F5F5F0' },
    { key: '--bg2',        label: '辅助背景', default: '#F8F9FA' },
    { key: '--dark-bg',    label: '深色背景', default: '#1a1f2e' },
    { key: '--text-dark',  label: '主文字色', default: '#2c3448' },
    { key: '--text-mid',   label: '次文字色', default: '#5a6a80' },
    { key: '--text-light', label: '淡文字色', default: '#9aafc4' },
  ];
  let customColors = sLoad('customColors', {});

  function applyColors(colorMap) {
    Object.entries(colorMap).forEach(([k, v]) => {
      document.documentElement.style.setProperty(k, v);
    });
  }
  applyColors(customColors);

  function renderColorFields() {
    const container = document.getElementById('color-fields');
    if (!container) return;
    container.innerHTML = '';
    colorDefs.forEach(def => {
      const currentVal = customColors[def.key] || def.default;

      const row = document.createElement('div');
      row.className = 'color-field-row';

      const labelDiv = document.createElement('div');
      labelDiv.className   = 'color-field-label';
      labelDiv.textContent = def.label;

      const picker = document.createElement('input');
      picker.type        = 'color';
      picker.className   = 'color-field-input';
      picker.dataset.ckey = def.key;
      picker.value = /^#[0-9a-fA-F]{6}$/.test(currentVal) ? currentVal : def.default;

      const hexInput = document.createElement('input');
      hexInput.type        = 'text';
      hexInput.className   = 'color-field-hex';
      hexInput.dataset.hkey = def.key;
      hexInput.value       = currentVal;
      hexInput.maxLength   = 7;

      picker.addEventListener('input', function () { hexInput.value = this.value; });
      hexInput.addEventListener('input', function () {
        if (/^#[0-9a-fA-F]{6}$/.test(this.value.trim())) picker.value = this.value.trim();
      });

      row.appendChild(labelDiv);
      row.appendChild(picker);
      row.appendChild(hexInput);
      container.appendChild(row);
    });
  }

  const colorApplyBtn = document.getElementById('color-apply-btn');
  if (colorApplyBtn) {
    colorApplyBtn.addEventListener('click', function () {
      const container = document.getElementById('color-fields');
      if (!container) return;
      colorDefs.forEach(def => {
        const hexEl = container.querySelector('.color-field-hex[data-hkey="' + def.key + '"]');
        if (hexEl) {
          const val = hexEl.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(val)) customColors[def.key] = val;
        }
      });
      sSave('customColors', customColors);
      applyColors(customColors);
    });
  }

  const colorResetBtn = document.getElementById('color-reset-btn');
  if (colorResetBtn) {
    colorResetBtn.addEventListener('click', function () {
      customColors = {};
      sSave('customColors', {});
      colorDefs.forEach(def => {
        document.documentElement.style.setProperty(def.key, def.default);
      });
      renderColorFields();
    });
  }

  /* ============================================================
     ③ 数据管理
     ============================================================ */

  /* 主页 + 所有 App 数据键（halo9_ 前缀） */
  const HOME_DATA_KEYS = [
    'cdItems', 'carouselUrls', 'userAvatar', 'userSig', 'msgData', 'textBars',
    'apiArchives', 'apiActiveConfig', 'apiCurrentModel',
    'customIcons', 'customColors', 'wallpaper', 'wallpaper2', 'customAppNames',
    'darkMode', 'pinAvatar', 'lockPin',
    'p2UcBg', 'p2UcName', 'p2UcUid', 'p2UcFans', 'p2UcLikes',
    'p2AlbumBg', 'p2CdImg', 'page2Cards',
    'garden',
  ];

  /* 美化数据键 */
  const THEME_DATA_KEYS = [
    'customIcons', 'customColors', 'wallpaper', 'wallpaper2', 'customAppNames', 'darkMode',
  ];

  /* 了了 App 及家园原始键（非 halo9_ 前缀） */
  const LIAO_RAW_KEYS = [
    'liao_roles', 'liao_chats', 'liao_suiyan', 'liao_userName', 'liao_userAvatar',
    'liao_suiyanBg', 'liao_emojis', 'liao_emojiCats', 'liao_favorites',
    'liao_personas', 'liao_worldbook',
  ];

  function collectHalo9Data(keys) {
    const result = {};
    keys.forEach(k => {
      const v = localStorage.getItem('halo9_' + k);
      if (v !== null) {
        try { result['halo9_' + k] = JSON.parse(v); } catch (e) { result['halo9_' + k] = v; }
      }
    });
    return result;
  }

  function collectRawData(rawKeys) {
    const result = {};
    rawKeys.forEach(k => {
      const v = localStorage.getItem(k);
      if (v !== null) {
        try { result[k] = JSON.parse(v); } catch (e) { result[k] = v; }
      }
    });
    return result;
  }

  function downloadJson(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  function importAllFromJson(file, callback) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        Object.entries(data).forEach(([k, v]) => {
          try {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          } catch (ex) {
            console.warn('导入键失败（可能超出存储限制）：', k, ex);
          }
        });
        if (callback) callback();
      } catch (err) { alert('导入失败：JSON 格式错误'); }
    };
    reader.readAsText(file);
  }

  /* ---- 全局完整备份（遍历所有 localStorage 键） ---- */
  const exportGlobalBtn = document.getElementById('export-global-btn');
  if (exportGlobalBtn) {
    exportGlobalBtn.addEventListener('click', function () {
      const allData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        try { allData[key] = JSON.parse(localStorage.getItem(key)); }
        catch (e) { allData[key] = localStorage.getItem(key); }
      }
      const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = 'halo9_全量备份_' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
      const msg = document.getElementById('global-backup-msg');
      if (msg) {
        msg.textContent = '导出成功，共 ' + localStorage.length + ' 个键（含所有 App 数据）';
        setTimeout(() => { msg.textContent = ''; }, 4000);
      }
    });
  }

  const importGlobalBtn = document.getElementById('import-global-btn');
  if (importGlobalBtn) importGlobalBtn.addEventListener('click', function () {
    const fi = document.getElementById('import-global-file');
    if (fi) fi.click();
  });

  const importGlobalFile = document.getElementById('import-global-file');
  if (importGlobalFile) {
    importGlobalFile.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      if (!confirm('导入全局备份将覆盖当前所有数据，确定继续吗？')) return;
      importAllFromJson(file, () => {
        const msg = document.getElementById('global-backup-msg');
        if (msg) msg.textContent = '导入成功，即将刷新页面…';
        setTimeout(() => location.reload(), 1500);
      });
      this.value = '';
    });
  }

  /* ---- 主页数据导出（含了了、家园、API、隐私等全部数据） ---- */
  const exportAllBtn = document.getElementById('export-all-btn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', () => {
      const data = Object.assign(
        {},
        collectHalo9Data(HOME_DATA_KEYS),
        collectRawData(LIAO_RAW_KEYS)
      );
      downloadJson(data, 'halo9_主页数据_' + new Date().toISOString().slice(0, 10) + '.json');
    });
  }

  const importAllBtn = document.getElementById('import-all-btn');
  if (importAllBtn) importAllBtn.addEventListener('click', function () {
    const fi = document.getElementById('import-all-file');
    if (fi) fi.click();
  });

  const importAllFile = document.getElementById('import-all-file');
  if (importAllFile) {
    importAllFile.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      importAllFromJson(file, () => {
        alert('数据导入成功，即将刷新页面');
        location.reload();
      });
      this.value = '';
    });
  }

  /* ---- 美化数据导出 ---- */
  const exportThemeBtn = document.getElementById('export-theme-btn');
  if (exportThemeBtn) {
    exportThemeBtn.addEventListener('click', () => {
      const data = collectHalo9Data(THEME_DATA_KEYS);
      downloadJson(data, 'halo9_美化数据_' + new Date().toISOString().slice(0, 10) + '.json');
    });
  }

  const importThemeBtn = document.getElementById('import-theme-btn');
  if (importThemeBtn) importThemeBtn.addEventListener('click', function () {
    const fi = document.getElementById('import-theme-file');
    if (fi) fi.click();
  });

  const importThemeFile = document.getElementById('import-theme-file');
  if (importThemeFile) {
    importThemeFile.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;
      importAllFromJson(file, () => {
        wallpaperSrc  = sLoad('wallpaper',  '');
        wallpaper2Src = sLoad('wallpaper2', '');
        applyWallpaper(wallpaperSrc);
        applyWallpaper2(wallpaper2Src);
        customColors   = sLoad('customColors',   {}); applyColors(customColors);
        customIcons    = sLoad('customIcons',    {}); restoreAllIcons();
        customAppNames = sLoad('customAppNames', {}); applyAllAppNames();
        const darkOn = localStorage.getItem('halo9_darkMode') === 'true';
        document.body.classList.toggle('dark-mode', darkOn);
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) toggle.checked = darkOn;
        alert('美化数据导入成功');
      });
      this.value = '';
    });
  }

  /* ---- 清除全部数据 ---- */
  const clearAllDataBtn = document.getElementById('clear-all-data-btn');
  if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', function () {
      if (!confirm('确定要清除全部本地数据吗？此操作不可恢复！')) return;
      localStorage.clear();
      alert('已清除全部数据，即将刷新页面');
      location.reload();
    });
  }

  /* ============================================================
     ④ 隐私设置 — 锁屏头像
     ============================================================ */
  const DEFAULT_PIN_AVATAR = 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=halo9';
  let pinAvatarTab = 'url';

  (function () {
    const saved = sLoad('pinAvatar', null);
    const prev  = document.getElementById('privacy-pin-avatar-preview');
    if (saved && prev) prev.src = saved;
  })();

  function setPinAvatarTab(tab) {
    pinAvatarTab = tab;
    document.querySelectorAll('[data-pin-avatar-tab]').forEach(b => {
      b.classList.toggle('active', b.dataset.pinAvatarTab === tab);
    });
    const urlPanel   = document.getElementById('pin-avatar-url-panel');
    const localPanel = document.getElementById('pin-avatar-local-panel');
    if (urlPanel)   urlPanel.style.display   = tab === 'url'   ? '' : 'none';
    if (localPanel) localPanel.style.display = tab === 'local' ? '' : 'none';
  }

  document.querySelectorAll('[data-pin-avatar-tab]').forEach(btn => {
    btn.addEventListener('click', function () { setPinAvatarTab(this.dataset.pinAvatarTab); });
  });

  const pinAvatarUrlInput = document.getElementById('privacy-pin-avatar-url');
  if (pinAvatarUrlInput) {
    pinAvatarUrlInput.addEventListener('input', function () {
      const url  = this.value.trim();
      const prev = document.getElementById('privacy-pin-avatar-preview');
      if (url && prev) prev.src = url;
    });
  }

  const pinAvatarFileInput = document.getElementById('privacy-pin-avatar-file');
  if (pinAvatarFileInput) {
    pinAvatarFileInput.addEventListener('change', async function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async e => {
        const compressed = await compressImage(e.target.result, 300, 0.85);
        const prev = document.getElementById('privacy-pin-avatar-preview');
        if (prev) prev.src = compressed;
      };
      reader.readAsDataURL(file);
    });
  }

  const pinAvatarSaveBtn = document.getElementById('privacy-pin-avatar-save-btn');
  if (pinAvatarSaveBtn) {
    pinAvatarSaveBtn.addEventListener('click', async function () {
      const msgEl = document.getElementById('privacy-pin-avatar-msg');
      if (!msgEl) return;
      msgEl.style.color = '#e07a7a';
      async function applyAndSave(src) {
        sSave('pinAvatar', src);
        const pinAvatarEl = document.getElementById('pin-avatar-img');
        if (pinAvatarEl) pinAvatarEl.src = src;
        const prev = document.getElementById('privacy-pin-avatar-preview');
        if (prev) prev.src = src;
        msgEl.style.color = '#5aaa7a';
        msgEl.textContent = '头像已保存';
        setTimeout(() => { msgEl.textContent = ''; }, 2000);
      }
      if (pinAvatarTab === 'url') {
        const urlEl = document.getElementById('privacy-pin-avatar-url');
        const url   = urlEl ? urlEl.value.trim() : '';
        if (!url) { msgEl.textContent = '请输入图片 URL'; return; }
        await applyAndSave(url);
      } else {
        const fileEl = document.getElementById('privacy-pin-avatar-file');
        const file   = fileEl ? fileEl.files[0] : null;
        if (!file) { msgEl.textContent = '请选择一张图片'; return; }
        const reader = new FileReader();
        reader.onload = async e => {
          const compressed = await compressImage(e.target.result, 300, 0.85);
          await applyAndSave(compressed);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const pinAvatarResetBtn = document.getElementById('privacy-pin-avatar-reset-btn');
  if (pinAvatarResetBtn) {
    pinAvatarResetBtn.addEventListener('click', function () {
      const msgEl = document.getElementById('privacy-pin-avatar-msg');
      sSave('pinAvatar', null);
      const pinAvatarEl = document.getElementById('pin-avatar-img');
      if (pinAvatarEl) pinAvatarEl.src = DEFAULT_PIN_AVATAR;
      const prev = document.getElementById('privacy-pin-avatar-preview');
      if (prev) prev.src = DEFAULT_PIN_AVATAR;
      const urlInput = document.getElementById('privacy-pin-avatar-url');
      if (urlInput) urlInput.value = '';
      if (msgEl) {
        msgEl.style.color = '#5aaa7a';
        msgEl.textContent = '已恢复默认头像';
        setTimeout(() => { msgEl.textContent = ''; }, 2000);
      }
    });
  }

  /* ============================================================
     ⑤ 隐私设置 — 主屏幕密码
     ============================================================ */
  const pinSaveBtn = document.getElementById('privacy-pin-save-btn');
  if (pinSaveBtn) {
    pinSaveBtn.addEventListener('click', function () {
      const msgEl  = document.getElementById('privacy-pin-msg');
      const oldEl  = document.getElementById('privacy-old-pin');
      const newEl  = document.getElementById('privacy-new-pin');
      const confEl = document.getElementById('privacy-confirm-pin');
      if (!msgEl) return;
      const oldVal  = oldEl  ? oldEl.value  : '';
      const newVal  = newEl  ? newEl.value  : '';
      const confVal = confEl ? confEl.value : '';
      msgEl.style.color = '#e07a7a';
      if (!oldVal || !newVal || !confVal) { msgEl.textContent = '请填写全部字段'; return; }
      if (!/^\d{6}$/.test(newVal))        { msgEl.textContent = '新密码必须为6位数字'; return; }
      if (newVal !== confVal)             { msgEl.textContent = '两次输入的新密码不一致'; return; }
      if (!window.LockScreen)             { msgEl.textContent = '锁屏模块未加载'; return; }
      const ok = window.LockScreen.changePin(oldVal, newVal);
      if (!ok) { msgEl.textContent = '当前密码错误'; return; }
      msgEl.style.color = '#5aaa7a';
      msgEl.textContent = '密码已更新';
      if (oldEl)  oldEl.value  = '';
      if (newEl)  newEl.value  = '';
      if (confEl) confEl.value = '';
      setTimeout(() => { msgEl.textContent = ''; }, 2000);
    });
  }

  /* ============================================================
     ⑥ 开发者工具
     ============================================================ */
  let devLogEnabled = false;
  let devLogEntries = [];

  function devLogWrite(type, content) {
    if (!devLogEnabled) return;
    const now     = new Date();
    const timeStr = String(now.getHours()).padStart(2,'0') + ':' +
      String(now.getMinutes()).padStart(2,'0') + ':' +
      String(now.getSeconds()).padStart(2,'0') + '.' +
      String(now.getMilliseconds()).padStart(3,'0');
    devLogEntries.push({ type, content, time: timeStr });
    const win = document.getElementById('devtools-log-window');
    if (!win) return;
    const line = document.createElement('div');
    line.style.borderBottom  = '1px solid rgba(153,200,237,0.08)';
    line.style.paddingBottom = '4px';
    line.style.marginBottom  = '4px';
    const timeSpan = document.createElement('span');
    timeSpan.className   = 'devlog-entry-time';
    timeSpan.textContent = '[' + timeStr + '] ';
    const contentSpan = document.createElement('span');
    contentSpan.className = 'devlog-entry-' + type;
    const displayContent  = typeof content === 'string'
      ? content.slice(0, 1200) + (content.length > 1200 ? '…(已截断)' : '')
      : JSON.stringify(content).slice(0, 1200);
    contentSpan.textContent = displayContent;
    line.appendChild(timeSpan);
    line.appendChild(contentSpan);
    win.appendChild(line);
    win.scrollTop = win.scrollHeight;
  }

  window.halo9Log = devLogWrite;

  /* 劫持 fetch 记录 AI API */
  (function patchFetch() {
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const url      = typeof args[0] === 'string' ? args[0] : (args[0].url || '');
      const isAiCall = url.includes('/chat/completions') || url.includes('/completions');
      if (isAiCall && devLogEnabled) {
        try {
          const body = args[1] && args[1].body ? JSON.parse(args[1].body) : null;
          devLogWrite('request',
            '→ POST ' + url + '\n' +
            '  model: '    + (body && body.model    ? body.model    : '?') + '\n' +
            '  messages: ' + (body && body.messages ? body.messages.length : '?') + ' 条');
        } catch (e) {
          devLogWrite('request', '→ POST ' + url);
        }
      }
      let response;
      try {
        response = await originalFetch.apply(this, args);
      } catch (err) {
        if (isAiCall && devLogEnabled) devLogWrite('error', '✗ 网络错误: ' + err.message);
        throw err;
      }
      if (isAiCall && devLogEnabled) {
        response.clone().json().then(json => {
          const content = json.choices && json.choices[0] && json.choices[0].message
            ? json.choices[0].message.content
            : JSON.stringify(json).slice(0, 300);
          devLogWrite('response', '← ' + response.status + ' 回复: ' +
            (typeof content === 'string' ? content.slice(0, 500) : content));
        }).catch(() => {
          devLogWrite('response', '← ' + response.status + ' (无法解析响应体)');
        });
      }
      return response;
    };
  })();

  const devLogToggleBtn = document.getElementById('devtools-log-toggle-btn');
  if (devLogToggleBtn) {
    devLogToggleBtn.addEventListener('click', function () {
      devLogEnabled    = !devLogEnabled;
      this.textContent = devLogEnabled ? '关闭日志记录' : '开启日志记录';
      const statusEl   = document.getElementById('devtools-log-status');
      if (statusEl) {
        statusEl.textContent = '日志记录：' + (devLogEnabled ? '开启（API请求将被记录）' : '关闭');
        statusEl.style.color = devLogEnabled ? '#4caf84' : 'var(--text-light)';
      }
      if (devLogEnabled) devLogWrite('info', '✓ 日志记录已开启，将捕获所有 AI API 请求');
    });
  }

  const devLogClearBtn = document.getElementById('devtools-log-clear-btn');
  if (devLogClearBtn) {
    devLogClearBtn.addEventListener('click', function () {
      devLogEntries = [];
      const win = document.getElementById('devtools-log-window');
      if (win) win.innerHTML = '';
    });
  }

  const devLogExportBtn = document.getElementById('devtools-log-export-btn');
  if (devLogExportBtn) {
    devLogExportBtn.addEventListener('click', function () {
      if (!devLogEntries.length) { alert('暂无日志内容'); return; }
      const lines = devLogEntries.map(e => '[' + e.time + '][' + e.type + '] ' + e.content);
      const blob  = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href = url; a.download = 'halo9_log_' + Date.now() + '.txt'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  /* 存储键查看 */
  function devtoolsViewKey(keyName) {
    const metaEl    = document.getElementById('devtools-result-meta');
    const contentEl = document.getElementById('devtools-result-content');
    if (!metaEl || !contentEl) return;
    if (keyName === '__all__') {
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) allKeys.push(localStorage.key(i));
      metaEl.textContent    = '共 ' + allKeys.length + ' 个键';
      metaEl.style.color    = 'var(--text-mid)';
      contentEl.textContent = allKeys.sort().join('\n');
      return;
    }
    if (!keyName) { contentEl.textContent = '请先选择或输入键名'; return; }
    const raw = localStorage.getItem(keyName);
    if (raw === null) {
      metaEl.style.color    = '#e05c5c';
      metaEl.textContent    = '键名「' + keyName + '」不存在';
      contentEl.textContent = '（该键在 localStorage 中不存在）';
      return;
    }
    metaEl.style.color = '#4caf84';
    try {
      const parsed   = JSON.parse(raw);
      const isArray  = Array.isArray(parsed);
      const typeDesc = isArray
        ? '数组，共 ' + parsed.length + ' 条'
        : (typeof parsed === 'object' ? '对象' : typeof parsed);
      metaEl.textContent = '键：' + keyName + ' | 类型：' + typeDesc + ' | 大小：' + raw.length + ' 字节';
      if (isArray && parsed.length > 0) {
        const summary = parsed.map((item, idx) => {
          if (typeof item === 'object' && item !== null) {
            const name = item.nickname || item.realname || item.name || item.id || item.title || item.content || '';
            const keys = Object.keys(item).slice(0, 5).join(', ');
            return '[' + idx + '] ' + (name ? '「' + String(name).slice(0, 30) + '」 ' : '') + '{' + keys + '}';
          }
          return '[' + idx + '] ' + String(item).slice(0, 50);
        }).join('\n');
        contentEl.textContent = '── 摘要 ──\n' + summary +
          '\n\n── 完整数据（前3条）──\n' + JSON.stringify(parsed.slice(0, 3), null, 2);
      } else {
        contentEl.textContent = JSON.stringify(parsed, null, 2).slice(0, 3000);
      }
    } catch (e) {
      metaEl.style.color    = '#e05c5c';
      metaEl.textContent    = '键：' + keyName + ' | JSON解析失败 | 大小：' + raw.length + ' 字节';
      contentEl.textContent = raw.slice(0, 500);
    }
  }

  const devtoolsViewBtn = document.getElementById('devtools-view-btn');
  if (devtoolsViewBtn) {
    devtoolsViewBtn.addEventListener('click', function () {
      const sel = document.getElementById('devtools-key-select');
      if (sel) devtoolsViewKey(sel.value);
    });
  }

  function refreshAllKeysList() {
    const container = document.getElementById('devtools-all-keys');
    if (!container) return;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    keys.sort();
    if (!keys.length) { container.textContent = '（localStorage 为空）'; return; }
    container.innerHTML = '';
    keys.forEach(k => {
      const size = (localStorage.getItem(k) || '').length;
      const span = document.createElement('span');
      span.style.cssText = 'display:block;padding:2px 0;border-bottom:1px solid rgba(153,200,237,0.1);';
      const bold = document.createElement('b');
      bold.textContent = k;
      const sizeSpan = document.createElement('span');
      sizeSpan.style.cssText = 'color:#9aafc4;margin-left:8px;';
      sizeSpan.textContent = size + ' 字节';
      span.appendChild(bold);
      span.appendChild(sizeSpan);
      container.appendChild(span);
    });
  }

  const devtoolsListAllBtn = document.getElementById('devtools-list-all-btn');
  if (devtoolsListAllBtn) devtoolsListAllBtn.addEventListener('click', refreshAllKeysList);

  const devtoolsRefreshKeysBtn = document.getElementById('devtools-refresh-keys-btn');
  if (devtoolsRefreshKeysBtn) devtoolsRefreshKeysBtn.addEventListener('click', refreshAllKeysList);

  const devtoolsFixRolesBtn = document.getElementById('devtools-fix-roles-btn');
  if (devtoolsFixRolesBtn) {
    devtoolsFixRolesBtn.addEventListener('click', function () {
      const msgEl         = document.getElementById('devtools-fix-msg');
      const candidateKeys = ['liao_roles', 'halo9_roles', 'roles'];
      let found = null, foundKey = '';
      for (let i = 0; i < candidateKeys.length; i++) {
        try {
          const raw = localStorage.getItem(candidateKeys[i]);
          if (!raw) continue;
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) { found = parsed; foundKey = candidateKeys[i]; break; }
        } catch (e) {}
      }
      if (!found) {
        if (msgEl) { msgEl.style.color = '#e05c5c'; msgEl.textContent = '未找到任何角色数据，请先在了了中创建角色。'; }
        return;
      }
      try {
        const jsonStr = JSON.stringify(found);
        localStorage.setItem('liao_roles',  jsonStr);
        localStorage.setItem('halo9_roles', jsonStr);
        if (msgEl) {
          msgEl.style.color = '#4caf84';
          msgEl.textContent = '修复成功！从「' + foundKey + '」读取了 ' + found.length + ' 个角色，已同步写入 liao_roles 和 halo9_roles。';
        }
      } catch (e) {
        if (msgEl) { msgEl.style.color = '#e05c5c'; msgEl.textContent = '写入失败：' + e.message; }
      }
      if (msgEl) setTimeout(() => { msgEl.textContent = ''; }, 5000);
    });
  }

  const devtoolsCustomViewBtn = document.getElementById('devtools-custom-view-btn');
  if (devtoolsCustomViewBtn) {
    devtoolsCustomViewBtn.addEventListener('click', function () {
      const keyEl = document.getElementById('devtools-custom-key');
      const key   = keyEl ? keyEl.value.trim() : '';
      if (!key) { alert('请输入键名'); return; }
      devtoolsViewKey(key);
    });
  }

  const devtoolsCustomDeleteBtn = document.getElementById('devtools-custom-delete-btn');
  if (devtoolsCustomDeleteBtn) {
    devtoolsCustomDeleteBtn.addEventListener('click', function () {
      const keyEl = document.getElementById('devtools-custom-key');
      const key   = keyEl ? keyEl.value.trim() : '';
      if (!key) { alert('请输入键名'); return; }
      if (!confirm('确定要删除键「' + key + '」吗？此操作不可恢复。')) return;
      localStorage.removeItem(key);
      alert('已删除键：' + key);
      refreshAllKeysList();
    });
  }

  const devtoolsHardRefreshBtn = document.getElementById('devtools-hard-refresh-btn');
  if (devtoolsHardRefreshBtn) {
    devtoolsHardRefreshBtn.addEventListener('click', function () {
      const msgEl = document.getElementById('devtools-refresh-msg');
      if (msgEl) { msgEl.style.color = '#4caf84'; msgEl.textContent = '正在清除缓存并强制刷新…'; }
      if (typeof caches !== 'undefined') {
        caches.keys().then(function (keyList) {
          return Promise.all(keyList.map(function (key) { return caches.delete(key); }));
        }).then(function () {
          location.reload(true);
        }).catch(function () {
          location.reload(true);
        });
      } else {
        location.reload(true);
      }
    });
  }

  const devtoolsSwClearBtn = document.getElementById('devtools-sw-clear-btn');
  if (devtoolsSwClearBtn) {
    devtoolsSwClearBtn.addEventListener('click', function () {
      const msgEl = document.getElementById('devtools-refresh-msg');
      if (!('serviceWorker' in navigator)) {
        if (msgEl) { msgEl.style.color = '#e05c5c'; msgEl.textContent = '当前浏览器不支持 ServiceWorker'; }
        return;
      }
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        if (!registrations.length) {
          if (msgEl) { msgEl.style.color = '#f0c060'; msgEl.textContent = '没有发现已注册的 ServiceWorker'; }
          return;
        }
        return Promise.all(registrations.map(function (reg) { return reg.unregister(); }))
          .then(function () {
            if (typeof caches !== 'undefined') {
              return caches.keys().then(function (keys) {
                return Promise.all(keys.map(function (k) { return caches.delete(k); }));
              });
            }
          }).then(function () {
            if (msgEl) {
              msgEl.style.color = '#4caf84';
              msgEl.textContent = '已清除 ' + registrations.length + ' 个 ServiceWorker 及全部缓存，即将刷新…';
            }
            setTimeout(function () { location.reload(true); }, 1200);
          });
      }).catch(function (e) {
        if (msgEl) { msgEl.style.color = '#e05c5c'; msgEl.textContent = '清除失败：' + e.message; }
      });
    });
  }

  /* ============================================================
     弹窗遮罩点击关闭
     ============================================================ */
  ['wallpaper-url-modal', 'wallpaper2-url-modal', 'icon-replace-modal'].forEach(id => {
    const mask = document.getElementById(id);
    if (mask) {
      mask.addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('show');
      });
    }
  });

}; /* end window.initSettings */
