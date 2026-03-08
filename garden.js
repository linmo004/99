/* ============================================================
   garden.js — 家园App完整逻辑（重写版）
   ============================================================ */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════
     ── 顶部可配置常量 ──
     ══════════════════════════════════════════════ */
  const INTRO_IMG_URL = 'https://img.icons8.com/fluency/200/cottage.png';
  const ROOM_BG_URL   = 'https://img.icons8.com/fluency/200/interior.png';

  const ROOM_AVATAR_POINTS = [
    { left: '18%', top: '35%' },
    { left: '38%', top: '30%' },
    { left: '55%', top: '28%' },
    { left: '72%', top: '38%' },
    { left: '42%', top: '42%' },
  ];

  const MAP_SPOTS = [
    { id: 'home',  label: '住所',   emoji: '🏠', left: '22%', top: '38%' },
    { id: 'plaza', label: '广场',   emoji: '⛲', left: '52%', top: '25%' },
    { id: 'park',  label: '游乐场', emoji: '🎡', left: '78%', top: '42%' },
    { id: 'mall',  label: '商场',   emoji: '🏬', left: '62%', top: '65%' },
    { id: 'cafe',  label: '咖啡厅', emoji: '☕', left: '30%', top: '68%' },
    { id: 'farm',  label: '菜园',   emoji: '🌿', left: '16%', top: '62%' },
  ];

  const LOCATION_STATES = {
    home:  ['在房间里休息', '在客厅看书', '在厨房做饭', '在卧室睡觉', '在书房写作'],
    plaza: ['在广场散步', '在广场晒太阳', '在广场聊天', '在广场看活动', '在广场发呆'],
    park:  ['在游乐场玩耍', '在游乐场坐旋转木马', '在游乐场排队', '在游乐场吃棉花糖'],
    mall:  ['在商场逛街', '在商场购物', '在商场吃饭', '在商场看电影', '在商场休息'],
    cafe:  ['在咖啡厅喝咖啡', '在咖啡厅看书', '在咖啡厅工作', '在咖啡厅发呆', '在咖啡厅聊天'],
    farm:  ['在菜园浇水', '在菜园除草', '在菜园摘菜', '在菜园种花', '在菜园赏蝴蝶'],
  };

  const LOCATION_DESC = {
    plaza: '阳光明媚的广场，微风轻拂，大家在这里自由活动。',
    park:  '欢乐的游乐场，旋转木马缓缓转动，笑声此起彼伏。',
    mall:  '宽敞明亮的商场，各种店铺琳琅满目，人来人往。',
    cafe:  '温馨的咖啡厅，木质桌椅，柔和的灯光，咖啡香气弥漫。',
    farm:  '生机勃勃的菜园，绿油油的蔬菜整齐排列，蜜蜂飞舞。',
  };

  const ACTIVITY_POOL = [
    { icon: '🎂', name: '生日派对',   desc: '今天是特别的日子，一起来庆祝吧！',
      narrative: '蜡烛的光映出温暖的笑脸，大家的祝福声此起彼伏。' },
    { icon: '🍕', name: '广场野餐',   desc: '铺开野餐毯，一起在广场享用美食！',
      narrative: '草地上铺开了格子毯，阳光正好，微风不燥，这是最美好的下午。' },
    { icon: '🎮', name: '游戏对决',   desc: '来一场公平的游戏对决，谁是最强者？',
      narrative: '游戏开始了！欢呼声和惋惜声交织在一起，胜负已分，却笑声不断。' },
    { icon: '🌟', name: '许愿时刻',   desc: '夜幕降临，流星划过，许下心愿吧。',
      narrative: '一颗流星悄然滑落，大家闭上眼睛，把最深的愿望悄悄放在心里。' },
    { icon: '🌱', name: '菜园劳动',   desc: '一起去菜园劳动，感受泥土的气息。',
      narrative: '锄头翻动泥土的声音，汗水换来的是对收获的期待。' },
    { icon: '📸', name: '集体合影',   desc: '难得聚齐，来一张大合照吧！',
      narrative: '大家挤在一起，镜头定格了这个珍贵的瞬间。' },
    { icon: '🎵', name: '音乐下午茶', desc: '咖啡厅里有人开始弹吉他了……',
      narrative: '旋律在咖啡厅里流淌，大家静静地沉浸在音乐里。' },
    { icon: '🧹', name: '大扫除',     desc: '一起把家园打扫得焕然一新！',
      narrative: '家园变得窗明几净，心情也跟着明亮起来。' },
    { icon: '🌙', name: '深夜聊天',   desc: '夜深了，大家聚在广场上聊到凌晨。',
      narrative: '这种只属于深夜的坦诚，让彼此的距离更近了一些。' },
    { icon: '🎁', name: '神秘礼物',   desc: '广场中央出现了一个大包裹……',
      narrative: '里面是一份让所有人都感到惊喜的礼物，欢呼声响彻广场。' },
  ];

  /* ══════════════════════════════════════════════
     ── 屏幕调试面板（移动端专用，点击查看存储内容）──
     ══════════════════════════════════════════════ */
  function showDebugPanel() {
    const existing = document.getElementById('gdn-debug-panel');
    if (existing) { existing.remove(); return; }

    const keys = ['liao_roles', 'halo9_roles', 'liao_chats', 'halo9_garden'];
    let html = '<div style="position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.92);' +
      'color:#7ecb7e;font-size:11px;font-family:monospace;overflow:auto;padding:16px;" id="gdn-debug-panel">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">' +
      '<b style="font-size:14px;">存储调试</b>' +
      '<button onclick="document.getElementById(\'gdn-debug-panel\').remove()" ' +
      'style="background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:6px;padding:4px 10px;cursor:pointer;">关闭</button>' +
      '</div>';

    keys.forEach(function (k) {
      const raw = localStorage.getItem(k);
      html += '<div style="margin-bottom:14px;">' +
        '<div style="color:#fff;font-weight:700;margin-bottom:4px;">' + k + '：</div>';
      if (!raw) {
        html += '<div style="color:#e06a4a;">（不存在）</div>';
      } else {
        try {
          const parsed = JSON.parse(raw);
          const preview = JSON.stringify(parsed, null, 2).slice(0, 600);
          html += '<pre style="white-space:pre-wrap;word-break:break-all;color:#c8f0c8;' +
            'background:rgba(255,255,255,0.07);border-radius:8px;padding:8px;">' +
            preview + (preview.length >= 600 ? '\n...(已截断)' : '') + '</pre>';
        } catch (e) {
          html += '<div style="color:#e06a4a;">解析失败：' + e.message + '</div>';
        }
      }
      html += '</div>';
    });

    /* 所有localStorage键列表 */
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      allKeys.push(localStorage.key(i));
    }
    html += '<div style="margin-bottom:14px;">' +
      '<div style="color:#fff;font-weight:700;margin-bottom:4px;">所有localStorage键：</div>' +
      '<div style="color:#a8d8a8;">' + allKeys.join('，') + '</div></div>';

    html += '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  /* ══════════════════════════════════════════════
     ── 数据管理 ──
     ══════════════════════════════════════════════ */
  const STORAGE_KEY = 'halo9_garden';

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveData(data) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
  }

  function initData() {
    const existing = loadData();
    if (existing) return existing;
    const data = {
      invitedRoles:    [],
      positions:       {},
      userPosition:    'home',
      charStatuses:    {},
      userStatus:      '在房间里休息',
      dailyActivities: [],
      dailyDate:       '',
      voteData:        null,
    };
    saveData(data);
    return data;
  }

  /* ── 工具 ── */
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function nowTimeStr() {
    const d = new Date();
    return (d.getMonth()+1) + '月' + d.getDate() + '日 ' +
      String(d.getHours()).padStart(2,'0') + ':' +
      String(d.getMinutes()).padStart(2,'0') + ':' +
      String(d.getSeconds()).padStart(2,'0');
  }

  /* ══════════════════════════════════════════════
     ── 角色库读取（多键名兼容，自动探测）──
     ══════════════════════════════════════════════ */
  function getAllRoles() {
    
```javascript
    /* 尝试所有可能的键名，自动探测 */
    const candidateKeys = [
      'liao_roles',
      'halo9_roles',
      'roles',
    ];
    for (let i = 0; i < candidateKeys.length; i++) {
      try {
        const raw = localStorage.getItem(candidateKeys[i]);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return [];
  }

  /* ── 角色字段兼容取值 ── */
  function getRoleId(role) {
    if (!role) return '';
    return role.id || role.realname || role.nickname || role.name || '';
  }
  function getRoleName(role) {
    if (!role) return '角色';
    return role.nickname || role.realname || role.name || '角色';
  }
  function getRoleAvatar(role) {
    if (!role) return 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=char';
    return role.avatar ||
      'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=' +
      encodeURIComponent(getRoleName(role));
  }
  function getRoleSetting(role) {
    if (!role) return '';
    return role.setting || role.persona || role.description || '';
  }

  function getRoleById(id) {
    return getAllRoles().find(function (r) {
      return (r.id || r.realname || r.nickname || r.name) === id;
    }) || null;
  }

  function getUserAvatar() {
    try {
      /* 兼容 halo9_userAvatar 和 liao_userAvatar */
      const v1 = localStorage.getItem('halo9_userAvatar');
      if (v1) return JSON.parse(v1);
      const v2 = localStorage.getItem('liao_userAvatar');
      if (v2) return JSON.parse(v2);
      return 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=halo9';
    } catch (e) {
      return 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=halo9';
    }
  }

  function getUserName() {
    try {
      const v = localStorage.getItem('liao_userName');
      return v ? JSON.parse(v) : '用户';
    } catch (e) { return '用户'; }
  }

  /* ── 读取该角色的了了聊天历史（最近N条） ── */
  function getRoleChatHistory(roleId, maxCount) {
    try {
      const raw = localStorage.getItem('liao_chats');
      if (!raw) return [];
      const chats = JSON.parse(raw);
      const chat  = chats.find(function (c) { return c.roleId === roleId; });
      if (!chat || !chat.messages) return [];
      const visible = chat.messages.filter(function (m) {
        return !m.hidden && (m.role === 'user' || m.role === 'assistant') &&
          m.type !== 'garden_chat_fold';
      });
      const recent = visible.slice(-(maxCount || 20));
      return recent.map(function (m) {
        return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content || '' };
      });
    } catch (e) { return []; }
  }

  /* ── 读取角色对应的聊天设置（用户设定、角色名等） ── */
  function getRoleChatSettings(roleId) {
    try {
      const raw = localStorage.getItem('liao_chats');
      if (!raw) return {};
      const chats = JSON.parse(raw);
      const chat  = chats.find(function (c) { return c.roleId === roleId; });
      return chat || {};
    } catch (e) { return {}; }
  }

  /* ── 读取世界书注入内容 ── */
  function getWorldBookInjection(roleId, historyMessages) {
    try {
      if (typeof window.getWorldBookInjection === 'function') {
        return window.getWorldBookInjection(historyMessages || [], roleId) || '';
      }
    } catch (e) {}
    return '';
  }

  /* ── 读取API配置 ── */
  function getApiConfig() {
    try {
      const v = localStorage.getItem('halo9_apiActiveConfig');
      return v ? JSON.parse(v) : null;
    } catch (e) { return null; }
  }
  function getApiModel() {
    try {
      const v = localStorage.getItem('halo9_apiCurrentModel');
      return v ? JSON.parse(v) : '';
    } catch (e) { return ''; }
  }

  /* ── 调用API ── */
  function callAPI(messages, onSuccess, onError) {
    const cfg   = getApiConfig();
    const model = getApiModel();
    if (!cfg || !cfg.url) { onError('未配置API'); return; }
    const endpoint = cfg.url.replace(/\/$/, '') + '/chat/completions';
    const headers  = { 'Content-Type': 'application/json' };
    if (cfg.key) headers['Authorization'] = 'Bearer ' + cfg.key;
    fetch(endpoint, {
      method: 'POST', headers,
      body: JSON.stringify({ model: model || 'gpt-3.5-turbo', messages, stream: false }),
    })
    .then(function (r) { return r.json(); })
    .then(function (json) {
      onSuccess((json.choices && json.choices[0] && json.choices[0].message &&
        json.choices[0].message.content) || '');
    })
    .catch(function (e) { onError(e.message || '请求失败'); });
  }

  /* ══════════════════════════════════════════════
     ── 构建临时对话 system prompt（完整注入）──
     ══════════════════════════════════════════════ */
  function buildGardenSystemPrompt(charObj, scene) {
    const roleId      = charObj.roleId;
    const role        = charObj.role || getRoleById(roleId);
    const roleName    = getRoleName(role);
    const roleSetting = getRoleSetting(role);

    const chatSettings   = getRoleChatSettings(roleId);
    const userSetting    = chatSettings.chatUserSetting || '';
    const chatUserName   = chatSettings.chatUserName || getUserName();
    const chatUserAvatar = chatSettings.chatUserAvatar || '';

    /* 世界书（基于了了聊天历史注入） */
    const liaoHistory = getRoleChatHistory(roleId, 30);
    const worldBook   = getWorldBookInjection(roleId, liaoHistory.map(function (m) {
      return { role: m.role, content: m.content };
    }));

    let prompt =
      '你扮演角色：' + roleName + '。\n';

    if (roleSetting) {
      prompt += '【角色设定】\n' + roleSetting + '\n\n';
    }

    if (userSetting) {
      prompt += '【用户设定】\n对方是' + chatUserName + '，' + userSetting + '\n\n';
    } else {
      prompt += '【用户设定】\n对方叫' + chatUserName + '。\n\n';
    }

    if (worldBook) {
      prompt += '【世界背景设定】\n' + worldBook + '\n\n';
    }

    prompt +=
      '【家园App说明】\n' +
      '现在你们正在家园App（一个类似"朋友聚会新生活"的轻量生活模拟游戏）里进行临时对话。\n' +
      '当前时间：' + nowTimeStr() + '。\n' +
      '当前场景：' + scene + '。\n' +
      '这是在家园App游戏内的临时对话，不是正式聊天界面，语气应轻松随意、自然生活化。\n' +
      '对话结束后内容会折叠保存到正式聊天记录里。\n\n' +
      '【回复规则】\n' +
      '1. 用口语短句，像发微信一样聊天。\n' +
      '2. 保持角色设定的性格和语气。\n' +
      '3. 不使用任何emoji或颜文字，纯文字。\n' +
      '4. 每次回复控制在1到3句话，简洁自然。\n';

    return prompt;
  }

  /* ══════════════════════════════════════════════
     ── 每日活动初始化 ──
     ══════════════════════════════════════════════ */
  function ensureDailyActivities(data) {
    const today = todayStr();
    if (data.dailyDate === today && data.dailyActivities.length > 0) return;
    const count  = 3 + Math.floor(Math.random() * 2);
    const pool   = ACTIVITY_POOL.slice();
    const chosen = [];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      chosen.push(Object.assign({}, pool[idx], { done: false }));
      pool.splice(idx, 1);
    }
    data.dailyActivities = chosen;
    data.dailyDate = today;
    saveData(data);
  }

  /* ── 随机分配角色位置和状态 ── */
  function randomizePositions(data) {
    const locationIds  = MAP_SPOTS.map(function (s) { return s.id; });
    (data.invitedRoles || []).forEach(function (roleId) {
      data.positions[roleId]    = pickRandom(locationIds);
      data.charStatuses[roleId] = pickRandom(LOCATION_STATES[data.positions[roleId]] || ['在家园里']);
    });
    data.userPosition = 'home';
    data.userStatus   = pickRandom(LOCATION_STATES['home']);
    saveData(data);
  }

  /* ══════════════════════════════════════════════
     ── 界面切换管理 ──
     ══════════════════════════════════════════════ */
  const VIEWS = [
    'garden-map-view', 'garden-apt-view', 'garden-room-view',
    'garden-plaza-view', 'garden-location-view',
  ];

  function showView(id) {
    VIEWS.forEach(function (v) {
      const el = document.getElementById(v);
      if (el) el.style.display = (v === id) ? 'flex' : 'none';
    });
  }

  /* ══════════════════════════════════════════════
     ── 开场动画 ──
     ══════════════════════════════════════════════ */
  function playIntro(callback) {
    const intro   = document.getElementById('garden-intro');
    const img     = document.getElementById('garden-intro-img');
    const overlay = document.getElementById('garden-intro-overlay');
    if (!intro) { callback(); return; }
    intro.style.display      = 'flex';
    img.src                  = INTRO_IMG_URL;
    img.style.opacity        = '0';
    overlay.style.background = 'rgba(0,0,0,0)';
    setTimeout(function () { img.style.opacity = '1'; }, 100);
    setTimeout(function () { overlay.style.background = 'rgba(0,0,0,0.7)'; }, 1800);
    setTimeout(function () {
      intro.style.display      = 'none';
      img.style.opacity        = '0';
      overlay.style.background = 'rgba(0,0,0,0)';
      callback();
    }, 2800);
  }

  /* ══════════════════════════════════════════════
     ── 地图界面 ──
     ══════════════════════════════════════════════ */
  function renderMap(data) {
    showView('garden-map-view');
    const spotsEl = document.getElementById('garden-map-spots');
    if (!spotsEl) return;
    spotsEl.innerHTML = '';

    MAP_SPOTS.forEach(function (spot) {
      const div       = document.createElement('div');
      div.className   = 'gdn-spot';
      div.style.left  = spot.left;
      div.style.top   = spot.top;

      const here = [];
      if (data.userPosition === spot.id) here.push({ avatar: getUserAvatar(), name: '我' });
      (data.invitedRoles || []).forEach(function (rid) {
        if (data.positions[rid] === spot.id) {
          const role = getRoleById(rid);
          here.push({ avatar: getRoleAvatar(role), name: getRoleName(role) });
        }
      });

      let avatarsHtml = '';
      here.slice(0, 3).forEach(function (p) {
        avatarsHtml += '<img src="' + p.avatar + '" alt="' + p.name + '">';
      });
      if (here.length > 3) avatarsHtml += '<div class="gdn-spot-count">+' + (here.length - 3) + '</div>';

      div.innerHTML =
        '<div class="gdn-spot-circle"><span class="gdn-spot-emoji">' + spot.emoji + '</span></div>' +
        '<div class="gdn-spot-label">' + spot.label + '</div>' +
        '<div class="gdn-spot-avatars">' + avatarsHtml + '</div>';

      div.addEventListener('click', function () { handleSpotClick(spot.id, data); });
      spotsEl.appendChild(div);
    });
  }

  function handleSpotClick(spotId, data) {
    if (spotId === 'home')       renderAptView(data);
    else if (spotId === 'plaza') renderPlazaView(data);
    else                         renderLocationView(spotId, data);
  }

  /* ══════════════════════════════════════════════
     ── 住所（公寓楼）界面 ──
     ══════════════════════════════════════════════ */
  function renderAptView(data) {
    showView('garden-apt-view');
    const building = document.getElementById('garden-apt-building');
    if (!building) return;
    building.innerHTML = '';

    const invited         = data.invitedRoles || [];
    const allRoles        = getAllRoles();
    const invitedRoleObjs = invited.map(function (id) {
      return allRoles.find(function (r) {
        return (r.id || r.realname || r.nickname || r.name) === id;
      }) || { id: id, realname: id, nickname: id };
    });

    const rooms = [{ type: 'user', name: '我', avatar: getUserAvatar() }];
    invitedRoleObjs.forEach(function (role) {
      rooms.push({
        type:   'role',
        name:   getRoleName(role),
        avatar: getRoleAvatar(role),
        roleId: getRoleId(role),
      });
    });

    const totalFloors = Math.ceil(rooms.length / 2) + 1;

    for (let floor = totalFloors; floor >= 1; floor--) {
      const floorEl   = document.createElement('div');
      floorEl.className = 'gdn-apt-floor';
      const labelEl   = document.createElement('div');
      labelEl.className   = 'gdn-floor-label';
      labelEl.textContent = floor + 'F';
      floorEl.appendChild(labelEl);
      const roomsEl = document.createElement('div');
      roomsEl.className = 'gdn-floor-rooms';

      if (floor === 1) {
        const settingsRoom = document.createElement('div');
        settingsRoom.className = 'gdn-settings-room';
        settingsRoom.innerHTML =
          '<div class="gdn-settings-room-frame">⚙️</div>' +
          '<div class="gdn-settings-room-name">设置室</div>';
        settingsRoom.addEventListener('click', function () { openInviteModal(data); });
        roomsEl.appendChild(settingsRoom);
      } else {
        const startIdx = (floor - 2) * 2;
        for (let i = startIdx; i < startIdx + 2 && i < rooms.length; i++) {
          const room   = rooms[i];
          const doorEl = document.createElement('div');
          doorEl.className = 'gdn-room-door';
          doorEl.innerHTML =
            '<div class="gdn-room-door-frame">' +
              '<img class="gdn-room-door-avatar" src="' + room.avatar + '" alt="">' +
              '<div class="gdn-room-door-knob"></div>' +
            '</div>' +
            '<div class="gdn-room-door-name">' + room.name + '</div>';
          (function (r) {
            doorEl.addEventListener('click', function () { renderRoomView(r, data); });
          })(room);
          roomsEl.appendChild(doorEl);
        }
      }

      floorEl.appendChild(roomsEl);
      building.appendChild(floorEl);
    }
  }

  /* ══════════════════════════════════════════════
     ── 房间内部界面 ──
     ══════════════════════════════════════════════ */
  function renderRoomView(roomOwner, data) {
    showView('garden-room-view');
    const titleEl = document.getElementById('gdn-room-title');
    if (titleEl) titleEl.textContent = roomOwner.name + ' 的房间';
    const bgImg = document.getElementById('garden-room-bg-img');
    if (bgImg) bgImg.src = ROOM_BG_URL;
    const avatarsEl = document.getElementById('garden-room-avatars');
    if (!avatarsEl) return;
    avatarsEl.innerHTML = '';

    const presentChars = [];
    const absentChars  = [];

    if (data.userPosition === 'home') {
      presentChars.push({ isUser: true, name: '我', avatar: getUserAvatar(), status: data.userStatus || '在房间里' });
    } else {
      absentChars.push({ isUser: true, name: '我', avatar: getUserAvatar(), location: data.userPosition });
    }

    (data.invitedRoles || []).forEach(function (rid) {
      const role = getRoleById(rid);
      if (data.positions[rid] === 'home') {
        presentChars.push({
          isUser: false, roleId: rid,
          name:   getRoleName(role),
          avatar: getRoleAvatar(role),
          status: data.charStatuses[rid] || '在房间里',
          role:   role,
        });
      } else {
        absentChars.push({
          isUser: false, roleId: rid,
          name:     getRoleName(role),
          avatar:   getRoleAvatar(role),
          location: data.positions[rid],
          role:     role,
        });
      }
    });

    presentChars.forEach(function (char, idx) {
      const point = ROOM_AVATAR_POINTS[idx % ROOM_AVATAR_POINTS.length];
      const pin   = document.createElement('div');
      pin.className  = 'gdn-room-avatar-pin';
      pin.style.left = point.left;
      pin.style.top  = point.top;
      pin.innerHTML  =
        '<img src="' + char.avatar + '" alt="">' +
        '<div class="gdn-room-avatar-pin-name">' + char.name + '</div>';
      (function (c) {
        pin.addEventListener('click', function () {
          showBubblePopup(c, data, pin.getBoundingClientRect());
        });
      })(char);
      avatarsEl.appendChild(pin);
    });

    if (absentChars.length > 0) {
      const absentWrap = document.createElement('div');
      absentWrap.className = 'gdn-room-absent';
      absentChars.forEach(function (char) {
        const ll  = (MAP_SPOTS.find(function (s) { return s.id === char.location; }) || {}).label || char.location;
        const chip = document.createElement('div');
        chip.className = 'gdn-room-absent-chip';
        chip.innerHTML =
          '<img src="' + char.avatar + '" alt="">' +
          '<span>' + char.name + ' 现在在' + ll + '</span>';
        absentWrap.appendChild(chip);
      });
      avatarsEl.appendChild(absentWrap);
    }
  }

  /* ══════════════════════════════════════════════
     ── 头像气泡弹窗 ──
     ══════════════════════════════════════════════ */
  var bubbleTarget = null;

  function showBubblePopup(charObj, data, anchorRect) {
    bubbleTarget = charObj;
    const popup = document.getElementById('gdn-bubble-popup');
    if (!popup) return;
    document.getElementById('gdn-bubble-avatar').src         = charObj.avatar;
    document.getElementById('gdn-bubble-name').textContent   = charObj.name;
    document.getElementById('gdn-bubble-status').textContent =
      charObj.isUser ? (data.userStatus || '') : (charObj.status || '');
    const locId    = charObj.isUser ? data.userPosition : (data.positions[charObj.roleId] || 'home');
    const locLabel = (MAP_SPOTS.find(function (s) { return s.id === locId; }) || {}).label || locId;
    document.getElementById('gdn-bubble-location').textContent = '📍 ' + locLabel;
    const chatBtn = document.getElementById('gdn-bubble-chat');
    const rpsBtn  = document.getElementById('gdn-bubble-rps');
    if (chatBtn) chatBtn.style.display = charObj.isUser ? 'none' : '';
    if (rpsBtn)  rpsBtn.style.display  = charObj.isUser ? 'none' : '';
    popup.style.display = 'block';
    const appEl  = document.getElementById('garden-app');
    if (appEl) {
      const ar   = appEl.getBoundingClientRect();
      let left   = anchorRect.right - ar.left + 8;
      let top    = anchorRect.top   - ar.top  - 20;
      if (left + 240 > ar.width)  left = anchorRect.left - ar.left - 248;
      if (top  + 170 > ar.height) top  = ar.height - 175;
      if (top < 10)  top  = 10;
      if (left < 8)  left = 8;
      popup.style.left = left + 'px';
      popup.style.top  = top  + 'px';
    }
  }

  function closeBubblePopup() {
    const popup = document.getElementById('gdn-bubble-popup');
    if (popup) popup.style.display = 'none';
    bubbleTarget = null;
  }

  /* ══════════════════════════════════════════════
     ── 临时对话浮窗 ──
     ══════════════════════════════════════════════ */
  var chatFloatRole     = null;
  var chatFloatMessages = [];
  var chatFloatScene    = '';

  function openChatFloat(charObj, data) {
    chatFloatRole     = charObj;
    chatFloatMessages = [];
    const locId    = (data.positions && data.positions[charObj.roleId]) || 'home';
    const locLabel = (MAP_SPOTS.find(function (s) { return s.id === locId; }) || {}).label || locId;
    chatFloatScene = '家园·' + locLabel;
    const floatEl = document.getElementById('gdn-chat-float');
    if (!floatEl) return;
    document.getElementById('gdn-chat-float-avatar').src         = charObj.avatar;
    document.getElementById('gdn-chat-float-name').textContent   = charObj.name;
    document.getElementById('gdn-chat-float-scene').textContent  = '📍 ' + chatFloatScene;
    document.getElementById('gdn-chat-float-messages').innerHTML = '';
    document.getElementById('gdn-chat-float-input').value        = '';
    floatEl.style.display = 'flex';
    closeBubblePopup();
    setTimeout(function () {
      const inp = document.getElementById('gdn-chat-float-input');
      if (inp) inp.focus();
    }, 100);
  }

  function closeChatFloat() {
    const floatEl = document.getElementById('gdn-chat-float');
    if (floatEl) floatEl.style.display = 'none';
    chatFloatRole     = null;
    chatFloatMessages = [];
  }

  function appendFloatMsg(role, content, tag) {
    const msgsEl = document.getElementById('gdn-chat-float-messages');
    if (!msgsEl) return;
    const isUser = role === 'user';
    const div    = document.createElement('div');
    div.className = 'gdn-float-msg' + (isUser ? ' user' : '');
    div.innerHTML =
      '<img src="' + (isUser ? getUserAvatar() : (chatFloatRole ? chatFloatRole.avatar : '')) + '" alt="">' +
      '<div class="gdn-float-bubble-wrap">' +
        '<div class="gdn-float-tag">' + (tag || '【家园临时对话】') + '</div>' +
        '<div class="gdn-float-bubble">' + content + '</div>' +
      '</div>';
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function appendFloatLoading() {
    const msgsEl = document.getElementById('gdn-chat-float-messages');
    if (!msgsEl) return;
    const div   = document.createElement('div');
    div.className = 'gdn-float-msg';
    div.id        = 'gdn-float-loading';
    div.innerHTML =
      '<img src="' + (chatFloatRole ? chatFloatRole.avatar : '') + '" alt="">' +
      '<div class="gdn-float-loading"><span></span><span></span><span></span></div>';
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  function removeFloatLoading() {
    const el = document.getElementById('gdn-float-loading');
    if (el) el.remove();
  }

  function sendFloatMessage(text, data) {
    if (!text || !chatFloatRole) return;
    const timeStr = nowTimeStr();
    const tag     = '【家园临时对话】' + timeStr + ' · ' + chatFloatScene;

    chatFloatMessages.push({ role: 'user', content: text, tag: tag, ts: Date.now() });
    appendFloatMsg('user', text, tag);
    appendFloatLoading();

    /* 构建完整system prompt */
    const sysPrompt = buildGardenSystemPrompt(chatFloatRole, chatFloatScene);

    /* 了了聊天历史（最近20条）作为上下文 */
    const liaoHistory = getRoleChatHistory(chatFloatRole.roleId, 20);

    /* 本次临时对话历史 */
    const gardenHistory = chatFloatMessages
      .slice(0, -1) /* 排除刚push的这条，下面会单独加 */
      .filter(function (m) { return m.role === 'user' || m.role === 'assistant'; })
      .map(function (m) { return { role: m.role, content: m.content }; });

    const messages = [{ role: 'system', content: sysPrompt }];

    /* 先注入了了历史（作为背景），再注入本次家园临时对话 */
    liaoHistory.forEach(function (m) { messages.push(m); });
    gardenHistory.forEach(function (m) { messages.push(m); });
    messages.push({ role: 'user', content: text });

    callAPI(messages, function (reply) {
      removeFloatLoading();
      const replyText = reply || '（微微一笑，没有说话）';
      chatFloatMessages.push({ role: 'assistant', content: replyText, tag: tag, ts: Date.now() });
      appendFloatMsg('assistant', replyText, tag);
    }, function (err) {
      removeFloatLoading();
      appendFloatMsg('assistant', '（暂时无法回应：' + err + '）', tag);
    });
  }

  /* ── 同步临时对话到了了聊天记录 ── */
  function syncChatFloatToLiao() {
    if (!chatFloatRole || !chatFloatMessages.length) {
      alert('暂无临时对话内容可同步');
      return;
    }
    const roleId = chatFloatRole.roleId;
    if (!roleId) return;

    let liaoChats = [];
    try {
      const raw = localStorage.getItem('liao_chats');
      if (raw) liaoChats = JSON.parse(raw);
    } catch (e) {}

    const chatIdx = liaoChats.findIndex(function (c) { return c.roleId === roleId; });
    if (chatIdx < 0) {
      alert('未找到对应角色的了了聊天记录，请先在了了中与该角色建立对话。');
      return;
    }

    const foldContent = chatFloatMessages.map(function (m) {
      return '[' + (m.role === 'user' ? '我' : chatFloatRole.name) + '] ' + m.content;
    }).join('\n');

    const foldMsg = {
      role: 'assistant',
      type: 'garden_chat_fold',
      content: '【家园临时对话折叠】' + chatFloatScene + ' · ' + nowTimeStr() + '\n' + foldContent,
      ts:  Date.now(),
      id:  'garden_fold_' + Date.now(),
      gardenFoldData: {
        scene:    chatFloatScene,
        messages: chatFloatMessages.slice(),
        roleName: chatFloatRole.name,
        timeStr:  nowTimeStr(),
      },
    };

    if (!liaoChats[chatIdx].messages) liaoChats[chatIdx].messages = [];
    liaoChats[chatIdx].messages.push(foldMsg);
    liaoChats[chatIdx].messages.push({
      role:   'user',
      type:   'system_hint',
      hidden: true,
      content: '【系统提示】用户刚刚在家园App（游戏）中与你进行了一段临时对话，场景是' +
        chatFloatScene + '，时间是' + nowTimeStr() + '，内容摘要：' + foldContent.slice(0, 200),
      ts: Date.now() + 1,
      id: 'garden_hint_' + Date.now(),
    });

    try { localStorage.setItem('liao_chats', JSON.stringify(liaoChats)); } catch (e) {}

    if (typeof window.LiaoChat !== 'undefined' &&
        typeof window.LiaoChat.refreshIfActive === 'function') {
      window.LiaoChat.refreshIfActive(roleId);
    }

    chatFloatMessages = [];
    alert('已同步到了了聊天记录（折叠显示）');
  }

  /* ══════════════════════════════════════════════
     ── 石头剪刀布 ──
     ══════════════════════════════════════════════ */
  var rpsTargetChar = null;

  function openRPS(charObj) {
    rpsTargetChar = charObj;
    const modal   = document.getElementById('gdn-rps-modal');
    if (!modal) return;
    const nameEl = document.getElementById('gdn-rps-role-name');
    if (nameEl) nameEl.textContent = charObj.name;
    const resultEl = document.getElementById('gdn-rps-result');
    if (resultEl) resultEl.style.display = 'none';
    modal.style.display = 'flex';
    closeBubblePopup();
  }

  function playRPS(userChoice) {
    const choices    = ['rock', 'scissors', 'paper'];
    const labels     = { rock: '石头✊', scissors: '剪刀✌️', paper: '布🖐️' };
    const roleChoice = pickRandom(choices);
    let result = '';
    if (userChoice === roleChoice) {
      result = '平局！';
    } else if (
      (userChoice === 'rock'     && roleChoice === 'scissors') ||
      (userChoice === 'scissors' && roleChoice === 'paper')    ||
      (userChoice === 'paper'    && roleChoice === 'rock')
    ) {
      result = '你赢了！🎉';
    } else {
      result = '你输了…😔';
    }
    const roleName   = rpsTargetChar ? rpsTargetChar.name : '角色';
    const resultText = '你出了 ' + labels[userChoice] + '，' + roleName +
      ' 出了 ' + labels[roleChoice] + '。' + result;
    const resultEl = document.getElementById('gdn-rps-result');
    if (resultEl) { resultEl.textContent   = resultText;
      resultEl.style.display = 'block';
    }
    const timeStr = nowTimeStr();
    const tag     = '【家园·石头剪刀布】' + timeStr;
    if (chatFloatRole && rpsTargetChar && chatFloatRole.roleId === rpsTargetChar.roleId) {
      chatFloatMessages.push({ role: 'user', content: resultText, tag: tag, ts: Date.now() });
      appendFloatMsg('user', resultText, tag);
    } else if (rpsTargetChar) {
      openChatFloat(rpsTargetChar, gardenDataRef);
      setTimeout(function () {
        chatFloatMessages.push({ role: 'user', content: resultText, tag: tag, ts: Date.now() });
        appendFloatMsg('user', resultText, tag);
      }, 150);
    }
  }

  /* ══════════════════════════════════════════════
     ── 广场界面 ──
     ══════════════════════════════════════════════ */
  function renderPlazaView(data) {
    showView('garden-plaza-view');
    ensureDailyActivities(data);

    const charsEl = document.getElementById('garden-plaza-chars');
    if (charsEl) { charsEl.innerHTML = ''; renderLocationChars('plaza', data, charsEl); }

    const listEl = document.getElementById('garden-activity-list');
    if (listEl) {
      listEl.innerHTML = '';
      data.dailyActivities.forEach(function (activity, idx) {
        const item = document.createElement('div');
        item.className = 'gdn-activity-item' + (activity.done ? ' done' : '');
        const joinBtn = '<button class="gdn-activity-join-btn"' +
          (activity.done ? ' disabled' : '') + '>' +
          (activity.done ? '已完成' : '参与') + '</button>';
        item.innerHTML =
          '<div class="gdn-activity-icon">' + activity.icon + '</div>' +
          '<div class="gdn-activity-info">' +
            '<div class="gdn-activity-name">' + activity.name + '</div>' +
            '<div class="gdn-activity-desc">' + activity.desc + '</div>' +
          '</div>' + joinBtn;
        if (!activity.done) {
          item.querySelector('.gdn-activity-join-btn').addEventListener('click', function () {
            triggerActivity(activity, idx, data);
          });
        }
        listEl.appendChild(item);
      });
    }
    renderVoteResult(data);
  }

  function triggerActivity(activity, idx, data) {
    data.dailyActivities[idx].done = true;
    saveData(data);
    renderPlazaView(data);
    const cfg = getApiConfig();
    if (!cfg || !cfg.url) { showNarrate(activity.icon, activity.name, activity.narrative); return; }
    callAPI([{
      role: 'system',
      content: '你是一个温暖的叙事者，请用100字以内的中文描述以下家园活动的情景，语言生动有画面感，充满温情：「' +
        activity.name + '」—— ' + activity.desc,
    }], function (reply) {
      showNarrate(activity.icon, activity.name, reply || activity.narrative);
    }, function () {
      showNarrate(activity.icon, activity.name, activity.narrative);
    });
  }

  function showNarrate(icon, title, text) {
    const modal = document.getElementById('gdn-narrate-modal');
    if (!modal) return;
    const iconEl  = document.getElementById('gdn-narrate-icon');
    const titleEl = document.getElementById('gdn-narrate-title');
    const textEl  = document.getElementById('gdn-narrate-text');
    if (iconEl)  iconEl.textContent  = icon;
    if (titleEl) titleEl.textContent = title;
    if (textEl)  textEl.textContent  = text;
    modal.style.display = 'flex';
  }

  /* ══════════════════════════════════════════════
     ── 投票功能 ──
     ══════════════════════════════════════════════ */
  function openVoteSetup() {
    const modal = document.getElementById('gdn-vote-setup-modal');
    if (modal) modal.style.display = 'flex';
  }

  function startVote(topic, optionsRaw, data) {
    const options = optionsRaw.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    if (!topic || options.length < 2) { alert('请填写题目和至少两个选项'); return; }
    const invited = data.invitedRoles || [];
    if (!invited.length) { alert('还没有邀请任何角色入住，无法发起投票'); return; }
    data.voteData = { topic: topic, options: options, votes: {} };
    saveData(data);
    const voteSection = document.getElementById('garden-vote-section');
    if (voteSection) voteSection.style.display = 'flex';
    const modal = document.getElementById('gdn-vote-setup-modal');
    if (modal) modal.style.display = 'none';
    let pending = invited.length;
    invited.forEach(function (roleId, i) {
      const role     = getRoleById(roleId);
      const roleName = getRoleName(role);
      const roleBase = role ? (role.setting || role.persona || ('你是' + roleName)) : ('你是' + roleName);
      const optStr   = options.map(function (o, idx) { return (idx + 1) + '. ' + o; }).join('\n');
      setTimeout(function () {
        callAPI([{
          role: 'system',
          content: roleBase + '\n\n现在在家园的广场上有一个投票活动，题目是：「' + topic +
            '」\n选项：\n' + optStr +
            '\n\n请从以上选项中选择一个，只输出选项的序号数字（如：1），不要输出任何其他内容。',
        }], function (reply) {
          const num    = parseInt((reply || '').trim());
          const optIdx = isNaN(num) ? 0 : Math.min(Math.max(0, num - 1), options.length - 1);
          data.voteData.votes[roleId] = optIdx;
          saveData(data);
          if (--pending <= 0) renderVoteResult(data);
        }, function () {
          data.voteData.votes[roleId] = Math.floor(Math.random() * options.length);
          saveData(data);
          if (--pending <= 0) renderVoteResult(data);
        });
      }, i * 400);
    });
  }

  function renderVoteResult(data) {
    const voteSection = document.getElementById('garden-vote-section');
    const resultEl    = document.getElementById('garden-vote-result');
    if (!voteSection || !resultEl) return;
    if (!data.voteData || !data.voteData.topic) { voteSection.style.display = 'none'; return; }
    voteSection.style.display = 'flex';
    resultEl.innerHTML = '';
    const { topic, options, votes } = data.voteData;
    const counts = options.map(function () { return 0; });
    Object.values(votes).forEach(function (idx) { if (idx >= 0 && idx < counts.length) counts[idx]++; });
    const total = Object.keys(votes).length || 1;
    const box   = document.createElement('div');
    box.className = 'gdn-vote-result-box';
    const topicEl = document.createElement('div');
    topicEl.className   = 'gdn-vote-topic';
    topicEl.textContent = topic;
    box.appendChild(topicEl);
    options.forEach(function (opt, idx) {
      const pct = Math.round((counts[idx] / total) * 100);
      const row = document.createElement('div');
      row.className = 'gdn-vote-option-row';
      row.innerHTML =
        '<div class="gdn-vote-option-label">' + opt + '</div>' +
        '<div class="gdn-vote-bar-wrap"><div class="gdn-vote-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="gdn-vote-count">' + counts[idx] + '</div>';
      box.appendChild(row);
    });
    resultEl.appendChild(box);
  }

  /* ══════════════════════════════════════════════
     ── 通用地点界面 ──
     ══════════════════════════════════════════════ */
  function renderLocationView(spotId, data) {
    showView('garden-location-view');
    const spot = MAP_SPOTS.find(function (s) { return s.id === spotId; });
    if (!spot) return;
    const titleEl = document.getElementById('gdn-location-title');
    if (titleEl) titleEl.textContent = spot.label;
    const descEl = document.getElementById('gdn-location-desc');
    if (descEl) descEl.textContent = LOCATION_DESC[spotId] || '';
    const charsEl = document.getElementById('garden-location-chars');
    if (charsEl) { charsEl.innerHTML = ''; renderLocationChars(spotId, data, charsEl); }
    const greetBtn = document.getElementById('gdn-location-greet');
    if (greetBtn) greetBtn.onclick = function () { triggerGreet(spotId, data); };
    const backBtn = document.getElementById('gdn-location-back');
    if (backBtn) backBtn.onclick = function () { renderMap(data); };
  }

  function renderLocationChars(spotId, data, container) {
    if (data.userPosition === spotId) {
      container.appendChild(makeCharChip({
        isUser: true, name: '我', avatar: getUserAvatar(), status: data.userStatus,
      }, data));
    }
    (data.invitedRoles || []).forEach(function (rid) {
      if (data.positions[rid] === spotId) {
        const role = getRoleById(rid);
        container.appendChild(makeCharChip({
          isUser: false, roleId: rid,
          name:   getRoleName(role),
          avatar: getRoleAvatar(role),
          status: data.charStatuses[rid] || '',
          role:   role,
        }, data));
      }
    });
    if (!container.children.length) {
      container.innerHTML =
        '<div style="font-size:12px;color:rgba(150,220,150,0.5);padding:8px 0;">这里暂时没有人</div>';
    }
  }

  function makeCharChip(charObj, data) {
    const chip = document.createElement('div');
    chip.className = 'gdn-loc-char-chip';
    chip.innerHTML =
      '<img src="' + charObj.avatar + '" alt="">' +
      '<div class="gdn-loc-char-chip-info">' +
        '<div class="gdn-loc-char-name">'   + charObj.name           + '</div>' +
        '<div class="gdn-loc-char-status">' + (charObj.status || '') + '</div>' +
      '</div>';
    if (!charObj.isUser) {
      chip.addEventListener('click', function () {
        showBubblePopup(charObj, data, chip.getBoundingClientRect());
      });
    }
    return chip;
  }

  function triggerGreet(spotId, data) {
    const spot      = MAP_SPOTS.find(function (s) { return s.id === spotId; });
    const spotLabel = spot ? spot.label : spotId;
    const hereRoles = (data.invitedRoles || []).filter(function (rid) {
      return data.positions[rid] === spotId;
    });
    if (!hereRoles.length) {
      showNarrate('👋', '打了个招呼',
        '你向' + spotLabel + '四处张望，微笑着和周围的一切打了个招呼，清风拂过，心情格外舒畅。');
      return;
    }
    const roleNames = hereRoles.map(function (rid) { return getRoleName(getRoleById(rid)); }).join('、');
    callAPI([{
      role: 'system',
      content: '请用80字以内生动描述：用户在' + spotLabel + '向' + roleNames +
        '打招呼，大家的反应和当时的温馨场景。语言自然活泼。',
    }], function (reply) {
      showNarrate('👋', '打了个招呼',
        reply || ('你在' + spotLabel + '遇到了' + roleNames + '，大家相视而笑，气氛格外融洽。'));
    }, function () {
      showNarrate('👋', '打了个招呼',
        '你在' + spotLabel + '遇到了' + roleNames + '，大家相视而笑，气氛格外融洽。');
    });
  }

  /* ══════════════════════════════════════════════
     ── 邀请角色入住弹窗 ──
     ══════════════════════════════════════════════ */
  var inviteSelected = [];

  function openInviteModal(data) {
    inviteSelected   = (data.invitedRoles || []).slice();
    const listEl     = document.getElementById('gdn-invite-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    const allRoles   = getAllRoles();

    if (!allRoles.length) {
      listEl.innerHTML =
        '<div style="font-size:13px;color:rgba(150,220,150,0.5);padding:12px 0;text-align:center;">' +
        '角色库为空，请先在了了中创建角色。<br><br>' +
        '<button onclick="window.GardenApp._showDebug()" ' +
        'style="background:rgba(100,200,100,0.2);border:1px solid rgba(100,200,100,0.4);' +
        'color:#7ecb7e;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:12px;">' +
        '🔍 查看存储调试</button></div>';
    } else {
      allRoles.forEach(function (role) {
        const id       = getRoleId(role);
        const selected = inviteSelected.includes(id);
        const item     = document.createElement('div');
        item.className = 'gdn-invite-item' + (selected ? ' selected' : '');
        item.innerHTML =
          '<img src="' + getRoleAvatar(role) + '" alt="">' +
          '<div class="gdn-invite-item-name">' + getRoleName(role) + '</div>' +
          '<div class="gdn-invite-check">' + (selected ? '✓' : '') + '</div>';
        item.addEventListener('click', function () {
          const idx = inviteSelected.indexOf(id);
          if (idx >= 0) {
            inviteSelected.splice(idx, 1);
            item.classList.remove('selected');
            item.querySelector('.gdn-invite-check').textContent = '';
          } else {
            inviteSelected.push(id);
            item.classList.add('selected');
            item.querySelector('.gdn-invite-check').textContent = '✓';
          }
        });
        listEl.appendChild(item);
      });
    }

    const modal = document.getElementById('gdn-invite-modal');
    if (modal) modal.style.display = 'flex';
  }

  function confirmInvite(data) {
    data.invitedRoles = inviteSelected.slice();
    data.invitedRoles.forEach(function (rid) {
      if (!data.positions[rid]) {
        data.positions[rid]    = pickRandom(MAP_SPOTS.map(function (s) { return s.id; }));
        data.charStatuses[rid] = pickRandom(LOCATION_STATES[data.positions[rid]] || ['在家园里']);
      }
    });
    Object.keys(data.positions).forEach(function (rid) {
      if (!data.invitedRoles.includes(rid)) {
        delete data.positions[rid];
        delete data.charStatuses[rid];
      }
    });
    saveData(data);
    const modal = document.getElementById('gdn-invite-modal');
    if (modal) modal.style.display = 'none';
    renderAptView(data);
  }

  /* ══════════════════════════════════════════════
     ── 拖拽临时对话浮窗 ──
     ══════════════════════════════════════════════ */
  function initChatFloatDrag() {
    const floatEl  = document.getElementById('gdn-chat-float');
    const headerEl = document.getElementById('gdn-chat-float-header');
    if (!floatEl || !headerEl) return;

    let isDragging = false;
    let startX = 0, startY = 0, origLeft = 0, origTop = 0;

    function onDragStart(e) {
      isDragging = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startX   = clientX;
      startY   = clientY;
      origLeft = floatEl.offsetLeft;
      origTop  = floatEl.offsetTop;
      floatEl.style.transform = 'none';
      floatEl.style.left = origLeft + 'px';
      floatEl.style.top  = origTop  + 'px';
      e.preventDefault();
    }

    function onDragMove(e) {
      if (!isDragging) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const appEl   = document.getElementById('garden-app');
      const appRect = appEl
        ? appEl.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
      let newLeft = origLeft + (clientX - startX);
      let newTop  = origTop  + (clientY - startY);
      newLeft = Math.max(0, Math.min(newLeft, appRect.width  - floatEl.offsetWidth));
      newTop  = Math.max(0, Math.min(newTop,  appRect.height - floatEl.offsetHeight));
      floatEl.style.left = newLeft + 'px';
      floatEl.style.top  = newTop  + 'px';
    }

    function onDragEnd() { isDragging = false; }

    headerEl.addEventListener('mousedown',  onDragStart);
    headerEl.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mousemove',  onDragMove);
    document.addEventListener('touchmove',  onDragMove,  { passive: false });
    document.addEventListener('mouseup',    onDragEnd);
    document.addEventListener('touchend',   onDragEnd);
  }

  /* ══════════════════════════════════════════════
     ── 全局事件绑定 ──
     ══════════════════════════════════════════════ */
  var gardenDataRef = null;

  function bindAllEvents() {
    /* 地图退出 */
    const mapClose = document.getElementById('gdn-map-close');
    if (mapClose) mapClose.addEventListener('click', function () { closeGardenApp(); });

    /* 住所返回 */
    const aptBack = document.getElementById('gdn-apt-back');
    if (aptBack) aptBack.addEventListener('click', function () { renderMap(gardenDataRef); });

    /* 住所设置 */
    const aptSettings = document.getElementById('gdn-apt-settings');
    if (aptSettings) aptSettings.addEventListener('click', function () { openInviteModal(gardenDataRef); });

    /* 房间返回 */
    const roomBack = document.getElementById('gdn-room-back');
    if (roomBack) roomBack.addEventListener('click', function () { renderAptView(gardenDataRef); });

    /* 广场返回 */
    const plazaBack = document.getElementById('gdn-plaza-back');
    if (plazaBack) plazaBack.addEventListener('click', function () { renderMap(gardenDataRef); });

    /* 广场发起投票 */
    const plazaVoteBtn = document.getElementById('gdn-plaza-vote-btn');
    if (plazaVoteBtn) plazaVoteBtn.addEventListener('click', function () { openVoteSetup(); });

    /* 投票弹窗取消 */
    const voteCancel = document.getElementById('gdn-vote-cancel');
    if (voteCancel) voteCancel.addEventListener('click', function () {
      const m = document.getElementById('gdn-vote-setup-modal');
      if (m) m.style.display = 'none';
    });

    /* 投票弹窗确认 */
    const voteConfirm = document.getElementById('gdn-vote-confirm');
    if (voteConfirm) voteConfirm.addEventListener('click', function () {
      const topic   = (document.getElementById('gdn-vote-topic')   || {}).value || '';
      const options = (document.getElementById('gdn-vote-options') || {}).value || '';
      startVote(topic, options, gardenDataRef);
    });

    /* 气泡弹窗关闭 */
    const bubbleClose = document.getElementById('gdn-bubble-close');
    if (bubbleClose) bubbleClose.addEventListener('click', function () { closeBubblePopup(); });

    /* 气泡→对话 */
    const bubbleChat = document.getElementById('gdn-bubble-chat');
    if (bubbleChat) bubbleChat.addEventListener('click', function () {
      if (bubbleTarget && !bubbleTarget.isUser) openChatFloat(bubbleTarget, gardenDataRef);
    });

    /* 气泡→石头剪刀布 */
    const bubbleRps = document.getElementById('gdn-bubble-rps');
    if (bubbleRps) bubbleRps.addEventListener('click', function () {
      if (bubbleTarget && !bubbleTarget.isUser) openRPS(bubbleTarget);
    });

    /* 临时对话关闭 */
    const chatFloatClose = document.getElementById('gdn-chat-float-close');
    if (chatFloatClose) chatFloatClose.addEventListener('click', function () { closeChatFloat(); });

    /* 临时对话同步 */
    const chatFloatSync = document.getElementById('gdn-chat-float-sync');
    if (chatFloatSync) chatFloatSync.addEventListener('click', function () { syncChatFloatToLiao(); });

    /* 临时对话AI按钮 */
    const aiBtn = document.getElementById('gdn-chat-float-ai-btn');
    if (aiBtn) aiBtn.addEventListener('click', function () {
      const input = document.getElementById('gdn-chat-float-input');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendFloatMessage(text, gardenDataRef);
    });

    /* 临时对话回车发送 */
    const chatInput = document.getElementById('gdn-chat-float-input');
    if (chatInput) chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';
        sendFloatMessage(text, gardenDataRef);
      }
    });

    /* 石头剪刀布按钮 */
    document.querySelectorAll('.gdn-rps-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { playRPS(this.dataset.choice); });
    });

    /* 石头剪刀布关闭 */
    const rpsClose = document.getElementById('gdn-rps-close');
    if (rpsClose) rpsClose.addEventListener('click', function () {
      const modal = document.getElementById('gdn-rps-modal');
      if (modal) modal.style.display = 'none';
    });

    /* 叙事弹窗关闭 */
    const narrateClose = document.getElementById('gdn-narrate-close');
    if (narrateClose) narrateClose.addEventListener('click', function () {
      const modal = document.getElementById('gdn-narrate-modal');
      if (modal) modal.style.display = 'none';
    });

    /* 邀请弹窗取消 */
    const inviteCancel = document.getElementById('gdn-invite-cancel');
    if (inviteCancel) inviteCancel.addEventListener('click', function () {
      const modal = document.getElementById('gdn-invite-modal');
      if (modal) modal.style.display = 'none';
    });

    /* 邀请弹窗确认 */
    const inviteConfirm = document.getElementById('gdn-invite-confirm');
    if (inviteConfirm) inviteConfirm.addEventListener('click', function () {
      confirmInvite(gardenDataRef);
    });

    /* 点击遮罩关闭弹窗 */
    ['gdn-invite-modal', 'gdn-rps-modal', 'gdn-narrate-modal', 'gdn-vote-setup-modal'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', function (e) {
        if (e.target === el) el.style.display = 'none';
      });
    });

    /* 初始化拖拽 */
    initChatFloatDrag();
  }

  /* ══════════════════════════════════════════════
     ── 打开 / 关闭家园App ──
     ══════════════════════════════════════════════ */
  function openGardenApp() {
    const appEl = document.getElementById('garden-app');
    if (!appEl) return;
    appEl.style.display = 'flex';

    gardenDataRef = initData();
    ensureDailyActivities(gardenDataRef);
    randomizePositions(gardenDataRef);

    if (!appEl.dataset.gdnBound) {
      bindAllEvents();
      appEl.dataset.gdnBound = '1';
    }

    playIntro(function () { renderMap(gardenDataRef); });
  }

  function closeGardenApp() {
    const appEl = document.getElementById('garden-app');
    if (appEl) appEl.style.display = 'none';
    VIEWS.forEach(function (v) {
      const el = document.getElementById(v);
      if (el) el.style.display = 'none';
    });
    closeBubblePopup();
    closeChatFloat();
  }

  /* ── 暴露全局接口 ── */
  window.GardenApp = {
    open:       openGardenApp,
    close:      closeGardenApp,
    _showDebug: showDebugPanel,
  };

})();
