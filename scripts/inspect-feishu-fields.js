#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const API_BASE = "https://open.feishu.cn/open-apis";

loadDotEnv(path.join(ROOT, ".env"));

const config = {
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  appToken: process.env.FEISHU_APP_TOKEN || "GtSLbyyR3aCENOsJYC6cdlsVnih",
  tableId: process.env.FEISHU_TABLE_ID
};

main().catch((error) => {
  console.error(`Inspect failed: ${error.message}`);
  process.exitCode = 1;
});

async function main() {
  if (!config.appId || !config.appSecret || !config.appToken || !config.tableId) {
    throw new Error("Missing FEISHU_APP_ID, FEISHU_APP_SECRET, FEISHU_APP_TOKEN, or FEISHU_TABLE_ID.");
  }

  const token = await getTenantAccessToken();
  const fields = await listFields(token);
  const records = await listRecords(token);

  console.log("Fields:");
  for (const field of fields) {
    console.log(`- ${field.field_name} (${field.type})`);
  }

  console.log("");
  console.log("First records with non-empty fields:");
  for (const record of records.slice(0, 5)) {
    console.log(`Record: ${record.record_id}`);
    const entries = Object.entries(record.fields || {});
    for (const [key, value] of entries) {
      console.log(`  ${key}: ${preview(value)}`);
    }
  }
}

async function getTenantAccessToken() {
  const response = await fetchJson(`${API_BASE}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: config.appId,
      app_secret: config.appSecret
    })
  });

  return response.tenant_access_token;
}

async function listFields(token) {
  const url = new URL(`${API_BASE}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/fields`);
  url.searchParams.set("page_size", "100");
  const response = await fetchJson(url, { headers: authHeaders(token) });
  return response.data?.items || [];
}

async function listRecords(token) {
  const url = new URL(`${API_BASE}/bitable/v1/apps/${config.appToken}/tables/${config.tableId}/records`);
  url.searchParams.set("page_size", "5");
  const response = await fetchJson(url, { headers: authHeaders(token) });
  return response.data?.items || [];
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const payload = await response.json();
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

function preview(value) {
  const text = JSON.stringify(value);
  if (!text) return "";
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
}
