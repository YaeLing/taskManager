const COLORS = {1:'#b8726a',2:'#b89460',3:'#6a9a78',4:'#7a88b8'};
const QNAMES = {1:'緊急 ＆ 重要',2:'緊急 ＆ 不重要',3:'不緊急 ＆ 重要',4:'不緊急 ＆ 不重要'};

/* ─── SHOEBILL SVG ─── */
const SHOEBILL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="55%"><stop offset="0%" stop-color="#7B9EAD"/><stop offset="100%" stop-color="#3D6070"/></radialGradient>
    <radialGradient id="head" cx="45%" cy="35%" r="60%"><stop offset="0%" stop-color="#8BAEBB"/><stop offset="100%" stop-color="#5A8899"/></radialGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#bg)"/>
  <!-- Body -->
  <ellipse cx="50" cy="72" rx="22" ry="20" fill="#5A8899"/>
  <!-- Neck -->
  <rect x="42" y="52" width="16" height="22" rx="8" fill="#6898A8"/>
  <!-- Head -->
  <circle cx="50" cy="38" r="20" fill="url(#head)"/>
  <!-- Crest feathers -->
  <ellipse cx="45" cy="19" rx="3" ry="7" fill="#4A7A8A" transform="rotate(-15 45 19)"/>
  <ellipse cx="50" cy="17" rx="3" ry="8" fill="#507D8D" transform="rotate(0 50 17)"/>
  <ellipse cx="55" cy="19" rx="3" ry="7" fill="#4A7A8A" transform="rotate(15 55 19)"/>
  <!-- Eyes — large, cute -->
  <circle cx="42" cy="35" r="6.5" fill="white"/>
  <circle cx="58" cy="35" r="6.5" fill="white"/>
  <circle cx="42" cy="35" r="4.5" fill="#1a2a34"/>
  <circle cx="58" cy="35" r="4.5" fill="#1a2a34"/>
  <circle cx="40.5" cy="33" r="1.8" fill="white"/>
  <circle cx="56.5" cy="33" r="1.8" fill="white"/>
  <!-- Beak — wide boat-shaped shoebill -->
  <path d="M28,45 Q50,62 72,45 Q64,56 50,58 Q36,56 28,45Z" fill="#C8A84A"/>
  <path d="M29,44 Q50,52 71,44 Q63,53 50,55 Q37,53 29,44Z" fill="#E0C060"/>
  <path d="M44,57 Q50,62 56,57" fill="none" stroke="#A88830" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Wing hints -->
  <ellipse cx="30" cy="75" rx="12" ry="17" fill="#4A7A88" transform="rotate(-12 30 75)"/>
  <ellipse cx="70" cy="75" rx="12" ry="17" fill="#4A7A88" transform="rotate(12 70 75)"/>
</svg>`;

const AVATARS = [
  {id:'shoebill', label:'鯨頭鸛'},
  {id:'🐧', label:'企鵝'},{id:'🦜', label:'鸚鵡'},{id:'🦢', label:'天鵝'},
  {id:'🦩', label:'紅鶴'},{id:'🌸', label:'花朵'},{id:'🌊', label:'海浪'},
  {id:'🍵', label:'茶杯'},{id:'🌙', label:'月亮'},{id:'🦋', label:'蝴蝶'},
];

function avHTML(av, size=22, avType=null){
  // Handle custom uploaded images
  if(avType === 'custom' || (av && av.startsWith('/avatars/'))){
    return `<img src="${av}" style="width:${size}px;height:${size}px;border-radius:${Math.round(size/4)}px;object-fit:cover;">`;
  }
  if(av==='shoebill') return SHOEBILL_SVG;
  return `<span style="font-size:${Math.round(size*.65)}px;line-height:1">${av}</span>`;
}

/* ─── PROFILE ─── */
let profile = null;
let selAv = 'shoebill';
let selAvType = 'emoji';  // 'emoji' or 'custom'
let customAvUrl = null;   // URL for custom uploaded avatar

function initTeamName(){
  const saved = localStorage.getItem('team_name') || 'My Team';
  document.getElementById('h-team-name').textContent = saved;
}

function editTeamName(){
  const current = document.getElementById('h-team-name').textContent;
  const next = prompt('團隊名稱', current);
  if(next === null) return;
  const val = next.trim() || 'My Team';
  document.getElementById('h-team-name').textContent = val;
  localStorage.setItem('team_name', val);
}

async function initProfile(){
  profile = JSON.parse(localStorage.getItem('user_profile')||'null');
  initTeamName();
  // 如果 localStorage 沒有 profile，嘗試從 server 用 IP 還原
  if(!profile){
    try {
      const res = await fetch('/api/users');
      const users = await res.json();
      const ip = await fetch('/api/ip').then(r=>r.json()).then(d=>d.ip).catch(()=>null);
      if(ip && users[ip]){
        profile = { name: users[ip].name, avatar: users[ip].avatar, avatar_type: users[ip].avatar_type || 'emoji' };
        localStorage.setItem('user_profile', JSON.stringify(profile));
      }
    } catch(e){}
  }
  await Promise.all([loadTasks(), loadChat(), loadPoints(), loadLeaves(), loadNotes()]);
  if(!profile){
    showSetup(false);
  } else {
    applyProfile();
    render();
  }
  // Open task drawer if URL contains a task id
  const urlTaskId = parseInt(location.pathname.replace('/',''));
  if(urlTaskId && tasks.find(t=>t.id===urlTaskId)) openDrawer(urlTaskId);
  // Handle browser back/forward
  window.addEventListener('popstate', e=>{
    if(e.state && e.state.taskId){ openDrawer(e.state.taskId); }
    else { document.getElementById('dov').classList.remove('open'); openTaskId=null; }
  });
}

let _nameCheckTimer = null;
async function onSetupNameInput(val){
  const hint = document.getElementById('setup-name-hint');
  clearTimeout(_nameCheckTimer);
  const name = val.trim();
  if(!name){ hint.textContent = ''; return; }
  _nameCheckTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/users');
      const users = await res.json();
      const match = Object.values(users).find(u => u.name === name);
      if(match){
        hint.textContent = '✓ 找到既有紀錄，已自動帶入頭像';
        selAvType = match.avatar_type || 'emoji';
        if(selAvType === 'custom'){
          customAvUrl = match.avatar;
          selAv = match.avatar;
        } else {
          selAv = match.avatar;
          customAvUrl = null;
        }
        buildAvGrid();
        resetUploadBtn();
        updateSetupPreview();
      } else {
        hint.textContent = '';
      }
    } catch(e){ hint.textContent = ''; }
  }, 400);
}

function showSetup(editing){
  if(editing && profile){
    selAv = profile.avatar;
    selAvType = profile.avatar_type || 'emoji';
    customAvUrl = profile.avatar_type === 'custom' ? profile.avatar : null;
  } else {
    selAv = 'shoebill';
    selAvType = 'emoji';
    customAvUrl = null;
  }
  buildAvGrid();
  resetUploadBtn();
  if(editing&&profile) document.getElementById('setup-name').value = profile.name;
  else document.getElementById('setup-name').value = '';
  document.getElementById('btn-setup-save').textContent = editing ? '更新資料' : '開始使用';
  updateSetupPreview();
  document.getElementById('setup-screen').style.display = 'flex';
  setTimeout(()=>document.getElementById('setup-name').focus(), 150);
}

function resetUploadBtn(){
  const btn = document.querySelector('.btn-upload-avatar');
  const txt = document.getElementById('upload-btn-text');
  btn.classList.remove('uploaded', 'uploading');
  txt.textContent = '選擇圖片上傳';
  if(selAvType === 'custom' && customAvUrl){
    btn.classList.add('uploaded');
    txt.textContent = '已上傳自訂頭像';
  }
}

async function handleAvatarUpload(e){
  const file = e.target.files[0];
  if(!file) return;

  const btn = document.querySelector('.btn-upload-avatar');
  const txt = document.getElementById('upload-btn-text');

  // Validate file size (max 2MB)
  if(file.size > 2 * 1024 * 1024){
    showToast('⚠️', '檔案太大', '請選擇 2MB 以下的圖片');
    return;
  }

  btn.classList.add('uploading');
  txt.textContent = '上傳中...';

  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const res = await fetch('/api/upload-avatar', {
      method: 'POST',
      body: formData
    });

    if(!res.ok) throw new Error('Upload failed');

    const data = await res.json();
    customAvUrl = data.url;
    selAvType = 'custom';
    selAv = customAvUrl;

    // Deselect emoji avatars
    document.querySelectorAll('.av-opt').forEach(el => el.classList.remove('sel'));

    btn.classList.remove('uploading');
    btn.classList.add('uploaded');
    txt.textContent = '已上傳：' + file.name.slice(0, 15) + (file.name.length > 15 ? '...' : '');

    updateSetupPreview();
    showToast('✅', '上傳成功', '已設定自訂頭像');
  } catch(err){
    btn.classList.remove('uploading');
    txt.textContent = '上傳失敗，請重試';
    showToast('❌', '上傳失敗', '請檢查網路連線後重試');
  }

  // Reset file input
  e.target.value = '';
}

function buildAvGrid(){
  const grid = document.getElementById('av-grid');
  grid.innerHTML = AVATARS.map(a=>`
    <div class="av-opt${a.id===selAv?' sel':''}" onclick="pickAv('${a.id}',this)" title="${a.label}">
      ${a.id==='shoebill'?`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="width:26px;height:26px">
        <circle cx="50" cy="50" r="48" fill="#4A7A8A"/>
        <ellipse cx="50" cy="72" rx="20" ry="18" fill="#5A8899"/>
        <circle cx="50" cy="38" r="20" fill="#7AABBB"/>
        <ellipse cx="50" cy="17" rx="3" ry="8" fill="#4A7A8A"/>
        <circle cx="42" cy="35" r="6" fill="white"/><circle cx="58" cy="35" r="6" fill="white"/>
        <circle cx="42" cy="35" r="4" fill="#1a2a34"/><circle cx="58" cy="35" r="4" fill="#1a2a34"/>
        <circle cx="40.5" cy="33" r="1.5" fill="white"/><circle cx="56.5" cy="33" r="1.5" fill="white"/>
        <path d="M29,44 Q50,58 71,44 Q63,54 50,56 Q37,54 29,44Z" fill="#E0C060"/>
      </svg>`:a.id}
    </div>`).join('');
}

function pickAv(av, el){
  selAv = av;
  selAvType = 'emoji';
  customAvUrl = null;
  document.querySelectorAll('.av-opt').forEach(e=>e.classList.remove('sel'));
  el.classList.add('sel');
  // Reset upload button
  const btn = document.querySelector('.btn-upload-avatar');
  const txt = document.getElementById('upload-btn-text');
  btn.classList.remove('uploaded');
  txt.textContent = '選擇圖片上傳';
  updateSetupPreview();
}

function updateSetupPreview(){
  const el = document.getElementById('setup-av-preview');
  if(selAvType === 'custom' && customAvUrl){
    el.innerHTML = `<img src="${customAvUrl}" alt="avatar">`;
    el.style.fontSize = '';
  } else if(selAv==='shoebill'){
    el.innerHTML = SHOEBILL_SVG;
    el.style.fontSize = '';
  } else {
    el.innerHTML = '';
    el.textContent = selAv;
    el.style.fontSize = '44px';
  }
}

async function saveProfile(){
  const name = (document.getElementById('setup-name').value.trim())||'使用者';
  profile = {
    name,
    avatar: selAvType === 'custom' ? customAvUrl : selAv,
    avatar_type: selAvType
  };
  localStorage.setItem('user_profile', JSON.stringify(profile));

  // Save to server
  try {
    await fetch('/api/users', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        id: myIP,
        name: profile.name,
        avatar: profile.avatar,
        avatar_type: profile.avatar_type
      })
    });
  } catch(e){ console.error('Failed to save profile:', e); }

  document.getElementById('setup-screen').style.display = 'none';
  applyProfile();
  render();
  loadNotes();
}

function applyProfile(){
  if(!profile) return;
  const avType = profile.avatar_type || 'emoji';
  // header avatar
  const hav = document.getElementById('h-user-av');
  hav.innerHTML = avHTML(profile.avatar, 26, avType);
  document.getElementById('h-user-name').textContent = profile.name;
  // logo icon
  const lav = document.getElementById('logo-av');
  lav.innerHTML = avHTML(profile.avatar, 28, avType);
  lav.style.fontSize = (avType === 'custom' || profile.avatar==='shoebill') ? '' : '16px';
  // favicon
  updateFavicon();
  // refresh drawer if open so comment avatars update immediately
  if(openTaskId!==null) renderDrawer(openTaskId);
}

function updateFavicon(){
  if(!profile) return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const avType = profile.avatar_type || 'emoji';

  if(avType === 'custom' && profile.avatar){
    // Custom image avatar
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>{
      ctx.drawImage(img, 0, 0, 64, 64);
      setFavicon(canvas.toDataURL());
    };
    img.onerror = ()=>{
      // Fallback to default
      ctx.fillStyle='#5a9490'; ctx.fillRect(0,0,64,64);
      ctx.font='32px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#fff';
      ctx.fillText('👤', 32, 36);
      setFavicon(canvas.toDataURL());
    };
    img.src = profile.avatar;
  } else if(profile.avatar==='shoebill'){
    const blob = new Blob([SHOEBILL_SVG],{type:'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = ()=>{ ctx.drawImage(img,0,0,64,64); URL.revokeObjectURL(url); setFavicon(canvas.toDataURL()); };
    img.src = url;
  } else {
    ctx.fillStyle='#06060f'; ctx.fillRect(0,0,64,64);
    ctx.font='42px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(profile.avatar, 32, 36);
    setFavicon(canvas.toDataURL());
  }
}

function setFavicon(url){
  let lnk=document.querySelector("link[rel~='icon']");
  if(!lnk){lnk=document.createElement('link');lnk.rel='icon';document.head.appendChild(lnk);}
  lnk.href=url;
}

/* ─── HANDLER ─── */
function toggleHandler(id,e){
  if(e)e.stopPropagation();
  if(!profile){showSetup(false);return;}
  const t=tasks.find(t=>t.id===id); if(!t)return;
  // 相容舊資料：將 handler 轉換為 handlers 陣列
  if(t.handler && !t.handlers){
    t.handlers = [t.handler];
    delete t.handler;
  }
  if(!t.handlers) t.handlers = [];
  const idx = t.handlers.findIndex(h=>h.name===profile.name);
  if(idx >= 0){
    logHistory('取消接手', t, `${profile.name} 取消處理中`);
    t.handlers.splice(idx, 1);
  } else {
    t.handlers.push({name:profile.name,avatar:profile.avatar,avatar_type:profile.avatar_type||'emoji'});
    logHistory('接手處理', t, `${profile.name} 標記處理中`);
  }
  save();render();
}

let tasks = [];
let chatMessages = [];
let selQ=1, editId=null, dragId=null, openTaskId=null, doneOpen=true, myIP='—';
let searchQuery = '';
let _saving = false;

fetch('/api/ip').then(r=>r.json()).then(d=>{myIP=d.ip;}).catch(()=>{});

/* ─── LEAVE SYSTEM ─── */
let leaveData = [];

async function loadLeaves(){
  try {
    const res = await fetch('/api/leaves');
    if(res.ok){
      leaveData = await res.json();
      renderLeaves();
      checkTodayLeaves();
    }
  } catch(e){}
}

function renderLeaves(){
  const el = document.getElementById('leave-list');
  if(!leaveData.length){
    el.innerHTML = '<div class="leave-empty">目前無人請假</div>';
    return;
  }
  const today = new Date().toISOString().slice(0,10);
  el.innerHTML = leaveData.map(l => {
    const end = l.endDate || l.date;
    const isToday = l.date <= today && today <= end;
    const isMine  = profile && l.name === profile.name;
    const fmtDate = d => d ? d.slice(5) : '';  // YYYY-MM-DD → MM-DD
    const isRange = end && end !== l.date;
    const dateLabel = isToday
      ? (isRange ? `今天（${fmtDate(l.date)} ~ ${fmtDate(end)}）` : '今天')
      : (isRange ? `${fmtDate(l.date)} ~ ${fmtDate(end)}` : fmtDate(l.date));
    return `<div class="leave-row${isToday?' leave-today':''}">
      <div class="leave-av">${avHTML(l.avatar, 20, l.avatar_type)}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:5px">
          <span class="leave-name">${esc(l.name)}</span>
          <span class="leave-date">${esc(dateLabel)}</span>
        </div>
        ${l.note ? `<div class="leave-note">${esc(l.note)}</div>` : ''}
      </div>
      ${isMine ? `<button class="leave-del" onclick="removeLeave('${l.date}')" title="取消請假">✕</button>` : ''}
    </div>`;
  }).join('');
}

let _todayLeaveShown = false;
function checkTodayLeaves(){
  if(_todayLeaveShown) return;
  const now = new Date();
  const today = now.toISOString().slice(0,10);
  const todayLeaves = leaveData.filter(l => l.date <= today && today <= (l.endDate || l.date));
  if(!todayLeaves.length) return;

  const nine = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  const msUntilNine = nine - now;

  if(msUntilNine > 0){
    // 還沒到 9 點，排程在 9:00 顯示
    setTimeout(() => {
      if(_todayLeaveShown) return;
      _todayLeaveShown = true;
      showLeaveAlert(todayLeaves);
    }, msUntilNine);
  } else {
    // 已過 9 點，立即顯示（延遲 1.5 秒讓頁面載入完）
    _todayLeaveShown = true;
    setTimeout(() => showLeaveAlert(todayLeaves), 1500);
  }
}

function showLeaveAlert(leaves){
  const overlay = document.createElement('div');
  overlay.className = 'leave-alert';
  const fmtD = d => d ? d.slice(5) : '';
  const peopleHTML = leaves.map(l => {
    const end = l.endDate || l.date;
    const dateRange = end !== l.date ? `${fmtD(l.date)} ~ ${fmtD(end)}` : fmtD(l.date);
    return `
    <div class="leave-alert-person">
      <div class="leave-alert-av">${avHTML(l.avatar, 32, l.avatar_type)}</div>
      <div>
        <div class="leave-alert-pname">${esc(l.name)}</div>
        <div class="leave-alert-note">${esc(dateRange)}</div>
        ${l.note ? `<div class="leave-alert-note">${esc(l.note)}</div>` : ''}
      </div>
    </div>`;
  }).join('');
  overlay.innerHTML = `
    <div class="leave-alert-card">
      <div class="leave-alert-emoji">🏖️</div>
      <div class="leave-alert-title">今天有人請假</div>
      <div class="leave-alert-people">${peopleHTML}</div>
      <div class="leave-alert-dismiss">點擊任意處關閉</div>
    </div>`;
  overlay.onclick = () => {
    overlay.classList.add('out');
    setTimeout(()=>overlay.remove(), 500);
  };
  document.body.appendChild(overlay);
  // 播放溫和提示音
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [440, 554, 659].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq; osc.type = 'sine';
      const t = ctx.currentTime + i * .18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(.25, t + .05);
      gain.gain.exponentialRampToValueAtTime(.01, t + .4);
      osc.start(t); osc.stop(t + .4);
    });
  } catch(e){}
}

function openLeaveModal(){
  if(!profile){ showSetup(false); return; }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0,10);
  const todayStr = new Date().toISOString().slice(0,10);
  const startEl = document.getElementById('leave-date-input');
  const endEl   = document.getElementById('leave-end-input');
  startEl.value = tomorrowStr;
  startEl.min   = todayStr;
  endEl.value   = '';
  endEl.min     = tomorrowStr;
  document.getElementById('leave-note-input').value = '';
  document.getElementById('leave-ov').style.display = 'flex';
}

function syncLeaveEndMin(){
  const startVal = document.getElementById('leave-date-input').value;
  const endEl    = document.getElementById('leave-end-input');
  endEl.min = startVal;
  if(endEl.value && endEl.value < startVal) endEl.value = '';
}

function closeLeaveModal(){
  document.getElementById('leave-ov').style.display = 'none';
}

async function submitLeave(){
  if(!profile) return;
  const dateVal = document.getElementById('leave-date-input').value;
  const endVal  = document.getElementById('leave-end-input').value;
  const note    = document.getElementById('leave-note-input').value.trim();
  if(!dateVal) return;
  try {
    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'add', name: profile.name,
        avatar: profile.avatar, avatar_type: profile.avatar_type || 'emoji',
        date: dateVal, endDate: endVal || dateVal, note
      })
    });
    const data = await res.json();
    if(data.ok){
      leaveData = data.leaves;
      renderLeaves();
      closeLeaveModal();
    }
  } catch(e){}
}

async function removeLeave(date){
  if(!profile) return;
  try {
    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ action: 'remove', name: profile.name, date })
    });
    const data = await res.json();
    if(data.ok){ leaveData = data.leaves; renderLeaves(); }
  } catch(e){}
}

/* ─── ROCKETS / POINTS ─── */
let pointsData = { rockets: {}, votes: {}, week: '' };
let selectedVoteTaskId = null;

async function loadPoints(){
  try {
    const res = await fetch('/api/points');
    if(res.ok){
      pointsData = await res.json();
      renderRockets();
      updateVoteBtn();
    }
  } catch(e){}
}

function renderRockets(){
  const el = document.getElementById('rockets-list');
  const rockets = pointsData.rockets || {};
  const entries = Object.entries(rockets).sort((a,b) => b[1] - a[1]);
  if(!entries.length){
    el.innerHTML = '<div class="rockets-empty">完成任務並獲得隊友投票後顯示</div>';
    return;
  }
  const max = entries[0][1] || 1;
  // 取得用戶頭像資訊
  el.innerHTML = entries.map(([name, count]) => {
    const pct = Math.round((count / max) * 100);
    // 嘗試從 tasks 中找到此用戶的頭像
    let avatarHTML = `<span style="font-size:11px">👤</span>`;
    for(const t of tasks){
      const h = (t.handlers||[]).find(h=>h.name===name) || (t.createdBy?.name===name ? t.createdBy : null);
      if(h){ avatarHTML = avHTML(h.avatar, 22, h.avatar_type); break; }
    }
    return `<div class="rocket-row">
      <div class="rocket-av">${avatarHTML}</div>
      <span class="rocket-name" title="${esc(name)}">${esc(name)}</span>
      <div class="rocket-bar-wrap"><div class="rocket-bar" style="width:${pct}%"></div></div>
      <span class="rocket-count">🚀${count}</span>
    </div>`;
  }).join('');
}

function updateVoteBtn(){
  const btn = document.getElementById('vote-btn');
  if(!btn) return;
  const week = pointsData.week || '';
  const votes = (pointsData.votes || {})[week] || {};
  const alreadyVoted = profile && votes[profile.name];
  if(alreadyVoted){
    btn.textContent = `已投給 ${votes[profile.name].votedFor}`;
    btn.classList.add('voted');
  } else {
    btn.textContent = '投票';
    btn.classList.remove('voted');
  }
}

function openVoteModal(){
  const week = pointsData.week || '';
  const votes = (pointsData.votes || {})[week] || {};
  if(profile && votes[profile.name]) return; // 已投票

  // 取得本週完成的任務（有 handlers 的）
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay() || 7;
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - dayOfWeek + 1);

  const eligible = tasks.filter(t => {
    if(!t.done) return false;
    // doneAt 沒有時用 id 當時間戳（id 是 Date.now()）
    const doneDate = t.doneAt ? new Date(t.doneAt) : new Date(t.id);
    return doneDate >= thisWeekStart;
  });

  const listEl = document.getElementById('vote-task-list');
  selectedVoteTaskId = null;

  if(!eligible.length){
    listEl.innerHTML = '<div class="vote-no-tasks">本週尚無已完成任務</div>';
  } else {
    listEl.innerHTML = eligible.map(t => {
      const handlers = t.handlers || (t.handler ? [t.handler] : []);
      // 沒有 handlers 時顯示建立者
      const recipients = handlers.length
        ? handlers
        : (t.createdBy ? [t.createdBy] : []);
      const recipientLabel = recipients.length ? '接手：' : '（無人認領）';
      const handlersHTML = recipients.map(h =>
        `<span class="vote-handler-chip"><span class="vote-handler-av">${avHTML(h.avatar,14,h.avatar_type)}</span>${esc(h.name)}</span>`
      ).join('');
      const noRecipient = !recipients.length;
      return `<div class="vote-task-item${noRecipient?' disabled':''}" id="vt-${t.id}" onclick="${noRecipient?'':` selectVoteTask(${t.id})`}" style="${noRecipient?'opacity:.4;cursor:default':''}">
        <div class="vote-task-qdot" style="background:${COLORS[t.q]}"></div>
        <div class="vote-task-body">
          <div class="vote-task-text">${esc(t.text)}</div>
          <div class="vote-task-handlers">
            ${recipients.length ? `<span style="font-size:.62rem;color:var(--dim);margin-right:2px">${handlers.length?'接手：':'建立：'}</span>${handlersHTML}` : '<span style="font-size:.62rem;color:var(--dim)">無可投票對象</span>'}
          </div>
        </div>
      </div>`;
    }).join('');
    listEl.innerHTML += `<button class="vote-confirm-btn" id="vote-confirm-btn" onclick="submitVote()" disabled>選擇任務後確認投票</button>`;
  }

  document.getElementById('vote-ov').style.display = 'flex';
}

function selectVoteTask(taskId){
  selectedVoteTaskId = taskId;
  document.querySelectorAll('.vote-task-item').forEach(el => el.classList.remove('selected'));
  const item = document.getElementById(`vt-${taskId}`);
  if(item) item.classList.add('selected');
  const btn = document.getElementById('vote-confirm-btn');
  if(btn){ btn.disabled = false; btn.textContent = '確認投票 🚀'; }
}

async function submitVote(){
  if(!selectedVoteTaskId || !profile) return;
  const t = tasks.find(t => t.id === selectedVoteTaskId);
  if(!t) return;
  const handlers = t.handlers || (t.handler ? [t.handler] : []);
  const recipients = handlers.length ? handlers : (t.createdBy ? [t.createdBy] : []);
  if(!recipients.length) return;

  const votedFor = recipients[0].name;

  try {
    const res = await fetch('/api/points/vote', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        voter: profile.name,
        votedFor,
        taskId: t.id,
        taskText: t.text
      })
    });
    const data = await res.json();
    if(data.ok){
      pointsData.rockets = data.rockets;
      if(!pointsData.votes[pointsData.week]) pointsData.votes[pointsData.week] = {};
      pointsData.votes[pointsData.week][profile.name] = { votedFor, taskId: t.id, taskText: t.text };
      renderRockets();
      updateVoteBtn();
      closeVoteModal();
      showNotif({ type:'task', name:'投票成功', avatar:'🚀', avatar_type:'emoji', action:'', text:`已將 🚀 送給 ${votedFor}` });
    }
  } catch(e){}
}

function closeVoteModal(){
  document.getElementById('vote-ov').style.display = 'none';
  selectedVoteTaskId = null;
}

/* ─── CHAT BOARD ─── */
async function loadChat(){
  try {
    const res = await fetch('/api/chat');
    if(res.ok){
      chatMessages = await res.json();
      renderChat();
    }
  } catch(e){ console.error('Failed to load chat:', e); }
}

function renderChat(){
  const el = document.getElementById('chat-list');
  const countEl = document.getElementById('chat-count');
  if(countEl) countEl.textContent = chatMessages.length;

  if(!chatMessages.length){
    el.innerHTML = '<div class="chat-empty">還沒有留言<br><span style="font-size:.65rem;opacity:.7">發送第一則訊息開始討論</span></div>';
    return;
  }

  el.innerHTML = chatMessages.map(m => {
    const isMine = profile && m.name === profile.name;
    return `<div class="chat-msg${isMine?' mine':''}">
      <div class="chat-msg-av">${m.avatar ? avHTML(m.avatar, 28, m.avatar_type) : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'}</div>
      <div class="chat-msg-body">
        <div class="chat-msg-meta">
          <span class="chat-msg-name">${esc(m.name || m.ip)}</span>
          <span class="chat-msg-time">${esc(m.time)}</span>
        </div>
        <div class="chat-msg-text">${esc(m.text)}</div>
      </div>
    </div>`;
  }).join('');

  el.scrollTop = el.scrollHeight;
}

async function sendChatMsg(){
  const inp = document.getElementById('chat-input');
  const text = inp.value.trim();
  if(!text) return;
  if(!profile){ showSetup(false); return; }

  const msg = {
    id: Date.now(),
    text,
    ip: myIP,
    time: ts(),
    name: profile.name,
    avatar: profile.avatar,
    avatar_type: profile.avatar_type || 'emoji'
  };

  chatMessages.push(msg);
  renderChat();
  inp.value = '';
  inp.focus();

  try {
    await fetch('/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({message: msg})
    });
  } catch(e){ console.error('Failed to send chat:', e); }
}

// Load tasks from server
async function loadTasks(){
  try {
    const res = await fetch('/api/tasks');
    if(res.ok){
      tasks = await res.json();
      render();
    }
    _loadWeeklyRecordIds();
  } catch(e){ console.error('Failed to load tasks:', e); }
}

// Save tasks to server (with debounce)
let _saveTimer = null;
function save(){
  // Save to localStorage as fallback
  localStorage.setItem('tasks_v4', JSON.stringify(tasks));
  if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async ()=>{
    if(_saving) return;
    _saving = true;
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({tasks})
      });
    } catch(e){ console.error('Failed to save tasks:', e); }
    _saving = false;
  }, 100);
}

function ts(){
  const d=new Date(), p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function today(){
  const d=new Date(), p=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
}

function dueBadge(due){
  if(!due) return '';
  const diff=Math.round((new Date(due)-new Date(today()))/86400000);
  let cls,lbl;
  if(diff<0)      {cls='overdue';lbl=`逾期${-diff}天`;}
  else if(diff===0){cls='today';  lbl='今天截止';}
  else if(diff<=3) {cls='soon';   lbl=`${diff}天後`;}
  else             {cls='normal'; lbl=due;}
  return `<span class="due-badge ${cls}">⏱ ${lbl}</span>`;
}
function isOverdue(due){ return !!due && Math.round((new Date(due)-new Date(today()))/86400000)<0; }

/* ─── RENDER ─── */
function render(){
  const active=tasks.filter(t=>!t.done && taskMatchesSearch(t));
  const done=tasks.filter(t=>t.done && taskMatchesSearch(t));
  const allActive=tasks.filter(t=>!t.done);
  document.getElementById('s-all').textContent=tasks.length;
  document.getElementById('s-done').textContent=tasks.filter(t=>t.done).length;
  document.getElementById('s-left').textContent=allActive.length;

  // Quadrants (matrix may be absent if replaced by notes board)
  [1,2,3,4].forEach(q=>{
    const list=active.filter(t=>t.q===q);
    const badge=document.getElementById('b'+q);
    if(badge) badge.textContent=list.length;
    const el=document.getElementById('t'+q);
    if(!el) return;
    if(!list.length){
      el.innerHTML=searchQuery
        ? `<div class="search-no-result"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>無符合結果</div>`
        : `<div class="q-empty">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        點此新增任務
      </div>`;
      return;
    }
    el.innerHTML=list.map((t,i)=>{
      const cc=(t.comments||[]).length;
      const ov=isOverdue(t.due);
      const handlers = t.handlers || (t.handler ? [t.handler] : []);
      const isHandling = handlers.length > 0;
      const isMine = profile && handlers.some(h=>h.name===profile.name);
      const handlersHTML = isHandling ? `<span class="handler-tag"><span class="handlers-stack">${handlers.slice(0,3).map(h=>`<span class="handler-av">${avHTML(h.avatar,13,h.avatar_type)}</span>`).join('')}</span>${handlers.length>3?`<span class="handlers-more">+${handlers.length-3}</span>`:''}${handlers.length===1?esc(handlers[0].name):handlers.length+'人'} 處理中</span>` : '';
      return `<div class="task-card${ov?' overdue':''}${isHandling?' handling':''}" draggable="true"
        ondragstart="onDragStart(event,${t.id})" ondragend="onDragEnd(event)"
        style="--c:${COLORS[q]}">
        <span class="task-num">${i+1}.</span>
        <div class="task-check ${t.done?'checked':''}" style="--c:${COLORS[q]}" onclick="toggleDone(${t.id},event)">
          <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <div class="task-body">
          <div class="task-text" onclick="openDrawer(${t.id})">${hlText(t.text)}</div>
          ${t.desc?`<div class="task-desc">${hlText(t.desc)}</div>`:''}
          <div class="task-footer">
            ${dueBadge(t.due)}
            ${(t.tags&&t.tags.length)?t.tags.map(g=>`<span class="task-tag">${esc(g)}</span>`).join(''):''}
            ${handlersHTML}
            ${t.createdBy?`<span class="creator-tag" title="由 ${esc(t.createdBy.name)} 建立"><span class="handler-av">${avHTML(t.createdBy.avatar,13,t.createdBy.avatar_type)}</span></span>`:''}
            <span class="comment-count ${cc?'has':''}" onclick="openDrawer(${t.id})" style="--c:${COLORS[q]}">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ${cc}
            </span>
          </div>
        </div>
        <div class="task-actions">
          <button class="hb${isMine?' on':''}" onclick="toggleHandler(${t.id},event)" title="${isMine?'取消處理中':'加入處理'}">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <button class="eb" onclick="openModal(${t.id})" title="編輯">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="db" onclick="delTask(${t.id},event)">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>`;
    }).join('');
  });

  renderSugPanel(active);

  // Completed - 按時間分組 (elements may not exist if matrix is removed)
  const doneBadge=document.getElementById('done-badge');
  if(doneBadge) doneBadge.textContent=done.length;
  const dl=document.getElementById('done-list');
  if(!dl) return;
  if(!done.length){
    dl.innerHTML=searchQuery
      ? '<div style="display:flex;align-items:center;color:var(--dim);font-size:.72rem;opacity:.4;padding:0 4px">無符合結果</div>'
      : '<div style="display:flex;align-items:center;color:var(--dim);font-size:.72rem;opacity:.4;padding:0 4px">尚無完成任務</div>';
  } else {
    // 計算本週和上週的起始日期
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay() || 7; // 週日為 7
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - dayOfWeek + 1); // 本週一
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7); // 上週一

    // 分組並排序
    const thisWeek = [], lastWeek = [], older = [];
    done.forEach(t => {
      const doneDate = t.doneAt ? new Date(t.doneAt) : new Date(t.id); // 沒有 doneAt 就用 id 當時間
      if(doneDate >= thisWeekStart) thisWeek.push(t);
      else if(doneDate >= lastWeekStart) lastWeek.push(t);
      else older.push(t);
    });

    // 每組內按完成時間排序（新的在前）
    const sortByDone = (a, b) => {
      const aTime = a.doneAt ? new Date(a.doneAt).getTime() : a.id;
      const bTime = b.doneAt ? new Date(b.doneAt).getTime() : b.id;
      return bTime - aTime;
    };
    thisWeek.sort(sortByDone);
    lastWeek.sort(sortByDone);
    older.sort(sortByDone);

    const renderDoneCard = (t, i) => {
      const cc=(t.comments||[]).length;
      const handlers = t.handlers || (t.handler ? [t.handler] : []);
      const handlersHTML = handlers.length > 0
        ? `<span class="handlers-stack" style="margin-left:4px" title="${handlers.map(h=>esc(h.name)).join(', ')}">${handlers.slice(0,3).map(h=>`<span class="handler-av">${avHTML(h.avatar,13,h.avatar_type)}</span>`).join('')}${handlers.length>3?`<span class="handlers-more">+${handlers.length-3}</span>`:''}</span>`
        : '';
      const doneDate = t.doneAt ? t.doneAt.slice(0,10) : '';
      return `<div class="done-card" draggable="true"
        ondragstart="onDragStart(event,${t.id})" ondragend="onDragEnd(event)">
        <div class="done-card-top" onclick="openDrawer(${t.id})" style="cursor:pointer">
          <span class="done-num">${i+1}.</span>
          <div class="done-qdot" style="background:${COLORS[t.q]}"></div>
          <span class="done-text">${hlText(t.text)}</span>
          ${handlersHTML}
          ${doneDate ? `<span class="done-date">${doneDate}</span>` : ''}
        </div>
        <div class="done-card-bot">
          <button class="done-btn" onclick="toggleDone(${t.id},event)">↩ 恢復</button>
          <span class="done-btn" style="cursor:pointer" onclick="openDrawer(${t.id})">💬 ${cc}</span>
          ${_weeklyRecordIds.has(t.id) ? `<button class="done-ppt-tag" onclick="editWeeklyRecord(${t.id},event)">▶ 週報</button>` : ''}
          <button class="done-del" onclick="delTask(${t.id},event)">✕</button>
        </div>
      </div>`;
    };

    let html = '';
    let idx = 0;
    if(thisWeek.length){
      html += `<div class="done-group-label">本週完成 (${thisWeek.length})</div>`;
      html += thisWeek.map(t => renderDoneCard(t, ++idx)).join('');
    }
    if(lastWeek.length){
      html += `<div class="done-group-label">上週完成 (${lastWeek.length})</div>`;
      html += lastWeek.map(t => renderDoneCard(t, ++idx)).join('');
    }
    if(older.length){
      html += `<div class="done-group-label">更早之前 (${older.length})</div>`;
      html += older.map(t => renderDoneCard(t, ++idx)).join('');
    }
    dl.innerHTML = html;
  }

  if(openTaskId!==null) renderDrawer(openTaskId);
}

let sugFilterTags = new Set();
let _filterTagList = [];

function getAllTags(){
  const set = new Set();
  tasks.forEach(t => (t.tags||[]).forEach(g => set.add(g)));
  return [...set].sort();
}

function renderTagFilters(){
  const el = document.getElementById('sug-tag-filters');
  if(!el) return;
  _filterTagList = getAllTags();
  [...sugFilterTags].forEach(g => { if(!_filterTagList.includes(g)) sugFilterTags.delete(g); });
  if(!_filterTagList.length){ el.innerHTML=''; return; }
  el.innerHTML = _filterTagList.map((g,i) =>
    `<button class="sug-filter-tag${sugFilterTags.has(g)?' active':''}" onclick="toggleSugFilterTag(${i})">${esc(g)}</button>`
  ).join('');
}

function toggleSugFilterTag(i){
  const tag = _filterTagList[i]; if(!tag) return;
  if(sugFilterTags.has(tag)) sugFilterTags.delete(tag);
  else sugFilterTags.add(tag);
  renderTagFilters();
  renderSugPanel(tasks.filter(t=>!t.done));
}

function renderSugPanel(active){
  renderTagFilters();
  const sorted=[...active].sort((a,b)=>{
    const aOv=isOverdue(a.due), bOv=isOverdue(b.due);
    if(aOv!==bOv) return aOv?-1:1;
    if(a.q!==b.q) return a.q-b.q;
    if(a.due&&b.due) return a.due.localeCompare(b.due);
    if(a.due) return -1; if(b.due) return 1; return 0;
  });
  const display = sugFilterTags.size ? sorted.filter(t=>(t.tags||[]).some(g=>sugFilterTags.has(g))) : sorted;
  document.getElementById('sug-count').textContent=sorted.length;
  const sl=document.getElementById('sug-list');
  if(!display.length){
    sl.innerHTML=searchQuery
      ? `<div class="sug-empty" style="opacity:.6"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="margin-bottom:6px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><br>無符合結果</div>`
      : '<div class="sug-empty">🎉 目前沒有待辦任務<br><span style="font-size:.65rem;opacity:.7">新增任務開始排程</span></div>';
  } else {
    sl.innerHTML=display.map((t,i)=>{
      const handlers = t.handlers || (t.handler ? [t.handler] : []);
      const isMine = profile && handlers.some(h=>h.name===profile.name);
      const handlersAvatars = handlers.length > 0
        ? `<div class="sug-handlers-stack" title="${handlers.map(h=>esc(h.name)).join(', ')} 處理中">${handlers.slice(0,3).map(h=>`<div class="sug-handler-avatar">${avHTML(h.avatar,32,h.avatar_type)}</div>`).join('')}</div>${handlers.length>3?`<span class="handlers-more" style="margin-left:4px">+${handlers.length-3}</span>`:''}`
        : `<div class="sug-handler-empty" title="尚未認領"></div>`;
      const tagBadges = (t.tags||[]).map(g=>`<span class="sug-tag" style="background:rgba(90,148,144,.1);color:var(--acc);border-color:rgba(90,148,144,.3)">${esc(g)}</span>`).join('');
      return `<div class="sug-item" onclick="openDrawer(${t.id})" style="--ic:${COLORS[t.q]}">
        <span class="sug-rank">${i+1}</span>
        <div class="sug-body">
          <div class="sug-text">${hlText(t.text)}</div>
          <div class="sug-tags">
            <span class="sug-tag sug-qbadge" style="background:${COLORS[t.q]}18;color:${COLORS[t.q]};border-color:${COLORS[t.q]}40">${QNAMES[t.q]}</span>
            ${isOverdue(t.due)?`<span class="sug-tag" style="background:rgba(184,114,106,.12);color:var(--q1);border-color:var(--q1gl)">⚠ 逾期</span>`:t.due?`<span class="sug-tag sug-duebadge" style="background:var(--s2);color:var(--dim);border-color:var(--border2)">📅 ${t.due}</span>`:''}
            ${tagBadges}
          </div>
        </div>
        <div class="sug-right">
          ${handlersAvatars}
          <button class="sug-handle-btn${isMine?' on':''}" onclick="toggleHandler(${t.id},event)" title="${isMine?'取消處理中':'接手'}">${isMine?'處理中':'接手'}</button>
          <button class="sug-done-btn" onclick="toggleDone(${t.id},event)" title="標記完成">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      </div>`;
    }).join('');
  }
}

/* ─── TAGS (modal) ─── */
let editTags = [];
let _tagSugs = [];

function renderTagChips(){
  const el = document.getElementById('itag-chips');
  if(!el) return;
  el.innerHTML = editTags.map((g,i) =>
    `<span class="tag-chip">${esc(g)}<button class="tag-chip-del" type="button" onclick="removeEditTag(${i})">×</button></span>`
  ).join('');
}

function removeEditTag(i){
  editTags.splice(i,1);
  renderTagChips();
  renderTagSuggestions();
}

function renderTagSuggestions(){
  const input = document.getElementById('itag-input');
  if(!input) return;
  const val = input.value.trim();
  const valLow = val.toLowerCase();
  const el = document.getElementById('itag-suggestions');
  const existing = getAllTags().filter(g => !editTags.includes(g) && (val===''||g.toLowerCase().includes(valLow)));
  const canNew = val && !getAllTags().map(g=>g.toLowerCase()).includes(valLow) && !editTags.map(g=>g.toLowerCase()).includes(valLow);
  _tagSugs = existing;
  if(!existing.length && !canNew){ el.style.display='none'; return; }
  el.style.display='';
  el.innerHTML = existing.map((g,i)=>`<div class="tag-sug-item" onclick="applyTagSug(${i})">${esc(g)}</div>`).join('')
    + (canNew ? `<div class="tag-sug-item tag-sug-new" onclick="addNewTag()">+ 新增「${esc(val)}」</div>` : '');
}

function applyTagSug(i){
  const tag = _tagSugs[i]; if(!tag) return;
  editTags.push(tag);
  document.getElementById('itag-input').value='';
  document.getElementById('itag-suggestions').style.display='none';
  renderTagChips();
}

function addNewTag(){
  const val = document.getElementById('itag-input').value.trim();
  if(!val || editTags.includes(val)) return;
  editTags.push(val);
  document.getElementById('itag-input').value='';
  document.getElementById('itag-suggestions').style.display='none';
  renderTagChips();
}

function handleTagKey(e){
  if(e.key==='Enter'){
    e.preventDefault();
    const val = document.getElementById('itag-input').value.trim();
    if(val){
      if(!editTags.includes(val)) editTags.push(val);
      document.getElementById('itag-input').value='';
      document.getElementById('itag-suggestions').style.display='none';
      renderTagChips();
    }
  } else if(e.key==='Escape'){
    document.getElementById('itag-suggestions').style.display='none';
  }
}

document.addEventListener('click', function(e){
  if(!e.target.closest('#tag-field')){
    const el = document.getElementById('itag-suggestions');
    if(el) el.style.display='none';
  }
});

function renderDonePanel(done){
  document.getElementById('done-badge').textContent=done.length;
  const dl=document.getElementById('done-list');
  if(!done.length){
    dl.innerHTML='<div style="display:flex;align-items:center;color:var(--dim);font-size:.72rem;opacity:.4;padding:0 4px">尚無完成任務</div>';
    return;
  }
  const now=new Date(), today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const dayOfWeek=today.getDay()||7;
  const thisWeekStart=new Date(today); thisWeekStart.setDate(today.getDate()-dayOfWeek+1);
  const lastWeekStart=new Date(thisWeekStart); lastWeekStart.setDate(thisWeekStart.getDate()-7);
  const thisWeek=[],lastWeek=[],older=[];
  done.forEach(t=>{
    const d=t.doneAt?new Date(t.doneAt):new Date(t.id);
    if(d>=thisWeekStart) thisWeek.push(t);
    else if(d>=lastWeekStart) lastWeek.push(t);
    else older.push(t);
  });
  const sortByDone=(a,b)=>(a.doneAt?new Date(a.doneAt).getTime():a.id)>(b.doneAt?new Date(b.doneAt).getTime():b.id)?-1:1;
  [thisWeek,lastWeek,older].forEach(g=>g.sort(sortByDone));
  const renderCard=(t,i)=>{
    const cc=(t.comments||[]).length;
    const doneDate=t.doneAt?t.doneAt.slice(0,10):'';
    return `<div class="done-card">
      <div class="done-card-top">
        <span class="done-num">${i}.</span>
        <div class="done-qdot" style="background:${COLORS[t.q]||COLORS[1]}"></div>
        <span class="done-text">${esc(t.text)}</span>
        ${doneDate?`<span class="done-date">${doneDate}</span>`:''}
      </div>
      <div class="done-card-bot">
        <button class="done-btn" onclick="toggleDone(${t.id},event)">↩ 恢復</button>
        <button class="done-del" onclick="delTask(${t.id},event)">✕</button>
      </div>
    </div>`;
  };
  let html='',idx=0;
  if(thisWeek.length){ html+=`<div class="done-group-label">本週完成 (${thisWeek.length})</div>`; html+=thisWeek.map(t=>renderCard(t,++idx)).join(''); }
  if(lastWeek.length){ html+=`<div class="done-group-label">上週完成 (${lastWeek.length})</div>`; html+=lastWeek.map(t=>renderCard(t,++idx)).join(''); }
  if(older.length){ html+=`<div class="done-group-label">更早之前 (${older.length})</div>`; html+=older.map(t=>renderCard(t,++idx)).join(''); }
  dl.innerHTML=html;
}

/* ─── CRUD ─── */
function toggleDone(id,e){
  if(e)e.stopPropagation();
  const t=tasks.find(t=>t.id===id); if(!t) return;
  if(!t.done){
    t.done=true;
    t.doneAt = new Date().toISOString();
    if(profile && (!t.handlers || !t.handlers.length) && !t.handler){
      t.handlers = [{name:profile.name, avatar:profile.avatar, avatar_type:profile.avatar_type||'emoji'}];
      logHistory('接手處理', t, `${profile.name} 標記處理中`);
    }
    save(); render();
    logHistory('標記完成', t, '移至已完成');
    _showWeeklyConfirm(id);
  } else {
    delete t.doneAt;
    t.done=false;
    save(); render();
    logHistory('恢復任務', t, '從已完成恢復');
  }
}
function delTask(id,e){
  if(e)e.stopPropagation();
  const t=tasks.find(t=>t.id===id);
  if(t) logHistory('刪除任務', t, `象限 Q${t.q}`);
  if(openTaskId===id)closeDrawer();
  tasks=tasks.filter(t=>t.id!==id); save(); render();
}

/* ─── QUADRANT CLICK TO ADD ─── */
function qAreaClick(e,q){
  // only if clicking on tasks area or empty div, not on a card
  if(e.target.closest('.task-card')) return;
  openModal(null, q);
}

/* ─── MODAL ─── */
function openModal(id=null, defaultQ=null){
  editId=id;
  document.getElementById('mtitle').textContent=id?'編輯任務':'新增任務';
  if(id){
    const t=tasks.find(t=>t.id===id);
    document.getElementById('itext').value=t.text;
    document.getElementById('idesc').value=t.desc||'';
    editTags=[...(t.tags||[])]; renderTagChips();
    document.getElementById('idue').value=t.due||'';
    pickQ(t.q);
  } else {
    document.getElementById('itext').value='';
    document.getElementById('idesc').value='';
    editTags=[]; renderTagChips();
    document.getElementById('idue').value=today();
    pickQ(defaultQ||1);
  }
  document.getElementById('ov').classList.add('open');
  setTimeout(()=>document.getElementById('itext').focus(),80);
}
function closeModal(){ document.getElementById('ov').classList.remove('open'); editId=null; }

function toggleHelp(){ document.getElementById('help-overlay').classList.toggle('open'); }
function closeHelp(e){ if(e.target===document.getElementById('help-overlay')) toggleHelp(); }
function pickQ(q){ selQ=q; document.querySelectorAll('.q-pick').forEach(el=>el.classList.toggle('selected',+el.dataset.q===q)); }
function saveTask(){
  const text=document.getElementById('itext').value.trim();
  if(!text){document.getElementById('itext').focus();return;}
  const desc=document.getElementById('idesc').value.trim();
  const due=document.getElementById('idue').value;
  const tags=[...editTags];
  if(editId){
    const t=tasks.find(t=>t.id===editId);
    if(t){
      const changed=[];
      if(t.text!==text) changed.push(`名稱：${t.text} → ${text}`);
      if(t.q!==selQ) changed.push(`象限：Q${t.q} → Q${selQ}`);
      if((t.due||'')!==(due||'')) changed.push(`截止：${t.due||'無'} → ${due||'無'}`);
      const oldTagStr=JSON.stringify([...(t.tags||[])].sort()), newTagStr=JSON.stringify([...tags].sort());
      if(oldTagStr!==newTagStr) changed.push(`標籤：${(t.tags||[]).join(',')||'無'} → ${tags.join(',')||'無'}`);
      t.text=text; t.desc=desc; t.due=due||null; t.q=selQ; t.tags=tags;
      logHistory('編輯任務', t, changed.join('；')||'更新說明');
    }
  } else {
    const newTask={
      id:Date.now(),text,desc,due:due||null,tags:tags,q:selQ,done:false,comments:[],
      createdBy: profile ? {name:profile.name,avatar:profile.avatar,avatar_type:profile.avatar_type||'emoji'} : null,
      createdAt: new Date().toISOString()
    };
    tasks.unshift(newTask);
    logHistory('新增任務', newTask, `象限 Q${selQ}${due?'，截止 '+due:''}`);
  }
  save();render();
  if(editId!==null && openTaskId===editId) openDrawer(editId);
  closeModal();
}

/* ─── DRAWER ─── */
function openDrawer(id){
  openTaskId=id;
  const t=tasks.find(t=>t.id===id); if(!t)return;
  history.pushState({taskId:id}, '', '/'+id);
  document.getElementById('dqdot').style.background=COLORS[t.q];
  document.getElementById('dqname').textContent=QNAMES[t.q];
  document.getElementById('dtitle').textContent=t.text;
  document.getElementById('ddesc').textContent=t.desc||'';
  // 顯示截止日期、handlers 和建立者
  const handlers = t.handlers || (t.handler ? [t.handler] : []);
  const handlersHTML = handlers.length > 0
    ? `<span class="handler-tag" style="margin-left:6px"><span class="handlers-stack">${handlers.slice(0,5).map(h=>`<span class="handler-av">${avHTML(h.avatar,13,h.avatar_type)}</span>`).join('')}</span>${handlers.length>5?`<span class="handlers-more">+${handlers.length-5}</span>`:''}${handlers.map(h=>esc(h.name)).join('、')} 處理中</span>`
    : '';
  const creatorHTML = t.createdBy
    ? `<span class="handler-tag" style="margin-left:6px;opacity:.75"><span class="handler-av">${avHTML(t.createdBy.avatar,13,t.createdBy.avatar_type)}</span>${esc(t.createdBy.name)} 建立</span>`
    : '';
  const tagBadgesDrawer=(t.tags||[]).map(g=>`<span class="task-tag" style="margin-left:4px">${esc(g)}</span>`).join('');
  document.getElementById('dmeta').innerHTML=(t.due?dueBadge(t.due):'')+tagBadgesDrawer+handlersHTML+creatorHTML;
  renderDrawer(id);
  document.getElementById('dov').classList.add('open');
  setTimeout(()=>document.getElementById('cinp').focus(),200);
}
function renderDrawer(id){
  const t=tasks.find(t=>t.id===id); if(!t)return;
  const list=t.comments||[], el=document.getElementById('clist');
  const countEl=document.getElementById('clist-count');
  if(countEl) countEl.textContent=`${list.length} 則`;
  if(!list.length){el.innerHTML='<div class="no-comments">還沒有留言，成為第一個！</div>';return;}
  el.innerHTML=list.map((c,i)=>{
    const likes=c.likes||[];
    const liked=likes.some(l=>(profile?.name&&l.name===profile.name)||l.ip===myIP);
    const lcount=likes.length;
    return `<div class="comment-item">
      <div class="comment-meta">
        <div class="comment-user-av">${(()=>{const av=(profile&&c.name===profile.name)?profile.avatar:c.avatar;const avt=(profile&&c.name===profile.name)?profile.avatar_type:c.avatar_type;return av?avHTML(av,28,avt):'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';})()}</div>
        <div class="comment-user-info">
          <span class="comment-user-name">${esc(c.name||c.ip)}</span>
          <span class="comment-ip-tag">${esc(c.ip)}</span>
          <span class="comment-time">${esc(c.time)}</span>
        </div>
      </div>
      <div class="comment-text">${esc(c.text)}</div>
      <div class="comment-foot">
        <button class="comment-like${liked?' liked':''}" onclick="likeComment(${id},${i})">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          ${lcount>0?lcount:''}
        </button>
        <button class="comment-del" onclick="delComment(${id},${i})">刪除留言</button>
      </div>
    </div>`;
  }).join('');
  el.scrollTop=el.scrollHeight;
}
function saveDrawerField(field, value){
  if(openTaskId===null) return;
  const t=tasks.find(t=>t.id===openTaskId); if(!t) return;
  if(field==='text' && !value) return;
  const prev = t[field] || null;
  const next = value || null;
  if(prev===next) return;
  t[field]=next;
  save();
  render();
}

function closeDrawer(){ document.getElementById('dov').classList.remove('open'); openTaskId=null; history.pushState(null,'','/'); }
function addComment(){
  const inp=document.getElementById('cinp'), text=inp.value.trim();
  if(!text||openTaskId===null){inp.focus();return;}
  const t=tasks.find(t=>t.id===openTaskId); if(!t)return;
  if(!t.comments)t.comments=[];
  t.comments.push({text,ip:myIP,time:ts(),name:profile?.name||myIP,avatar:profile?.avatar||null,avatar_type:profile?.avatar_type||'emoji'});
  logHistory('新增留言', t, `${text.slice(0,40)}${text.length>40?'…':''}`);
  save();render();inp.value='';inp.focus();
}
function delComment(tid,idx){
  const t=tasks.find(t=>t.id===tid);
  if(t&&t.comments){
    const c=t.comments[idx];
    logHistory('刪除留言', t, c?`${c.name||c.ip}：${String(c.text).slice(0,40)}`:'');
    t.comments.splice(idx,1); save(); render();
  }
}

function likeComment(tid, idx){
  const t=tasks.find(t=>t.id===tid); if(!t) return;
  const c=t.comments[idx]; if(!c) return;
  if(!c.likes) c.likes=[];
  const me=profile?.name||myIP;
  const existing=c.likes.findIndex(l=>(profile?.name&&l.name===profile.name)||l.ip===myIP);
  if(existing>=0) c.likes.splice(existing,1);
  else c.likes.push({name:me, ip:myIP});
  save();
  const el=document.getElementById('clist');
  const pos=el?el.scrollTop:0;
  renderDrawer(tid);
  if(el) el.scrollTop=pos;
}

/* ─── DRAG & DROP ─── */
function onDragStart(e,id){ dragId=id; e.dataTransfer.effectAllowed='move'; setTimeout(()=>e.target.style.opacity='.3',0); }
function onDragEnd(e){ e.target.style.opacity=''; document.querySelectorAll('.quadrant').forEach(el=>el.classList.remove('drag-over')); }
function onDragOver(e,q){ e.preventDefault(); e.dataTransfer.dropEffect='move'; document.getElementById('q'+q).classList.add('drag-over'); }
function onDrop(e,q){
  e.preventDefault(); document.getElementById('q'+q).classList.remove('drag-over');
  if(dragId===null)return;
  const t=tasks.find(t=>t.id===dragId);
  if(t){
    const changed = t.q!==q || t.done;
    if(changed){ logHistory(t.done?'恢復任務':'移動象限', t, `Q${t.q} → Q${q}`); t.q=q; t.done=false; save(); render(); }
  }
  dragId=null;
}
function onDoneDragOver(e){
  e.preventDefault(); e.dataTransfer.dropEffect='move';
  document.getElementById('done-list').classList.add('drag-over');
}
function onDoneDrop(e){
  e.preventDefault(); document.getElementById('done-list').classList.remove('drag-over');
  if(dragId===null)return;
  const t=tasks.find(t=>t.id===dragId);
  if(t&&!t.done){ t.done=true; t.doneAt=new Date().toISOString(); logHistory('標記完成', t, '拖曳至已完成'); save(); render(); _showWeeklyConfirm(t.id); }
  dragId=null;
}

/* ─── KEYBOARD ─── */
document.getElementById('setup-screen').addEventListener('click',e=>{
  if(e.target===document.getElementById('setup-screen')&&profile) document.getElementById('setup-screen').style.display='none';
});

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    if(document.getElementById('setup-screen').style.display!=='none'&&profile){document.getElementById('setup-screen').style.display='none';return;}
    if(searchQuery){clearSearch();return;}
    closeModal();closeDrawer();
  }
  if(e.key==='Enter'&&document.getElementById('ov').classList.contains('open')
     &&!['BUTTON','TEXTAREA'].includes(document.activeElement.tagName)) saveTask();
  if(e.key==='Enter'&&!e.shiftKey&&document.activeElement===document.getElementById('cinp')){
    e.preventDefault();addComment();
  }
});

function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/* ─── SEARCH ─── */
function onSearchInput(val){
  searchQuery = val.trim().toLowerCase();
  const clr = document.getElementById('h-search-clear');
  if(clr) clr.classList.toggle('visible', !!searchQuery);
  render();
}
function clearSearch(){
  searchQuery = '';
  const inp = document.getElementById('h-search-input');
  if(inp) inp.value = '';
  const clr = document.getElementById('h-search-clear');
  if(clr) clr.classList.remove('visible');
  render();
}
function taskMatchesSearch(t){
  if(!searchQuery) return true;
  const q = searchQuery;
  if(t.text && t.text.toLowerCase().includes(q)) return true;
  if(t.desc && t.desc.toLowerCase().includes(q)) return true;
  if(t.comments && t.comments.some(c => c.text && c.text.toLowerCase().includes(q))) return true;
  return false;
}
function hlText(str){
  if(!searchQuery || !str) return esc(str||'');
  const q = searchQuery;
  const lower = str.toLowerCase();
  let out = '', i = 0;
  while(i < str.length){
    const idx = lower.indexOf(q, i);
    if(idx < 0){ out += esc(str.slice(i)); break; }
    out += esc(str.slice(i, idx));
    out += `<mark class="search-hl">${esc(str.slice(idx, idx+q.length))}</mark>`;
    i = idx + q.length;
  }
  return out;
}

/* ─── HISTORY LOGGING ─── */
function logHistory(action, task, detail=''){
  const entry = {
    time: ts(),
    user: profile?.name || '未知使用者',
    avatar: profile?.avatar || null,
    avatar_type: profile?.avatar_type || 'emoji',
    ip: myIP,
    action,
    task_id: task?.id || null,
    task: task?.text || '',
    detail
  };
  fetch('/api/history',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(entry)
  }).catch(()=>{});
}

/* ─── ROCKET CELEBRATION ─── */
function showRocketCelebration(voter, totalRockets, taskText){
  // 發射粒子火箭
  const count = 18;
  for(let i = 0; i < count; i++){
    setTimeout(()=>{
      const el = document.createElement('div');
      el.className = 'rocket-particle';
      const startX = 10 + Math.random() * 80; // vw
      const startY = 60 + Math.random() * 35; // vh
      const dx = (Math.random() - .5) * 300;
      const dy = -(200 + Math.random() * 400);
      const r  = (Math.random() - .5) * 40;
      const r2 = (Math.random() - .5) * 120;
      const dur = .8 + Math.random() * 1.2;
      el.style.cssText = `left:${startX}vw;top:${startY}vh;--dx:${dx}px;--dy:${dy}px;--r:${r}deg;--r2:${r2}deg;animation-duration:${dur}s;`;
      el.textContent = '🚀';
      document.body.appendChild(el);
      setTimeout(()=>el.remove(), dur * 1000 + 100);
    }, i * 60);
  }

  // 主視窗
  const overlay = document.createElement('div');
  overlay.className = 'rocket-celebration';
  overlay.innerHTML = `
    <div class="rocket-celeb-card">
      <div class="rocket-celeb-rockets">🚀🚀🚀</div>
      <div class="rocket-celeb-msg">你獲得火箭了！</div>
      <div class="rocket-celeb-sub">${esc(voter)} 覺得你表現很棒<br>你現在共有 <strong style="color:#fbbf24">🚀 × ${totalRockets}</strong></div>
      ${taskText ? `<div class="rocket-celeb-task">「${esc(taskText)}」</div>` : ''}
      <div class="rocket-celeb-dismiss">點擊任意處關閉</div>
    </div>
  `;
  overlay.onclick = () => {
    overlay.classList.add('out');
    setTimeout(()=>overlay.remove(), 500);
  };
  document.body.appendChild(overlay);

  // 播放音效（上升音階）
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      const t = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(.35, t + .04);
      gain.gain.exponentialRampToValueAtTime(.01, t + .3);
      osc.start(t); osc.stop(t + .3);
    });
  } catch(e){}
}

/* ─── NOTIFICATIONS (Teams style) ─── */
let _notifSound = null;
function playNotifSound(){
  if(!_notifSound){
    // 簡單的提示音 (使用 Web Audio API)
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch(e){}
  }
}

function showNotif(opts){
  // opts: { type, name, avatar, avatar_type, action, text, taskId, onClick }
  const container = document.getElementById('notif-container');
  const card = document.createElement('div');
  card.className = 'notif-card';
  card.dataset.type = opts.type || 'task';

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const avatarHTML = opts.avatar
    ? avHTML(opts.avatar, 36, opts.avatar_type || 'emoji')
    : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>';

  card.innerHTML = `
    <div class="notif-accent"></div>
    <div class="notif-avatar">${avatarHTML}</div>
    <div class="notif-body">
      <div class="notif-header">
        <span class="notif-name">${esc(opts.name || '系統')}</span>
        <span class="notif-action">${esc(opts.action || '')}</span>
        <span class="notif-time">${timeStr}</span>
      </div>
      <div class="notif-text">${esc(opts.text || '')}</div>
    </div>
    <button class="notif-close" onclick="event.stopPropagation();this.parentElement.classList.add('out');setTimeout(()=>this.parentElement.remove(),250);">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  // 點擊跳轉
  if(opts.taskId){
    card.onclick = () => {
      openDrawer(opts.taskId);
      card.classList.add('out');
      setTimeout(()=>card.remove(),250);
    };
  } else if(opts.type === 'chat'){
    card.onclick = () => {
      // 手機版切換到留言板 tab
      if(window.innerWidth < 640) setMobTab('chat');
      // 滾動到底部
      const chatList = document.getElementById('chat-list');
      if(chatList) chatList.scrollTop = chatList.scrollHeight;
      card.classList.add('out');
      setTimeout(()=>card.remove(),250);
    };
  }

  // 有新通知時，移除現有通知並替換
  const existing = container.querySelectorAll('.notif-card:not(.out)');
  existing.forEach(old => {
    old.classList.add('out');
    setTimeout(()=>old.remove(), 250);
  });

  setTimeout(()=>container.appendChild(card), existing.length ? 260 : 0);
  playNotifSound();
}

// 保留舊的 showToast 做為簡單通知的備用
function showToast(icon, title, msg){
  showNotif({ type:'task', name:title, action:'', text:msg, avatar:icon, avatar_type:'emoji' });
}

function sendBrowserNotif(title, body){
  if(!('Notification' in window)) return;
  if(Notification.permission==='granted'){
    const icon=document.querySelector("link[rel~='icon']")?.href||'';
    new Notification(title, {body, icon});
  } else if(Notification.permission==='default'){
    Notification.requestPermission().then(p=>{
      if(p==='granted') new Notification(title, {body});
    });
  }
}

function requestNotifPermission(){
  if('Notification' in window && Notification.permission==='default'){
    Notification.requestPermission();
  }
}

// ── SSE: real-time broadcast from server ──────────────────────
function connectSSE(){
  const es = new EventSource('/api/events');
  es.onmessage = e => {
    if(!e.data || e.data.startsWith(':')) return;
    try {
      const entry = JSON.parse(e.data);

      // Handle sync event (two-way binding) - 靜默同步，不顯示通知
      if(entry.type === 'sync'){
        const isSelf = entry.from_ip === myIP;
        if(!isSelf){
          tasks = entry.tasks;
          localStorage.setItem('tasks_v4', JSON.stringify(tasks));
          render();
        }
        return;
      }

      // Handle leave update
      if(entry.type === 'leave_update'){
        leaveData = entry.leaves || [];
        renderLeaves();
        // 通知其他人（非本人）有人請假
        const isSelf = entry.action === 'add' && entry.leave?.name === profile?.name;
        if(!isSelf && entry.action === 'add' && entry.leave){
          const l = entry.leave;
          const today = new Date().toISOString().slice(0,10);
          if(l.date === today){
            // 今天請假 → 全螢幕通知
            showLeaveAlert([l]);
          } else {
            showNotif({ type:'task', name:l.name, avatar:l.avatar, avatar_type:l.avatar_type, action:'請假', text:`${l.date}${l.note ? ' · ' + l.note : ''}` });
          }
        }
        return;
      }

      // Handle points update
      if(entry.type === 'points_update'){
        pointsData.rockets = entry.rockets || {};
        if(!pointsData.votes[entry.week]) pointsData.votes[entry.week] = {};
        renderRockets();
        updateVoteBtn();
        const isRecipient = profile && entry.votedFor === profile.name;
        const isVoter     = profile && entry.voter    === profile.name;
        if(isRecipient){
          // 被加分的人：全螢幕火箭慶祝
          const myTotal = (pointsData.rockets || {})[profile.name] || 0;
          showRocketCelebration(entry.voter, myTotal, entry.taskText);
        } else if(!isVoter){
          // 其他旁觀者：普通通知
          showNotif({ type:'task', name:entry.voter, avatar:'🚀', avatar_type:'emoji', action:'投票給', text:`${entry.votedFor} — ${entry.taskText}` });
        }
        return;
      }

      // Handle chat message - 留言板新訊息通知
      if(entry.type === 'chat'){
        const isSelf = entry.from_ip === myIP;
        if(!isSelf && entry.message){
          chatMessages.push(entry.message);
          renderChat();
          showNotif({
            type: 'chat',
            name: entry.message.name,
            avatar: entry.message.avatar,
            avatar_type: entry.message.avatar_type,
            action: '發送訊息',
            text: entry.message.text
          });
          sendBrowserNotif(`💬 ${entry.message.name}`, entry.message.text);
        }
        return;
      }

      // Handle history notifications
      const isSelf = entry.ip === myIP;
      if(isSelf) return; // 自己的操作不通知

      // 需要通知的動作：新增任務、新增留言、標記完成、恢復任務、編輯任務、刪除任務
      // 不需要通知的動作：接手處理、取消接手
      const notifyActions = ['新增任務', '新增留言', '標記完成', '恢復任務', '編輯任務', '刪除任務'];
      if(notifyActions.includes(entry.action)){
        let type = 'task';
        let action = entry.action;
        if(entry.action === '新增留言') type = 'comment';
        else if(entry.action === '標記完成') type = 'done';

        showNotif({
          type,
          name: entry.user,
          avatar: entry.avatar,
          avatar_type: entry.avatar_type,
          action,
          text: entry.task + (entry.detail ? `：${entry.detail}` : ''),
          taskId: entry.task_id
        });
        sendBrowserNotif(`${entry.user} ${action}`, entry.task);
      }
    } catch(_){}
  };
  es.onerror = () => {
    es.close();
    setTimeout(connectSSE, 5000); // reconnect after 5s
  };
}

// Same-device cross-tab sync still via storage event
window.addEventListener('storage', e=>{
  if(e.key!=='tasks_v4'||!e.newValue) return;
  _lastTasksStr=e.newValue;
  tasks=JSON.parse(e.newValue);
  render();
});

/* ─── MOBILE TABS ─── */
function isMobile(){ return window.innerWidth < 640; }

function setMobTab(panel){
  if(!isMobile()) return;
  document.querySelectorAll('.mob-tab').forEach(el=>el.classList.toggle('active', el.dataset.panel===panel));
  document.querySelector('.sug-panel').classList.toggle('mob-show', panel==='sug');
  document.querySelector('.right-area').classList.toggle('mob-show', panel==='quadrant');
  document.querySelector('.right-area').classList.toggle('mob-show-done', panel==='done');
  document.querySelector('.chat-panel').classList.toggle('mob-show', panel==='chat');
}

function initMobTabs(){
  if(!isMobile()) return;
  setMobTab('quadrant');
  // Reset active tab to quadrant on init
  document.querySelectorAll('.mob-tab').forEach(el=>el.classList.toggle('active', el.dataset.panel==='quadrant'));
}

window.addEventListener('resize', ()=>{
  if(!isMobile()){
    // Restore desktop: remove mob-show classes
    document.querySelector('.sug-panel').classList.remove('mob-show');
    document.querySelector('.right-area').classList.remove('mob-show');
    document.querySelector('.completed-section').classList.remove('mob-show');
  } else {
    initMobTabs();
  }
});

initProfile();
initMobTabs();
connectSSE();

/* ─── COLUMN RESIZER ─── */
function initResizers(){
  if(isMobile()) return;

  const sug  = document.querySelector('.sug-panel');
  const chat = document.querySelector('.chat-panel');
  const layout = document.querySelector('.layout');

  // 從 localStorage 恢復寬度
  const savedSug  = localStorage.getItem('col_sug_w');
  const savedChat = localStorage.getItem('col_chat_w');
  if(savedSug)  sug.style.width  = savedSug  + 'px';
  if(savedChat) chat.style.width = savedChat + 'px';

  function makeResizer(resizerId, getPanel, getDirection){
    const handle = document.getElementById(resizerId);
    if(!handle) return;
    handle.addEventListener('mousedown', e => {
      e.preventDefault();
      const panel     = getPanel();
      const startX    = e.clientX;
      const startW    = panel.offsetWidth;
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      function onMove(e){
        const dx  = getDirection(e.clientX - startX);
        const min = 160;
        const max = layout.offsetWidth * 0.45;
        const nw  = Math.max(min, Math.min(max, startW + dx));
        panel.style.width = nw + 'px';
      }
      function onUp(){
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // 儲存寬度
        localStorage.setItem(
          resizerId === 'resizer-left' ? 'col_sug_w' : 'col_chat_w',
          parseInt(getPanel().style.width)
        );
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup',   onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  // 左 resizer：拖右 → 左欄變寬
  makeResizer('resizer-left',  () => sug,  dx =>  dx);
  // 右 resizer：拖左 → 右欄變寬
  makeResizer('resizer-right', () => chat, dx => -dx);
  // done resizer：拖左 → 已完成欄變寬
  const done = document.querySelector('.completed-section');
  const savedDone = localStorage.getItem('col_done_w');
  if(savedDone){ done.style.flex = 'none'; done.style.width = savedDone + 'px'; }
  const doneHandle = document.getElementById('resizer-done');
  if(doneHandle) {
    doneHandle.addEventListener('mousedown', e => {
      e.preventDefault();
      const startX = e.clientX, startW = done.offsetWidth;
      doneHandle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      function onMove(e){
        const nw = Math.max(140, Math.min(500, startW - (e.clientX - startX)));
        done.style.flex = 'none';
        done.style.width = nw + 'px';
      }
      function onUp(){
        doneHandle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        localStorage.setItem('col_done_w', parseInt(done.style.width));
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }
}

window.addEventListener('resize', ()=>{
  if(!isMobile()){
    // 桌面切回時重新套用
    initResizers();
  }
});

initResizers();
setTimeout(requestNotifPermission, 1500);

/* ─── DONE PANEL TOGGLE ─── */
let doneVisible = false;
function toggleDonePanel(){
  const section = document.getElementById('done-section');
  const resizer = document.getElementById('resizer-done');
  const btn = document.getElementById('h-done-btn');
  const matrix = document.querySelector('.matrix');
  doneVisible = !doneVisible;
  section.style.display = doneVisible ? '' : 'none';
  if(resizer) resizer.style.display = doneVisible ? '' : 'none';
  btn.classList.toggle('active', doneVisible);
  if(matrix) matrix.classList.toggle('grid-mode', !doneVisible);
}

/* ─── TASK URL ─── */
function taskUrl(id){ return window.location.origin + '/' + id; }

function copyTaskUrl(){
  if(openTaskId===null) return;
  const url = taskUrl(openTaskId);
  navigator.clipboard.writeText(url).then(()=>{
    showCopyToast('已複製任務連結');
  }).catch(()=>{
    const ta = document.createElement('textarea');
    ta.value = url; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    showCopyToast('已複製任務連結');
  });
}

function showCopyToast(msg){
  const existing = document.querySelector('.copy-toast');
  if(existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'copy-toast'; el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 1800);
}

/* ═══ WEEKLY REPORT ═══ */
let _weeklyTaskId = null;
let _wrFromDoneFlow = false; // true = opened via confirm dialog, cancel should revert done
let _wrImages = []; // [{file, url, caption}]
let _weeklyRecordIds = new Set();

function _loadWeeklyRecordIds() {
  fetch('/api/weekly-records')
    .then(r => r.json())
    .then(data => {
      _weeklyRecordIds = new Set((data.records || []).map(r => r.taskId));
      render();
    }).catch(() => {});
}

function _isoWeekKey(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  dt.setUTCDate(dt.getUTCDate() + 4 - (dt.getUTCDay() || 7));
  const y = dt.getUTCFullYear();
  const wk = Math.ceil((((dt - Date.UTC(y, 0, 1)) / 86400000) + 1) / 7);
  return `${y}-W${String(wk).padStart(2,'0')}`;
}

// ── Edit existing record (from done card tag) ──
function editWeeklyRecord(taskId, e) {
  if (e) e.stopPropagation();
  _weeklyTaskId = taskId;
  const t = tasks.find(t => t.id === taskId);
  if (!t) return;

  document.getElementById('wr-task-label').value = t.text;
  document.getElementById('wr-project').value = '';
  document.getElementById('wr-notes').value = '';
  _wrImages = [];
  _renderWRImages();
  _renderWRComments(t);

  fetch('/api/weekly-record?taskId=' + taskId)
    .then(r => r.ok ? r.json() : null)
    .then(rec => {
      if (!rec) return;
      if (rec.taskText) document.getElementById('wr-task-label').value = rec.taskText;
      document.getElementById('wr-project').value = rec.project || '';
      document.getElementById('wr-notes').value = rec.notes || '';
      _wrImages = (rec.images || []).map(img => ({
        file: null, url: img.url, caption: img.caption || '', serverFilename: img.filename
      }));
      _renderWRImages();
    }).catch(() => {});

  document.getElementById('wr-overlay').classList.add('open');
  setTimeout(() => document.getElementById('wr-notes').focus(), 100);
}

// ── Confirm dialog (shown when task marked done) ──
function _showWeeklyConfirm(taskId) {
  const t = tasks.find(t => t.id === taskId);
  if (!t) return;
  _weeklyTaskId = taskId;
  document.getElementById('wc-task-name').textContent = t.text;
  document.getElementById('wc-overlay').classList.add('open');
}

function skipWeeklyRecord() {
  _weeklyTaskId = null;
  document.getElementById('wc-overlay').classList.remove('open');
}

// ── Record fill-in modal ──
function openWeeklyRecord() {
  document.getElementById('wc-overlay').classList.remove('open');
  _wrFromDoneFlow = true;
  const t = tasks.find(t => t.id === _weeklyTaskId);
  if (!t) return;

  document.getElementById('wr-task-label').value = t.text;
  document.getElementById('wr-project').value = '';
  document.getElementById('wr-notes').value = '';
  _wrImages = [];
  _renderWRImages();
  _renderWRComments(t);

  // Pre-fill if record already exists
  fetch('/api/weekly-record?taskId=' + _weeklyTaskId)
    .then(r => r.ok ? r.json() : null)
    .then(rec => {
      if (!rec) return;
      if (rec.taskText) document.getElementById('wr-task-label').value = rec.taskText;
      document.getElementById('wr-project').value = rec.project || '';
      document.getElementById('wr-notes').value = rec.notes || '';
      // Existing server images shown as URL refs (no re-upload needed)
      _wrImages = (rec.images || []).map(img => ({
        file: null,
        url: img.url,
        caption: img.caption || '',
        serverFilename: img.filename
      }));
      _renderWRImages();
    }).catch(() => {});

  document.getElementById('wr-overlay').classList.add('open');
  setTimeout(() => document.getElementById('wr-notes').focus(), 100);
}

function _closeWRModal() {
  document.getElementById('wr-overlay').classList.remove('open');
  _weeklyTaskId = null;
  _wrFromDoneFlow = false;
  _wrImages = [];
  _renderWRImages();
  document.getElementById('wr-comments-col').classList.add('empty');
  document.getElementById('wr-ref-list').innerHTML = '';
}

function closeWeeklyRecord() {
  // 使用者主動關閉（取消 / X / 點背景）
  const id = _weeklyTaskId;
  const fromDone = _wrFromDoneFlow;
  _closeWRModal();
  if (fromDone && id) {
    // 從 done 流程進來的，取消時還原 done 狀態
    const t = tasks.find(t => t.id === id);
    if (t && t.done) {
      t.done = false;
      delete t.doneAt;
      save(); render();
    }
  }
}

function wrAddFiles(files) {
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    _wrImages.push({ file, url: URL.createObjectURL(file), caption: '', serverFilename: null });
  }
  _renderWRImages();
}

function _renderWRImages() {
  const list = document.getElementById('wr-img-list');
  if (!list) return;
  list.innerHTML = '';
  _wrImages.forEach((img, i) => {
    const item = document.createElement('div');
    item.className = 'wr-img-item';
    item.innerHTML = `
      <img class="wr-img-thumb" src="${img.url}" alt="" onclick="window.open('${img.url}','_blank')">
      <div class="wr-img-right">
        <input type="text" placeholder="這張圖的說明..." value="${(img.caption||'').replace(/"/g,'&quot;')}"
               oninput="_wrImages[${i}].caption=this.value">
      </div>
      <button class="wr-img-del" onclick="_wrRemoveImg(${i})" title="移除">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>`;
    list.appendChild(item);
  });
}

function _wrRemoveImg(i) {
  if (_wrImages[i] && _wrImages[i].url && !_wrImages[i].serverFilename) {
    URL.revokeObjectURL(_wrImages[i].url);
  }
  _wrImages.splice(i, 1);
  _renderWRImages();
}

function _renderWRComments(task) {
  const col = document.getElementById('wr-comments-col');
  const list = document.getElementById('wr-ref-list');
  const comments = (task && task.comments) || [];
  if (!comments.length) { col.classList.add('empty'); list.innerHTML = ''; return; }
  col.classList.remove('empty');
  list.innerHTML = comments.map(c => {
    const avHtml = c.avatar_type === 'custom' && c.avatar
      ? `<img src="${c.avatar}" alt="">`
      : `<span>${(c.name||'?')[0]}</span>`;
    return `<div class="wr-ref-item">
      <div class="wr-ref-meta">
        <div class="wr-ref-av">${avHtml}</div>
        <span class="wr-ref-name">${c.name||'—'}</span>
        <span class="wr-ref-time">${(c.time||'').slice(5)}</span>
      </div>
      <div class="wr-ref-text">${c.text.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
    </div>`;
  }).join('');
  // scroll to bottom so latest is visible
  list.scrollTop = list.scrollHeight;
}

// Paste handler
document.addEventListener('paste', function(e) {
  if (!document.getElementById('wr-overlay').classList.contains('open')) return;
  const items = (e.clipboardData || e.originalEvent?.clipboardData || {}).items || [];
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        _wrImages.push({ file, url: URL.createObjectURL(file), caption: '', serverFilename: null });
        _renderWRImages();
      }
    }
  }
});

// Drag-drop
(function initWRDrop() {
  const ready = () => {
    const zone = document.getElementById('wr-drop-zone');
    if (!zone) { setTimeout(ready, 200); return; }
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      files.forEach(file => _wrImages.push({ file, url: URL.createObjectURL(file), caption: '', serverFilename: null }));
      _renderWRImages();
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ready);
  } else {
    ready();
  }
})();

async function saveWeeklyRecord() {
  const t = tasks.find(t => t.id === _weeklyTaskId);
  if (!t) return;
  const notes = document.getElementById('wr-notes').value.trim();
  const btn = document.querySelector('#wr-overlay .btn-s');
  if (btn) { btn.disabled = true; btn.textContent = '儲存中...'; }

  try {
    const imageData = [];
    for (let i = 0; i < _wrImages.length; i++) {
      const img = _wrImages[i];
      if (img.file) {
        const b64 = await new Promise(res => {
          const reader = new FileReader();
          reader.onload = e => res(e.target.result.split(',')[1]);
          reader.readAsDataURL(img.file);
        });
        const ext = img.file.type === 'image/jpeg' ? 'jpg' : 'png';
        imageData.push({ filename: `img_${i}.${ext}`, caption: img.caption, data: b64 });
      } else if (img.serverFilename) {
        // Keep existing server image (no data field = server keeps it)
        imageData.push({ filename: img.serverFilename, caption: img.caption });
      }
    }
    const resp = await fetch('/api/weekly-record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: t.id, taskText: document.getElementById('wr-task-label').value.trim() || t.text, project: document.getElementById('wr-project').value.trim(), notes, images: imageData, handlers: t.handlers || [] })
    });
    if (resp.ok) {
      _closeWRModal();
      _loadWeeklyRecordIds();
      showCopyToast('已儲存到本週週報 ✓');
    } else {
      alert('儲存失敗，請稍後再試');
    }
  } catch(err) {
    alert('儲存失敗：' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '儲存'; }
  }
}

// ── PPT Modal ──
function openPPTModal() {
  const week = _isoWeekKey(new Date());
  document.getElementById('ppt-week-badge').textContent = week;
  fetch('/api/weekly-config')
    .then(r => r.json())
    .then(cfg => {
      const titleEl = document.getElementById('ppt-title');
      const presEl  = document.getElementById('ppt-presenters');
      titleEl.value = cfg.title || '';
      presEl.value  = cfg.presenters || '';
      if (cfg.title)      titleEl.placeholder = cfg.title;
      if (cfg.presenters) presEl.placeholder  = cfg.presenters;
    }).catch(() => {});
  fetch('/api/weekly-records')
    .then(r => r.json())
    .then(data => {
      const n = (data.records || []).length;
      document.getElementById('ppt-record-count').textContent = `本週已記錄 ${n} 個任務`;
    }).catch(() => {});
  fetch('/api/ppt-template-info')
    .then(r => r.json())
    .then(info => _setPPTTemplateStatus(info.exists, info.exists ? '已載入模板' : null))
    .catch(() => {});
  document.getElementById('ppt-overlay').classList.add('open');
}

function _setPPTTemplateStatus(loaded, name) {
  const zone = document.getElementById('ppt-template-zone');
  const status = document.getElementById('ppt-template-status');
  if (loaded) {
    zone.classList.add('loaded');
    status.textContent = `✓ ${name || '已載入模板'}`;
  } else {
    zone.classList.remove('loaded');
    status.textContent = '點選選擇 .pptx 檔案';
  }
}

async function uploadPPTTemplate(file) {
  if (!file) return;
  const zone = document.getElementById('ppt-template-zone');
  zone.style.opacity = '.5';
  try {
    const fd = new FormData();
    fd.append('file', file);
    const resp = await fetch('/api/upload-ppt-template', { method: 'POST', body: fd });
    if (resp.ok) {
      _setPPTTemplateStatus(true, file.name);
      showCopyToast('模板已上傳 ✓');
    } else {
      alert('上傳失敗');
    }
  } catch(e) {
    alert('上傳失敗：' + e.message);
  } finally {
    zone.style.opacity = '';
  }
}

function closePPTModal() {
  document.getElementById('ppt-overlay').classList.remove('open');
}

function savePPTConfig() {
  const cfg = {
    title: document.getElementById('ppt-title').value,
    presenters: document.getElementById('ppt-presenters').value
  };
  fetch('/api/weekly-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cfg)
  }).catch(() => {});
}

async function generatePPT() {
  const btn = document.getElementById('ppt-gen-btn');
  btn.disabled = true; btn.textContent = '生成中...';
  const cfg = {
    title: document.getElementById('ppt-title').value || 'Firmware Update',
    presenters: document.getElementById('ppt-presenters').value
  };
  try {
    const resp = await fetch('/api/generate-ppt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg)
    });
    if (!resp.ok) { alert('生成失敗：' + await resp.text()); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const week = document.getElementById('ppt-week-badge').textContent; // '2026-W23'
    const weekNum = week.split('W')[1]; // '23'
    const now = new Date();
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const dd = String(now.getDate()).padStart(2,'0');
    a.download = `sync week${weekNum}_${mm}${dd}.pptx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closePPTModal();
    showCopyToast('PPT 已生成並下載 ✓');
  } catch(err) {
    alert('生成失敗：' + err.message);
  } finally {
    btn.disabled = false; btn.textContent = '生成 PPT';
  }
}

async function clearWeeklyHistory() {
  if (!confirm('確定要刪除非本週的所有歷史紀錄嗎？本週資料不受影響。')) return;
  try {
    const resp = await fetch('/api/clear-weekly-history', { method: 'POST' });
    const data = await resp.json();
    showCopyToast(`已清除 ${data.removed} 週的歷史紀錄`);
  } catch(err) {
    alert('清除失敗：' + err.message);
  }
}

// ══════════════════════════════════════════════
//  NOTES
// ══════════════════════════════════════════════
const NOTE_MAX = 30;
const NOTE_COLORS = [
  { key: 'default', hex: null,      label: '預設' },
  { key: 'red',     hex: '#fce8e4', label: '紅' },
  { key: 'orange',  hex: '#fde8d0', label: '橙' },
  { key: 'yellow',  hex: '#fdf4c4', label: '黃' },
  { key: 'green',   hex: '#d4f0dc', label: '綠' },
  { key: 'teal',    hex: '#c8ece8', label: '青' },
  { key: 'blue',    hex: '#d4e8f8', label: '藍' },
  { key: 'purple',  hex: '#e8d8f8', label: '紫' },
  { key: 'pink',    hex: '#f8d8ec', label: '粉' },
];

let _notes = [];
let _editNote = null;
let _noteClItems = [];

async function loadNotes() {
  if (!profile) return;
  try {
    _notes = await API.fetchNotes(profile.name);
  } catch(e) {
    _notes = [];
  }
  renderNotes();
}

function renderNotes() {
  const grid = document.getElementById('notes-grid');
  const countEl = document.getElementById('notes-count');
  if (!grid) return;
  if (countEl) countEl.textContent = `${_notes.length} / ${NOTE_MAX}`;
  if (_notes.length === 0) {
    grid.innerHTML = '<div class="notes-empty">點擊「＋ 新增」建立第一張便條紙</div>';
    return;
  }
  grid.innerHTML = _notes.map(n => noteCardHTML(n)).join('');
}

function noteCardHTML(n) {
  const colorKey = n.color || 'default';
  let body = '';
  if (n.type === 'text' || n.type === 'rich') {
    body = `
      ${n.title ? `<div class="note-card-title">${esc(n.title)}</div>` : ''}
      ${n.body  ? `<div class="note-card-body">${esc(n.body)}</div>`   : ''}
    `;
  } else if (n.type === 'checklist') {
    const items = (n.items || []).slice(0, 6);
    const extra = (n.items || []).length - items.length;
    body = `
      ${n.title ? `<div class="note-card-title">${esc(n.title)}</div>` : ''}
      <div>
        ${items.map(it => `
          <div class="note-cl-item ${it.done ? 'done' : ''}">
            <span class="note-cl-icon">${it.done ? '☑' : '☐'}</span>
            <span>${esc(it.text)}</span>
          </div>`).join('')}
        ${extra > 0 ? `<div class="note-cl-more">＋${extra} 項</div>` : ''}
      </div>
    `;
  }
  return `
    <div class="note-card" data-id="${n.id}" data-color="${colorKey}"
         onclick="openNoteEdit('${n.id}')">
      ${body}
      <button class="note-card-del" onclick="event.stopPropagation();deleteNote('${n.id}')" title="刪除">✕</button>
    </div>`;
}

function openNoteTypePicker() {
  if (_notes.length >= NOTE_MAX) { showNotif(`已達 ${NOTE_MAX} 張上限`); return; }
  document.getElementById('note-type-ov').classList.add('active');
}
function closeNoteTypePicker() {
  document.getElementById('note-type-ov').classList.remove('active');
}

function startNewNote(type) {
  closeNoteTypePicker();
  _editNote = { id: Date.now().toString(), type, color: 'default', title: '', body: '', items: [], createdAt: new Date().toISOString() };
  _noteClItems = [];
  _openNoteModal(false);
}

function openNoteEdit(id) {
  const n = _notes.find(n => n.id === id);
  if (!n) return;
  _editNote = JSON.parse(JSON.stringify(n));
  _noteClItems = JSON.parse(JSON.stringify(_editNote.items || []));
  _openNoteModal(true);
}

function _openNoteModal(isEdit) {
  const modal = document.getElementById('note-edit-modal');
  const type = _editNote.type;

  const titleWrap = document.getElementById('nem-title-wrap');
  const titleInp  = document.getElementById('nem-title');
  if (type === 'text') { titleWrap.style.display = 'none'; }
  else { titleWrap.style.display = ''; titleInp.value = _editNote.title || ''; }

  const bodyWrap = document.getElementById('nem-body-wrap');
  const bodyTA   = document.getElementById('nem-body');
  if (type === 'checklist') { bodyWrap.style.display = 'none'; }
  else { bodyWrap.style.display = ''; bodyTA.value = _editNote.body || ''; }

  const clWrap = document.getElementById('nem-cl-wrap');
  if (type === 'checklist') { clWrap.style.display = ''; _renderClEditor(); }
  else { clWrap.style.display = 'none'; }

  _renderNoteColors();

  const colorHex = NOTE_COLORS.find(c => c.key === (_editNote.color || 'default'))?.hex;
  modal.style.background = colorHex || '';

  document.getElementById('nem-del-btn').style.display = isEdit ? '' : 'none';
  document.getElementById('note-edit-ov').classList.add('active');
}

function _renderClEditor() {
  document.getElementById('nem-cl-list').innerHTML = _noteClItems.map((it, i) => `
    <div class="nem-cl-item">
      <input type="checkbox" ${it.done ? 'checked' : ''}
             onchange="_noteClItems[${i}].done=this.checked;this.nextElementSibling.className='${it.done ? '' : 'done'}'">
      <input type="text" value="${esc(it.text)}" class="${it.done ? 'done' : ''}"
             placeholder="項目…" oninput="_noteClItems[${i}].text=this.value">
      <button class="nem-cl-rm" onclick="removeNoteCheckItem(${i})">✕</button>
    </div>`).join('');
}

function addNoteCheckItem() {
  _noteClItems.push({ text: '', done: false });
  _renderClEditor();
  const inputs = document.querySelectorAll('.nem-cl-item input[type="text"]');
  if (inputs.length) inputs[inputs.length - 1].focus();
}
function removeNoteCheckItem(i) {
  _noteClItems.splice(i, 1);
  _renderClEditor();
}

function _renderNoteColors() {
  document.getElementById('nem-colors').innerHTML = NOTE_COLORS.map(c => `
    <button class="nem-swatch ${(_editNote.color || 'default') === c.key ? 'selected' : ''}"
            data-color="${c.key}" title="${c.label}"
            style="${c.hex ? `background:${c.hex}` : ''}"
            onclick="selectNoteColor('${c.key}')"></button>`).join('');
}

function selectNoteColor(key) {
  _editNote.color = key;
  const hex = NOTE_COLORS.find(c => c.key === key)?.hex;
  document.getElementById('note-edit-modal').style.background = hex || '';
  _renderNoteColors();
}

async function saveCurrentNote() {
  if (!_editNote || !profile) return;
  const type = _editNote.type;
  if (type !== 'text') _editNote.title = (document.getElementById('nem-title')?.value || '').trim();
  if (type !== 'checklist') _editNote.body = (document.getElementById('nem-body')?.value || '').trim();
  if (type === 'checklist') _editNote.items = _noteClItems.filter(it => it.text.trim());
  _editNote.updatedAt = new Date().toISOString();

  const idx = _notes.findIndex(n => n.id === _editNote.id);
  if (idx >= 0) _notes[idx] = _editNote;
  else _notes.unshift(_editNote);

  await API.saveNotes(profile.name, _notes);
  closeNoteModal();
  renderNotes();
}

async function deleteNote(id) {
  if (!profile) return;
  _notes = _notes.filter(n => n.id !== id);
  await API.saveNotes(profile.name, _notes);
  renderNotes();
}

async function deleteCurrentNote() {
  if (!_editNote || !profile) return;
  _notes = _notes.filter(n => n.id !== _editNote.id);
  await API.saveNotes(profile.name, _notes);
  closeNoteModal();
  renderNotes();
}

function closeNoteModal() {
  document.getElementById('note-edit-ov').classList.remove('active');
  _editNote = null;
  _noteClItems = [];
}
