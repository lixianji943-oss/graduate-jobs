# 应届生岗位信息库

这是一个基于飞书多维表格同步数据的应届生岗位信息库。

## 本地预览

网页入口：

```text
outputs/graduate-jobs.html
```

本地同步飞书数据：

```powershell
$env:FEISHU_MAX_RECORDS='2000'
& "C:\Users\86135\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\sync-feishu-jobs.js
```

## Cloudflare Pages 部署

Cloudflare Pages 推荐配置：

```text
Framework preset: None
Build command: npm run build
Build output directory: outputs
Root directory: /
```

Cloudflare Pages 环境变量：

```text
FEISHU_APP_ID=你的飞书 App ID
FEISHU_APP_SECRET=你的飞书 App Secret
FEISHU_APP_TOKEN=GtSLbyyR3aCENOsJYC6cdlsVnih
FEISHU_TABLE_ID=tblH4au5rnBcqHgJ
FEISHU_MAX_RECORDS=2000
```

不要把 `FEISHU_APP_SECRET` 写进 GitHub。它只能放在 Cloudflare Pages 的环境变量里。

## 数据流程

```text
飞书多维表格 -> scripts/sync-feishu-jobs.js -> outputs/jobs-data.json -> outputs/graduate-jobs.html
```

网页会优先读取 `jobs-data.json`。如果没有这个文件，则显示页面内置示例数据。
