# Milo · 循日健康规划

从现有循日 Site 迁出的独立部署版。保留每日安排、一周饮食、术后康复、居家/工位教程、就诊随访、健康记录和 WalkBack 研究解读。使用独立密码登录、服务器 SQLite 保存；不依赖 ChatGPT 或 Cloudflare D1。

## 一键部署

在 **Linux 服务器**执行。前置条件：Docker Engine、Docker Compose v2、Python 3、curl，以及已经服务 `www.madeagents.ai` 的 Nginx HTTPS 配置。脚本不安装/替换系统组件，不申请 TLS 证书，不改 DNS。

```bash
git clone https://github.com/lokinko/milo.git
cd milo
sudo ./deploy.sh
```

首次运行输入并确认一个 12–256 字符的密码。脚本会：

1. 查找 `server_name www.madeagents.ai` 的 HTTPS server 块；无法唯一定位时停止，不覆盖现有站点。
2. 将密码的 scrypt 加盐散列保存在忽略的 `.deploy/` 目录，不保存明文密码。
3. 更新前创建一致的 SQLite 备份，构建并启动非 root Docker 容器。
4. 验证应用健康，给现有 server 块添加 `/milo` 路由；`nginx -t` 通过后再 reload。
5. 验证本机 HTTPS 路由，成功后输出 `https://www.madeagents.ai/milo`。

应用只绑定 `127.0.0.1:3088`；主站的其他路由保留。数据库存放在固定 Docker volume `milo-data`，容器更新/重建不会删除它。**不要执行 `docker volume rm milo-data`。**

后续更新：

```bash
git pull --ff-only
sudo ./deploy.sh
```

如果 Nginx 配置较复杂或使用宝塔，可明确指定已启用的配置文件：

```bash
sudo ./deploy.sh --nginx-config /www/server/panel/vhost/nginx/www.madeagents.ai.conf
```

先检查而不部署：`sudo ./deploy.sh --check`。只启动应用并生成 `.deploy/nginx-milo.conf`：`sudo ./deploy.sh --skip-nginx`，此模式不会声称域名已部署。生成的片段需要 include 在主站 server 块内部。

可选：`--origin https://your-domain.example --path /milo --port 3088`。路径更改会重新构建。`--reset-password` 设置新密码并使旧登录会话失效。备份位于 `backups/`；Nginx 原始配置备份在 `.deploy/nginx-backups/`。应用新版本启动失败时，脚本恢复上一镜像与配置；Nginx 校验/reload 失败时恢复原 Nginx 文件。

若 Docker 尚未安装，请先按 [Docker 官方 Linux 安装文档](https://docs.docker.com/engine/install/) 配置。新域名的 DNS 和已有 HTTPS 证书需先就绪。首次构建需要访问 Docker Hub 与 npm registry，并建议服务器有至少 2GB 可用内存。

## 迁移已有健康记录

这个 GitHub 仓库是公开的，初始档案与检查数据已经替换为通用示例，不含原用户的个人体检信息；密钥、数据库、备份和运行配置均不进入 Git 或 Docker 构建上下文。

1. 在原循日 Site 的“我的档案”或“健康记录”中导出 JSON 完整备份。
2. 用独立密码登录 Milo，进入“我的档案 → 保存与迭代 → 导入原网站的 JSON 备份”。
3. 核对后确认导入，再点击“保存修改”。旧档案、餐单、记录、医嘱与训练设置会一并导入；未保存前仅在当前页面中替换。

请把健康备份保存在私密位置，勿提交到公开仓库。此版是一个个人空间，只有一个独立密码；不是多用户账号系统。

## 本地开发与验证

需 Node.js 24+、npm、Python 3。

```bash
npm ci
npm test
npm run build
npm run test:integration
```

生产集成检查覆盖 `/milo` 资源路径、登录、CSRF、输入校验、保存冲突、大小限制、重启持久化、退出撤销和登录限流。Nginx 测试覆盖正确 HTTPS server 选择、其他站点保留、重复执行及已有路由冲突。

迁移时已通过生产构建、集成测试、浏览器登录与页面检查、Docker 镜像构建。完整部署流程仍需在目标 Linux/Nginx 服务器验证；本机 Docker Desktop 的测试容器启动阻塞，未据此宣称服务器部署已完成。

本地开发需设置 `APP_ORIGIN=http://localhost:3000` 和 `AUTH_PASSWORD_HASH`（用 `lib/password.mjs` 的 `hashPassword` 生成，写入忽略的 `.env.local`），然后运行 `npm run dev`。生产部署请使用 `deploy.sh`。

## 实现与依据

Next.js standalone、Node.js 内置 SQLite、Docker Compose、Nginx 路径代理。参考 [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)、[Node.js SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)、[Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)。医疗研究来源保留在站内；生活计划和教程不能代替个体医嘱。
