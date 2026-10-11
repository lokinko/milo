# Milo · 循日健康规划

从现有循日 Site 迁出的独立源码版。保留每日安排、一周饮食、术后康复、居家/工位教程、就诊随访、健康记录和 WalkBack 研究解读。使用独立密码登录、服务器 SQLite 保存，无需 ChatGPT 认证。

## 源码一键部署

在 **Linux / systemd 服务器**执行，建议 Ubuntu 22.04+ 或 Debian 12+。服务器需有 Python 3、curl、tar/xz、标准系统工具，以及已服务 `www.madeagents.ai` 的 Nginx HTTPS 配置。DNS 和证书须已就绪。

```bash
git clone https://github.com/lokinko/milo.git
cd milo
sudo ./deploy.sh
```

首次输入并确认一个 12–256 字符的独立密码。脚本会：

1. 检查现有 Nginx HTTPS 配置，定位 `server_name www.madeagents.ai`，只增加 `/milo` 路由。
2. 使用可用的系统 Node.js 24+；若没有，从 Node.js 官网下载 Node.js 24，校验 SHA256，安装到 `/opt/milo/runtime/node`，不替换系统 Node.js。
3. 以非 root 用户 `milo` 执行 `npm ci --include=dev` 和源码构建，组装包含静态资源的 Next.js standalone 发布目录。
4. 更新前备份 SQLite，切换版本，启动 `milo.service`；检查实际新版本的健康状态，失败则恢复上一版本和登录配置。
5. 校验、重载 Nginx，并验证本机 HTTPS 入口，成功后输出 `https://www.madeagents.ai/milo`。

应用监听 `127.0.0.1:3088`。systemd 管理进程、异常重启及开机启动。第一次准备 Node.js 与安装依赖需要访问 `nodejs.org` 和 npm registry；建议至少 2GB 可用内存。

## 更新与管理

在原源码仓库目录执行：

```bash
git pull --ff-only
sudo ./deploy.sh
```

构建新版本时旧服务继续运行，切换时会短暂重启。原密码和健康记录自动保留。每次发布保留独立目录及上一版本，便于恢复；数据库备份保存于独立目录。

```bash
sudo systemctl status milo
sudo journalctl -u milo -f
sudo systemctl restart milo
sudo ./deploy.sh --reset-password
```

`--reset-password` 会使旧登录会话失效。

| 路径 | 内容 |
| --- | --- |
| `/opt/milo/current` | 指向当前发布版本的符号链接 |
| `/opt/milo/releases/` | 独立发布目录，代码更新不写入原版本 |
| `/opt/milo/shared/data/milo.sqlite` | 持久化健康记录与登录会话 |
| `/opt/milo/shared/backups/` | 更新前的一致 SQLite 备份 |
| `/opt/milo/shared/.deploy/` | 私密配置与密码散列，目录 700、配置 600 |
| `/etc/systemd/system/milo.service` | 服务配置，不含密码散列 |
| 源码目录的 `.deploy/nginx-backups/` | Nginx 配置备份 |

源码目录不存储生产数据库和密码。不要删除 `/opt/milo/shared`；它保存真实健康记录。旧发布目录和备份由你按需要保留，脚本不会自动清理历史数据。

## 部署选项

```bash
# 先检查环境和 Nginx，不构建、不启动服务
sudo ./deploy.sh --check

# 宝塔或复杂 Nginx 配置：明确指定已经启用的配置文件
sudo ./deploy.sh --nginx-config /www/server/panel/vhost/nginx/www.madeagents.ai.conf

# 可选的域名、子路径和内部端口
sudo ./deploy.sh --origin https://your-domain.example --path /milo --port 3088

# 启动应用、生成 Nginx 片段，暂不安装路由
sudo ./deploy.sh --skip-nginx
```

`--skip-nginx` 生成源码目录的 `.deploy/nginx-milo.conf`，需要 include 到现有主站 server 块内部。可以在第一次部署指定 `--install-dir /srv/milo`，之后每次沿用该选项；已有安装不能用这个参数搬迁数据库。

脚本不申请证书、不修改 DNS。无法唯一定位 Nginx server 块或已有手工 `/milo` 路由时停止；请指定正确配置或先处理路由冲突。Nginx 校验/reload 失败会恢复原 Nginx 文件，同时恢复上一应用版本。若最终 HTTPS 访问校验失败，保留已健康启动的版本，并明确报错供检查域名、证书和 Nginx 设置。

## 导入原网站健康记录

仓库是公开的，初始个人档案和体检结果已替换为通用示例。密钥、数据库、备份和运行配置不进入 Git，也不进入发布目录。

1. 在原循日 Site 的“我的档案”或“健康记录”中导出 JSON 完整备份。
2. 登录 Milo，进入“我的档案 → 保存与迭代 → 导入原网站的 JSON 备份”。
3. 核对、确认导入，再点击“保存修改”。档案、餐单、每日记录、医嘱与训练设置会一并导入。

健康备份请保存在私密位置。此版是只有一个独立密码的个人空间。

## 开发与验证

本地需 Node.js 24+、npm、Python 3。

```bash
npm ci
npm test
npm run build
npm run test:integration
```

集成测试从与部署相同的 standalone 发布目录启动实际 Node.js 服务，检查资源路径、独立登录、CSRF、校验、保存冲突、重启持久化、退出撤销和限流。测试还检查生产配置权限、更新保留密码、密码重置、systemd 配置及 Nginx 路由安装逻辑。

本机已验证源码构建与实际发布目录中的应用行为；目标 Linux/systemd/Nginx 服务器尚未实际执行完整部署流程。

本地开发设置 `APP_ORIGIN=http://localhost:3000` 和 `AUTH_PASSWORD_HASH`（用 `lib/password.mjs` 的 `hashPassword` 生成，写入忽略的 `.env.local`），然后 `npm run dev`。

参考：[Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)、[Node.js SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)、[systemd 执行配置](https://github.com/systemd/systemd/blob/main/man/systemd.exec.xml)、[Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)。医疗研究来源保留在站内。
