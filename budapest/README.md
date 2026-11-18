# 布达佩斯 PWA：更新和安全说明

此目录可上传到已启用 GitHub Pages 的仓库 `budapest/` 子路径，访问 `https://yangyangqu.github.io/europe-trip-2026-pages/budapest/`。

- `index.html`：公开的密码输入页，不含行程明文和密码
- `data.locked.json`：AES-256-GCM 加密的行程，不含明文
- `sw.js`：让 iPhone 断网也能访问已经缓存的密码页面及加密行程
- `manifest.webmanifest` 和 `icon.svg`：主屏幕安装

**首次使用：**在 iPhone 的 Safari 打开网页，输入密码，再“分享 → 添加到主屏幕”。联网打开至少一次，确认显示“离线行程已缓存”，再在飞行模式测试。若尚未缓存，首次访问不能离线。

**更新：**源 HTML 文件只放本地或你控制的私有存储。修改后运行构建脚本重新加密 `data.locked.json`，将新密文提交至 GitHub Pages。切勿直接将源 HTML 或密码提交到公开仓库。后续网页上线后的新版本会在你下次联网打开时刷新缓存；旧版可能会保留到刷新完成。

**密码：**不要写进 README、GitHub Issue 或源码里。密码不能丢；丢失后只能使用原始 HTML 重新加密并设置新密码。

**隐私：**整个行程是加密的，这不同于只用 CSS/JavaScript 遮挡文字的伪密码锁。GitHub Pages 的 URL 和静态加密文件仍然公开可见；如需强身份验证，应另用有后端鉴权的服务。
