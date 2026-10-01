(() => {
  'use strict';

  const APP_KEY = 'clampplay.mobile.v1';
  const state = {
    route: 'home',
    locale: {},
    connected: false,
    serialPort: null,
    writer: null,
    playing: false,
    safetyLocked: false,
    beat: 0,
    timer: null,
    startedAt: 0,
    activeMode: 'piano',
    selectedSongId: null,
    songs: [],
    logs: [],
    calibration: [],
    settings: { dark: true, autoRelease: true, haptics: true },
  };

  const icons = {
    home: '⌂', songs: '♫', perform: '▶', calibrate: '⌁', safety: '⚠', settings: '⚙'
  };
  const navItems = [
    ['home', '首页'], ['songs', '曲目'], ['perform', '演奏'], ['calibrate', '校准'], ['safety', '安全'], ['settings', '设置']
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const el = (tag, className = '', content = '') => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content) node.textContent = content;
    return node;
  };

  function defaultSongs() {
    return [{
      id: 'song-demo',
      name: '晴天 · 排练版',
      bpm: 120,
      difficult: 'Chorus 09–16',
      notes: '右手保留旋律与节奏；辅助只进入和弦和底鼓困难点。',
      events: [
        { id: crypto.randomUUID(), type: 'piano', channel: 1, actuator: 1, velocity: 82, start: 0, duration: 180, label: 'C chord' },
        { id: crypto.randomUUID(), type: 'piano', channel: 1, actuator: 3, velocity: 86, start: 500, duration: 180, label: 'G chord' },
        { id: crypto.randomUUID(), type: 'guitar', channel: 2, actuator: 5, velocity: 70, start: 1000, duration: 240, label: 'Am fret' },
        { id: crypto.randomUUID(), type: 'pedal', channel: 3, actuator: 1, velocity: 92, start: 1500, duration: 120, label: 'Accent pedal' },
      ]
    }];
  }

  function defaultCalibration() {
    return Array.from({ length: 10 }, (_, index) => ({
      channel: index + 1, travel: 4, force: 10, returnOk: true, tested: false, enabled: true
    }));
  }

  async function boot() {
    try {
      const response = await fetch('locales/zh-CN.json');
      state.locale = await response.json();
    } catch (_) {
      state.locale = {};
    }
    restore();
    if (!state.songs.length) state.songs = defaultSongs();
    if (!state.calibration.length) state.calibration = defaultCalibration();
    if (!state.selectedSongId) state.selectedSongId = state.songs[0].id;
    bindShell();
    render();
    registerServiceWorker();
  }

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(APP_KEY));
      if (!saved) return;
      state.route = saved.route || state.route;
      state.songs = Array.isArray(saved.songs) ? saved.songs : [];
      state.logs = Array.isArray(saved.logs) ? saved.logs : [];
      state.calibration = Array.isArray(saved.calibration) ? saved.calibration : [];
      state.settings = { ...state.settings, ...(saved.settings || {}) };
      state.selectedSongId = saved.selectedSongId || null;
    } catch (_) {
      toast('本地数据读取失败，已使用安全默认值。', 'error');
    }
  }

  function persist() {
    const payload = {
      route: state.route,
      songs: state.songs,
      logs: state.logs.slice(0, 300),
      calibration: state.calibration,
      settings: state.settings,
      selectedSongId: state.selectedSongId,
    };
    localStorage.setItem(APP_KEY, JSON.stringify(payload));
  }

  function bindShell() {
    $('#menuButton').addEventListener('click', () => toggleDrawer(true));
    $('#closeDrawer').addEventListener('click', () => toggleDrawer(false));
    $('#scrim').addEventListener('click', () => toggleDrawer(false));
    $('#quickStop').addEventListener('click', requestEmergencyStop);
    $('#drawerConnect').addEventListener('click', connectDevice);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') requestEmergencyStop();
      if (event.code === 'Space' && state.route === 'perform') {
        event.preventDefault();
        togglePlay();
      }
    });
  }

  function toggleDrawer(open) {
    $('#drawer').classList.toggle('open', open);
    $('#scrim').classList.toggle('open', open);
    $('#drawer').setAttribute('aria-hidden', String(!open));
  }

  function currentSong() {
    return state.songs.find((song) => song.id === state.selectedSongId) || state.songs[0];
  }

  function renderNav() {
    const drawer = $('#navList');
    const bottom = $('#bottomNav');
    drawer.innerHTML = '';
    bottom.innerHTML = '';
    navItems.forEach(([route, label]) => {
      const drawerButton = el('button', `drawer-item ${route === state.route ? 'active' : ''}`, `${icons[route]}  ${label}`);
      drawerButton.addEventListener('click', () => navigate(route));
      drawer.append(drawerButton);
      if (route !== 'settings') {
        const bottomButton = el('button', `nav-button ${route === state.route ? 'active' : ''}`);
        bottomButton.innerHTML = `<i>${icons[route]}</i><span>${label}</span>`;
        bottomButton.addEventListener('click', () => navigate(route));
        bottom.append(bottomButton);
      }
    });
    $('#drawerConnection').textContent = state.connected ? 'Controller connected' : 'Demo device';
    $('#drawerConnect').textContent = state.connected ? 'Disconnect' : 'Connect';
  }

  function navigate(route) {
    state.route = route;
    persist();
    toggleDrawer(false);
    render();
    $('#screen').focus();
  }

  function render() {
    renderNav();
    const screen = $('#screen');
    screen.innerHTML = '';
    const pages = { home: pageHome, songs: pageSongs, perform: pagePerform, calibrate: pageCalibrate, safety: pageSafety, settings: pageSettings };
    pages[state.route](screen);
    $('#modeBadge').textContent = state.connected ? 'CONNECTED' : 'DEMO';
  }

  function pageHeader(title, kicker, subtitle = '') {
    const head = el('section', 'page-head');
    const body = el('div');
    body.innerHTML = `<div class="eyebrow">${escapeHtml(kicker)}</div><h1>${escapeHtml(title)}</h1>${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ''}`;
    head.append(body);
    return head;
  }

  function pageHome(root) {
    root.append(pageHeader('演奏概览', 'CLAMPPLAY-1 / MOBILE CONTROL', '手机端用于准备、排练、监看和安全停止；实体控制保持明确的连接与确认边界。'));
    const song = currentSong();
    const hero = el('section', 'card hero-card');
    hero.innerHTML = `<div class="row between"><div><div class="eyebrow">CURRENT SONG</div><h2>${escapeHtml(song.name)}</h2><p class="sub">困难段：${escapeHtml(song.difficult || '未标记')}</p></div><span class="badge orange">${song.bpm} BPM</span></div><div class="stripe"></div><div class="row between"><div><span class="status-dot ${state.connected ? 'safe' : ''}"></span> <span class="sub">${state.connected ? '控制器在线，仍需人工确认机械状态。' : '演示模式，动作只进入本地模拟队列。'}</span></div><button class="button primary" id="homePlay">开始演奏</button></div>`;
    root.append(hero);
    $('#homePlay', hero).addEventListener('click', () => navigate('perform'));

    const metric = el('section', 'metric-grid');
    metric.innerHTML = `<div class="metric"><small>ACTUATORS</small><b>10 CH</b><div class="progress"><i style="width:${enabledChannels() * 10}%"></i></div></div><div class="metric"><small>SAFETY</small><b>${state.safetyLocked ? 'LOCKED' : 'READY'}</b><div class="progress"><i style="width:${state.safetyLocked ? 0 : 100}%;background:${state.safetyLocked ? 'var(--red)' : 'var(--safe)'}"></i></div></div><div class="metric"><small>QUEUE</small><b>${queuedEvents().length}</b><div class="progress"><i style="width:${Math.min(100, queuedEvents().length * 20)}%;background:var(--blue)"></i></div></div>`;
    root.append(metric);

    const next = el('section', 'card');
    const event = nextEvent();
    next.innerHTML = `<div class="row between"><div><h2>下一动作</h2><p class="sub">${event ? `${escapeHtml(event.label || event.type)} · CH${event.channel} · ${event.start} ms` : '当前曲目还没有动作事件。'}</p></div><span class="badge ${event ? 'safe' : ''}">${event ? 'SCHEDULED' : 'EMPTY'}</span></div><div class="row" style="margin-top:12px"><button class="button" id="homeSongs">编辑曲目</button><button class="button danger" id="homeStop">急停</button></div>`;
    root.append(next);
    $('#homeSongs', next).addEventListener('click', () => navigate('songs'));
    $('#homeStop', next).addEventListener('click', requestEmergencyStop);

    const log = el('section', 'card');
    log.innerHTML = '<div class="row between"><h2>最近事件</h2><button class="button small ghost" id="goSafety">查看审计</button></div>';
    const recent = state.logs.slice(0, 4);
    if (!recent.length) log.append(empty('暂无事件记录。'));
    recent.forEach((item) => log.append(logRow(item)));
    root.append(log);
    $('#goSafety', log).addEventListener('click', () => navigate('safety'));
  }

  function pageSongs(root) {
    root.append(pageHeader('曲目与困难段', 'SONG LIBRARY', '曲目保存在本机浏览器。每个动作都可以编辑通道、力度、开始时间和持续时间。'));
    const top = el('section', 'card');
    top.innerHTML = '<div class="row between"><div><h2>我的曲目</h2><p class="sub">先编排，再选择哪些动作需要辅助。</p></div><button class="button primary" id="newSong">新建曲目</button></div>';
    root.append(top);
    $('#newSong', top).addEventListener('click', () => openSongEditor());
    state.songs.forEach((song) => {
      const row = el('section', `card ${song.id === state.selectedSongId ? 'selected-card' : ''}`);
      row.innerHTML = `<div class="row between"><div class="grow"><h3>${escapeHtml(song.name)}</h3><p class="sub">${song.bpm} BPM · ${song.events.length} 个动作 · ${escapeHtml(song.difficult || '未标记困难段')}</p></div><span class="badge">${song.id === state.selectedSongId ? 'ACTIVE' : 'SAVED'}</span></div><div class="row" style="margin-top:12px"><button class="button small chooseSong">设为当前</button><button class="button small editSong">编辑</button><button class="button small danger deleteSong">删除</button></div>`;
      $('.chooseSong', row).addEventListener('click', () => { state.selectedSongId = song.id; persist(); render(); toast('已切换当前曲目', 'safe'); });
      $('.editSong', row).addEventListener('click', () => openSongEditor(song));
      $('.deleteSong', row).addEventListener('click', () => deleteSong(song));
      root.append(row);
    });
  }

  function pagePerform(root) {
    const song = currentSong();
    root.append(pageHeader('实时演奏', 'PERFORMANCE WORKSPACE', '当前所有动作默认是模拟回执；连接控制器后仍应先做低力度单通道验证。'));
    const transport = el('section', 'card');
    transport.innerHTML = `<div class="row between"><div><h2>${escapeHtml(song.name)}</h2><p class="sub">${state.playing ? '正在播放本地时序' : '已暂停，队列可编辑'}</p></div><span class="badge orange" id="bpmBadge">${song.bpm} BPM</span></div><input id="performBpm" class="range" type="range" min="50" max="180" value="${song.bpm}"><div class="beats" id="beats"><i></i><i></i><i></i><i></i></div><div class="row"><button id="playButton" class="button primary">${state.playing ? 'Ⅱ 暂停' : '▶ 开始'}</button><button id="stopButton" class="button">停止</button><button id="performEStop" class="button danger">■ 急停</button></div>`;
    root.append(transport);
    $('#performBpm', transport).addEventListener('input', (event) => { song.bpm = Number(event.target.value); $('#bpmBadge', transport).textContent = `${song.bpm} BPM`; persist(); });
    $('#playButton', transport).addEventListener('click', togglePlay);
    $('#stopButton', transport).addEventListener('click', stopPlay);
    $('#performEStop', transport).addEventListener('click', requestEmergencyStop);

    const tabs = el('div', 'section-tabs');
    [['piano', '钢琴击键'], ['guitar', '吉他按弦'], ['pedal', '脚踏表达']].forEach(([key, title]) => {
      const button = el('button', `tab ${state.activeMode === key ? 'active' : ''}`, title);
      button.addEventListener('click', () => { state.activeMode = key; render(); });
      tabs.append(button);
    });
    root.append(tabs);
    if (state.activeMode === 'pedal') root.append(pedalPanel()); else root.append(actuatorPanel());

    const timeline = el('section', 'card');
    timeline.innerHTML = '<div class="row between"><div><h2>动作时间线</h2><p class="sub">编辑曲目即可改变这里的本地时序。</p></div><button class="button small" id="editTimeline">编辑</button></div>';
    const list = [...song.events].sort((a, b) => a.start - b.start);
    if (!list.length) timeline.append(empty('暂无动作事件。'));
    const body = el('div', 'timeline');
    list.forEach((event) => { const item = el('div', 'event-item'); item.innerHTML = `<b>${escapeHtml(event.label || event.type)}</b><br><small>${event.start} ms · CH${event.channel} · A${event.actuator} · ${event.velocity}% · ${event.duration} ms</small>`; body.append(item); });
    timeline.append(body); root.append(timeline);
    $('#editTimeline', timeline).addEventListener('click', () => openSongEditor(song));
  }

  function actuatorPanel() {
    const panel = el('section', 'card');
    const isPiano = state.activeMode === 'piano';
    panel.innerHTML = `<div class="row between"><div><h2>${isPiano ? '10 路毛毡锤头阵列' : '10 路吉他压弦阵列'}</h2><p class="sub">${isPiano ? '点击通道模拟低力度击键。' : '点击通道模拟硅胶压弦与回位。'}</p></div><span class="badge ${state.safetyLocked ? 'orange' : 'safe'}">${state.safetyLocked ? 'LOCKED' : 'READY'}</span></div>`;
    const grid = el('div', 'actuator-grid');
    for (let index = 1; index <= 10; index += 1) {
      const button = el('button', 'actuator', `A${index}`);
      button.innerHTML = `A${index}<span>${isPiano ? 'HAMMER' : 'FRET'}</span>`;
      button.addEventListener('click', () => manualActuate(index));
      grid.append(button);
    }
    panel.append(grid);
    const actions = el('div', 'row'); actions.style.marginTop = '14px';
    const test = el('button', 'button', '低力度测试'); test.addEventListener('click', () => manualActuate(1));
    const release = el('button', 'button', '释放全部执行器'); release.addEventListener('click', releaseAll);
    actions.append(test, release); panel.append(actions);
    return panel;
  }

  function pedalPanel() {
    const panel = el('section', 'card');
    panel.innerHTML = '<div class="row between"><div><h2>双踩脚踏表达</h2><p class="sub">拖动滑块模拟钢索位移到表达信号的映射。</p></div><span class="badge">EXPRESSION</span></div>';
    const input = document.createElement('input'); input.type = 'range'; input.min = '0'; input.max = '100'; input.value = '0'; input.className = 'range'; input.style.marginTop = '20px';
    const metric = el('div', 'metric-grid'); metric.innerHTML = '<div class="metric"><small>PEDAL A</small><b id="pedalValue">0%</b></div><div class="metric"><small>OUTPUT</small><b id="pedalVoltage">0.00V</b></div><div class="metric"><small>MODE</small><b>CONT</b></div>';
    input.addEventListener('input', () => { const value = Number(input.value); $('#pedalValue', metric).textContent = `${value}%`; $('#pedalVoltage', metric).textContent = `${(value * 3.3 / 100).toFixed(2)}V`; log('Pedal expression', `${value}% local simulation`, 'perform'); });
    panel.append(input, metric); return panel;
  }

  function pageCalibrate(root) {
    root.append(pageHeader('通道校准', 'MECHANICAL SETUP', '校准值是本机配置记录，不等同于真实执行器已经完成标定。测试前必须检查乐器接触面和限流供电。'));
    const safety = el('section', 'warning-banner', '校准动作只能以低力度、单通道、无人体接触、可随时急停为前提。'); root.append(safety);
    state.calibration.forEach((channel) => {
      const card = el('section', 'card');
      card.innerHTML = `<div class="row between"><div><h2>通道 ${channel.channel}</h2><p class="sub">${channel.tested ? '已执行本地模拟测试' : '尚未测试'} · ${channel.returnOk ? '回位状态记录：正常' : '回位待检查'}</p></div><button class="button small channelTest">测试</button></div><div class="form-grid" style="margin-top:12px"><div class="field"><label>目标行程 mm</label><input class="travelInput" type="number" min="0" max="6" step="0.1" value="${channel.travel}"></div><div class="field"><label>目标力度 N</label><input class="forceInput" type="number" min="0" max="25" step="0.5" value="${channel.force}"></div></div><div class="switch-row"><span>通道启用</span><button class="switch ${channel.enabled ? 'on' : ''}"><i></i></button></div>`;
      $('.travelInput', card).addEventListener('change', (event) => { channel.travel = Number(event.target.value); persist(); });
      $('.forceInput', card).addEventListener('change', (event) => { channel.force = Number(event.target.value); persist(); });
      $('.channelTest', card).addEventListener('click', () => testChannel(channel));
      $('.switch', card).addEventListener('click', (event) => { channel.enabled = !channel.enabled; event.currentTarget.classList.toggle('on', channel.enabled); persist(); });
      root.append(card);
    });
  }

  function pageSafety(root) {
    root.append(pageHeader('安全与审计', 'SAFETY INTERLOCK', '急停的结果必须可见：停止节拍器、清空模拟队列、记录事件，并要求人工复位。'));
    const card = el('section', 'card');
    card.innerHTML = `<div class="row between"><div><h2>${state.safetyLocked ? '安全锁定中' : '安全待命'}</h2><p class="sub">${state.safetyLocked ? '请完成机构、夹具、接触面和回位检查后复位。' : '输出动作仍需由操作员确认。'}</p></div><span class="status-dot ${state.safetyLocked ? '' : 'safe'}"></span></div><div class="row" style="margin-top:13px"><button id="safetyStop" class="button danger">■ 紧急停止</button><button id="safetyReset" class="button" ${state.safetyLocked ? '' : 'disabled'}>确认并复位</button></div>`;
    root.append(card); $('#safetyStop', card).addEventListener('click', requestEmergencyStop); $('#safetyReset', card).addEventListener('click', resetSafety);
    const policy = el('section', 'card'); policy.innerHTML = '<h2>强制检查项</h2><div class="list-row"><div class="grow"><b>接触面</b><small>毛毡、硅胶、EVA 无破损，无硬金属接触乐器。</small></div><span class="badge safe">CHECK</span></div><div class="list-row"><div class="grow"><b>供电与行程</b><small>限流供电、机械限位、单通道低力度测试均应先于整段演奏。</small></div><span class="badge orange">REVIEW</span></div><div class="list-row"><div class="grow"><b>断链与急停</b><small>通信超时、急停按钮与人工复位应在接入实体前单独演练。</small></div><span class="badge orange">REVIEW</span></div>'; root.append(policy);
    const logs = el('section', 'card'); logs.innerHTML = '<div class="row between"><h2>事件审计</h2><button id="clearLogs" class="button small ghost">清空日志</button></div>';
    if (!state.logs.length) logs.append(empty('暂无日志。'));
    state.logs.slice(0, 30).forEach((entry) => logs.append(logRow(entry))); root.append(logs);
    $('#clearLogs', logs).addEventListener('click', () => { state.logs = []; persist(); render(); });
  }

  function pageSettings(root) {
    root.append(pageHeader('设置与部署', 'DEVICE & DATA', '本页管理演示模式、串口连接、本地数据和手机安装。'));
    const device = el('section', 'card');
    device.innerHTML = `<div class="row between"><div><h2>设备连接</h2><p class="sub">${state.connected ? '已连接浏览器串口。' : '当前为本地演示模式。'}</p></div><span class="badge ${state.connected ? 'safe' : 'orange'}">${state.connected ? 'ONLINE' : 'DEMO'}</span></div><div class="row" style="margin-top:13px"><button id="connectButton" class="button primary">${state.connected ? '断开控制器' : '连接 Web Serial'}</button><button id="demoButton" class="button">保持演示模式</button></div>`;
    root.append(device); $('#connectButton', device).addEventListener('click', connectDevice); $('#demoButton', device).addEventListener('click', () => { disconnectDevice(); toast('已切回本地演示模式', 'safe'); });
    const preferences = el('section', 'card'); preferences.innerHTML = '<h2>本机偏好</h2>';
    [['autoRelease', '通信超时自动释放'], ['haptics', '触摸反馈（浏览器支持时）']].forEach(([key, label]) => { const row = el('div', 'switch-row'); row.innerHTML = `<span>${label}</span><button class="switch ${state.settings[key] ? 'on' : ''}"><i></i></button>`; $('.switch', row).addEventListener('click', (event) => { state.settings[key] = !state.settings[key]; event.currentTarget.classList.toggle('on', state.settings[key]); persist(); }); preferences.append(row); }); root.append(preferences);
    const data = el('section', 'card'); data.innerHTML = '<h2>数据导入导出</h2><p class="sub">导出的是曲目、校准记录和本地日志，不包含任何硬件密钥或真实设备凭据。</p><div class="row" style="margin-top:13px"><button id="exportData" class="button">导出 JSON</button><label class="button" for="importData">导入 JSON</label><input id="importData" type="file" accept="application/json" class="hidden"></div>'; root.append(data); $('#exportData', data).addEventListener('click', exportData); $('#importData', data).addEventListener('change', importData);
    const install = el('section', 'card'); install.innerHTML = '<h2>手机安装</h2><p class="sub">通过 HTTPS 或 localhost 打开后，可从浏览器菜单安装为主屏幕应用。Docker 部署将提供静态访问入口。</p><button id="installButton" class="button">检查安装条件</button>'; root.append(install); $('#installButton', install).addEventListener('click', () => toast('请使用 Chrome 或 Edge 的“安装应用 / 添加到主屏幕”。'));
  }

  function openSongEditor(song = null) {
    const isNew = !song;
    const draft = song ? structuredClone(song) : { id: crypto.randomUUID(), name: '新曲目', bpm: 100, difficult: '', notes: '', events: [] };
    const modal = el('div', 'modal-backdrop');
    const box = el('section', 'modal');
    box.innerHTML = `<h2>${isNew ? '新建曲目' : '编辑曲目'}</h2><p class="sub">请只编排需要辅助的动作；不要用全自动替代用户原本可以完成的表达。</p><div class="form-grid"><div class="field wide"><label>曲目名称</label><input id="songName" value="${escapeAttr(draft.name)}"></div><div class="field"><label>BPM</label><input id="songBpm" type="number" min="50" max="180" value="${draft.bpm}"></div><div class="field"><label>困难段落</label><input id="songDifficult" value="${escapeAttr(draft.difficult || '')}"></div><div class="field wide"><label>备注</label><textarea id="songNotes">${escapeHtml(draft.notes || '')}</textarea></div></div><div class="row between" style="margin-top:17px"><h3>动作事件</h3><button id="addEvent" class="button small">添加动作</button></div><div id="eventEditor" class="stack" style="margin-top:10px"></div><div class="modal-actions"><button id="cancelModal" class="button">取消</button>${isNew ? '' : '<button id="deleteModal" class="button danger">删除</button>'}<button id="saveSong" class="button primary">保存曲目</button></div>`;
    modal.append(box); $('#modalRoot').append(modal);
    const eventsRoot = $('#eventEditor', box);
    const renderEvents = () => {
      eventsRoot.innerHTML = '';
      if (!draft.events.length) eventsRoot.append(empty('暂无事件。可以添加一个辅助动作。'));
      draft.events.forEach((event, index) => {
        const row = el('section', 'card'); row.style.marginBottom = '0';
        row.innerHTML = `<div class="row between"><b>事件 ${index + 1}</b><button class="button small danger removeEvent">移除</button></div><div class="form-grid" style="margin-top:10px"><div class="field"><label>类型</label><select class="eventType"><option value="piano">钢琴</option><option value="guitar">吉他</option><option value="pedal">脚踏</option></select></div><div class="field"><label>通道</label><input class="eventChannel" type="number" min="1" max="3" value="${event.channel}"></div><div class="field"><label>执行器</label><input class="eventActuator" type="number" min="1" max="10" value="${event.actuator}"></div><div class="field"><label>力度 %</label><input class="eventVelocity" type="number" min="1" max="100" value="${event.velocity}"></div><div class="field"><label>开始 ms</label><input class="eventStart" type="number" min="0" value="${event.start}"></div><div class="field"><label>持续 ms</label><input class="eventDuration" type="number" min="20" value="${event.duration}"></div><div class="field wide"><label>标签</label><input class="eventLabel" value="${escapeAttr(event.label || '')}"></div></div>`;
        $('.eventType', row).value = event.type;
        $('.eventType', row).addEventListener('change', (e) => { event.type = e.target.value; });
        [['.eventChannel', 'channel'], ['.eventActuator', 'actuator'], ['.eventVelocity', 'velocity'], ['.eventStart', 'start'], ['.eventDuration', 'duration']].forEach(([selector, key]) => { $(selector, row).addEventListener('change', (e) => { event[key] = Number(e.target.value); }); });
        $('.eventLabel', row).addEventListener('input', (e) => { event.label = e.target.value; });
        $('.removeEvent', row).addEventListener('click', () => { draft.events.splice(index, 1); renderEvents(); });
        eventsRoot.append(row);
      });
    };
    renderEvents();
    $('#addEvent', box).addEventListener('click', () => { draft.events.push({ id: crypto.randomUUID(), type: 'piano', channel: 1, actuator: 1, velocity: 60, start: draft.events.length * 500, duration: 160, label: 'New action' }); renderEvents(); });
    $('#cancelModal', box).addEventListener('click', () => modal.remove());
    const deleteButton = $('#deleteModal', box); if (deleteButton) deleteButton.addEventListener('click', () => { modal.remove(); deleteSong(song); });
    $('#saveSong', box).addEventListener('click', () => {
      draft.name = $('#songName', box).value.trim() || 'Untitled'; draft.bpm = clamp(Number($('#songBpm', box).value), 50, 180); draft.difficult = $('#songDifficult', box).value.trim(); draft.notes = $('#songNotes', box).value.trim(); draft.events.sort((a, b) => a.start - b.start);
      const index = state.songs.findIndex((item) => item.id === draft.id); if (index >= 0) state.songs[index] = draft; else state.songs.push(draft); state.selectedSongId = draft.id; persist(); modal.remove(); log('Song saved', `${draft.name} / ${draft.events.length} events`, 'songs'); toast('曲目已保存', 'safe'); render();
    });
  }

  function deleteSong(song) {
    if (!song || state.songs.length <= 1) { toast('至少保留一首曲目。', 'error'); return; }
    confirmAction('确认删除当前曲目？', () => { state.songs = state.songs.filter((item) => item.id !== song.id); if (state.selectedSongId === song.id) state.selectedSongId = state.songs[0].id; persist(); log('Song deleted', song.name, 'songs'); render(); });
  }

  function manualActuate(channel) {
    if (state.safetyLocked) { toast('请先完成安全复位。', 'error'); return; }
    const calibration = state.calibration[channel - 1];
    if (!calibration || !calibration.enabled) { toast('该通道已禁用。', 'error'); return; }
    const mode = state.activeMode;
    const label = mode === 'piano' ? 'Piano hammer' : 'Guitar fret';
    log(label, `CH${channel} / ${calibration.force}N target / simulated`, 'perform');
    vibrate();
    const button = [...document.querySelectorAll('.actuator')][channel - 1]; if (button) { button.classList.add('on'); setTimeout(() => button.classList.remove('on'), 190); }
    toast(`通道 ${channel} 已完成低力度模拟动作`, 'safe');
  }

  function testChannel(channel) {
    if (state.safetyLocked) { toast('安全锁定中，不能测试。', 'error'); return; }
    if (!channel.enabled) { toast('请先启用该通道。', 'error'); return; }
    channel.tested = true; channel.returnOk = true; persist(); log('Calibration test', `CH${channel.channel} / ${channel.travel}mm / ${channel.force}N simulated`, 'calibrate'); toast(`通道 ${channel.channel} 测试记录已更新`, 'safe'); render();
  }

  function togglePlay() { if (state.playing) stopPlay(); else startPlay(); }
  function startPlay() {
    if (state.safetyLocked) { toast('安全锁定中，不能开始演奏。', 'error'); return; }
    state.playing = true; state.startedAt = performance.now(); state.beat = 0; log('Transport start', `${currentSong().name} local schedule`, 'perform'); tick(); render();
  }
  function stopPlay() { state.playing = false; clearTimeout(state.timer); state.timer = null; log('Transport stop', 'metronome stopped', 'perform'); render(); }
  function tick() {
    if (!state.playing) return;
    document.querySelectorAll('#beats i').forEach((node, index) => node.classList.toggle('on', index === state.beat));
    const song = currentSong();
    const elapsed = performance.now() - state.startedAt;
    song.events.filter((event) => elapsed >= event.start && elapsed < event.start + 80).forEach((event) => { log('Scheduled action', `${event.label || event.type} / CH${event.channel}`, 'perform'); });
    state.beat = (state.beat + 1) % 4;
    state.timer = setTimeout(tick, 60000 / song.bpm);
  }

  function requestEmergencyStop() { confirmAction('确认立即急停？所有本地输出队列将被清空。', emergencyStop, true); }
  function emergencyStop() { state.playing = false; clearTimeout(state.timer); state.timer = null; state.safetyLocked = true; log('E-STOP', 'all local outputs released and safety locked', 'safety'); persist(); vibrate([90, 50, 90]); toast('已急停：请检查机构并手动复位。', 'error'); render(); }
  function resetSafety() { state.safetyLocked = false; log('Safety reset', 'operator confirmed local reset', 'safety'); persist(); toast('安全互锁已复位', 'safe'); render(); }
  function releaseAll() { state.playing = false; clearTimeout(state.timer); log('Manual release', 'all local channels released', 'perform'); toast('已释放全部本地执行器', 'safe'); render(); }

  async function connectDevice() {
    if (state.connected) { disconnectDevice(); return; }
    if (!('serial' in navigator)) { toast('当前浏览器不支持 Web Serial。请使用 Chrome 或 Edge；现可继续使用演示模式。', 'error'); return; }
    try {
      const port = await navigator.serial.requestPort(); await port.open({ baudRate: 115200 }); state.serialPort = port; state.writer = port.writable.getWriter(); state.connected = true; log('Device connected', 'Web Serial 115200', 'settings'); toast('控制器已连接。仍请先做低力度测试。', 'safe'); render();
    } catch (error) { toast(`连接取消或失败：${error.message}`, 'error'); }
  }
  async function disconnectDevice() {
    try { if (state.writer) state.writer.releaseLock(); if (state.serialPort) await state.serialPort.close(); } catch (_) { /* no-op */ }
    state.serialPort = null; state.writer = null; state.connected = false; log('Device disconnected', 'back to demo mode', 'settings'); render();
  }

  function log(action, detail, category) {
    state.logs.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), action, detail, category }); state.logs = state.logs.slice(0, 300); persist();
  }
  function logRow(entry) { const row = el('div', 'list-row'); const date = new Date(entry.at); row.innerHTML = `<div class="grow"><b>${escapeHtml(entry.action)}</b><small>${escapeHtml(entry.detail)} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small></div><span class="badge">${escapeHtml(entry.category || 'system').toUpperCase()}</span>`; return row; }
  function nextEvent() { return [...currentSong().events].sort((a, b) => a.start - b.start)[0] || null; }
  function queuedEvents() { return currentSong().events || []; }
  function enabledChannels() { return state.calibration.filter((item) => item.enabled).length; }
  function empty(message) { const node = el('div', 'empty', message); return node; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
  function escapeAttr(value) { return escapeHtml(value); }
  function vibrate(pattern = 20) { if (state.settings.haptics && navigator.vibrate) navigator.vibrate(pattern); }

  function toast(message, type = '') { const node = el('div', `toast ${type}`, message); $('#toastRoot').append(node); setTimeout(() => node.remove(), 3200); }
  function confirmAction(message, action, danger = false) { const modal = el('div', 'modal-backdrop'); const box = el('section', 'modal'); box.innerHTML = `<h2>${danger ? '安全确认' : '确认操作'}</h2><p class="sub">${escapeHtml(message)}</p><div class="modal-actions"><button class="button" id="modalCancel">取消</button><button class="button ${danger ? 'danger' : 'primary'}" id="modalConfirm">确认</button></div>`; modal.append(box); $('#modalRoot').append(modal); $('#modalCancel', box).addEventListener('click', () => modal.remove()); $('#modalConfirm', box).addEventListener('click', () => { modal.remove(); action(); }); }

  function exportData() { const payload = { exportedAt: new Date().toISOString(), songs: state.songs, calibration: state.calibration, logs: state.logs, settings: state.settings }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'clampplay-mobile-data.json'; link.click(); URL.revokeObjectURL(url); log('Data export', 'local JSON exported', 'settings'); }
  function importData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(reader.result); if (!Array.isArray(data.songs) || !Array.isArray(data.calibration)) throw new Error('invalid format'); state.songs = data.songs; state.calibration = data.calibration; state.logs = Array.isArray(data.logs) ? data.logs : state.logs; state.settings = { ...state.settings, ...(data.settings || {}) }; state.selectedSongId = state.songs[0]?.id || null; persist(); toast('数据已导入', 'safe'); render(); } catch (_) { toast('导入失败：文件格式不正确。', 'error'); } }; reader.readAsText(file, 'utf-8'); }
  function registerServiceWorker() { if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {}); }

  boot();
})();
