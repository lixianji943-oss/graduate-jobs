#!/usr/bin/env node

/*
 * Sync Feishu Bitable records into outputs/jobs-data.json.
 *
 * Required config can be provided through environment variables or a local .env:
 * FEISHU_APP_ID
 * FEISHU_APP_SECRET
 * FEISHU_APP_TOKEN
 * FEISHU_TABLE_ID
 *
 * Optional:
 * FEISHU_VIEW_ID
 * FEISHU_OUTPUT
 * FEISHU_INCLUDE_EXPIRED=true
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUTPUT = path.join(ROOT, "outputs", "jobs-data.json");
const DEFAULT_APP_TOKEN = "GtSLbyyR3aCENOsJYC6cdlsVnih";
const API_BASE = "https://open.feishu.cn/open-apis";

loadDotEnv(path.join(ROOT, ".env"));

const config = {
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appToken: process.env.FEISHU_APP_TOKEN || DEFAULT_APP_TOKEN,
  tableId: process.env.FEISHU_TABLE_ID,
  viewId: process.env.FEISHU_VIEW_ID,
  output: process.env.FEISHU_OUTPUT
    ? path.resolve(ROOT, process.env.FEISHU_OUTPUT)
    : DEFAULT_OUTPUT,
  includeExpired: process.env.FEISHU_INCLUDE_EXPIRED === "true",
  maxRecords: Number(process.env.FEISHU_MAX_RECORDS || 0)
};

const FIELD = {
  company: ["企业名称", "公司名称", "企业", "company"],
  nature: ["企业性质", "公司性质", "nature"],
  role: ["工作岗位", "招聘岗位", "岗位名称", "岗位", "职位名称", "role"],
  type: ["岗位类型", "行业分类", "职位类型", "type"],
  city: ["工作地点", "城市", "地点", "city"],
  degree: ["学历要求", "学历", "degree"],
  major: ["专业要求", "专业", "major"],
  target: ["招聘对象", "届次", "面向对象", "target"],
  deadline: ["截止时间", "投递截止时间", "截止日期", "deadline"],
  status: ["投递状态", "岗位状态", "status"],
  salary: ["薪资范围", "薪资与福利", "薪资", "salary"],
  source: ["信息来源", "公告来源", "来源", "source"],
  sourceType: ["来源类型", "链接类型", "sourceType"],
  link: ["官方投递链接", "官方投递网页", "投递链接", "公告链接", "链接", "link"],
  responsibilities: ["岗位职责", "职责", "responsibilities"],
  requirements: ["任职要求", "岗位要求", "要求", "requirements"],
  updated: ["更新时间", "更新日期", "updated"],
  display: ["是否展示", "展示", "发布", "display"],
  auditStatus: ["审核状态", "校验状态", "auditStatus"],
  note: ["问题备注", "备注", "note"]
};

const GOOD_AUDIT_STATUS = new Set(["自动通过", "已通过", "通过", "发布", "已发布"]);
const BAD_AUDIT_STATUS = new Set(["待补充", "已下架", "不通过", "拒绝", "垃圾", "重复"]);
const GOOD_SOURCE_TYPES = new Set(["企业官网", "官方招聘系统", "学校就业网", "官方公众号"]);

main().catch((error) => {
  console.error(`Sync failed: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  requireConfig();

  const token = await getTenantAccessToken(config.appId, config.appSecret);

  if (!config.tableId) {
    await printTables(token, config.appToken);
    throw new Error("FEISHU_TABLE_ID is missing. Pick a table_id above and add it to .env.");
  }

  const records = await listAllRecords(token, config.appToken, config.tableId, config.viewId);
  const { jobs, skipped } = transformRecords(records);

  const payload = {
    syncedAt: new Date().toISOString(),
    source: "feishu-bitable",
    appToken: config.appToken,
    tableId: config.tableId,
    totalRecords: records.length,
    publishedJobs: jobs.length,
    skipped,
    jobs
  };

  fs.mkdirSync(path.dirname(config.output), { recursive: true });
  fs.writeFileSync(config.output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(`Synced ${jobs.length} jobs from ${records.length} records.`);
  console.log(`Output: ${config.output}`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} records. See "skipped" in the output JSON.`);
  }
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) process.env[key] = value;
  }
}

function requireConfig() {
  const missing = [];
  if (!config.appId) missing.push("FEISHU_APP_ID");
  if (!config.appSecret) missing.push("FEISHU_APP_SECRET");
  if (!config.appToken) missing.push("FEISHU_APP_TOKEN");

  if (missing.length) {
    throw new Error(`Missing config: ${missing.join(", ")}. Create .env from .env.example first.`);
  }
}

async function getTenantAccessToken(appId, appSecret) {
  const response = await fetchJson(`${API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret
    })
  });

  if (!response.tenant_access_token) {
    throw new Error(`Could not get tenant access token: ${JSON.stringify(response)}`);
  }

  return response.tenant_access_token;
}

async function printTables(token, appToken) {
  const url = new URL(`${API_BASE}/bitable/v1/apps/${appToken}/tables`);
  url.searchParams.set("page_size", "100");

  const response = await fetchJson(url, {
    headers: authHeaders(token)
  });

  const tables = response.data?.items || [];
  if (!tables.length) {
    console.log("No tables found in this Bitable app.");
    return;
  }

  console.log("Tables in this Bitable app:");
  for (const table of tables) {
    console.log(`- ${table.name || "(untitled)"}: ${table.table_id}`);
  }
}

async function listAllRecords(token, appToken, tableId, viewId) {
  const all = [];
  let pageToken = "";
  const seenPageTokens = new Set();

  do {
    const url = new URL(`${API_BASE}/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
    url.searchParams.set("page_size", "500");
    if (pageToken) url.searchParams.set("page_token", pageToken);
    if (viewId) url.searchParams.set("view_id", viewId);

    const response = await fetchJson(url, {
      headers: authHeaders(token)
    });

    const data = response.data || {};
    const items = data.items || [];
    all.push(...items);
    console.log(`Fetched ${items.length} records, total ${all.length}.`);

    if (config.maxRecords && all.length >= config.maxRecords) {
      return all.slice(0, config.maxRecords);
    }

    const nextPageToken = data.page_token || "";
    if (!data.has_more || !nextPageToken) break;
    if (seenPageTokens.has(nextPageToken)) {
      throw new Error(`Repeated page token detected: ${nextPageToken}`);
    }

    seenPageTokens.add(nextPageToken);
    pageToken = nextPageToken;
  } while (pageToken);

  return all;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload;

  try {
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    throw new Error(`Invalid JSON from Feishu: ${text.slice(0, 200)}`);
  }

  if (!response.ok || payload.code !== 0) {
    throw new Error(`Feishu API error: HTTP ${response.status}, ${JSON.stringify(payload)}`);
  }

  return payload;
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=utf-8"
  };
}

function transformRecords(records) {
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const jobs = [];
  const skipped = [];

  for (const [index, record] of records.entries()) {
    const raw = record.fields || {};
    const job = normalizeJob(raw, record.record_id, index, today);
    const reason = getSkipReason(raw, job, today);
    const dedupeKey = [job.company, job.role, job.city, job.link].join("|").toLowerCase();

    if (reason) {
      skipped.push({ recordId: record.record_id, reason, company: job.company, role: job.role });
      continue;
    }

    if (seen.has(dedupeKey)) {
      skipped.push({ recordId: record.record_id, reason: "duplicate", company: job.company, role: job.role });
      continue;
    }

    seen.add(dedupeKey);
    jobs.push(job);
  }

  return { jobs, skipped };
}

function normalizeJob(raw, recordId, index, today) {
  const deadline = formatDate(getValue(raw, FIELD.deadline));
  const updated = formatDate(getValue(raw, FIELD.updated)) || today;
  const status = getText(raw, FIELD.status) || getAutoStatus(deadline, today);

  return {
    id: recordId || index + 1,
    company: getText(raw, FIELD.company) || "未填写企业",
    nature: getText(raw, FIELD.nature) || "未公开",
    role: getText(raw, FIELD.role) || "未填写岗位",
    type: getText(raw, FIELD.type) || "未分类",
    city: getText(raw, FIELD.city) || "未公开",
    degree: getText(raw, FIELD.degree) || "未公开",
    major: getText(raw, FIELD.major) || "未公开",
    target: getText(raw, FIELD.target) || "应届生",
    deadline,
    status,
    salary: getText(raw, FIELD.salary) || "未公开",
    source: getText(raw, FIELD.source) || getText(raw, FIELD.sourceType) || "待核验来源",
    sourceType: getText(raw, FIELD.sourceType) || "未填写",
    updated,
    link: getUrl(raw, FIELD.link),
    responsibilities: splitLines(getText(raw, FIELD.responsibilities) || "未公开"),
    requirements: splitLines(getText(raw, FIELD.requirements) || "未公开")
  };
}

function getSkipReason(raw, job, today) {
  const displayValue = getValue(raw, FIELD.display);
  const auditStatus = getText(raw, FIELD.auditStatus);
  const hasAuditStatus = auditStatus !== "";
  const sourceType = job.sourceType;

  if (isExplicitNo(displayValue)) return "display is not enabled";
  if (hasAuditStatus && BAD_AUDIT_STATUS.has(auditStatus)) return `bad audit status: ${auditStatus}`;
  if (hasAuditStatus && !GOOD_AUDIT_STATUS.has(auditStatus) && !isExplicitYes(displayValue)) {
    return `not approved: ${auditStatus}`;
  }

  if (!job.company || job.company === "未填写企业") return "missing company";
  if (!job.role || job.role === "未填写岗位") return "missing role";
  if (!job.city || job.city === "未公开") return "missing city";
  if (!job.link || job.link === "#") return "missing official link";
  if (!isAllowedUrl(job.link)) return "official link is not a valid http(s) URL";
  if (job.deadline && job.deadline < today && !config.includeExpired) return "expired";

  if (sourceType && sourceType !== "未填写" && !GOOD_SOURCE_TYPES.has(sourceType)) {
    return `unsupported source type: ${sourceType}`;
  }

  return "";
}

function getValue(raw, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(raw, name)) return raw[name];
  }
  return undefined;
}

function getText(raw, names) {
  return valueToText(getValue(raw, names));
}

function getUrl(raw, names) {
  const value = getValue(raw, names);

  if (!value) return "#";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    const firstUrl = value.map(valueToUrl).find(Boolean);
    return firstUrl || valueToText(value);
  }

  return valueToUrl(value) || valueToText(value) || "#";
}

function valueToUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return value.link || value.url || value.href || "";
  }
  return "";
}

function valueToText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join("、");
  if (typeof value === "object") {
    return (
      value.text ||
      value.name ||
      value.title ||
      value.value ||
      value.link ||
      value.url ||
      ""
    ).toString().trim();
  }
  return "";
}

function formatDate(value) {
  if (value === undefined || value === null || value === "") return "";

  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const number = Number(value);
    const millis = number > 9999999999 ? number : number * 1000;
    const date = new Date(millis);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  const text = valueToText(value);
  const match = text.match(/\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/);
  if (match) {
    const [year, month, day] = match[0].split(/[-/.]/);
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return text;
}

function getAutoStatus(deadline, today) {
  if (deadline && deadline < today) return "已截止";
  if (deadline && daysBetween(today, deadline) <= 14) return "即将截止";
  return "可投递";
}

function daysBetween(from, to) {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  return Math.ceil((end - start) / 86400000);
}

function splitLines(text) {
  return String(text)
    .split(/\r?\n|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isExplicitYes(value) {
  const text = valueToText(value).toLowerCase();
  return value === true || ["yes", "y", "true", "1", "是", "展示", "发布"].includes(text);
}

function isExplicitNo(value) {
  const text = valueToText(value).toLowerCase();
  return value === false || ["no", "n", "false", "0", "否", "不展示", "不发布"].includes(text);
}

function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (error) {
    return false;
  }
}
