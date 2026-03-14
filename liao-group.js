/* ============================================================
   liao-group.js — 群聊界面 / 群聊AI回复
   ============================================================ */

let currentGroupIdx = -1;

/* ============================================================
   打开群聊界面
   ============================================================ */
function openGroupView(groupIdx) {
  currentGroupIdx = groupIdx;
  const group = liaoGroups[groupIdx];
  if (!group) return;

  /* 复用单聊界面，切换到群聊模式 */
  document.getElementById('chat-view-title').textContent = group.name || '群聊';

  /* 群聊隐藏在线状态栏 */
  const statusRow = document.getElementById('chat-status-row');
  if (statusRow) statusRow.style.display = 'none';

  currentQuoteMsgIdx = -1;
  const quoteBar = document.getElementById('chat-quote-bar');
  if (quoteBar) quoteBar.style.display = 'none';

  const suggestBar = document.getElementById('emoji-suggest-bar');
  if (suggestBar) { suggestBar.innerHTML = ''; suggestBar.classList.remove('visible'); }

  const emojiPanel = document.getElementById('emoji-panel');
  if (emojiPanel) emojiPanel.style.display = 'none';
  emojiPanelOpen = false;

  document.body.classList.remove('timestamp-hidden');

  /* 标记当前是群聊模式 */
  document.getElementById('liao-chat-view').dataset.mode = 'group';

  renderGroupMessages();
  document.getElementById('liao-chat-view').classList.add('show');
  setTimeout(scrollChatToBottom, 100);
}

function closeGroupView() {
  document.getElementById('liao-chat-view').classList.remove('show');
  document.getElementById('liao-chat-view').dataset.mode = '';
  currentGroupIdx = -1;

  /* 恢复在线状态栏 */
  const statusRow = document.getElementById('chat-status-row');
  if (statusRow) statusRow.style.display = '';
}

/* ============================================================
   群聊消息渲染
   ============================================================ */
function renderGroupMessages() {
  if (currentGroupIdx < 0) return;
  const group = liaoGroups[currentGroupIdx];
  const area  = document.getElementById('liao-chat-messages');
  area.innerHTML = '';

  const msgs    = (group.messages || []).filter(m => !m.hidden);
  const maxLoad = (group.chatSettings && group.chatSettings.maxLoadMsgs > 0)
    ? group.chatSettings.maxLoadMsgs : 40;

  if (msgs.length > maxLoad) {
    const loadBtn = document.createElement('div');
    loadBtn.style.cssText =
      'text-align:center;padding:10px 0 6px;cursor:pointer;' +
      'font-size:11.5px;color:#4a7abf;user-select:none;-webkit-user-select:none;';
    loadBtn.textContent = '↑ 加载过往消息';
    loadBtn.addEventListener('click', () => {
      if (!group.chatSettings) group.chatSettings = {};
      group.chatSettings.maxLoadMsgs = msgs.length;
      renderGroupMessages();
    });
    area.appendChild(loadBtn);
  }

  const toRender = msgs.length > maxLoad ? msgs.slice(-maxLoad) : msgs;
  let lastRenderedTs = null;

  toRender.forEach(msg => {
    if (shouldInsertTimeDivider(lastRenderedTs, msg.ts)) {
      area.appendChild(createTimeDivider(msg.ts));
    }
    lastRenderedTs = msg.ts || lastRenderedTs;
    appendGroupMessageBubble(msg, group);
  });

  scrollChatToBottom();
}

/* ============================================================
   群聊气泡渲染（带角色名）
   ============================================================ */
function appendGroupMessageBubble(msg, group) {
  const area   = document.getElementById('liao-chat-messages');
  const isUser = msg.role === 'user';

  if (!msg.id) {
    msg.id = 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  }

  /* 撤回消息 */
  if (msg.recalled) {
    const recallRow     = document.createElement('div');
    recallRow.className = 'recall-notice';
    recallRow.dataset.msgId = msg.id;
    const who = isUser ? '你' : (msg.roleName || '对方');
    recallRow.textContent = who + ' 撤回了一条消息';
    area.appendChild(recallRow);
    scrollChatToBottom();
    return;
  }

  const row       = document.createElement('div');
  row.className   = 'chat-msg-row' + (isUser ? ' user-row' : '');
  row.dataset.msgId = msg.id;

  /* 时间戳 */
  const tsEl       = document.createElement('span');
  tsEl.className   = 'chat-msg-timestamp';
  tsEl.dataset.msgId = msg.id;
  tsEl.textContent = (typeof getFormattedTimestamp === 'function')
    ? getFormattedTimestamp(msg.ts)
    : formatFullTime(msg.ts);
  tsEl.addEventListener('click', (e) => {
    e.stopPropagation();
    openGroupMsgActionMenu(e, msg.id);
  });

  /* 头像 */
  let avatarSrc = group.chatUserAvatar || liaoUserAvatar;
  if (!isUser) {
    const senderRole = liaoRoles.find(r => r.id === msg.roleId);
    avatarSrc = senderRole ? (senderRole.avatar || defaultAvatar()) : defaultAvatar();
  }
  const avatarEl     = document.createElement('img');
  avatarEl.className = 'chat-msg-avatar' + (isUser ? ' user-avatar' : '');
  avatarEl.src       = avatarSrc;
  avatarEl.alt       = '';

  /* 气泡包裹（群聊非用户消息需要显示名字） */
  const bubbleWrap     = document.createElement('div');
  bubbleWrap.className = 'group-bubble-wrap';

  if (!isUser && msg.roleName) {
    const nameEl       = document.createElement('div');
    nameEl.className   = 'group-msg-sender-name';
    nameEl.textContent = msg.roleName;
    bubbleWrap.appendChild(nameEl);
  }

  const bubbleEl     = document.createElement('div');
  bubbleEl.className = 'chat-msg-bubble';

  if (msg.quoteContent) {
    bubbleEl.innerHTML = '<div class="msg-quote-block">' + escHtml(msg.quoteContent) + '</div>';
  }

  if (msg.type === 'image') {
    bubbleEl.innerHTML += '<img class="real-image-bubble" src="' + escHtml(msg.content) + '" alt="图片">';
  } else {
    const { html, isEmojiOnly, isTransferOnly } = renderSpecialContent(msg.content || '', msg);
    bubbleEl.innerHTML += html;
    if (isEmojiOnly)         bubbleEl.classList.add('bubble-emoji-only');
    else if (isTransferOnly) bubbleEl.classList.add('bubble-transfer-only');
  }

  bubbleWrap.appendChild(bubbleEl);

  if (isUser) {
    row.appendChild(tsEl);
    row.appendChild(bubbleWrap);
    row.appendChild(avatarEl);
  } else {
    row.appendChild(avatarEl);
    row.appendChild(bubbleWrap);
    row.appendChild(tsEl);
  }

  area.appendChild(row);
  scrollChatToBottom();
}

/* ============================================================
   群聊发送用户消息
   ============================================================ */
function sendGroupUserMessage() {
  if (currentGroupIdx < 0) return;
  const input   = document.getElementById('chat-view-input');
  const content = input.value.trim();
  if (!content) return;

  const group = liaoGroups[currentGroupIdx];
  const uAvt  = group.chatUserAvatar || liaoUserAvatar;
  const uName = group.chatUserName   || liaoUserName;

  const quoteContent = (currentQuoteMsgIdx >= 0 && group.messages[currentQuoteMsgIdx])
    ? (group.messages[currentQuoteMsgIdx].content || '') : '';

  const msgObj = {
    role:         'user',
    type:         'text',
    content,
    quoteContent: quoteContent || undefined,
    ts:           Date.now(),
    id:           'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2)
  };

  group.messages.push(msgObj);
  lSave('groups', liaoGroups);
  input.value = '';

  const suggestBar = document.getElementById('emoji-suggest-bar');
  if (suggestBar) { suggestBar.innerHTML = ''; suggestBar.classList.remove('visible'); }
  currentQuoteMsgIdx = -1;
  const quoteBar = document.getElementById('chat-quote-bar');
  if (quoteBar) quoteBar.style.display = 'none';

  appendGroupMessageBubble(msgObj, group);
}

/* ============================================================
   群聊AI回复
   ============================================================ */
async function triggerGroupAiReply() {
  if (currentGroupIdx < 0) return;
  const group = liaoGroups[currentGroupIdx];

  const activeConfig = loadApiConfig();
  if (!activeConfig || !activeConfig.url) { alert('请先配置 API 地址'); return; }
  const model = loadApiModel();
  if (!model) { alert('请先选择模型'); return; }

  /* 获取群成员信息 */
  const members = (group.memberIds || [])
    .map(id => liaoRoles.find(r => r.id === id))
    .filter(Boolean);
  if (!members.length) { alert('群成员为空'); return; }

  /* 日程判断（如果开启） */
  if (group.chatSettings && group.chatSettings.scheduleEnabled) {
    const unavailable = members.filter(m => {
      if (typeof schCheckCanReply !== 'function') return false;
      const result = schCheckCanReply(m.id);
      return !result.canReply;
    });
    if (unavailable.length === members.length) {
      const noticeMsg = {
        role:    'assistant',
        type:    'text',
        content: '所有成员当前都不方便回复',
        ts:      Date.now(),
        id:      'msg_' + Date.now() + '_sch',
        roleName: '系统',
        roleId:   ''
      };
      group.messages.push(noticeMsg);
      lSave('groups', liaoGroups);
      appendGroupMessageBubble(noticeMsg, group);
      return;
    }
  }

  const csbAiBtn = document.getElementById('csb-ai');
  if (csbAiBtn) csbAiBtn.classList.add('active');
  showTypingIndicator(true);

  const chatUserName2   = group.chatUserName   || liaoUserName;
  const chatUserSetting = group.chatUserSetting || '';

  /* 成员设定列表 */
  const membersDesc = members.map(m =>
    '【' + (m.nickname || m.realname) + '】' + (m.setting || '普通人')
  ).join('\n');

  const emojiNameList = liaoEmojis.length
    ? liaoEmojis.map(e => e.name).join('、')
    : '（暂无）';

  /* 群记忆 */
  let memorySection = '';
  if (group.memory) {
    const longItems      = group.memory.longTerm  || [];
    const importantItems = group.memory.important || [];
    if (longItems.length || importantItems.length) {
      memorySection = '【群聊共享记忆】\n';
      longItems.forEach(item => {
        memorySection += '- ' + item.content + '（' + formatMemoryTime(item.ts) + '）\n';
      });
      importantItems.forEach(item => {
        memorySection += '- ' + item.content + '（' + formatMemoryTime(item.ts) + '）\n';
      });
      memorySection += '\n';
    }
  }

  /* 当前时间 */
  const now       = new Date();
  const weekNames = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  const timeSection =
    '【当前时间】\n' +
    now.getFullYear() + '-' +
    String(now.getMonth()+1).padStart(2,'0') + '-' +
    String(now.getDate()).padStart(2,'0') + ' ' +
    String(now.getHours()).padStart(2,'0') + ':' +
    String(now.getMinutes()).padStart(2,'0') + '，' +
    weekNames[now.getDay()] + '\n\n';

  const systemPrompt =
    memorySection +
    '【群聊成员设定】\n' +
    '群名：' + (group.name || '群聊') + '\n' +
    '以下是群内所有角色，每个角色都有自己的性格和说话风格，请严格区分：\n' +
    membersDesc + '\n\n' +
    '【用户设定】\n对方叫' + chatUserName2 + '。' + (chatUserSetting || '') + '\n\n' +
    '【回复规则】\n' +
    '1. 你需要同时扮演以上所有群成员进行群聊对话\n' +
    '2. 每条消息格式必须是：[角色名]: 消息内容\n' +
    '3. 角色名必须是上方列表中的名字，不能用其他名字\n' +
    '4. 每个成员说的每句话单独一行\n' +
    '5. 群成员之间可以互相回应、互怼、闲聊，不是每次都要回应用户\n' +
    '6. 几乎每个成员都要参与发言，但发言数量可以不同\n' +
    '7. 口语化短句，像真实群聊一样，有情绪有反应\n' +
    '8. 可以使用表情包，格式：[(角色名)发送了一个表情包：表情包名称]，名称从以下列表选：' + emojiNameList + '\n' +
    '9. 发消息不用句号结尾，像活人一样\n' +
    '10. 【严禁】在回复里输出 [ts:任何数字] 格式\n\n' +
    timeSection;

  /* 构建历史消息 */
  const maxApiMsgs = (group.chatSettings && group.chatSettings.maxApiMsgs) || 0;
  let historyMsgs = (group.messages || [])
    .filter(m => !m.hidden && (m.role === 'user' || m.role === 'assistant'))
    .map(m => {
      const prefix = m.roleName ? '[' + m.roleName + ']: ' : (m.role === 'user' ? chatUserName2 + ': ' : '');
      return {
        role:    m.role === 'assistant' ? 'assistant' : 'user',
        content: '[ts:' + (m.ts || 0) + '] ' + prefix + (m.content || '')
      };
    });
  if (maxApiMsgs > 0 && historyMsgs.length > maxApiMsgs) {
    historyMsgs = historyMsgs.slice(-maxApiMsgs);
  }

  const messages = [{ role: 'system', content: systemPrompt }, ...historyMsgs];

  try {
    const endpoint = activeConfig.url.replace(/\/$/, '') + '/chat/completions';
    const headers  = { 'Content-Type': 'application/json' };
    if (activeConfig.key) headers['Authorization'] = 'Bearer ' + activeConfig.key;

    const res = await fetch(endpoint, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ model, messages, stream: false })
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const json     = await res.json();
    let rawContent = json.choices?.[0]?.message?.content || '';
    rawContent     = removeEmoji(rawContent);

    showTypingIndicator(false);
    processGroupAiResponse(rawContent, group);

  } catch (err) {
    showTypingIndicator(false);
    alert('API 请求失败：' + err.message);
  } finally {
    if (csbAiBtn) csbAiBtn.classList.remove('active');
  }
}

/* ============================================================
   解析并渲染群聊AI回复
   ============================================================ */
function processGroupAiResponse(rawContent, group) {
  const lines = rawContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const baseTs = Date.now();
  let cumulativeDelay = 0;

  const parsedLines = [];
  lines.forEach(line => {
    /* 格式：[角色名]: 内容 */
    const match = line.match(/^\[([^\]]+)\]:\s*(.+)$/);
    if (match) {
      const roleName = match[1].trim();
      const content  = removeEmoji(match[2].trim());
      if (!content) return;
      const senderRole = liaoRoles.find(r =>
        (r.nickname === roleName) || (r.realname === roleName)
      );
      parsedLines.push({
        roleName,
        roleId:  senderRole ? senderRole.id : '',
        content,
        avatar:  senderRole ? (senderRole.avatar || defaultAvatar()) : defaultAvatar()
      });
    }
  });

  parsedLines.forEach((item, i) => {
    const delay = calcBubbleDelay(item.content);
    cumulativeDelay += (i === 0 ? 300 : delay);

    setTimeout(() => {
      if (currentGroupIdx < 0) return;
      const currentGroup = liaoGroups[currentGroupIdx];
      const msgTs = baseTs + i;
      const msgObj = {
        role:     'assistant',
        type:     'text',
        content:  item.content,
        roleName: item.roleName,
        roleId:   item.roleId,
        ts:       msgTs,
        id:       'msg_' + msgTs + '_' + Math.random().toString(36).slice(2)
      };
      currentGroup.messages.push(msgObj);
      lSave('groups', liaoGroups);
      appendGroupMessageBubble(msgObj, currentGroup);

      if (i === parsedLines.length - 1) {
        renderChatList();
      }
    }, cumulativeDelay);
  });
}

/* ============================================================
   群聊消息操作菜单
   ============================================================ */
function openGroupMsgActionMenu(e, msgId) {
  if (currentGroupIdx < 0) return;
  const group  = liaoGroups[currentGroupIdx];
  const msgIdx = group.messages.findIndex(m => m.id === msgId);
  if (msgIdx < 0) return;
  const msg = group.messages[msgIdx];

  const menu    = document.getElementById('liao-msg-action-menu');
  const menuBox = document.getElementById('liao-msg-action-box');
  menuBox.innerHTML = '';

  const actions = [
    { label: '引用', fn: () => {
      currentQuoteMsgIdx = msgIdx;
      document.getElementById('chat-quote-bar-text').textContent = (msg.content || '').slice(0, 30);
      document.getElementById('chat-quote-bar').style.display = 'flex';
      closeActionMenu();
    }},
    { label: '删除', danger: true, fn: () => {
      group.messages.splice(msgIdx, 1);
      lSave('groups', liaoGroups);
      renderGroupMessages();
      closeActionMenu();
    }}
  ];

  actions.forEach(a => {
    const btn       = document.createElement('button');
    btn.className   = 'msg-action-item' + (a.danger ? ' danger' : '');
    btn.textContent = a.label;
    btn.addEventListener('click', a.fn);
    menuBox.appendChild(btn);
  });

  menu.style.display = 'block';
  requestAnimationFrame(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    let x = e.clientX, y = e.clientY;
    const bw = menuBox.offsetWidth || 130, bh = menuBox.offsetHeight || 100;
    if (x + bw > vw) x = vw - bw - 8;
    if (y + bh > vh) y = vh - bh - 8;
    menuBox.style.left = x + 'px';
    menuBox.style.top  = y + 'px';
  });

  setTimeout(() => {
    document.addEventListener('click', function onOut() {
      closeActionMenu();
      document.removeEventListener('click', onOut);
    }, { once: true });
  }, 0);
}

/* ============================================================
   拦截单聊的发送/回复按钮，群聊模式下转发到群聊逻辑
   ============================================================ */
(function patchGroupMode() {
  const origSendUserMessage = window.sendUserMessage;
  window.sendUserMessage = function() {
    if (document.getElementById('liao-chat-view').dataset.mode === 'group') {
      sendGroupUserMessage();
    } else {
      origSendUserMessage && origSendUserMessage();
    }
  };

  const origTriggerAiReply = window.triggerAiReply;
  window.triggerAiReply = function() {
    if (document.getElementById('liao-chat-view').dataset.mode === 'group') {
      triggerGroupAiReply();
    } else {
      origTriggerAiReply && origTriggerAiReply();
    }
  };

  const origCloseChatView = window.closeChatView;
  window.closeChatView = function() {
    if (document.getElementById('liao-chat-view').dataset.mode === 'group') {
      closeGroupView();
    } else {
      origCloseChatView && origCloseChatView();
    }
  };
})();

/* ============================================================
   群聊设置
   ============================================================ */

let _gsUserAvatarSrc = '';
let _gsViewingPrivateIdx = -1;

function openGroupSettings() {
  if (currentGroupIdx < 0) return;
  const group = liaoGroups[currentGroupIdx];
  if (!group) return;

  document.getElementById('gs-title').textContent = group.name || '群聊设置';
  gsLoadInfoTab(group);
  gsLoadScheduleTab(group);
  gsLoadMemoryTab(group);
  gsLoadPrivateTab(group);
  gsSwitchTab('gs-tab-info');

  document.getElementById('liao-group-settings').style.display = 'flex';
}

function gsSwitchTab(tabId) {
  document.querySelectorAll('[data-gstab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.gstab === tabId);
  });
  document.querySelectorAll('#liao-group-settings .cs-page').forEach(page => {
    page.classList.toggle('active', page.id === tabId + '-page');
  });
}
function gsLoadInfoTab(group) {
  document.getElementById('gs-group-name').value = group.name || '';
  _gsUserAvatarSrc = '';
  document.getElementById('gs-user-avatar-preview').src = group.chatUserAvatar || liaoUserAvatar;
  document.getElementById('gs-user-avatar-url').value   = '';
  document.getElementById('gs-user-name').value         = group.chatUserName    || liaoUserName;
  document.getElementById('gs-user-setting').value      = group.chatUserSetting || '';
  document.getElementById('gs-hide-timestamp').checked  = !!(group.chatSettings && group.chatSettings.hideTimestamp);
  document.getElementById('gs-chat-bg-url').value       = (group.chatSettings && group.chatSettings.beauty && group.chatSettings.beauty.chatBgUrl) || '';
  document.getElementById('gs-custom-css').value        = (group.chatSettings && group.chatSettings.beauty && group.chatSettings.beauty.customCSS)  || '';
  document.getElementById('gs-max-api-msgs').value      = (group.chatSettings && group.chatSettings.maxApiMsgs)  || 0;
  document.getElementById('gs-max-load-msgs').value     = (group.chatSettings && group.chatSettings.maxLoadMsgs) || 40;
  gsRenderMemberList(group);
  const at = (group.chatSettings && group.chatSettings.autoTrigger) || { enabled: false, times: [], intervals: [] };
  document.getElementById('gs-auto-trigger-enabled').checked = !!at.enabled;
  gsRenderTriggerTimes(at.times     || []);
  gsRenderTriggerIntervals(at.intervals || []);
}

function gsRenderMemberList(group) {
  const container = document.getElementById('gs-member-list');
  if (!container) return;
  container.innerHTML = '';
  (group.memberIds || []).forEach(id => {
    const role = liaoRoles.find(r => r.id === id);
    if (!role) return;
    const item = document.createElement('div');
    item.className = 'group-member-pick-item';
    item.style.justifyContent = 'space-between';
    item.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;">' +
        '<img src="' + escHtml(role.avatar || defaultAvatar()) + '" class="group-member-pick-avatar" alt="">' +
        '<span class="group-member-pick-name">' + escHtml(role.nickname || role.realname) + '</span>' +
      '</div>' +
      '<button class="liao-btn-ghost" data-remove-id="' + escHtml(id) + '" style="padding:4px 10px;font-size:11px;color:#e07a7a;border-color:rgba(224,122,122,0.35);">移除</button>';
    item.querySelector('[data-remove-id]').addEventListener('click', () => {
      if (currentGroupIdx < 0) return;
      const g = liaoGroups[currentGroupIdx];
      g.memberIds = (g.memberIds || []).filter(mid => mid !== id);
      lSave('groups', liaoGroups);
      gsRenderMemberList(g);
      renderChatList();
    });
    container.appendChild(item);
  });
}

function gsRenderTriggerTimes(times) {
  const container = document.getElementById('gs-trigger-times-list');
  if (!container) return;
  container.innerHTML = '';
  times.forEach((t, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;';
    row.innerHTML =
      '<span style="flex:1;font-size:13px;color:var(--text-dark);">' + escHtml(t) + '</span>' +
      '<button class="liao-btn-ghost" data-time-del="' + i + '" style="padding:4px 10px;font-size:11px;color:#e07a7a;border-color:rgba(224,122,122,0.35);">删除</button>';
    row.querySelector('[data-time-del]').addEventListener('click', () => {
      if (currentGroupIdx < 0) return;
      const g  = liaoGroups[currentGroupIdx];
      const at = g.chatSettings.autoTrigger;
      at.times.splice(i, 1);
      lSave('groups', liaoGroups);
      gsRenderTriggerTimes(at.times);
    });
    container.appendChild(row);
  });
  if (!times.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--text-light);padding:4px 0;">暂无定时触发</div>';
  }
}

function gsRenderTriggerIntervals(intervals) {
  const container = document.getElementById('gs-trigger-intervals-list');
  if (!container) return;
  container.innerHTML = '';
  intervals.forEach((sec, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;';
    row.innerHTML =
      '<span style="flex:1;font-size:13px;color:var(--text-dark);">每隔 ' + sec + ' 秒</span>' +
      '<button class="liao-btn-ghost" data-interval-del="' + i + '" style="padding:4px 10px;font-size:11px;color:#e07a7a;border-color:rgba(224,122,122,0.35);">删除</button>';
    row.querySelector('[data-interval-del]').addEventListener('click', () => {
      if (currentGroupIdx < 0) return;
      const g  = liaoGroups[currentGroupIdx];
      const at = g.chatSettings.autoTrigger;
      at.intervals.splice(i, 1);
      lSave('groups', liaoGroups);
      gsRenderTriggerIntervals(at.intervals);
    });
    container.appendChild(row);
  });
  if (!intervals.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--text-light);padding:4px 0;">暂无间隔触发</div>';
  }
}

function gsLoadScheduleTab(group) {
  const enabled = !!(group.chatSettings && group.chatSettings.scheduleEnabled);
  const el = document.getElementById('gs-schedule-enabled');
  if (el) el.checked = enabled;
}

function gsLoadMemoryTab(group) {
  gsRenderMemoryList('gs-memory-long-list',      (group.memory && group.memory.longTerm)  || [], 'long',      group);
  gsRenderMemoryList('gs-memory-short-list',     (group.memory && group.memory.shortTerm) || [], 'short',     group);
  gsRenderMemoryList('gs-memory-important-list', (group.memory && group.memory.important) || [], 'important', group);
}

function gsRenderMemoryList(containerId, items, type, group) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'memory-empty';
    empty.textContent = '暂无记忆';
    container.appendChild(empty);
    return;
  }
  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = 'memory-item';
    const body = document.createElement('div');
    body.className = 'memory-item-body';
    const contentDiv = document.createElement('div');
    contentDiv.className = 'memory-item-content';
    contentDiv.textContent = item.content;
    const timeDiv = document.createElement('div');
    timeDiv.className = 'memory-item-time';
    timeDiv.textContent = formatMemoryTime(item.ts);
    body.appendChild(contentDiv);
    body.appendChild(timeDiv);
    const actions = document.createElement('div');
    actions.className = 'memory-item-actions';
    const delBtn = document.createElement('button');
    delBtn.className = 'memory-item-del-btn';
    delBtn.textContent = '删除';
    delBtn.addEventListener('click', () => {
      if (currentGroupIdx < 0) return;
      const g   = liaoGroups[currentGroupIdx];
      const arr = type === 'long' ? g.memory.longTerm : type === 'short' ? g.memory.shortTerm : g.memory.important;
      arr.splice(idx, 1);
      lSave('groups', liaoGroups);
      gsLoadMemoryTab(g);
    });
    actions.appendChild(delBtn);
    row.appendChild(body);
    row.appendChild(actions);
    container.appendChild(row);
  });
}

function gsLoadPrivateTab(group) {
  /* 成员选择 */
  const pickContainer = document.getElementById('gs-private-member-pick');
  if (pickContainer) {
    pickContainer.innerHTML = '';
    (group.memberIds || []).forEach(id => {
      const role = liaoRoles.find(r => r.id === id);
      if (!role) return;
      const item = document.createElement('label');
      item.className = 'group-member-pick-item';
      item.innerHTML =
        '<input type="checkbox" class="gs-private-member-cb group-member-checkbox" value="' + escHtml(id) + '">' +
        '<img src="' + escHtml(role.avatar || defaultAvatar()) + '" class="group-member-pick-avatar" alt="">' +
        '<span class="group-member-pick-name">' + escHtml(role.nickname || role.realname) + '</span>';
      pickContainer.appendChild(item);
    });
  }

  /* 已缓存私聊列表 */
  gsRenderPrivateChatList(group);
}

function gsRenderPrivateChatList(group) {
  const container = document.getElementById('gs-private-chat-list');
  if (!container) return;
  container.innerHTML = '';
  const list = (group.privateChats || []);
  if (!list.length) {
    container.innerHTML = '<div style="font-size:12px;color:var(--text-light);text-align:center;padding:16px 0;">暂无私聊记录</div>';
    return;
  }
  list.forEach((pc, idx) => {
    const card = document.createElement('div');
    card.className = 'cs-section-card';
    card.style.cursor = 'pointer';
    card.innerHTML =
      '<div style="font-size:13px;font-weight:600;color:var(--text-dark);margin-bottom:4px;">' +
        escHtml(pc.title || '私聊记录') +
      '</div>' +
      '<div style="font-size:11px;color:var(--text-light);">' + formatMemoryTime(pc.ts) + '</div>';
    card.addEventListener('click', () => gsViewPrivateChat(idx));
    container.appendChild(card);
  });
}

function gsViewPrivateChat(idx) {
  if (currentGroupIdx < 0) return;
  const group = liaoGroups[currentGroupIdx];
  const pc    = (group.privateChats || [])[idx];
  if (!pc) return;
  _gsViewingPrivateIdx = idx;

  document.getElementById('gs-private-view-title').textContent = pc.title || '私聊记录';
  const content = document.getElementById('gs-private-view-content');
  content.innerHTML = '';

  (pc.messages || []).forEach(msg => {
    const bubble = document.createElement('div');
    bubble.style.cssText = 'padding:6px 12px;border-radius:12px;font-size:12px;line-height:1.6;max-width:85%;' +
      (msg.isLeft
        ? 'background:rgba(210,230,255,0.6);align-self:flex-start;'
        : 'background:rgba(70,130,220,0.55);color:#fff;align-self:flex-end;');
    const name = document.createElement('div');
    name.style.cssText = 'font-size:10px;font-weight:600;margin-bottom:2px;opacity:0.7;';
    name.textContent = msg.roleName || '';
    bubble.appendChild(name);
    const text = document.createElement('div');
    text.textContent = msg.content || '';
    bubble.appendChild(text);
    content.appendChild(bubble);
  });

  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.gap = '8px';

  document.getElementById('gs-private-view-modal').style.display = 'flex';
}

/* ============================================================
   群聊设置 — 事件绑定
   ============================================================ */
(function bindGroupSettingsEvents() {

  /* 关闭按钮 */
  document.getElementById('gs-close-btn').addEventListener('click', () => {
    document.getElementById('liao-group-settings').style.display = 'none';
  });

  /* tab 切换 */
  document.querySelectorAll('[data-gstab]').forEach(btn => {
    btn.addEventListener('click', function() {
      gsSwitchTab(this.dataset.gstab);
    });
  });

  /* 保存群名 */
  document.getElementById('gs-name-save-btn').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const name = document.getElementById('gs-group-name').value.trim();
    if (!name) { alert('请填写群名称'); return; }
    liaoGroups[currentGroupIdx].name = name;
    lSave('groups', liaoGroups);
    document.getElementById('gs-title').textContent = name;
    document.getElementById('chat-view-title').textContent = name;
    renderChatList();
    alert('群名已保存');
  });

  /* 添加成员按钮 */
  document.getElementById('gs-add-member-btn').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const group      = liaoGroups[currentGroupIdx];
    const pickList   = document.getElementById('gs-add-member-list');
    pickList.innerHTML = '';
    liaoRoles.forEach(role => {
      if ((group.memberIds || []).includes(role.id)) return;
      const item = document.createElement('label');
      item.className = 'group-member-pick-item';
      item.innerHTML =
        '<input type="checkbox" class="gs-add-member-cb group-member-checkbox" value="' + escHtml(role.id) + '">' +
        '<img src="' + escHtml(role.avatar || defaultAvatar()) + '" class="group-member-pick-avatar" alt="">' +
        '<span class="group-member-pick-name">' + escHtml(role.nickname || role.realname) + '</span>';
      pickList.appendChild(item);
    });
    document.getElementById('gs-add-member-modal').style.display = 'flex';
  });

  document.getElementById('gs-add-member-confirm').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const group   = liaoGroups[currentGroupIdx];
    const checked = document.querySelectorAll('.gs-add-member-cb:checked');
    checked.forEach(cb => {
      if (!group.memberIds) group.memberIds = [];
      if (!group.memberIds.includes(cb.value)) group.memberIds.push(cb.value);
    });
    lSave('groups', liaoGroups);
    gsRenderMemberList(group);
    renderChatList();
    document.getElementById('gs-add-member-modal').style.display = 'none';
  });

  document.getElementById('gs-add-member-cancel').addEventListener('click', () => {
    document.getElementById('gs-add-member-modal').style.display = 'none';
  });

  /* 自动触发：添加时间 */
  document.getElementById('gs-trigger-time-add').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const val = document.getElementById('gs-trigger-time-input').value;
    if (!val) return;
    const g  = liaoGroups[currentGroupIdx];
    if (!g.chatSettings) g.chatSettings = {};
    if (!g.chatSettings.autoTrigger) g.chatSettings.autoTrigger = { enabled: false, times: [], intervals: [] };
    if (!g.chatSettings.autoTrigger.times) g.chatSettings.autoTrigger.times = [];
    if (!g.chatSettings.autoTrigger.times.includes(val)) {
      g.chatSettings.autoTrigger.times.push(val);
      lSave('groups', liaoGroups);
      gsRenderTriggerTimes(g.chatSettings.autoTrigger.times);
    }
  });

  /* 自动触发：添加间隔 */
  document.getElementById('gs-trigger-interval-add').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const val = parseInt(document.getElementById('gs-trigger-interval-input').value);
    if (!val || val < 60) { alert('间隔至少60秒'); return; }
    const g  = liaoGroups[currentGroupIdx];
    if (!g.chatSettings) g.chatSettings = {};
    if (!g.chatSettings.autoTrigger) g.chatSettings.autoTrigger = { enabled: false, times: [], intervals: [] };
    if (!g.chatSettings.autoTrigger.intervals) g.chatSettings.autoTrigger.intervals = [];
    g.chatSettings.autoTrigger.intervals.push(val);
    lSave('groups', liaoGroups);
    gsRenderTriggerIntervals(g.chatSettings.autoTrigger.intervals);
    document.getElementById('gs-trigger-interval-input').value = '';
  });

  /* 保存自动触发开关 */
  document.getElementById('gs-auto-trigger-save').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const g = liaoGroups[currentGroupIdx];
    if (!g.chatSettings) g.chatSettings = {};
    if (!g.chatSettings.autoTrigger) g.chatSettings.autoTrigger = { enabled: false, times: [], intervals: [] };
    g.chatSettings.autoTrigger.enabled = document.getElementById('gs-auto-trigger-enabled').checked;
    lSave('groups', liaoGroups);
    gsRestartAutoTrigger();
    alert('自动触发设置已保存');
  });

  /* 用户头像本地上传 */
  document.getElementById('gs-user-avatar-local-btn').addEventListener('click', () => {
    document.getElementById('gs-user-avatar-file').click();
  });
  document.getElementById('gs-user-avatar-file').addEventListener('change', function() {
    const file = this.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      _gsUserAvatarSrc = e.target.result;
      document.getElementById('gs-user-avatar-preview').src = _gsUserAvatarSrc;
    };
    reader.readAsDataURL(file);
    this.value = '';
  });
  document.getElementById('gs-user-avatar-url').addEventListener('input', function() {
    const url = this.value.trim();
    if (url) { _gsUserAvatarSrc = url; document.getElementById('gs-user-avatar-preview').src = url; }
  });

  /* 保存用户设置 */
  document.getElementById('gs-user-save-btn').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const g = liaoGroups[currentGroupIdx];
    if (_gsUserAvatarSrc) g.chatUserAvatar = _gsUserAvatarSrc;
    const un = document.getElementById('gs-user-name').value.trim();
    const us = document.getElementById('gs-user-setting').value.trim();
    if (un) g.chatUserName = un;
    g.chatUserSetting = us;
    lSave('groups', liaoGroups);
    _gsUserAvatarSrc = '';
    alert('用户设置已保存');
  });

  /* 时间戳 */
  document.getElementById('gs-timestamp-save-btn').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const g      = liaoGroups[currentGroupIdx];
    const hidden = document.getElementById('gs-hide-timestamp').checked;
    if (!g.chatSettings) g.chatSettings = {};
    g.chatSettings.hideTimestamp = hidden;
    lSave('groups', liaoGroups);
    document.body.classList.toggle('timestamp-hidden', hidden);
    alert('时间戳设置已保存');
  });

  /* 聊天背景图本地上传 */
  document.getElementById('gs-chat-bg-local-btn').addEventListener('click', () => {
    document.getElementById('gs-chat-bg-file').click();
  });
  document.getElementById('gs-chat-bg-file').addEventListener('change', function() {
    const file = this.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const urlEl = document.getElementById('gs-chat-bg-url');
      if (urlEl) urlEl.value = ev.target.result;
    };
    reader.readAsDataURL(file);
    this.value = '';
  });
  document.getElementById('gs-chat-bg-clear-btn').addEventListener('click', () => {
    const urlEl = document.getElementById('gs-chat-bg-url');
    if (urlEl) urlEl.value = '';
  });

  /* 保存美化 */
  document.getElementById('gs-beauty-save-btn').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const g = liaoGroups[currentGroupIdx];
    if (!g.chatSettings) g.chatSettings = {};
    if (!g.chatSettings.beauty) g.chatSettings.beauty = {};
    g.chatSettings.beauty.chatBgUrl  = (document.getElementById('gs-chat-bg-url').value || '').trim();
    g.chatSettings.beauty.customCSS  = document.getElementById('gs-custom-css').value || '';
    lSave('groups', liaoGroups);
    gsApplyGroupBeauty(g);
    alert('美化设置已保存');
  });

  document.getElementById('gs-beauty-reset-btn').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const g = liaoGroups[currentGroupIdx];
    if (g.chatSettings) g.chatSettings.beauty = {};
    lSave('groups', liaoGroups);
    document.getElementById('gs-chat-bg-url').value = '';
    document.getElementById('gs-custom-css').value  = '';
    gsApplyGroupBeauty(g);
    alert('美化已重置');
  });

  /* 消息数量 */
  document.getElementById('gs-msgs-save-btn').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const g = liaoGroups[currentGroupIdx];
    if (!g.chatSettings) g.chatSettings = {};
    g.chatSettings.maxApiMsgs  = parseInt(document.getElementById('gs-max-api-msgs').value)  || 0;
    g.chatSettings.maxLoadMsgs = parseInt(document.getElementById('gs-max-load-msgs').value) || 40;
    lSave('groups', liaoGroups);
    alert('消息数量设置已保存');
  });

  /* 日程开关 */
  document.getElementById('gs-schedule-save-btn').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const g = liaoGroups[currentGroupIdx];
    if (!g.chatSettings) g.chatSettings = {};
    g.chatSettings.scheduleEnabled = document.getElementById('gs-schedule-enabled').checked;
    lSave('groups', liaoGroups);
    alert('日程设置已保存');
  });

  /* 群记忆：手动添加 */
  document.getElementById('gs-memory-add-btn').addEventListener('click', () => {
    const form = document.getElementById('gs-memory-add-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    document.getElementById('gs-memory-add-content').value = '';
  });

  document.getElementById('gs-memory-add-confirm').addEventListener('click', () => {
    if (currentGroupIdx < 0) return;
    const content = document.getElementById('gs-memory-add-content').value.trim();
    const type    = document.getElementById('gs-memory-add-type').value;
    if (!content) { alert('请输入记忆内容'); return; }
    const g = liaoGroups[currentGroupIdx];
    if (!g.memory) g.memory = { longTerm: [], shortTerm: [], important: [], other: {} };
    const item = { id: 'mem_' + Date.now(), content, ts: Date.now(), type };
    if (type === 'long')           g.memory.longTerm.push(item);
    else if (type === 'short')     g.memory.shortTerm.push(item);
    else if (type === 'important') g.memory.important.push(item);
    lSave('groups', liaoGroups);
    document.getElementById('gs-memory-add-form').style.display = 'none';
    gsLoadMemoryTab(g);
  });

  document.getElementById('gs-memory-add-cancel').addEventListener('click', () => {
    document.getElementById('gs-memory-add-form').style.display = 'none';
  });

  /* 群记忆：AI总结 */
  document.getElementById('gs-memory-ai-btn').addEventListener('click', async () => {
    if (currentGroupIdx < 0) return;
    const g = liaoGroups[currentGroupIdx];
    const activeConfig = loadApiConfig();
    if (!activeConfig || !activeConfig.url) { alert('请先配置 API'); return; }
    const model = loadApiModel();
    if (!model) { alert('请先选择模型'); return; }

    const recentMsgs = (g.messages || [])
      .filter(m => !m.hidden)
      .slice(-50)
      .map(m => (m.roleName || '用户') + '：' + (m.content || ''))
      .join('\n');
    if (!recentMsgs.trim()) { alert('暂无聊天记录'); return; }

    const btn = document.getElementById('gs-memory-ai-btn');
    btn.textContent = '总结中…'; btn.disabled = true;

    try {
      const endpoint = activeConfig.url.replace(/\/$/, '') + '/chat/completions';
      const headers  = { 'Content-Type': 'application/json' };
      if (activeConfig.key) headers['Authorization'] = 'Bearer ' + activeConfig.key;
      const res = await fetch(endpoint, {
        method: 'POST', headers,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: '你是记忆整理助手，根据群聊记录提炼记忆。每条格式：[long:内容] 或 [short:内容] 或 [important:内容]，只输出条目。' },
            { role: 'user',   content: recentMsgs }
          ],
          stream: false
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json = await res.json();
      const raw  = (json.choices?.[0]?.message?.content || '').trim();
      const re = /\[(long|short|important):(.+?)\]/g;
      let match, added = 0;
      if (!g.memory) g.memory = { longTerm: [], shortTerm: [], important: [], other: {} };
      while ((match = re.exec(raw)) !== null) {
        const type = match[1], content = match[2].trim();
        if (!content) continue;
        const item = { id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2), content, ts: Date.now(), type };
        if (type === 'long')           g.memory.longTerm.push(item);
        else if (type === 'short')     g.memory.shortTerm.push(item);
        else if (type === 'important') g.memory.important.push(item);
        added++;
      }
      lSave('groups', liaoGroups);
      gsLoadMemoryTab(g);
      alert('AI 总结完成，新增 ' + added + ' 条记忆');
    } catch (err) {
      alert('AI 总结失败：' + err.message);
    } finally {
      btn.textContent = 'AI 总结记忆'; btn.disabled = false;
    }
  });

  /* 成员私聊：生成 */
  document.getElementById('gs-private-gen-btn').addEventListener('click', async () => {
    if (currentGroupIdx < 0) return;
    const g = liaoGroups[currentGroupIdx];
    const checked = document.querySelectorAll('.gs-private-member-cb:checked');
    const selectedIds = Array.from(checked).map(cb => cb.value);
    if (selectedIds.length < 2) { alert('请至少选择2名成员'); return; }

    const activeConfig = loadApiConfig();
    if (!activeConfig || !activeConfig.url) { alert('请先配置 API'); return; }
    const model = loadApiModel();
    if (!model) { alert('请先选择模型'); return; }

    const selectedRoles = selectedIds.map(id => liaoRoles.find(r => r.id === id)).filter(Boolean);
    const statusEl = document.getElementById('gs-private-gen-status');
    if (statusEl) { statusEl.style.color = '#9aafc4'; statusEl.textContent = 'AI 生成中…'; }
    document.getElementById('gs-private-gen-btn').disabled = true;

    const membersDesc = selectedRoles.map(m =>
      '【' + (m.nickname || m.realname) + '】' + (m.setting || '普通人')
    ).join('\n');
    const names = selectedRoles.map(m => m.nickname || m.realname);
    const title = names.join(' & ') + ' 的私聊';

    const prompt =
      '以下是两个角色的设定：\n' + membersDesc + '\n\n' +
      '请生成他们之间的一段私下聊天记录（10~20条消息），内容自然真实，符合各自性格。\n' +
      '每条消息格式：[角色名]: 消息内容\n' +
      '只输出聊天内容，不要任何说明。';

    try {
      const endpoint = activeConfig.url.replace(/\/$/, '') + '/chat/completions';
      const headers  = { 'Content-Type': 'application/json' };
      if (activeConfig.key) headers['Authorization'] = 'Bearer ' + activeConfig.key;
      const res = await fetch(endpoint, {
        method: 'POST', headers,
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const json    = await res.json();
      const raw     = (json.choices?.[0]?.message?.content || '').trim();
      const lines   = raw.split('\n').map(l => l.trim()).filter(Boolean);
      const messages = [];
      lines.forEach((line, i) => {
        const match = line.match(/^\[([^\]]+)\]:\s*(.+)$/);
        if (match) {
          messages.push({
            roleName: match[1].trim(),
            content:  removeEmoji(match[2].trim()),
            isLeft:   i % 2 === 0
          });
        }
      });

      if (!g.privateChats) g.privateChats = [];
      g.privateChats.unshift({ title, ts: Date.now(), memberIds: selectedIds, messages });
      lSave('groups', liaoGroups);
      gsRenderPrivateChatList(g);
      if (statusEl) { statusEl.style.color = '#4caf84'; statusEl.textContent = '生成完成！'; }

    } catch (err) {
      if (statusEl) { statusEl.style.color = '#e07a7a'; statusEl.textContent = '生成失败：' + err.message; }
    } finally {
      document.getElementById('gs-private-gen-btn').disabled = false;
    }
  });

  /* 私聊查看弹窗关闭 */
  document.getElementById('gs-private-view-close').addEventListener('click', () => {
    document.getElementById('gs-private-view-modal').style.display = 'none';
    _gsViewingPrivateIdx = -1;
  });

  /* 私聊删除 */
  document.getElementById('gs-private-view-delete').addEventListener('click', () => {
    if (_gsViewingPrivateIdx < 0 || currentGroupIdx < 0) return;
    if (!confirm('确定删除这条私聊记录？')) return;
    const g = liaoGroups[currentGroupIdx];
    (g.privateChats || []).splice(_gsViewingPrivateIdx, 1);
    lSave('groups', liaoGroups);
    gsRenderPrivateChatList(g);
    document.getElementById('gs-private-view-modal').style.display = 'none';
    _gsViewingPrivateIdx = -1;
  });

})();

/* ============================================================
   群聊美化应用
   ============================================================ */
function gsApplyGroupBeauty(group) {
  const styleId = 'liao-group-beauty-style';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl    = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  const beauty  = (group.chatSettings && group.chatSettings.beauty) || {};
  const bgUrl   = beauty.chatBgUrl || '';
  const custom  = beauty.customCSS || '';
  const bgStyle = bgUrl
    ? '#liao-chat-messages{background-image:url("' + bgUrl + '") !important;background-size:cover !important;background-position:center !important;}'
    : '';
  styleEl.textContent = bgStyle + '\n' + custom;
}

/* ============================================================
   群聊设置入口：绑定 ··· 按钮（群聊模式下）
   ============================================================ */
(function patchSettingsBtn() {
  const origOpenChatSettings = window.openChatSettings;
  window.openChatSettings = function() {
    if (document.getElementById('liao-chat-view').dataset.mode === 'group') {
      openGroupSettings();
    } else {
      origOpenChatSettings && origOpenChatSettings();
    }
  };
})();

/* ============================================================
   群聊打开时应用美化
   ============================================================ */
const _origOpenGroupView = window.openGroupView;
window.openGroupView = function(groupIdx) {
  _origOpenGroupView(groupIdx);
  const group = liaoGroups[groupIdx];
  if (group) gsApplyGroupBeauty(group);
};

/* ============================================================
   自动触发定时器
   ============================================================ */
let _autoTriggerTimers = {};
let _lastTriggerTs     = {};

function gsRestartAutoTrigger() {
  /* 清除旧定时器 */
  Object.values(_autoTriggerTimers).forEach(t => clearInterval(t));
  _autoTriggerTimers = {};

  liaoGroups.forEach((group, idx) => {
    const at = group.chatSettings && group.chatSettings.autoTrigger;
    if (!at || !at.enabled) return;

    /* 间隔触发 */
    (at.intervals || []).forEach(sec => {
      const key = 'g' + idx + '_i' + sec;
      _autoTriggerTimers[key] = setInterval(() => {
        _triggerGroupAutoReply(idx);
      }, sec * 1000);
    });
  });
}

/* 每分钟检查一次定时触发 */
setInterval(() => {
  const now  = new Date();
  const hhmm = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  liaoGroups.forEach((group, idx) => {
    const at = group.chatSettings && group.chatSettings.autoTrigger;
    if (!at || !at.enabled) return;
    (at.times || []).forEach(t => {
      if (t === hhmm) {
        const key = 'g' + idx + '_t' + t;
        const lastTs = _lastTriggerTs[key] || 0;
        if (Date.now() - lastTs > 60000) {
          _lastTriggerTs[key] = Date.now();
          _triggerGroupAutoReply(idx);
        }
      }
    });
  });
}, 30000);

function _triggerGroupAutoReply(groupIdx) {
  const prevIdx    = currentGroupIdx;
  currentGroupIdx  = groupIdx;
  triggerGroupAiReply().finally(() => {
    if (prevIdx !== groupIdx) currentGroupIdx = prevIdx;
  });
}

/* 页面加载后启动定时器 */
gsRestartAutoTrigger();

/* ============================================================
   AI群聊回复时偶尔顺带生成私聊（10%概率）
   ============================================================ */
const _origProcessGroupAiResponse = processGroupAiResponse;
window.processGroupAiResponse = function(rawContent, group) {
  _origProcessGroupAiResponse(rawContent, group);

  if (Math.random() > 0.10) return;
  if (!group.memberIds || group.memberIds.length < 2) return;

  /* 随机选两个成员 */
  const shuffled = [...group.memberIds].sort(() => Math.random() - 0.5);
  const twoIds   = shuffled.slice(0, 2);
  const twoRoles = twoIds.map(id => liaoRoles.find(r => r.id === id)).filter(Boolean);
  if (twoRoles.length < 2) return;

  const activeConfig = loadApiConfig();
  if (!activeConfig || !activeConfig.url) return;
  const model = loadApiModel();
  if (!model) return;

  const membersDesc = twoRoles.map(m =>
    '【' + (m.nickname || m.realname) + '】' + (m.setting || '普通人')
  ).join('\n');
  const names = twoRoles.map(m => m.nickname || m.realname);
  const title = names.join(' & ') + ' 的私聊';

  const prompt =
    '以下是两个角色的设定：\n' + membersDesc + '\n\n' +
    '请生成他们之间的一段简短私下聊天（6~10条），内容自然真实，符合各自性格，与刚才的群聊话题有一定关联。\n' +
    '每条消息格式：[角色名]: 消息内容\n只输出聊天内容。';

  const endpoint = activeConfig.url.replace(/\/$/, '') + '/chat/completions';
  const headers  = { 'Content-Type': 'application/json' };
  if (activeConfig.key) headers['Authorization'] = 'Bearer ' + activeConfig.key;

  fetch(endpoint, {
    method: 'POST', headers,
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false })
  })
  .then(r => r.json())
  .then(json => {
    const raw  = (json.choices?.[0]?.message?.content || '').trim();
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const messages = [];
    lines.forEach((line, i) => {
      const match = line.match(/^\[([^\]]+)\]:\s*(.+)$/);
      if (match) {
        messages.push({
          roleName: match[1].trim(),
          content:  removeEmoji(match[2].trim()),
          isLeft:   i % 2 === 0
        });
      }
    });
    if (!messages.length) return;
    if (!group.privateChats) group.privateChats = [];
    group.privateChats.unshift({ title, ts: Date.now(), memberIds: twoIds, messages });
    lSave('groups', liaoGroups);
  })
  .catch(() => { /* 静默失败 */ });
};

/* ============================================================
   群聊模式下 csb-rolephone 按钮替换为成员私聊入口
   ============================================================ */
(function patchRolephoneBtn() {
  const origInitSpecialBar = window.initSpecialBar;
  window.initSpecialBar = function() {
    origInitSpecialBar && origInitSpecialBar();
    const btn = document.getElementById('csb-rolephone');
    if (!btn) return;
    btn.addEventListener('click', function() {
      if (document.getElementById('liao-chat-view').dataset.mode === 'group') {
        if (currentGroupIdx < 0) return;
        const group = liaoGroups[currentGroupIdx];
        openGroupSettings();
        setTimeout(() => gsSwitchTab('gs-tab-private'), 100);
      }
    }, true);
  };
})();

/* ============================================================
   群成员备注
   ============================================================ */

/* 获取某成员在当前群的显示名（优先用备注） */
function gsGetMemberDisplayName(group, roleId, fallbackName) {
  const aliases = (group.memberAliases) || {};
  return aliases[roleId] || fallbackName || '';
}

/* 在 gsRenderMemberList 里每个成员旁边加备注编辑按钮 */
const _origGsRenderMemberList = gsRenderMemberList;
gsRenderMemberList = function(group) {
  const container = document.getElementById('gs-member-list');
  if (!container) return;
  container.innerHTML = '';
  (group.memberIds || []).forEach(id => {
    const role = liaoRoles.find(r => r.id === id);
    if (!role) return;
    const aliases     = group.memberAliases || {};
    const displayName = aliases[id] || (role.nickname || role.realname);
    const realName    = role.nickname || role.realname;
    const hasAlias    = !!aliases[id];

    const item = document.createElement('div');
    item.className = 'group-member-pick-item';
    item.style.justifyContent = 'space-between';
    item.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">' +
        '<img src="' + escHtml(role.avatar || defaultAvatar()) + '" class="group-member-pick-avatar" alt="">' +
        '<div style="flex:1;min-width:0;">' +
          '<div class="group-member-pick-name">' + escHtml(displayName) + '</div>' +
          (hasAlias ? '<div style="font-size:10px;color:var(--text-light);">真名：' + escHtml(realName) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-shrink:0;">' +
        '<button class="liao-btn-ghost" data-alias-id="' + escHtml(id) + '" style="padding:4px 10px;font-size:11px;">备注</button>' +
        '<button class="liao-btn-ghost" data-remove-id="' + escHtml(id) + '" style="padding:4px 10px;font-size:11px;color:#e07a7a;border-color:rgba(224,122,122,0.35);">移除</button>' +
      '</div>';

    /* 备注按钮 */
    item.querySelector('[data-alias-id]').addEventListener('click', () => {
      if (currentGroupIdx < 0) return;
      const g       = liaoGroups[currentGroupIdx];
      const current = (g.memberAliases && g.memberAliases[id]) || '';
      const val     = prompt('为「' + realName + '」设置群备注（留空则清除备注）', current);
      if (val === null) return;
      if (!g.memberAliases) g.memberAliases = {};
      if (val.trim()) {
        g.memberAliases[id] = val.trim();
      } else {
        delete g.memberAliases[id];
      }
      lSave('groups', liaoGroups);
      gsRenderMemberList(g);
    });

    /* 移除按钮 */
    item.querySelector('[data-remove-id]').addEventListener('click', () => {
      if (currentGroupIdx < 0) return;
      const g = liaoGroups[currentGroupIdx];
      g.memberIds = (g.memberIds || []).filter(mid => mid !== id);
      lSave('groups', liaoGroups);
      gsRenderMemberList(g);
      renderChatList();
    });

    container.appendChild(item);
  });
};

/* 在 appendGroupMessageBubble 里取名字时优先用备注 */
const _origAppendGroupMessageBubble = appendGroupMessageBubble;
appendGroupMessageBubble = function(msg, group) {
  /* 如果是 assistant 消息且有 roleId，把 roleName 替换成备注名 */
  if (msg.role === 'assistant' && msg.roleId) {
    const displayName = gsGetMemberDisplayName(group, msg.roleId, msg.roleName);
    if (displayName !== msg.roleName) {
      /* 临时替换，不污染原始数据 */
      const patchedMsg = Object.assign({}, msg, { roleName: displayName });
      return _origAppendGroupMessageBubble(patchedMsg, group);
    }
  }
  return _origAppendGroupMessageBubble(msg, group);
};
