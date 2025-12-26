// auth UI helper: switch panels and update tab states
function showPanel(name){
  const loginPanel = document.getElementById('panel-login');
  const registerPanel = document.getElementById('panel-register');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  if(!tabLogin || !tabRegister || !loginPanel || !registerPanel) return;
  loginPanel.hidden = name !== 'login';
  registerPanel.hidden = name !== 'register';
  tabLogin.classList.toggle('active', name === 'login');
  tabRegister.classList.toggle('active', name === 'register');
  tabLogin.setAttribute('aria-selected', name === 'login');
  tabRegister.setAttribute('aria-selected', name === 'register');
}

document.addEventListener('DOMContentLoaded', function(){
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  // 主题初始化与切换（注入到导航）
  (function(){
    function applyTheme(t){
      var dark = (t === 'dark');
      if(dark) document.documentElement.setAttribute('data-theme','dark');
      else document.documentElement.removeAttribute('data-theme');
      try{ localStorage.setItem('kmnzTheme', t); }catch(e){}
      // 同步更新关键 CSS 变量，确保切换即时生效（无需刷新或跳页）
      var vars = {
        '--bg': dark? '#0b1116' : '#ffffff',
        '--surface': dark? '#0f1720' : '#ffffff',
        '--text': dark? '#e6eef8' : '#222222',
        '--muted': dark? '#9aa6b2' : '#666',
        '--border': dark? 'rgba(255,255,255,0.06)' : '#eee',
        '--accent': dark? '#59a6ff' : '#1e88e5',
        '--hero-overlay': dark? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.36)',
        '--hero-foreground': '#ffffff'
      };
      for(var k in vars) document.documentElement.style.setProperty(k, vars[k]);
      const btn = document.getElementById('theme-toggle');
      if(btn) btn.textContent = dark ? '🌙' : '☀️';
    }
    function initTheme(){
      let saved = null;
      try{ saved = localStorage.getItem('kmnzTheme'); }catch(e){}
      if(!saved){
        saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
      }
      applyTheme(saved);
    }
    const siteNav = document.getElementById('site-nav');
    if(siteNav && !document.getElementById('theme-toggle')){
      const tbtn = document.createElement('button');
      tbtn.id = 'theme-toggle'; tbtn.type = 'button'; tbtn.className = 'theme-toggle';
      tbtn.setAttribute('aria-label','切换主题');
      siteNav.appendChild(tbtn);
      tbtn.addEventListener('click', ()=>{
        const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        applyTheme(cur === 'dark' ? 'light' : 'dark');
      });
      initTheme();
    }
  })();
  if(tabLogin && tabRegister){
    const hash = location.hash.replace('#','');
    showPanel(hash==='register'? 'register' : 'login');
    tabLogin.addEventListener('click', ()=>{ showPanel('login'); location.hash='login'; });
    tabRegister.addEventListener('click', ()=>{ showPanel('register'); location.hash='register'; });

    // login handler
    const loginForm = document.getElementById('login-form');
    if(loginForm){
      const loginStatus = document.getElementById('login-status');
      loginForm.addEventListener('submit', function(e){
        e.preventDefault();
        const emailEl = document.getElementById('login-email');
        const email = (emailEl && emailEl.value || '').trim();
        const pwdEl = document.getElementById('login-password');
        const pwd = (pwdEl && pwdEl.value) || '';
        function fail(msg){ if(loginStatus){ loginStatus.textContent = msg; loginStatus.style.color = '#c0392b'; } return false; }
        if(!email) return fail('请填写邮箱或用户名。');
        if(!pwd) return fail('请填写密码。');

        // 必须在本地用户库中存在且密码匹配才允许登录
        const matched = window.getUsers().find(u => String(u.id) === String(email));
        if(!matched) return fail('该账户不存在，请先注册。');
        if(!matched.password) return fail('该账户未设置密码，请重新注册。');
        if(matched.password !== pwd) return fail('密码错误。');

        // 验证通过，使用已存信息登录
        const avatar = matched.avatar || (window.defaultAvatars && window.defaultAvatars.length ? window.defaultAvatars[Math.floor(Math.random()*window.defaultAvatars.length)] : 'assets/images/default4.png');
        const nameFromStore = matched.name || email;
        const user = { id: email, name: nameFromStore, avatar };
        window.loginUser(user);
        if(loginStatus){ loginStatus.textContent = '登录成功，1 秒后跳转到首页…'; loginStatus.style.color = ''; }
        setTimeout(()=>{ location.href = 'index.html'; }, 1000);
      });
    }

    // register handler
    const regForm = document.getElementById('register-form');
    if(regForm){
      regForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const status = document.getElementById('reg-status');
        const success = document.getElementById('reg-success');
        if(status) { status.textContent = ''; status.style.color = ''; }

        // gather values
        const name = (document.getElementById('reg-name').value || '').trim();
        const email = (document.getElementById('reg-email').value || '').trim();
        const p = document.getElementById('reg-password').value || '';
        const p2 = document.getElementById('reg-password2').value || '';
        // avatar selection removed from registration; assign a random default avatar

        // basic validation
        function fail(msg){ if(status){ status.textContent = msg; status.style.color = '#c0392b'; } return false; }
        if(!name) return fail('请填写昵称。');
        if(!email) return fail('请填写邮箱或用户名。');
        // 简单邮箱格式检查（允许用户名形式也通过，但优先检查含 @ 的邮箱格式）
        if(email.indexOf('@') >= 0){
          const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if(!re.test(email)) return fail('请输入有效的邮箱地址。');
        }
        if(p.length < 8) return fail('密码长度至少 8 位。');
        if(p !== p2) return fail('两次密码不一致。');

        // 使用随机默认头像（注册时不再允许直接选择头像）
        let avatar = (window.defaultAvatars && window.defaultAvatars.length)
          ? window.defaultAvatars[Math.floor(Math.random()*window.defaultAvatars.length)]
          : 'assets/images/default4.png';

        // all good —创建用户并写入本地用户库（使用邮箱作为唯一 id）
        // 保存密码以便后续登录校验（注意：本示例将密码明文存储在 localStorage，仅用于教学/演示）
        const user = { id: email, name: name, avatar, password: p };
        // 重复检查（按邮箱）
        const existing = window.getUsers().find(u => String(u.id) === String(email));
        if(existing) return fail('该邮箱已被注册。');
        const users = window.getUsers(); users.push(user); window.saveUsers(users);
        if(typeof window.loginUser === 'function') window.loginUser(user);
        if(status) { status.textContent = ''; }
        if(success){
          success.hidden = false;
          success.textContent = '注册成功（模拟），1 秒后跳转到联系表单…';
          // 注册成功后短暂提示，然后跳转到联系表单页
          setTimeout(()=>{ location.href = 'contact.html'; }, 1000);
        }
      });
    }
  }
});
document.addEventListener('DOMContentLoaded',function(){
  const navToggle = document.getElementById('nav-toggle');
  const siteNav = document.getElementById('site-nav');
  if(navToggle && siteNav){
    navToggle.addEventListener('click',()=>{
      const shown = siteNav.getAttribute('data-visible') === 'true';
      const next = !shown;
      siteNav.setAttribute('data-visible', next);
      siteNav.style.display = shown ? 'none' : 'block';
      navToggle.setAttribute('aria-expanded', String(next));
    });
  }

  // 渲染文章列表（若存在 data.js 的 posts）
  if(window.posts && document.getElementById('posts-list')){
    const list = document.getElementById('posts-list');
    list.innerHTML = '';
    window.posts.forEach(p=>{
      const card = document.createElement('article');
      card.className = 'post-card';
      card.innerHTML = `<h4><a href="post-detail.html?id=${p.id}">${p.title}</a></h4><p class="meta">${p.date} · ${p.author}</p><p>${p.excerpt}</p>`;
      list.appendChild(card);
    });
  }

  // 渲染成员列表（如果存在成员数据和容器）
  if(window.members && document.getElementById('members-grid')){
    const grid = document.getElementById('members-grid');
    grid.innerHTML = '';
    window.members.forEach(m=>{
      const a = document.createElement('a');
      a.className = 'member-link';
      a.href = `member${m.id}.html`;
      a.setAttribute('aria-label', m.name + ' 资料页');
      a.tabIndex = 0;
      a.innerHTML = `
        <div class="member-card">
          <div class="member-photo"><img src="${m.photo}" alt="${m.name}" loading="lazy"></div>
          <div class="member-name">${m.name}</div>
        </div>`;
      // 支持键盘回车打开链接
      a.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter') window.location.href = a.href;
      });
      grid.appendChild(a);
    });
  }

  // 文章详情页渲染
  if(window.posts && document.getElementById('post-detail')){
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const post = window.posts.find(x=>String(x.id)===String(id)) || window.posts[0];
    if(post){
      document.getElementById('post-title').textContent = post.title;
      document.getElementById('post-meta').textContent = `${post.author} · ${post.date}`;
      document.getElementById('post-content').innerHTML = post.content;
    }
  }

  // 图片拖动/按下时微放大（支持鼠标按下或触摸）
  document.querySelectorAll('.member-photo').forEach(photo=>{
    photo.addEventListener('mousedown',()=>photo.classList.add('dragging'));
    photo.addEventListener('mouseup',()=>photo.classList.remove('dragging'));
    photo.addEventListener('mouseleave',()=>photo.classList.remove('dragging'));
    photo.addEventListener('touchstart',()=>photo.classList.add('dragging'),{passive:true});
    photo.addEventListener('touchend',()=>photo.classList.remove('dragging'));
  });

  // 简单表单验证
  const form = document.getElementById('contact-form');
  if(form){
    const status = document.getElementById('form-status');
    const user = window.getStoredUser && window.getStoredUser();
    // 若未登录则阻止提交，并提示前往登录
    if(!user){
      if(status){ status.textContent = '请先登录或注册后再提交。'; status.style.color = 'crimson'; }
    }
    form.addEventListener('submit',e=>{
      e.preventDefault();
      const name = document.getElementById('name');
      const email = document.getElementById('email');
      const message = document.getElementById('message');
      const status = document.getElementById('form-status');
      const cur = window.getStoredUser && window.getStoredUser();
      if(!cur){
        if(status){ status.textContent = '未登录，无法提交。请先登录或注册。'; status.style.color = 'crimson'; }
        return;
      }
      if(!name.value.trim()||!email.value.trim()||!message.value.trim()){
        status.textContent = '请完整填写所有字段。';
        status.style.color = 'crimson';
        return;
      }
      // 简单成功提示（模拟提交）
      status.textContent = '发送成功（模拟）';
      status.style.color = 'green';
      form.reset();
      // 保持 email 为当前用户 id
      try{ email.value = cur.id || ''; }catch(e){}
    });
  }
});





document.addEventListener('DOMContentLoaded', function () {
  const carousel = document.querySelector('.hero-carousel');
  if (!carousel) return;

  // 防止重复初始化（若脚本被多次加载）
  if (carousel.dataset.carouselInitialized) return;
  carousel.dataset.carouselInitialized = '1';

  const slides = Array.from(carousel.querySelectorAll('.slide'));
  const nextBtn = carousel.querySelector('.carousel-control.next');
  const prevBtn = carousel.querySelector('.carousel-control.prev');
  // 确保 current 在生成指示器前已知，避免引用未定义变量
  let current = slides.findIndex(s => s.classList.contains('active'));
  if (current < 0) current = 0;
  // 指示器容器与字母映射（不够时循环使用字母）
  const indicatorsContainer = carousel.querySelector('.carousel-indicators');
  const letters = ['K','M','N','Z'];

  // 动态生成指示器（如果 HTML 中没有或数量不匹配时）
  if (indicatorsContainer) {
    const existing = Array.from(indicatorsContainer.querySelectorAll('.indicator'));
    if (existing.length !== slides.length) {
      indicatorsContainer.innerHTML = '';
      slides.forEach((s, i) => {
        const btn = document.createElement('button');
        btn.className = 'indicator';
        btn.type = 'button';
        btn.dataset.index = String(i);
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-label', `第 ${i+1} 张`);
        btn.setAttribute('aria-selected', i === current ? 'true' : 'false');
        btn.textContent = letters[i % letters.length];
        indicatorsContainer.appendChild(btn);
      });
    }
  }

  const indicators = Array.from(carousel.querySelectorAll('.indicator'));
  let timer = null;
  const interval = (() => {
    const v = carousel.dataset.interval;
    return (v && !isNaN(Number(v)) && Number(v) > 0) ? Number(v) : 4000;
  })();

  if (slides.length === 0) return;

  // current 已在上方初始化

  // 初始化 ARIA 与样式基线
  slides.forEach((s, i) => {
    s.setAttribute('role', 'tabpanel');
    s.setAttribute('aria-hidden', i === current ? 'false' : 'true');
    // 确保只有 active 的 slide 可见（兼容现有 CSS）
    s.style.zIndex = (i === current) ? '2' : '1';
  });
  if (indicators.length === slides.length) {
    indicators.forEach((btn, i) => {
      btn.classList.toggle('active', i === current);
      btn.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });
  }

  function show(index) {
    if (!slides.length) return;
    index = ((index % slides.length) + slides.length) % slides.length;
    slides.forEach((s, i) => {
      const active = i === index;
      s.classList.toggle('active', active);
      s.setAttribute('aria-hidden', active ? 'false' : 'true');
      s.style.zIndex = active ? '2' : '1';
    });
    if (indicators.length === slides.length) {
      indicators.forEach((btn, i) => {
        const active = i === index;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }
    current = index;
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  // 绑定按钮事件（不修改按钮结构）
  if (nextBtn) nextBtn.addEventListener('click', () => { next(); resetTimer(); });
  if (prevBtn) prevBtn.addEventListener('click', () => { prev(); resetTimer(); });

  // 仅在 indicators 数量与 slides 匹配时绑定（避免错误）
  if (indicators.length === slides.length) {
    indicators.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index);
        if (!isNaN(idx)) { show(idx); resetTimer(); }
      });
    });
  }

  // 使轮播可被键盘操作
  carousel.setAttribute('tabindex','0');
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { prev(); resetTimer(); }
    if (e.key === 'ArrowRight') { next(); resetTimer(); }
  });

  function startTimer() { if (timer) return; if (slides.length > 1) timer = setInterval(next, interval); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function resetTimer() { stopTimer(); startTimer(); }

  carousel.addEventListener('mouseenter', stopTimer);
  carousel.addEventListener('mouseleave', startTimer);
  carousel.addEventListener('focusin', stopTimer);
  carousel.addEventListener('focusout', startTimer);

  // 初始化显示并启动定时器（仅在多张时）
  show(current);
  startTimer();
});

/* ---------- 认证状态管理（简单的 localStorage 模拟） ---------- */
// 公开函数，其他页面可调用
window.getStoredUser = function(){
  try{ const s = localStorage.getItem('kmnzUser'); return s? JSON.parse(s): null; }catch(e){return null}
};
// 简单的用户库管理（用于本地模拟多用户注册）
window.getUsers = function(){
  try{ const s = localStorage.getItem('kmnzUsers'); return s? JSON.parse(s): []; }catch(e){ return []; }
};
window.saveUsers = function(users){
  try{ localStorage.setItem('kmnzUsers', JSON.stringify(users||[])); }catch(e){}
};

window.loginUser = function(user){
  // user: {id: 'email', name?: '昵称', avatar: 'assets/...'} — 将当前登录用户写入 kmnzUser，并在 kmnzUsers 中 upsert
  try{ localStorage.setItem('kmnzUser', JSON.stringify(user)); }catch(e){}
  try{
    if(user && user.id){
      const users = window.getUsers();
      const idx = users.findIndex(u=>String(u.id)===String(user.id));
      if(idx >= 0) users[idx] = Object.assign({}, users[idx], user);
      else users.push(Object.assign({}, user));
      window.saveUsers(users);
    }
  }catch(e){}
  if(typeof window.updateAuthUI === 'function') window.updateAuthUI();
};

window.logoutUser = function(){
  try{ localStorage.removeItem('kmnzUser'); }catch(e){}
  if(typeof window.updateAuthUI === 'function') window.updateAuthUI();
  // 注销后跳转到登录页面
  try{ location.href = 'auth.html#login'; }catch(e){}
};

window.updateAuthUI = function(){
  const user = window.getStoredUser();
  const authBtn = document.getElementById('nav-auth-btn');
  const userBox = document.getElementById('nav-user');
  if(user){
    if(authBtn) authBtn.hidden = true;
    if(userBox){
      userBox.hidden = false;
      userBox.dataset.logged = '1';
      const img = document.getElementById('nav-user-avatar');
      const idSpan = document.getElementById('nav-user-id');
      if(img && user.avatar) img.src = user.avatar;
      if(idSpan) idSpan.textContent = user.id || '';
    }
  } else {
    // 未登录：隐藏用户信息区域，仅显示登录/注册按钮
    if(authBtn) authBtn.hidden = false;
    if(userBox){
      userBox.hidden = true;
      userBox.dataset.logged = '0';
      const img = document.getElementById('nav-user-avatar');
      const idSpan = document.getElementById('nav-user-id');
      if(img) img.src = 'assets/images/default4.png';
      if(idSpan) idSpan.textContent = '';
    }
  };
};

// 当 DOM 准备好后绑定按钮动作并运行一次更新
document.addEventListener('DOMContentLoaded', function(){
  const authBtn = document.getElementById('nav-auth-btn');
  const signout = document.getElementById('nav-signout');
  if(authBtn){ authBtn.addEventListener('click', ()=>{ location.href = 'auth.html#login'; }); }
  if(signout){ signout.addEventListener('click', ()=>{ window.logoutUser(); }); }
  // 首次渲染
  if(typeof window.updateAuthUI === 'function') window.updateAuthUI();
});

  // 增加用户菜单（头像编辑已移至 user.html）
document.addEventListener('DOMContentLoaded', function(){
  const userBox = document.getElementById('nav-user');
  if(!userBox) return;

  // 点击头像或 id：未登录时跳转到登录页，已登录时进入个人页面
  userBox.addEventListener('click', (e)=>{
    // 如果点击退出按钮则忽略（已有绑定）
    if(e.target && (e.target.id === 'nav-signout' || e.target.closest('#nav-signout'))) return;
    const user = window.getStoredUser();
    if(!user){
      // 未登录：前往登录页面
      location.href = 'auth.html#login';
      return;
    }
    // 已登录：前往个人页，个人页提供头像编辑
    location.href = 'user.html';
  });

  // 构建菜单项
  let menu = userBox.querySelector('.user-menu');
  if(!menu){
    menu = document.createElement('div'); menu.className = 'user-menu';
    menu.innerHTML = `
      <a href="#" id="menu-profile">查看资料</a>
      <button id="menu-edit-avatar">编辑头像</button>
    `;
    userBox.appendChild(menu);
  }

  // 点击菜单项处理
  menu.querySelector('#menu-profile').addEventListener('click', (e)=>{
    e.preventDefault();
    const user = window.getStoredUser();
    if(user){
      location.href = 'user.html';
    } else {
      alert('未登录');
    }
    userBox.classList.remove('open');
  });

  menu.querySelector('#menu-edit-avatar').addEventListener('click', (e)=>{
    e.preventDefault();
    userBox.classList.remove('open');
    location.href = 'user.html';
  });

  // 绑定注册表单内交互：密码强度与匹配
  const pwd = document.getElementById('reg-password');
  const pwd2 = document.getElementById('reg-password2');
  const pwdBar = document.getElementById('pwd-bar');
  const matchMeta = document.getElementById('match-meta');

  function calcStrength(s){
    if(!s) return 0;
    let score = 0;
    if(s.length >= 8) score += 1;
    if(/[A-Z]/.test(s)) score += 1;
    if(/[0-9]/.test(s)) score += 1;
    if(/[^A-Za-z0-9]/.test(s)) score += 1;
    return score;
  }
  if(pwd){ pwd.addEventListener('input', ()=>{
    const v = pwd.value||''; const s = calcStrength(v); const pct = (s/4)*100; if(pwdBar) pwdBar.style.width = pct+'%';
  }); }
  if(pwd2){ pwd2.addEventListener('input', ()=>{
    const v1 = pwd.value||''; const v2 = pwd2.value||'';
    if(!v2) matchMeta.textContent = '';
    else if(v1 === v2) { matchMeta.textContent = '两次密码匹配'; matchMeta.style.color = '#2e7d32'; }
    else { matchMeta.textContent = '两次密码不一致'; matchMeta.style.color = '#c0392b'; }
  }); }

  

  // 关闭菜单时点击文档任意处
  document.addEventListener('click', (e)=>{
    if(!userBox.contains(e.target)) userBox.classList.remove('open');
  });
});

// 头像编辑已搬移到 user.html，页面脚本会复用 `window.processAvatarFile` 和 `window.loginUser`。

/* 默认头像集合：使用工作区内现有图片作为随机分配池 */
window.defaultAvatars = [
  'assets/images/Lita.PNG',
  'assets/images/Tina.PNG',
  'assets/images/Nero.PNG',
  'assets/images/default4.png' /* 占位：可替换为你上传的图片 */
];

// 接收 File 对象，返回压缩/缩放后的 dataURL，限制尺寸与大小
window.processAvatarFile = function(file, opts){
  const maxDim = (opts && opts.maxDim) || 256; // px
  const maxBytes = (opts && opts.maxBytes) || 150 * 1024; // bytes

  return new Promise((resolve, reject)=>{
    if(!file || !file.type.startsWith('image/')) return reject(new Error('不是图片文件'));
    const reader = new FileReader();
    reader.onload = ()=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.width, h = img.height;
        const ratio = Math.min(1, maxDim / Math.max(w, h));
        w = Math.round(w * ratio); h = Math.round(h * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // 优先尝试 WebP 导出（更小），若不支持或大小仍超限则回退到 JPEG
        const tryExport = (mime, quality)=>{
          try{
            const dataUrl = canvas.toDataURL(mime, quality);
            const b64 = dataUrl.split(',')[1] || '';
            const byteLen = Math.ceil(b64.length * 3 / 4);
            return { dataUrl, byteLen };
          }catch(e){
            return null;
          }
        };

        // 尝试 WebP
        const webpSupportTest = (()=>{
          try{
            const testCanvas = document.createElement('canvas');
            return !!(testCanvas.toDataURL && testCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0);
          }catch(e){ return false; }
        })();

        let quality = 0.92;
        const mimeCandidates = webpSupportTest ? ['image/webp','image/jpeg'] : ['image/jpeg'];

        (function tryLoop(){
          for(const mime of mimeCandidates){
            const res = tryExport(mime, quality);
            if(res){
              if(res.byteLen <= maxBytes || quality <= 0.5){
                return resolve(res.dataUrl);
              }
            }
          }
          quality = Math.max(0.5, quality - 0.12);
          if(quality <= 0.5) {
            // 最终回退到 JPEG 最低质量
            const final = tryExport('image/jpeg', 0.5);
            if(final) return resolve(final.dataUrl);
            return resolve(canvas.toDataURL());
          }
          setTimeout(tryLoop,0);
        })();
      };
      img.onerror = ()=> reject(new Error('无法加载图片'));
      img.src = reader.result;
    };
    reader.onerror = ()=> reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
};

// 重置密码处理：在 reset.html 上绑定，修改 localStorage 中的用户密码并登录
document.addEventListener('DOMContentLoaded', function(){
  const resetForm = document.getElementById('reset-form');
  if(!resetForm) return;
  resetForm.addEventListener('submit', function(e){
    e.preventDefault();
    const status = document.getElementById('reset-status');
    function fail(msg){ if(status){ status.textContent = msg; status.style.color = '#c0392b'; } return false; }
    const email = (document.getElementById('reset-email').value || '').trim();
    const p = (document.getElementById('reset-password').value || '');
    const p2 = (document.getElementById('reset-password2').value || '');
    if(!email) return fail('请填写邮箱或用户名。');
    if(p.length < 8) return fail('密码长度至少 8 位。');
    if(p !== p2) return fail('两次密码不一致。');
    const users = window.getUsers();
    const idx = users.findIndex(u => String(u.id) === String(email));
    if(idx < 0) return fail('该账户不存在。');
    // 更新密码并保存
    users[idx].password = p;
    window.saveUsers(users);
    // 登录该用户
    const matched = users[idx];
    const avatar = matched.avatar || (window.defaultAvatars && window.defaultAvatars.length ? window.defaultAvatars[0] : 'assets/images/default4.png');
    const user = { id: matched.id, name: matched.name || matched.id, avatar };
    window.loginUser(user);
    if(status){ status.style.color = ''; status.textContent = '密码已重置并已登录，1 秒后跳转到首页…'; }
    setTimeout(()=>{ location.href = 'index.html'; }, 1000);
  });
});
