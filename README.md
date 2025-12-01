# Noblesse Billing Admin

独立的打赏/账单后台管理系统（可单独上传为新仓库并部署到新域名）。

## 功能
- 总账汇总、按用户查询账单、订单确认到账
- 通过 Redis 保存用户与账单关联
- 管理操作使用 `ADMIN_API_KEY` 鉴权

## 目录
- `index.html` + `admin.js` 管理后台前端
- `styles.css` UI 样式
- `api/` Serverless API（Vercel 兼容）
- `.env.example` 环境变量模板

## 环境变量
- `REDIS_URL`：Redis 连接串（推荐 TLS/云端）
- `ADMIN_API_KEY`：后台操作密钥

示例（使用你提供的实例）：
```
REDIS_URL=rediss://default:ngWfbHbxkzHC71qTqGUMjYJF9GzdZHPE@redis-19016.c99.us-east-1-4.ec2.cloud.redislabs.com:19016
ADMIN_API_KEY=change-this
```

## 本地验证
- 安装 Vercel CLI：`npm i -g vercel`
- 进入本目录并链接：`vercel link`
- 同步环境：`vercel env pull .env.local`
- 本地运行（支持 API）：`vercel dev`

前端页面：`http://localhost:3000/` 访问管理台

## 生产部署
- 直接将本文件夹提交为新仓库
- 在 Vercel 新建项目并设置 `REDIS_URL`、`ADMIN_API_KEY`
- 部署后即可通过新域名访问

## redis-cli 快速连接
- 安装 Docker Desktop
- 直接连到你的云 Redis：
```
# Windows PowerShell（建议）
docker run --rm -it redis:7-alpine redis-cli -u "redis://default:ngWfbHbxkzHC71qTqGUMjYJF9GzdZHPE@redis-19016.c99.us-east-1-4.ec2.cloud.redislabs.com:19016"
```

> 如果实例要求 TLS，可将协议改为 `rediss://`。
