# 后台管理系统

## 功能

- 查询账号与交易流水
- 支付接口健康检查与实时监控（SSE）
- 支付回调实时监控（SSE）
- 接入 Cloudflare Zero Trust（Access JWT 校验）
- IP 白名单限制
 - 前端不保存任何数据，所有数据均由后端 API 从数据库读取

## 快速开始

1. 复制 `.env.example` 为 `.env` 并填写:
   - `PORT` 服务端口
   - `DB_PATH` SQLite 文件路径（演示用，可替换为你的真实库）
   - `IP_WHITELIST` 允许访问的 IP 列表
   - `CF_ACCESS_JWKS_URL` 一般为 `https://你的域名/cdn-cgi/access/certs`
   - `CF_ACCESS_AUD` Cloudflare Access 应用 AUD 值
   - `CF_ACCESS_ISS` 形如 `https://你的team名.cloudflareaccess.com`
   - `PAYMENT_HEALTH_URL` 支付健康检查 URL
- `SUPABASE_URL` 你的 Supabase 项目地址
- `SUPABASE_SERVICE_KEY` Supabase 服务密钥（仅后端使用，不要提交）
- `SUPABASE_ANON_KEY` Supabase 匿名密钥（如仅需读取公开表）
   - `ADMIN_USERNAME` / `ADMIN_PASSWORD` / `ADMIN_SECRET` 管理员登录与会话
   - `VERCEL_BLOB_TOKEN` 用于管理存储在 Vercel Blob 的图片/视频
   - `PAYMENT_CALLBACKS_URL` 支付回调状态数据源 URL

2. 安装依赖并启动

```bash
npm install
npm run dev
```

3. 浏览器访问 `http://localhost:8787`

## Vercel 部署（关联 GitHub 仓库）

- 已提供 `vercel.json`，将根路径映射到 `web/`，API 映射到 `/api`
- 部署步骤：
  - 在 Vercel 选择“Import Git Repository”，指向你的 GitHub 仓库 `admin-system`
  - 在 Project Settings → Environment Variables 配置：
    - `SUPABASE_URL`、`SUPABASE_SERVICE_KEY`
    - `CF_ACCESS_JWKS_URL`、`CF_ACCESS_AUD`、`CF_ACCESS_ISS`
    - `IP_WHITELIST`、`PAYMENT_HEALTH_URL`
  - 选择 Node.js 运行时为 `nodejs20.x`；创建后自动构建并部署
  - 如需预览/生产环境，分别在 Vercel 中设置对应环境变量

> 说明：Express 已通过 `serverless-http` 适配到 Vercel Serverless Functions（`api/index.js`）。

## Cloudflare Access 说明

- 在 Cloudflare Zero Trust 创建应用并开启 **One-time Access Links** 或指定身份提供商登录
- 将应用的 `AUD` 与团队 `ISS` 填入环境变量
- 后端会校验请求头 `Cf-Access-Jwt-Assertion` 的 JWT

## 替换为真实数据库

- 已接入 Supabase，使用 PostgREST 访问 `accounts` 与 `transactions` 表
- Supabase Auth 管理：提供用户列表、创建与删除接口（服务密钥权限）
- 如需扩展表结构或字段，请在 Supabase 中创建对应表并调整查询参数

### 管理员账号表
- SQL 位于 `db/supabase_admin.sql`，在 Supabase SQL Editor 执行即可创建
- 字段：`id`、`auth_user_id`、`email`、`name`、`password_hash`、`role`（admin/superadmin/viewer）、`status`（active/disabled）、`ip_whitelist[]`、`mfa_enabled`、`last_login_at`、`created_at`、`updated_at`
- 接口：
  - `GET /api/admin-accounts?query&role&status`
  - `POST /api/admin-accounts`（JSON 负载）
  - `PATCH /api/admin-accounts/:id`
  - `DELETE /api/admin-accounts/:id`
 - 登录：`POST /api/admin/login` 使用 `email + password` 验证；密码在后端以 `bcrypt` 哈希存储与校验
 - 分离策略：普通用户存在于 Supabase `auth.users`，管理员存在于 `admin_accounts`，用户列表接口会自动排除 `admin_accounts` 的邮箱

## Supabase 管理接口

- 表数据：后端代理至 `${SUPABASE_URL}/rest/v1`，支持查询与增删改
- 用户管理：后端代理至 `${SUPABASE_URL}/auth/v1/admin`，支持列表、创建与删除
- 注意：用户管理需要 `SUPABASE_SERVICE_KEY`（服务密钥）。若仅设置了 `SUPABASE_ANON_KEY`，用户管理接口不可用，但可读取开启策略的业务表。
- `.env` 必须设置 `SUPABASE_SERVICE_KEY`；不要将密钥暴露到前端或提交到仓库

- 登录：访问根路径，未登录则显示登录页，成功后进入侧边导航的管理面板
- 客户端页面管理：调用后端代理的 Vercel Blob API 列表/上传/删除资源
- 支付回调监控：SSE 轮询 `PAYMENT_CALLBACKS_URL` 并实时显示
## 数据隐私与缓存
- 前端不使用 `localStorage`/`sessionStorage`/IndexedDB
- 后端对 `/api/*` 响应设置 `Cache-Control: no-store` 与 `Pragma: no-cache`
- 管理员会话采用 HttpOnly Cookie，生产环境自动附加 `Secure`
