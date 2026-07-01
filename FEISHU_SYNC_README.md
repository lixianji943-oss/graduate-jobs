# Feishu Job Sync

This project can sync jobs from a Feishu Bitable into:

```text
outputs/jobs-data.json
```

The web page already tries to load that file first. If it exists, jobs from Feishu will be shown automatically.

## 1. Prepare Feishu Config

Create a local `.env` file from `.env.example`, then fill in:

```text
FEISHU_APP_ID=your app id
FEISHU_APP_SECRET=your app secret
FEISHU_APP_TOKEN=GtSLbyyR3aCENOsJYC6cdlsVnih
FEISHU_TABLE_ID=your table id
```

Do not put `FEISHU_APP_SECRET` inside the HTML page.

Your current Bitable link already contains this app token:

```text
GtSLbyyR3aCENOsJYC6cdlsVnih
```

If you do not know the `table_id` yet, leave `FEISHU_TABLE_ID` empty, run the sync script once, and it will print the available tables.

## 2. Recommended Bitable Fields

Use these field names in Feishu:

```text
企业名称
企业性质
工作岗位
工作地点
学历要求
专业要求
岗位类型
岗位职责
任职要求
薪资范围
截止时间
官方投递链接
信息来源
来源类型
是否展示
审核状态
更新时间
```

The script can also recognize a few common aliases, such as `岗位名称`, `城市`, and `投递链接`.

## 3. Automatic Publish Rules

A record will be skipped if:

```text
是否展示 = 否
审核状态 is 待补充 / 已下架 / 不通过 / 拒绝 / 垃圾 / 重复
企业名称 is empty
工作岗位 is empty
工作地点 is empty
官方投递链接 is empty
官方投递链接 is not http(s)
截止时间 is expired
来源类型 is not one of 企业官网 / 官方招聘系统 / 学校就业网 / 官方公众号
```

If `审核状态` exists, it should be one of:

```text
自动通过
已通过
通过
发布
已发布
```

You can also set `是否展示 = 是` to publish a record.

## 4. Run Sync

From the project folder:

```powershell
& "C:\Users\86135\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" scripts\sync-feishu-jobs.js
```

After it succeeds, refresh:

```text
http://127.0.0.1:4173/graduate-jobs.html
```

## 5. Later Automation

For a zero-budget first version, run the script manually whenever you want to update data.

Later, this same script can be moved to GitHub Actions, a free cloud function, or a scheduled task.
