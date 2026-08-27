# 灵感 Radar Console 线上登录说明

后台不能用纯静态文件直接上线。线上访问请通过 `server.js` 启动服务，它会保护 `admin.html`、`admin.css`、`admin.js`，并用 HttpOnly Cookie 保存管理员会话。

## 本地启动

```bash
npm start
```

本地开发默认账号：

```text
admin / radar2026
```

## 线上启动

线上必须设置管理员密码：

```bash
NODE_ENV=production \
RADAR_ADMIN_USER=admin \
RADAR_ADMIN_PASSWORD='replace-with-a-strong-password' \
HOST=0.0.0.0 \
PORT=4173 \
npm start
```

如果部署在 HTTPS 反向代理后面，建议让代理传递 `X-Forwarded-Proto: https`，或设置：

```bash
COOKIE_SECURE=true
```

## 当前安全策略

- 管理员密码只从环境变量读取，不写入前端代码。
- 登录成功后使用 HttpOnly、SameSite=Strict 的 Session Cookie。
- 后台页面和后台 JS/CSS 需要登录后才能访问。
- 登录接口有简单 IP 级限流，10 分钟内最多 5 次失败尝试。
- 服务端设置了基础安全响应头：CSP、X-Frame-Options、Referrer-Policy、nosniff。

## 后续线上增强

- 接入数据库保存资源、审核记录和点击事件。
- Session 存储迁移到 Redis，支持多实例部署。
- 管理员账号改为数据库用户，并存储密码哈希。
- 增加操作审计日志、角色权限和二次验证。
