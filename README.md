# KMNZ 资料站

这是一个纯静态站点，可以直接打开 HTML，也可以用本地静态服务器预览。

## 目录结构

```text
.
├── index.html              # 首页
├── members.html            # 成员列表
├── member1.html            # LITA
├── member2.html            # TINA
├── member3.html            # NERO
├── member4.html            # LIZ
├── history.html            # 历程
├── about.html              # 关于和链接
├── auth.html               # 登录 / 注册
├── reset.html              # 重置密码
├── user.html               # 个人中心
├── songcover.html          # 歌回封面导入
├── assets/
│   ├── fonts/
│   └── images/
├── css/
│   └── style.css           # 全站样式
└── js/
    ├── config.js           # 站点配置默认值
    ├── data.js             # 成员数据
    ├── main.js             # 全站通用交互
    ├── profile.js          # 个人中心交互
    ├── songcover.js        # 歌回页交互
    └── theme.js            # 主题初始化和切换
```

## 本地预览

直接打开 `index.html` 可以看页面。歌回导入和部分浏览器能力建议用本地服务器：

```powershell
python -m http.server 8080
```

然后访问 `http://localhost:8080/`。

## 配置

`js/config.js` 里只保留安全默认值。不要把私密代理 key 写进前端代码；静态站点里的 JS 会被所有访问者看到。

Firebase 仍兼容 `window.FIREBASE_CONFIG`。如果要接 Firebase，可以在 `js/config.js` 的 `firebaseConfig` 中填公开的 Web App 配置。

歌回页默认使用公开 CORS 代理兜底。如果你有自己的代理，把代理地址配置到 `KMNZ_CONFIG.songcoverProxy`，但不要把后端密钥放在这个项目里。
