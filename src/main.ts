// @ts-nocheck
const { ItemView, Notice, Plugin, PluginSettingTab, Setting, requestUrl } = require("obsidian");
const { gsap } = require("gsap");

const VIEW_TYPE = "forest-agent-dashboard-view";
const GITHUB_CACHE_KEYS = ["daily", "weekly"];
const GMAIL_METADATA_SCOPE = "https://www.googleapis.com/auth/gmail.metadata";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const MAIL_PAGE_SIZE = 10;
const MAIL_MAX_ITEMS = 50;
const KEYCHAIN_SERVICE = "Obsidian Forest Agent Dashboard";
const BLOCKED_REPO_TERMS = [
  "bitcoin-recovery",
  "brute-force-tool",
  "btc-password",
  "crypto",
  "flash usdt",
  "flash-usdt",
  "giveaway",
  "keylogger",
  "linkedin",
  "nft",
  "phishing",
  "roblox",
  "script executor",
  "stealer",
  "token grabber",
  "wallet",
];
const ENGINEERING_REPO_TERMS = [
  "agent",
  "agent-skill",
  "ai-agent",
  "api",
  "automation",
  "benchmark",
  "build",
  "ci",
  "cli",
  "cloud-native",
  "codex",
  "compiler",
  "database",
  "debug",
  "developer",
  "developer-tools",
  "devops",
  "docker",
  "framework",
  "infra",
  "kubernetes",
  "langchain",
  "llm",
  "mcp",
  "monitoring",
  "observability",
  "open-source",
  "postgres",
  "rag",
  "sdk",
  "self-hosted",
  "skill",
  "superpowers",
  "testing",
  "tooling",
  "typescript",
  "workflow",
];

const DEFAULT_SETTINGS = {
  tasks: [
    { id: "1", text: "Review PR #42", done: false },
    { id: "2", text: "Write project proposal", done: false },
    { id: "3", text: "Update documentation", done: false },
  ],
  githubTokenStored: "",
  mascotImagePath: "",
  noteOpenStats: {},
  gmailAddress: "",
  gmailInboxUrl: "https://mail.google.com/mail/u/0/#inbox",
  gmailClientId: "",
  gmailClientSecretStored: "",
  gmailTokenEncrypted: "",
  qqMailAddress: "",
  qqMailInboxUrl: "https://mail.qq.com/",
  qqAuthCodeEncrypted: "",
  githubCache: {
    daily: null,
    weekly: null,
  },
};
const ENGINEERING_FALLBACK_ITEMS = [
  {
    name: "obra/Superpowers",
    url: "https://github.com/obra/Superpowers",
    description: "Agentic skills framework for Claude Code engineering workflows: design, planning, debugging, TDD, review, and verification.",
    stars: 0,
    language: "Shell",
    topics: ["skills", "claude-code", "workflow"],
    createdAt: "",
    pushedAt: "",
  },
  {
    name: "obra/superpowers-marketplace",
    url: "https://github.com/obra/superpowers-marketplace",
    description: "Curated marketplace for Claude Code plugins and Superpowers-style engineering workflow packs.",
    stars: 0,
    language: "mixed",
    topics: ["plugins", "skills", "workflow"],
    createdAt: "",
    pushedAt: "",
  },
  {
    name: "anthropics/skills",
    url: "https://github.com/anthropics/skills",
    description: "Public agent skill examples, including technical workflows such as web testing and MCP server generation.",
    stars: 0,
    language: "Python",
    topics: ["agent-skill", "automation", "mcp"],
    createdAt: "",
    pushedAt: "",
  },
  {
    name: "travisvn/awesome-claude-skills",
    url: "https://github.com/travisvn/awesome-claude-skills",
    description: "Curated Claude Skills resources for customizing coding-agent engineering workflows.",
    stars: 0,
    language: "Markdown",
    topics: ["awesome", "claude-code", "skills"],
    createdAt: "",
    pushedAt: "",
  },
  {
    name: "VoltAgent/awesome-agent-skills",
    url: "https://github.com/VoltAgent/awesome-agent-skills",
    description: "Collection of agent skills compatible with Claude Code, Codex, Gemini CLI, Cursor, and other coding agents.",
    stars: 0,
    language: "Markdown",
    topics: ["agent-skill", "codex", "developer-tools"],
    createdAt: "",
    pushedAt: "",
  },
  {
    name: "modelcontextprotocol/servers",
    url: "https://github.com/modelcontextprotocol/servers",
    description: "Reference MCP servers and integrations for connecting agents to files, databases, APIs, and external tools.",
    stars: 0,
    language: "TypeScript",
    topics: ["mcp", "servers", "developer-tools"],
    createdAt: "",
    pushedAt: "",
  },
  {
    name: "langfuse/langfuse",
    url: "https://github.com/langfuse/langfuse",
    description: "Open-source LLM observability and tracing platform for prompts, agents, evaluations, and production debugging.",
    stars: 0,
    language: "TypeScript",
    topics: ["observability", "llm", "tracing"],
    createdAt: "",
    pushedAt: "",
  },
  {
    name: "langchain-ai/langgraph",
    url: "https://github.com/langchain-ai/langgraph",
    description: "Graph-based framework for building stateful, multi-step LLM and agent workflows.",
    stars: 0,
    language: "Python",
    topics: ["agent", "workflow", "llm"],
    createdAt: "",
    pushedAt: "",
  },
];

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRelativeTime(timestamp) {
  const time = Number(timestamp) || 0;

  if (!time) {
    return "Recently";
  }

  const difference = Math.max(0, Date.now() - time);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) return "Now";
  if (difference < hour) return `${Math.floor(difference / minute)}m ago`;
  if (difference < day) return `${Math.floor(difference / hour)}h ago`;
  if (difference < 7 * day) return `${Math.floor(difference / day)}d ago`;

  return new Date(time).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNoteCategory(file) {
  const name = String(file && file.basename || "");

  if (/^(项目|Project)/i.test(name)) return "Projects";
  if (/^(学习|面试|Learning)/i.test(name)) return "Learning";
  if (/^(论文|竞赛|Paper)/i.test(name)) return "Research";
  return "Notes";
}

function getNoteLocation(file) {
  const parentPath = file && file.parent && file.parent.path;

  if (!parentPath || parentPath === "/") {
    return "Vault";
  }

  const segments = parentPath.split("/").filter(Boolean);
  const location = segments[segments.length - 1] || "Vault";

  return location === "work&study" ? "Knowledge Base" : location;
}

function normalizeHttpsUrl(value, fallback) {
  try {
    const parsed = new URL(String(value || fallback));
    return parsed.protocol === "https:" ? parsed.toString() : fallback;
  } catch (_error) {
    return fallback;
  }
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function runKeychainCommand(args, stdinValue = null, ignoreMissing = false) {
  if (process.platform !== "darwin") {
    return Promise.reject(new Error("Secure mail credentials currently require macOS Keychain."));
  }

  const { spawn } = require("child_process");
  return new Promise((resolve, reject) => {
    let settled = false;
    const child = spawn("/usr/bin/security", args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error("macOS Keychain did not respond. Unlock your Mac and try again."));
    }, 15000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`macOS Keychain could not be opened: ${error.message}`));
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0 || (ignoreMissing && /could not be found/i.test(stderr))) {
        resolve(stdout.trimEnd());
        return;
      }
      reject(new Error(stderr.trim() || `macOS Keychain returned status ${code}.`));
    });

    if (stdinValue === null) {
      child.stdin.end();
    } else {
      child.stdin.end(`${stdinValue}\n`);
    }
  });
}

async function storeKeychainSecret(account, value) {
  if (!value) throw new Error("A credential value is required.");
  await runKeychainCommand([
    "add-generic-password",
    "-U",
    "-a", account,
    "-s", KEYCHAIN_SERVICE,
    "-l", `${KEYCHAIN_SERVICE} · ${account.split(":")[0]}`,
    "-X", Buffer.from(String(value), "utf8").toString("hex"),
  ]);
}

function readKeychainSecret(account) {
  return runKeychainCommand([
    "find-generic-password",
    "-a", account,
    "-s", KEYCHAIN_SERVICE,
    "-w",
  ]);
}

function deleteKeychainSecret(account) {
  return runKeychainCommand([
    "delete-generic-password",
    "-a", account,
    "-s", KEYCHAIN_SERVICE,
  ], null, true);
}

function getExternalShell() {
  try {
    const { shell } = require("electron");
    return shell;
  } catch (_error) {
    return null;
  }
}

let cachedSystemHttpsProxy;

function getSystemHttpsProxy() {
  if (cachedSystemHttpsProxy !== undefined) return cachedSystemHttpsProxy;

  const environmentProxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.ALL_PROXY || process.env.all_proxy;
  if (environmentProxy) {
    try {
      const parsed = new URL(environmentProxy);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        cachedSystemHttpsProxy = {
          host: parsed.hostname,
          port: Number(parsed.port) || (parsed.protocol === "https:" ? 443 : 80),
        };
        return cachedSystemHttpsProxy;
      }
    } catch (_error) {
      // Fall through to the macOS system proxy.
    }
  }

  if (process.platform === "darwin") {
    try {
      const { execFileSync } = require("child_process");
      const output = execFileSync("/usr/sbin/scutil", ["--proxy"], {
        encoding: "utf8",
        timeout: 3000,
      });
      const enabled = output.match(/HTTPSEnable\s*:\s*(\d+)/);
      const host = output.match(/HTTPSProxy\s*:\s*([^\s]+)/);
      const port = output.match(/HTTPSPort\s*:\s*(\d+)/);
      if (enabled && enabled[1] === "1" && host && port) {
        cachedSystemHttpsProxy = { host: host[1], port: Number(port[1]) };
        return cachedSystemHttpsProxy;
      }
    } catch (_error) {
      // Direct networking remains available when no system proxy is configured.
    }
  }

  cachedSystemHttpsProxy = null;
  return cachedSystemHttpsProxy;
}

function executeHttpsRequest(target, options, connectedSocket = null) {
  const https = require("https");
  return new Promise((resolve, reject) => {
    const requestOptions = {
      protocol: "https:",
      hostname: target.hostname,
      port: Number(target.port) || 443,
      path: `${target.pathname}${target.search}`,
      method: options.method || "GET",
      headers: options.headers || {},
      rejectUnauthorized: true,
    };

    if (connectedSocket) {
      const agent = new https.Agent({ keepAlive: false });
      agent.createConnection = () => connectedSocket;
      requestOptions.agent = agent;
    }

    const request = https.request(requestOptions, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        text += chunk;
        if (text.length > 2 * 1024 * 1024) {
          request.destroy(new Error("Google returned an unexpectedly large response."));
        }
      });
      response.on("end", () => {
        let json = {};
        try {
          json = text ? JSON.parse(text) : {};
        } catch (_error) {
          json = {};
        }
        resolve({ status: response.statusCode || 0, headers: response.headers, text, json });
      });
    });
    request.setTimeout(20000, () => request.destroy(new Error("Google request timed out. Check the system proxy and try again.")));
    request.once("error", reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

function escapeCurlConfigValue(value) {
  return String(value == null ? "" : value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/[\r\n]+/g, " ");
}

function requestGoogleViaCurl(url, options, proxy) {
  const { spawn } = require("child_process");
  return new Promise((resolve, reject) => {
    const marker = "__AGENT_DASHBOARD_HTTP_STATUS__:";
    const child = spawn("/usr/bin/curl", ["--config", "-"], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error("Google request timed out through the system proxy."));
    }, 35000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Could not start the secure Google request: ${error.message}`));
    });
    child.once("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Google request failed with curl status ${code}.`));
        return;
      }

      const markerIndex = stdout.lastIndexOf(`\n${marker}`);
      if (markerIndex < 0) {
        reject(new Error("Google returned a response without an HTTP status."));
        return;
      }
      const text = stdout.slice(0, markerIndex);
      const status = Number(stdout.slice(markerIndex + marker.length + 1).trim()) || 0;
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch (_error) {
        json = {};
      }
      resolve({ status, headers: {}, text, json });
    });

    const config = [
      "silent",
      "show-error",
      "location",
      "connect-timeout = 10",
      "max-time = 30",
      "retry = 1",
      "retry-delay = 1",
      `url = "${escapeCurlConfigValue(url)}"`,
      `request = "${escapeCurlConfigValue(options.method || "GET")}"`,
      ...(proxy ? [`proxy = "http://${escapeCurlConfigValue(proxy.host)}:${proxy.port}"`] : []),
      ...Object.entries(options.headers || {}).map(([name, value]) => (
        `header = "${escapeCurlConfigValue(name)}: ${escapeCurlConfigValue(value)}"`
      )),
      ...(options.body ? [`data = "${escapeCurlConfigValue(options.body)}"`] : []),
      `write-out = "\\n${marker}%{http_code}"`,
    ].join("\n");
    child.stdin.end(`${config}\n`);
  });
}

function requestGoogleUrl(url, options = {}) {
  const target = new URL(url);
  const proxy = getSystemHttpsProxy();
  if (process.platform === "darwin") {
    return requestGoogleViaCurl(url, options, proxy);
  }
  if (!proxy) return executeHttpsRequest(target, options);

  const http = require("http");
  const tls = require("tls");
  return new Promise((resolve, reject) => {
    const authority = `${target.hostname}:${Number(target.port) || 443}`;
    const connectRequest = http.request({
      host: proxy.host,
      port: proxy.port,
      method: "CONNECT",
      path: authority,
      headers: { Host: authority },
    });
    connectRequest.setTimeout(10000, () => connectRequest.destroy(new Error("The system proxy did not respond.")));
    connectRequest.once("error", reject);
    connectRequest.once("connect", (response, socket, head) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`The system proxy rejected the Google connection with status ${response.statusCode}.`));
        return;
      }
      if (head && head.length) socket.unshift(head);

      const secureSocket = tls.connect({
        socket,
        servername: target.hostname,
        rejectUnauthorized: true,
      });
      secureSocket.once("error", reject);
      secureSocket.once("secureConnect", () => {
        executeHttpsRequest(target, options, secureSocket).then(resolve, reject);
      });
    });
    connectRequest.end();
  });
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function postForm(url, values) {
  const body = new URLSearchParams(values).toString();
  const response = await requestGoogleUrl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(body),
    },
    body,
  });

  if (response.status < 200 || response.status >= 300) {
    const message = response.json && (response.json.error_description || response.json.error);
    throw new Error(message || `OAuth request failed with status ${response.status}.`);
  }

  return response.json || {};
}

async function gmailApiRequest(path, accessToken) {
  const response = await requestGoogleUrl(`${GMAIL_API_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status < 200 || response.status >= 300) {
    const message = response.json && response.json.error && response.json.error.message;
    const apiDisabled = response.status === 403 && /not been used|disabled|accessnotconfigured|serviceusage/i.test(String(message || ""));
    const error = new Error(apiDisabled
      ? "Gmail API is not enabled for this Google Cloud project. Enable Gmail API, wait about a minute, then press Refresh."
      : (message || `Gmail API request failed with status ${response.status}.`));
    error.status = response.status;
    throw error;
  }

  return response.json || {};
}

function getGmailHeader(message, name) {
  const headers = message && message.payload && Array.isArray(message.payload.headers)
    ? message.payload.headers
    : [];
  const header = headers.find((item) => String(item.name || "").toLowerCase() === name.toLowerCase());
  return header ? String(header.value || "") : "";
}

function decodeMimeWords(value) {
  return String(value || "").replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g, (_match, charset, encoding, encoded) => {
    try {
      let bytes;
      if (encoding.toUpperCase() === "B") {
        bytes = Buffer.from(encoded, "base64");
      } else {
        const normalized = encoded.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_hex, code) => String.fromCharCode(parseInt(code, 16)));
        bytes = Buffer.from(normalized, "binary");
      }

      const rawLabel = String(charset || "utf-8").toLowerCase();
      const label = rawLabel === "gb2312" || rawLabel === "gbk" ? "gb18030" : rawLabel;
      const Decoder = window.TextDecoder || require("util").TextDecoder;
      return new Decoder(label).decode(bytes);
    } catch (_error) {
      return encoded;
    }
  });
}

function cleanSender(value) {
  const decoded = decodeMimeWords(value).trim();
  const named = decoded.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/);
  return (named ? named[1] : decoded).trim() || "Unknown sender";
}

function imapQuote(value) {
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function dateDaysAgo(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function compactNumber(value) {
  const number = Number(value) || 0;

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}m`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}k`;
  }

  return String(number);
}

function parseStarNumber(text) {
  const normalized = String(text || "").replace(/,/g, "").trim().toLowerCase();
  const match = normalized.match(/([\d.]+)\s*([km])?/);

  if (!match) {
    return 0;
  }

  const value = Number(match[1]) || 0;
  const unit = match[2];

  if (unit === "m") {
    return Math.round(value * 1000000);
  }

  if (unit === "k") {
    return Math.round(value * 1000);
  }

  return Math.round(value);
}

function hasTags(cache) {
  const frontmatterTags = cache && cache.frontmatter && cache.frontmatter.tags;
  const inlineTags = cache && cache.tags;
  const hasFrontmatterTags = Array.isArray(frontmatterTags)
    ? frontmatterTags.length > 0
    : typeof frontmatterTags === "string" && frontmatterTags.trim().length > 0;
  const hasInlineTags = Array.isArray(inlineTags) && inlineTags.length > 0;

  return hasFrontmatterTags || hasInlineTags;
}

function truncateText(text, maxLength) {
  const normalized = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";

  if (!normalized) {
    return "";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

function markdownToSearchText(markdown) {
  return String(markdown || "")
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, " ")
    .replace(/```[^\n]*\n?/g, " ")
    .replace(/!\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/(^|\s)[#>*_`~]+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function createSearchSnippet(text, query, maxLength = 128) {
  const source = String(text || "").trim();
  const normalizedQuery = String(query || "").toLowerCase();

  if (!source) {
    return "";
  }

  const matchIndex = source.toLowerCase().indexOf(normalizedQuery);
  const centeredStart = matchIndex >= 0 ? matchIndex - Math.floor((maxLength - normalizedQuery.length) / 2) : 0;
  const start = Math.max(0, Math.min(centeredStart, Math.max(0, source.length - maxLength)));
  const end = Math.min(source.length, start + maxLength);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < source.length ? "…" : "";

  return `${prefix}${source.slice(start, end).trim()}${suffix}`;
}

function getFuzzyTitleScore(title, query) {
  if (query.length < 2) {
    return 0;
  }

  let cursor = 0;
  let previousMatch = -2;
  let gapCount = 0;
  let consecutiveBonus = 0;

  for (const character of query) {
    const matchIndex = title.indexOf(character, cursor);

    if (matchIndex < 0) {
      return 0;
    }

    gapCount += Math.max(0, matchIndex - cursor);

    if (matchIndex === previousMatch + 1) {
      consecutiveBonus += 4;
    }

    previousMatch = matchIndex;
    cursor = matchIndex + 1;
  }

  return Math.max(1, 64 + consecutiveBonus - gapCount - Math.min(20, title.length - query.length));
}

function normalizeRepo(repo) {
  const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 3) : [];
  const language = repo.language || "mixed";
  const fallbackIntro = `${language} repository${topics.length ? ` about ${topics.join(", ")}` : ""}.`;

  return {
    name: repo.full_name || repo.name || "unknown/repository",
    url: repo.html_url || "",
    description: truncateText(repo.description || fallbackIntro, 170),
    stars: Number(repo.stargazers_count) || 0,
    totalStars: Number(repo.stargazers_count) || 0,
    trend: `${compactNumber(Number(repo.stargazers_count) || 0)} total stars`,
    language,
    topics,
    createdAt: repo.created_at || "",
    pushedAt: repo.pushed_at || "",
  };
}

function getRepoTopics(item) {
  if (Array.isArray(item.topics)) {
    return item.topics.filter(Boolean).slice(0, 4);
  }

  if (typeof item.topics === "string") {
    return item.topics.split(/\s+/).filter(Boolean).slice(0, 4);
  }

  return [];
}

function getRepoSearchText(item) {
  return [item.name, item.description, item.language, ...getRepoTopics(item)].join(" ").toLowerCase();
}

function isBlockedRepo(item) {
  const text = getRepoSearchText(item);
  const walletRisk = text.includes("wallet") && (text.includes("mnemonic") || text.includes("seed") || text.includes("recovery"));
  const flashTokenRisk = text.includes("flash") && (text.includes("usdt") || text.includes("btc") || text.includes("transaction"));

  return walletRisk || flashTokenRisk || BLOCKED_REPO_TERMS.some((term) => text.includes(term));
}

function getEngineeringScore(item) {
  if (isBlockedRepo(item)) {
    return -1000;
  }

  const text = getRepoSearchText(item);
  const language = String(item.language || "").toLowerCase();
  const engineeringTermScore = ENGINEERING_REPO_TERMS.reduce((score, term) => score + (text.includes(term) ? 2 : 0), 0);
  const languageScore = ["typescript", "javascript", "python", "go", "rust", "java", "shell", "c++", "c"].includes(language) ? 1 : 0;
  const nameScore = /cli|sdk|agent|mcp|dev|tool|db|infra|ops|test|graph|trace/i.test(item.name || "") ? 2 : 0;

  return engineeringTermScore + languageScore + nameScore;
}

function rankEngineeringRepos(items) {
  const ranked = items
    .map((item) => ({ item, score: getEngineeringScore(item) }))
    .filter((entry) => entry.score > -1000)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (right.item.stars || 0) - (left.item.stars || 0);
    });
  const strong = ranked.filter((entry) => entry.score > 0).map((entry) => entry.item);

  return (strong.length >= 6 ? strong : ranked.map((entry) => entry.item)).slice(0, 8);
}

function parseGitHubTrendingHtml(html, mode) {
  const document = new DOMParser().parseFromString(html, "text/html");
  const articles = Array.from(document.querySelectorAll("article.Box-row"));

  return articles
    .map((article) => {
      const link = article.querySelector("h2 a");
      const relativeUrl = (link && link.getAttribute("href") || "").trim();
      const name = relativeUrl.replace(/^\/+|\/+$/g, "") || (link ? link.textContent.replace(/\s+/g, "") : "");
      const description = truncateText(article.querySelector("p")?.textContent || "", 170);
      const language = article.querySelector('[itemprop="programmingLanguage"]')?.textContent?.trim() || "mixed";
      const starLink = Array.from(article.querySelectorAll("a")).find((candidate) => {
        const href = candidate.getAttribute("href") || "";
        return href.endsWith("/stargazers");
      });
      const totalStarsText = starLink ? starLink.textContent : "";
      const trendText = Array.from(article.querySelectorAll("span"))
        .map((candidate) => candidate.textContent.replace(/\s+/g, " ").trim())
        .find((text) => /stars?\s+(today|this week)/i.test(text)) || "";
      const trendStars = parseStarNumber(trendText);
      const totalStars = parseStarNumber(totalStarsText);

      if (!name) {
        return null;
      }

      return {
        name,
        url: `https://github.com/${name}`,
        description,
        stars: trendStars || totalStars,
        totalStars,
        trend: trendText || `${compactNumber(totalStars)} total stars`,
        language,
        topics: ["trending", mode === "weekly" ? "weekly" : "daily"],
        createdAt: "",
        pushedAt: "",
      };
    })
    .filter(Boolean);
}

class SimpleImapClient {
  constructor(host = "imap.qq.com", port = 993, timeoutMs = 12000) {
    this.host = host;
    this.port = port;
    this.timeoutMs = timeoutMs;
    this.socket = null;
    this.commandIndex = 0;
    this.pending = null;
    this.greetingBuffer = "";
  }

  async connect() {
    const tls = require("tls");

    await new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        error ? reject(error instanceof Error ? error : new Error(String(error))) : resolve();
      };
      const timer = window.setTimeout(() => finish(new Error("QQ Mail IMAP connection timed out.")), this.timeoutMs);

      this.socket = tls.connect({
        host: this.host,
        port: this.port,
        servername: this.host,
        rejectUnauthorized: true,
      });
      this.socket.setEncoding("utf8");
      this.socket.on("data", (chunk) => {
        if (this.pending) {
          this.handleCommandData(chunk);
          return;
        }

        this.greetingBuffer += chunk;
        if (/^\*\s+(OK|PREAUTH)\b/im.test(this.greetingBuffer)) {
          this.greetingBuffer = "";
          finish();
        }
      });
      this.socket.once("error", (error) => finish(new Error(`QQ Mail IMAP connection failed: ${error.message}`)));
      this.socket.once("close", () => {
        if (this.pending) {
          const pending = this.pending;
          this.pending = null;
          pending.reject(new Error("QQ Mail closed the IMAP connection."));
        }
      });
    });
  }

  handleCommandData(chunk) {
    if (!this.pending) return;
    this.pending.response += chunk;
    const escapedTag = this.pending.tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const completion = this.pending.response.match(new RegExp(`(?:^|\\r\\n)${escapedTag}\\s+(OK|NO|BAD)\\b`, "i"));

    if (!completion) return;

    const pending = this.pending;
    this.pending = null;
    if (completion[1].toUpperCase() === "OK") {
      pending.resolve(pending.response);
    } else {
      const detail = pending.response.split(/\r?\n/).find((line) => line.startsWith(pending.tag)) || "IMAP command rejected";
      pending.reject(new Error(detail.replace(pending.tag, "").trim()));
    }
  }

  async execute(command) {
    if (!this.socket || this.socket.destroyed) {
      throw new Error("QQ Mail IMAP connection is not open.");
    }
    if (this.pending) {
      throw new Error("QQ Mail IMAP command overlap detected.");
    }

    this.commandIndex += 1;
    const tag = `A${String(this.commandIndex).padStart(3, "0")}`;

    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (this.pending && this.pending.tag === tag) {
          this.pending = null;
          reject(new Error("QQ Mail IMAP command timed out."));
        }
      }, this.timeoutMs);

      this.pending = {
        tag,
        response: "",
        resolve: (value) => {
          window.clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          window.clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        },
      };
      this.socket.write(`${tag} ${command}\r\n`);
    });
  }

  close() {
    if (this.socket && !this.socket.destroyed) {
      this.socket.end();
    }
    this.socket = null;
  }
}

function parseImapSearchIds(response) {
  const searchLine = String(response || "").split(/\r?\n/).find((line) => /^\* SEARCH\b/i.test(line));
  if (!searchLine) return [];
  return searchLine.replace(/^\* SEARCH\s*/i, "").trim().split(/\s+/).filter((item) => /^\d+$/.test(item));
}

function parseImapHeaders(response, uid) {
  const literal = String(response || "").match(/\{\d+\}\r\n([\s\S]*?)(?:\r\n\)|\r\n\*|\r\nA\d{3}\s)/i);
  const headerText = literal ? literal[1] : "";
  const unfolded = headerText.replace(/\r?\n[ \t]+/g, " ");
  const headers = {};

  unfolded.split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf(":");
    if (separator <= 0) return;
    headers[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  });

  const parsedDate = Date.parse(headers.date || "");
  return {
    id: `qq-${uid}`,
    sender: cleanSender(headers.from),
    subject: decodeMimeWords(headers.subject).trim() || "(No subject)",
    snippet: "",
    receivedAt: Number.isFinite(parsedDate) ? parsedDate : 0,
    unread: !/FLAGS\s*\([^)]*\\Seen/i.test(String(response || "")),
  };
}

class DashboardView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.clockEl = null;
    this.dateEl = null;
    this.tasksContainer = null;
    this.ghFeedContainer = null;
    this.ghStatusEl = null;
    this.hnFeedContainer = null;
    this.githubMode = "daily";
    this.healthElements = null;
    this.backToTopButton = null;
    this.rootEl = null;
    this.noteSearchIndex = new Map();
    this.searchIndexReady = false;
    this.searchIndexPromise = null;
    this.searchIndexVersion = 0;
    this.searchDebounceTimer = null;
    this.searchRequestId = 0;
    this.frequentNotesContainer = null;
    this.mailHubContainer = null;
    this.mailState = {
      gmail: { status: plugin.hasGmailConnection() ? "idle" : "setup", data: null, error: "" },
      qq: { status: plugin.hasQqMailConnection() ? "idle" : "setup", data: null, error: "" },
    };
    this.mailFilter = { gmail: "unread", qq: "unread" };
    this.mailVisibleCount = { gmail: MAIL_PAGE_SIZE, qq: MAIL_PAGE_SIZE };
    this.loadingAnimations = new Map();
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Forest Agent Dashboard";
  }

  getIcon() {
    return "bot";
  }

  async onOpen() {
    const root = this.containerEl.children[1];

    if (!root) {
      return;
    }

    root.empty();
    root.addClass("agent-dashboard");
    root.setAttr("aria-label", "Forest Agent Dashboard");
    this.rootEl = root;
    const shell = root.createDiv({ cls: "ad-shell" });

    this.renderHeader(shell);
    this.renderDecorativeBrandMarks(shell);
    this.renderActionBar(shell);
    this.renderSearchBox(shell);

    // 一次遍历同时算出 stats 和热力图 cells，避免 getMarkdownFiles + getFileCache 双重遍历
    const snapshot = this.computeVaultSnapshot();
    this.renderFrequentNotes(shell);
    this.renderMailHub(shell);
    this.renderStatsCards(shell, snapshot);
    this.renderHeatmap(shell, snapshot.heatmapCells);

    this.renderLists(shell);
    this.renderBackToTop(root);
    this.registerDomEvent(root, "scroll", () => this.updateBackToTopVisibility());

    // 笔记变化时刷新统计，并让全文搜索索引保持同步。
    this.registerEvent(this.app.vault.on("create", (file) => {
      this.refreshVaultStats();
      void this.handleSearchIndexChange(file);
    }));
    this.registerEvent(this.app.vault.on("modify", (file) => void this.handleSearchIndexChange(file)));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      this.refreshVaultStats();
      this.removeSearchIndexEntry(file && file.path);
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      this.refreshVaultStats();
      this.removeSearchIndexEntry(oldPath);
      void this.handleSearchIndexChange(file);
    }));

    void this.ensureNoteSearchIndex();

    this.registerInterval(window.setInterval(() => this.updateClock(), 1000));
    this.updateClock();
    this.renderCachedGitHubFeed();
    void this.fetchGitHubFeed(this.githubMode);
    void this.fetchHackerNewsFeed();
    void this.refreshMailFeeds();
  }

  async onClose() {
    if (this.searchDebounceTimer) {
      window.clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    this.searchRequestId += 1;
    this.stopAllLoadingMotion();
  }

  stopLoadingMotion(key) {
    const animation = this.loadingAnimations.get(key);
    if (!animation) return;
    animation.revert();
    this.loadingAnimations.delete(key);
  }

  stopAllLoadingMotion() {
    Array.from(this.loadingAnimations.keys()).forEach((key) => this.stopLoadingMotion(key));
  }

  createSignalLoader(parent, key, label) {
    this.stopLoadingMotion(key);
    const loader = parent.createDiv({
      cls: "ad-signal-loader",
      attr: { role: "status", "aria-live": "polite", "aria-label": label },
    });
    const rail = loader.createDiv({ cls: "ad-signal-loader-rail", attr: { "aria-hidden": "true" } });
    ["Notes", "Mail", "Tasks", "Signals"].forEach((name) => {
      rail.createSpan({ cls: "ad-signal-loader-node", attr: { title: name } });
    });
    loader.createSpan({ text: label, cls: "ad-signal-loader-label" });

    const motion = gsap.matchMedia();
    motion.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        allowMotion: "(prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const nodes = rail.querySelectorAll(".ad-signal-loader-node");
        if (context.conditions.reduceMotion) {
          gsap.set(nodes, { autoAlpha: 1, y: 0, scale: 1 });
          return undefined;
        }
        const timeline = gsap.timeline({ repeat: -1, yoyo: true });
        timeline.to(nodes, {
          autoAlpha: 0.35,
          y: -4,
          scale: 0.82,
          duration: 0.52,
          ease: "sine.inOut",
          stagger: { each: 0.1, from: "start" },
        });
        return () => timeline.kill();
      },
    );
    this.loadingAnimations.set(key, motion);
    return loader;
  }

  updateClock() {
    const now = new Date();

    if (this.clockEl) {
      this.clockEl.innerText = now.toLocaleTimeString("zh-CN", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }

    if (this.dateEl) {
      const dateText = now.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      this.dateEl.innerText = `${dateText.toUpperCase()} · SHANGHAI`;
    }
  }

  renderHeader(root) {
    const header = root.createDiv({ cls: "ad-header" });
    const copy = header.createDiv({ cls: "ad-title-container" });

    this.dateEl = copy.createEl("p", { text: "", cls: "ad-subtitle" });
    copy.createEl("h1", { text: "FOREST AGENT DASHBOARD", cls: "ad-title" });
    copy.createEl("p", {
      text: "Notes, tasks and messages meet here. Find what matters now, then move into the day.",
      cls: "ad-title-note",
    });

    const side = header.createDiv({ cls: "ad-header-side" });
    const status = side.createDiv({ cls: "ad-status" });
    this.clockEl = status.createSpan({ text: "", cls: "ad-status-time" });
    this.renderBrandMark(side);
  }

  renderBrandMark(parent) {
    const card = parent.createDiv({ cls: "ad-mascot-card", attr: { "aria-label": "Forest dashboard brand" } });
    if (this.getMascotImagePath()) {
      this.createMascotImage(card, "ad-mascot-img", "User-supplied dashboard mascot");
    } else {
      this.createForestMark(card);
    }
    card.createDiv({ text: "by Totoro", cls: "ad-mascot-caption" });
  }

  renderDecorativeBrandMarks(root) {
    [
      "ad-mascot-float ad-mascot-peek-top",
      "ad-mascot-float ad-mascot-sleep-heatmap",
      "ad-mascot-float ad-mascot-peek-bottom",
    ].forEach((className) => {
      const wrapper = root.createDiv({ cls: className, attr: { "aria-hidden": "true" } });
      this.createForestMark(wrapper, true);
    });
  }

  createForestMark(parent, compact = false) {
    const mark = parent.createDiv({ cls: `ad-forest-mark${compact ? " is-compact" : ""}`, attr: { "aria-hidden": "true" } });
    const letter = mark.createDiv({ cls: "ad-forest-letter" });
    letter.createSpan({ cls: "ad-forest-canopy" });
    letter.createSpan({ cls: "ad-forest-trunk" });
    const rail = mark.createDiv({ cls: "ad-canopy-rail" });
    [0, 1, 2, 3].forEach(() => rail.createSpan({ cls: "ad-canopy-node" }));
    return mark;
  }

  createMascotImage(parent, className, altText) {
    const image = parent.createEl("img", {
      cls: className,
      attr: {
        src: this.getMascotImageSrc(),
        alt: altText,
        loading: "lazy",
      },
    });
    const fallback = parent.createDiv({ cls: "ad-mascot-missing" });
    this.createForestMark(fallback);

    fallback.hide();
    image.onerror = () => {
      image.hide();
      fallback.show();
    };

    return image;
  }

  getMascotImageSrc() {
    return this.app.vault.adapter.getResourcePath(this.getMascotImagePath());
  }

  getMascotImagePath() {
    const configuredPath = String(this.plugin.settings.mascotImagePath || "").trim();
    if (!configuredPath) return "";
    const normalizedPath = configuredPath.replace(/^\/+/, "");
    return this.app.vault.getAbstractFileByPath(normalizedPath) ? normalizedPath : "";
  }

  renderBackToTop(root) {
    const button = root.createEl("button", {
      text: "↑",
      cls: "ad-back-top",
      attr: { "aria-label": "Back to top" },
    });

    this.backToTopButton = button;
    this.registerDomEvent(button, "click", () => {
      root.scrollTo({ top: 0, behavior: "smooth" });
    });
    this.updateBackToTopVisibility();
  }

  updateBackToTopVisibility() {
    if (!this.rootEl || !this.backToTopButton) {
      return;
    }

    if (this.rootEl.scrollTop > 420) {
      this.backToTopButton.addClass("is-visible");
    } else {
      this.backToTopButton.removeClass("is-visible");
    }
  }

  renderActionBar(root) {
    const actions = root.createDiv({ cls: "ad-actions" });

    this.createActionButton(actions, "Vault Lint", () => this.runVaultLint());
    this.createActionButton(actions, "Sync GitHub", () => this.fetchGitHubFeed(this.githubMode, true));
  }

  createActionButton(parent, label, onClick) {
    const button = parent.createEl("button", { text: label, cls: "ad-btn" });
    this.registerDomEvent(button, "click", onClick);
    return button;
  }

  getVaultStats() {
    const { stats } = this.computeVaultSnapshot(true);
    return stats;
  }

  // statsOnly=true 时只算统计卡片所需字段，跳过热力图聚合，供 refreshVaultStats 轻量刷新
  computeVaultSnapshot(statsOnly = false) {
    const files = this.app.vault.getMarkdownFiles();
    const totalNotes = files.length;
    let untaggedNotes = 0;

    const activeFilesByDay = statsOnly ? null : new Map();
    const createdCountByDay = statsOnly ? null : new Map();
    const updatedCountByDay = statsOnly ? null : new Map();

    const bump = (map, key, file) => {
      const set = map.get(key);
      if (set) {
        set.add(file.path);
      } else {
        map.set(key, new Set([file.path]));
      }
    };

    files.forEach((file) => {
      const cache = this.app.metadataCache.getFileCache(file);

      if (!hasTags(cache)) {
        untaggedNotes += 1;
      }

      if (!statsOnly) {
        const createdKey = formatDateKey(new Date(file.stat.ctime));
        const updatedKey = formatDateKey(new Date(file.stat.mtime));

        bump(activeFilesByDay, createdKey, file);
        bump(activeFilesByDay, updatedKey, file);
        createdCountByDay.set(createdKey, (createdCountByDay.get(createdKey) || 0) + 1);
        updatedCountByDay.set(updatedKey, (updatedCountByDay.get(updatedKey) || 0) + 1);
      }
    });

    const vaultHealth = totalNotes === 0 ? 100 : Math.max(0, 100 - Math.floor((untaggedNotes / totalNotes) * 100));
    const activeTasks = this.plugin.settings.tasks.filter((task) => !task.done).length;
    const stats = { activeTasks, totalNotes, untaggedNotes, vaultHealth };

    if (statsOnly) {
      return { stats, heatmapCells: [], streakDays: 0 };
    }

    const start = dateDaysAgo(90);
    const heatmapCells = [];

    for (let index = 0; index < 91; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = formatDateKey(date);
      const activeFiles = activeFilesByDay.get(key);
      const created = createdCountByDay.get(key) || 0;
      const updated = updatedCountByDay.get(key) || 0;

      heatmapCells.push({
        date: key,
        created,
        updated,
        // 当天有活动的唯一文件数，避免同文件多次操作被重复计数
        count: activeFiles ? activeFiles.size : 0,
      });
    }

    // 从今天（cells 末尾）往前数连续有活动的天数
    let streakDays = 0;

    for (let index = heatmapCells.length - 1; index >= 0; index -= 1) {
      if (heatmapCells[index].count > 0) {
        streakDays += 1;
      } else {
        break;
      }
    }

    return { stats, heatmapCells, streakDays };
  }

  renderStatsCards(root, snapshot) {
    const { stats, streakDays } = snapshot;
    const section = root.createDiv({ cls: "ad-stats" });

    this.healthElements = this.createCard(section, "Tag Coverage", `${stats.vaultHealth}`, `Untagged Notes: ${stats.untaggedNotes}`, true);
    this.createCard(section, "Total Notes", `${stats.totalNotes}`, "In your vault");
    this.createCard(section, "Task Flow", `${stats.activeTasks}`, "Active tasks");
    this.createCard(section, "Writing Streak", `${streakDays}`, streakDays > 0 ? "days in a row" : "start writing today");
  }

  createCard(parent, title, value, subtext, isHealth = false) {
    const card = parent.createDiv({ cls: `ad-card${isHealth ? " ad-health-card" : ""}` });
    const titleEl = card.createDiv({ text: title, cls: "ad-card-title" });
    const valueEl = card.createDiv({ text: value, cls: `ad-card-value${isHealth ? " ad-health-value" : ""}` });
    const subEl = card.createDiv({ text: subtext, cls: `ad-card-sub${isHealth ? " ad-health-sub" : ""}` });

    return { card, titleEl, valueEl, subEl };
  }

  refreshVaultStats() {
    const stats = this.getVaultStats();

    if (!this.healthElements) {
      return;
    }

    this.healthElements.valueEl.innerText = String(stats.vaultHealth);
    this.healthElements.subEl.innerText = `Untagged Notes: ${stats.untaggedNotes}`;
    this.healthElements.card.addClass("ad-card-pulse");

    window.setTimeout(() => {
      this.healthElements && this.healthElements.card.removeClass("ad-card-pulse");
    }, 800);
  }

  async runVaultLint() {
    const report = this.buildVaultLintReport();
    const folderPath = "Dashboard";
    const reportPath = `${folderPath}/Vault Lint Report.md`;

    if (!(await this.app.vault.adapter.exists(folderPath))) {
      await this.app.vault.createFolder(folderPath);
    }

    const existingFile = this.app.vault.getAbstractFileByPath(reportPath);

    if (existingFile) {
      await this.app.vault.modify(existingFile, report.content);
    } else {
      await this.app.vault.create(reportPath, report.content);
    }

    const reportFile = this.app.vault.getAbstractFileByPath(reportPath);
    if (reportFile) {
      await this.app.workspace.getLeaf(false).openFile(reportFile);
    }

    this.refreshVaultStats();
    new Notice(`Vault Lint report updated: ${report.issueCount} issues`);
  }

  buildVaultLintReport() {
    const files = this.app.vault.getMarkdownFiles();
    const basenameMap = new Map();
    const untagged = [];
    const empty = [];
    const longNames = [];
    const largeFiles = [];

    files.forEach((file) => {
      const cache = this.app.metadataCache.getFileCache(file);
      const list = basenameMap.get(file.basename) || [];
      list.push(file);
      basenameMap.set(file.basename, list);

      if (!hasTags(cache)) {
        untagged.push(file);
      }

      if (file.stat.size <= 10) {
        empty.push(file);
      }

      if (file.basename.length > 42) {
        longNames.push(file);
      }

      if (file.stat.size > 80000) {
        largeFiles.push(file);
      }
    });

    const duplicates = Array.from(basenameMap.values()).filter((items) => items.length > 1);
    const issueCount = untagged.length + empty.length + longNames.length + largeFiles.length + duplicates.length;
    const now = new Date().toLocaleString("zh-CN", { hour12: false });
    const lines = [
      "# Vault Lint Report",
      "",
      `Generated: ${now}`,
      "",
      "## Summary",
      "",
      `- Total markdown notes: ${files.length}`,
      `- Untagged notes: ${untagged.length}`,
      `- Empty or near-empty notes: ${empty.length}`,
      `- Long note names: ${longNames.length}`,
      `- Large notes over 80 KB: ${largeFiles.length}`,
      `- Duplicate basenames: ${duplicates.length}`,
      "",
      "## Untagged Notes",
      "",
      ...this.formatFileList(untagged, 80),
      "",
      "## Empty Or Near-Empty Notes",
      "",
      ...this.formatFileList(empty, 80),
      "",
      "## Long Note Names",
      "",
      ...this.formatFileList(longNames, 80),
      "",
      "## Large Notes",
      "",
      ...this.formatFileList(largeFiles, 80),
      "",
      "## Duplicate Basenames",
      "",
      ...this.formatDuplicateList(duplicates),
      "",
    ];

    return { content: lines.join("\n"), issueCount };
  }

  formatFileList(files, limit) {
    if (!files.length) {
      return ["- None"];
    }

    const lines = files.slice(0, limit).map((file) => `- ${this.linkForFile(file)} (${file.path})`);

    if (files.length > limit) {
      lines.push(`- ...and ${files.length - limit} more`);
    }

    return lines;
  }

  formatDuplicateList(groups) {
    if (!groups.length) {
      return ["- None"];
    }

    return groups.flatMap((group) => [
      `- ${group[0].basename}`,
      ...group.map((file) => `  - ${file.path}`),
    ]);
  }

  linkForFile(file) {
    const target = file.path.replace(/\.md$/i, "");
    return `[[${target}|${file.basename}]]`;
  }

  renderSearchBox(root) {
    const container = root.createDiv({ cls: "ad-search-container" });
    const label = container.createEl("label", { text: "Search notes", cls: "ad-sr-only" });
    const input = container.createEl("input", {
      type: "text",
      placeholder: "Search note titles and contents...",
      cls: "ad-search-input",
    });
    const results = container.createDiv({ cls: "ad-search-results", attr: { "aria-live": "polite" } });

    const inputId = "ad-search-input";
    input.id = inputId;
    label.setAttr("for", inputId);

    this.registerDomEvent(input, "input", (event) => {
      const query = event.target.value.toLowerCase().trim();

      if (this.searchDebounceTimer) {
        window.clearTimeout(this.searchDebounceTimer);
      }

      this.searchRequestId += 1;
      const requestId = this.searchRequestId;

      this.searchDebounceTimer = window.setTimeout(async () => {
        this.searchDebounceTimer = null;
        results.empty();

        if (!query) {
          return;
        }

        results.createDiv({ text: this.searchIndexReady ? "Searching notes…" : "Indexing your notes…", cls: "ad-search-status" });

        try {
          const matches = await this.searchNotes(query);

          if (requestId !== this.searchRequestId) {
            return;
          }

          results.empty();

          if (!matches.length) {
            results.createDiv({ text: `No notes match “${query}”`, cls: "ad-search-status ad-search-empty" });
            return;
          }

          matches.forEach((match) => this.renderSearchResult(results, match, query));
        } catch (error) {
          if (requestId !== this.searchRequestId) {
            return;
          }

          console.error("Forest Agent Dashboard note search failed", error);
          results.empty();
          results.createDiv({ text: "Search is temporarily unavailable. Try again.", cls: "ad-search-status ad-error-text" });
        }
      }, 220);
    });
  }

  renderFrequentNotes(root) {
    const section = root.createDiv({ cls: "ad-panel ad-frequent-panel" });
    const heading = section.createDiv({ cls: "ad-frequent-heading" });
    const copy = heading.createDiv({ cls: "ad-frequent-heading-copy" });

    copy.createEl("h2", { text: "Frequent Notes" });
    copy.createDiv({
      text: "Ranked by opens, with note titles treated as reading material rather than controls.",
      cls: "ad-section-sub",
    });
    heading.createDiv({ text: "LAST 7 DAYS", cls: "ad-frequent-period" });

    this.frequentNotesContainer = section.createDiv({
      cls: "ad-frequent-grid",
      attr: { "aria-live": "polite" },
    });
    this.renderFrequentNoteItems();

    const footer = section.createDiv({ cls: "ad-frequent-footer" });
    footer.createDiv({
      text: "Note titles use the reading typeface; paths and frequency stay secondary.",
      cls: "ad-frequent-footnote",
    });
    const browseButton = footer.createEl("button", {
      text: "Browse all notes →",
      cls: "ad-inline-action",
      attr: { type: "button" },
    });
    this.registerDomEvent(browseButton, "click", () => {
      this.app.commands.executeCommandById("switcher:open");
    });
  }

  renderFrequentNoteItems() {
    if (!this.frequentNotesContainer) {
      return;
    }

    const entries = this.plugin.getFrequentNoteEntries(6, 7);
    this.frequentNotesContainer.empty();

    if (!entries.length) {
      this.frequentNotesContainer.createDiv({
        text: "Open a note to start building your frequent list.",
        cls: "ad-frequent-empty",
      });
      return;
    }

    entries.forEach((entry, index) => {
      const item = this.frequentNotesContainer.createEl("button", {
        cls: `ad-frequent-note${entry.isFallback ? " is-fallback" : ""}`,
        attr: {
          type: "button",
          title: entry.file.path,
          "aria-label": `Open ${entry.file.basename}`,
        },
      });
      item.createSpan({ text: String(index + 1).padStart(2, "0"), cls: "ad-frequent-rank" });

      const body = item.createDiv({ cls: "ad-frequent-body" });
      body.createDiv({ text: entry.file.basename, cls: "ad-frequent-title" });
      const meta = body.createDiv({ cls: "ad-frequent-meta" });
      meta.createSpan({ text: getNoteCategory(entry.file) });
      meta.createSpan({ text: `/ ${getNoteLocation(entry.file)}` });
      meta.createSpan({ text: formatRelativeTime(entry.lastOpenedAt || entry.file.stat.mtime) });

      const metric = item.createDiv({ cls: "ad-frequent-metric" });
      metric.createSpan({ text: entry.isFallback ? "NEW" : String(entry.openCount), cls: "ad-frequent-count" });
      metric.createSpan({ text: entry.isFallback ? "recent" : "opens", cls: "ad-frequent-count-label" });

      this.registerDomEvent(item, "click", () => this.app.workspace.getLeaf(false).openFile(entry.file));
    });
  }

  renderMailHub(root) {
    const section = root.createDiv({ cls: "ad-panel ad-mail-panel" });
    this.mailHubContainer = section;
    this.populateMailHub(section);
  }

  populateMailHub(section) {
    const heading = section.createDiv({ cls: "ad-mail-heading" });
    const copy = heading.createDiv();
    copy.createEl("h2", { text: "Mailroom" });
    copy.createDiv({
      text: "A quiet, read-only view of what is waiting in Gmail and QQ Mail.",
      cls: "ad-section-sub",
    });
    const settingsButton = heading.createEl("button", {
      text: "Mail settings",
      cls: "ad-inline-action",
      attr: { type: "button" },
    });
    this.registerDomEvent(settingsButton, "click", () => this.openDashboardSettings());

    const grid = section.createDiv({ cls: "ad-mail-grid" });
    this.renderMailProvider(grid, {
      id: "gmail",
      monogram: "G",
      name: "Gmail",
      address: this.plugin.settings.gmailAddress,
      inboxUrl: normalizeHttpsUrl(this.plugin.settings.gmailInboxUrl, DEFAULT_SETTINGS.gmailInboxUrl),
      composeUrl: "https://mail.google.com/mail/u/0/?view=cm&fs=1&tf=1",
      connected: this.plugin.hasGmailConnection(),
      state: this.mailState.gmail,
    });
    this.renderMailProvider(grid, {
      id: "qq",
      monogram: "Q",
      name: "QQ Mail",
      address: this.plugin.settings.qqMailAddress,
      inboxUrl: normalizeHttpsUrl(this.plugin.settings.qqMailInboxUrl, DEFAULT_SETTINGS.qqMailInboxUrl),
      connected: this.plugin.hasQqMailConnection(),
      state: this.mailState.qq,
    });

    section.createDiv({
      text: "Read-only · message headers stay in memory · credentials are protected by Obsidian secure storage.",
      cls: "ad-mail-privacy",
    });
  }

  refreshMailHub() {
    if (!this.mailHubContainer) {
      return;
    }

    ["gmail", "qq"].forEach((id) => {
      const connected = id === "gmail" ? this.plugin.hasGmailConnection() : this.plugin.hasQqMailConnection();
      if (!connected) {
        this.mailState[id] = { status: "setup", data: null, error: "" };
      } else if (this.mailState[id].status === "setup") {
        this.mailState[id] = { status: "idle", data: null, error: "" };
      }
    });
    this.mailHubContainer.empty();
    this.populateMailHub(this.mailHubContainer);
  }

  renderMailProvider(parent, provider) {
    this.stopLoadingMotion(`mail-${provider.id}`);
    const item = parent.createDiv({ cls: `ad-mail-provider ad-mail-${provider.id}` });
    const top = item.createDiv({ cls: "ad-mail-provider-top" });
    top.createDiv({ text: provider.monogram, cls: "ad-mail-monogram", attr: { "aria-hidden": "true" } });
    const copy = top.createDiv({ cls: "ad-mail-provider-copy" });
    copy.createDiv({ text: provider.name, cls: "ad-mail-provider-name" });
    copy.createDiv({
      text: (provider.state.data && provider.state.data.address) || provider.address || "Add your address in Forest Dashboard settings",
      cls: `ad-mail-address${provider.address ? "" : " is-empty"}`,
    });

    const badge = top.createDiv({
      cls: `ad-mail-status-badge is-${provider.state.status}`,
      attr: { "aria-live": "polite" },
    });
    if (provider.state.status === "ready") {
      const count = Number(provider.state.data && provider.state.data.unreadCount) || 0;
      badge.setText(`${count} unread`);
    } else if (provider.state.status === "loading") {
      badge.setText("Syncing");
    } else if (provider.state.status === "error") {
      badge.setText("Needs attention");
    } else if (provider.connected) {
      badge.setText("Connected");
    } else {
      badge.setText("Set up");
    }

    if (provider.connected) this.renderMailFilter(item, provider);
    this.renderMailMessages(item, provider);

    const actions = item.createDiv({ cls: "ad-mail-actions" });
    if (!provider.connected) {
      const connectButton = actions.createEl("button", {
        text: provider.id === "gmail" ? "Connect Gmail" : "Set up QQ IMAP",
        cls: "ad-mail-action is-primary",
        attr: { type: "button" },
      });
      this.registerDomEvent(connectButton, "click", () => {
        if (provider.id === "gmail") {
          void this.connectGmailFromDashboard();
        } else {
          this.openDashboardSettings();
        }
      });
    } else {
      const refreshButton = actions.createEl("button", {
        text: provider.state.status === "loading" ? "Syncing…" : "Refresh",
        cls: "ad-mail-action is-primary",
        attr: { type: "button" },
      });
      refreshButton.disabled = provider.state.status === "loading";
      this.registerDomEvent(refreshButton, "click", () => void this.refreshMailProvider(provider.id));
    }

    const inboxButton = actions.createEl("button", {
      text: "Open inbox",
      cls: "ad-mail-action",
      attr: { type: "button" },
    });
    this.registerDomEvent(inboxButton, "click", () => this.openExternal(provider.inboxUrl));

    if (provider.composeUrl) {
      const composeButton = actions.createEl("button", {
        text: "Compose",
        cls: "ad-mail-action",
        attr: { type: "button" },
      });
      this.registerDomEvent(composeButton, "click", () => this.openExternal(provider.composeUrl));
    }

    if (provider.address) {
      const copyButton = actions.createEl("button", {
        text: "Copy address",
        cls: "ad-mail-action",
        attr: { type: "button" },
      });
      this.registerDomEvent(copyButton, "click", async () => {
        try {
          await navigator.clipboard.writeText(provider.address);
          new Notice(`${provider.name} address copied.`);
        } catch (_error) {
          new Notice(`Could not copy the ${provider.name} address.`);
        }
      });
    }
  }

  renderMailFilter(item, provider) {
    const viewbar = item.createDiv({ cls: "ad-mail-viewbar" });
    const tabs = viewbar.createDiv({
      cls: "ad-mail-tabs",
      attr: { role: "tablist", "aria-label": `${provider.name} message view` },
    });
    [
      { id: "unread", label: "Unread" },
      { id: "recent", label: "Recent" },
    ].forEach((option) => {
      const active = this.mailFilter[provider.id] === option.id;
      const button = tabs.createEl("button", {
        text: option.label,
        cls: `ad-mail-tab${active ? " is-active" : ""}`,
        attr: {
          type: "button",
          role: "tab",
          "aria-selected": active ? "true" : "false",
          tabindex: active ? "0" : "-1",
        },
      });
      this.registerDomEvent(button, "click", () => {
        if (active) return;
        this.mailFilter[provider.id] = option.id;
        this.mailVisibleCount[provider.id] = MAIL_PAGE_SIZE;
        void this.refreshMailProvider(provider.id);
      });
      this.registerDomEvent(button, "keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const next = option.id === "unread" ? "recent" : "unread";
        this.mailFilter[provider.id] = next;
        this.mailVisibleCount[provider.id] = MAIL_PAGE_SIZE;
        void this.refreshMailProvider(provider.id);
      });
    });

    const data = provider.state.data;
    if (data && data.fetchedAt) {
      viewbar.createSpan({ text: `Updated ${formatRelativeTime(data.fetchedAt)}`, cls: "ad-mail-updated" });
    }
  }

  renderMailMessages(item, provider) {
    const state = provider.state;
    const mode = this.mailFilter[provider.id] || "unread";
    const list = item.createDiv({ cls: "ad-mail-message-list" });

    if (!provider.connected) {
      list.createDiv({
        text: provider.id === "gmail"
          ? "Connect a Google Desktop OAuth client to see unread subjects here."
          : "Add your QQ address and IMAP authorization code in settings.",
        cls: "ad-mail-empty",
      });
      return;
    }

    if (state.status === "loading" || state.status === "idle") {
      this.createSignalLoader(
        list,
        `mail-${provider.id}`,
        `Gathering ${mode === "recent" ? "recent" : "unread"} ${provider.name} signals…`,
      );
      return;
    }

    if (state.status === "error") {
      list.createDiv({ text: state.error || "Mail could not be refreshed.", cls: "ad-mail-error" });
      return;
    }

    const messages = state.data && Array.isArray(state.data.messages) ? state.data.messages : [];
    if (!messages.length) {
      list.createDiv({
        text: mode === "recent" ? "No recent messages in the inbox." : "Inbox clear — no unread messages.",
        cls: `ad-mail-empty${mode === "unread" ? " is-clear" : ""}`,
      });
      return;
    }

    messages.forEach((message) => {
      const row = list.createEl("button", {
        cls: `ad-mail-message ${message.unread ? "is-unread" : "is-read"}`,
        attr: {
          type: "button",
          title: `Open ${provider.name}`,
          "aria-label": `Open ${message.unread ? "unread " : ""}message: ${message.subject}`,
        },
      });
      const messageCopy = row.createDiv({ cls: "ad-mail-message-copy" });
      const senderLine = messageCopy.createDiv({ cls: "ad-mail-message-sender-line" });
      if (message.unread) senderLine.createSpan({ cls: "ad-mail-unread-dot", attr: { "aria-hidden": "true" } });
      senderLine.createSpan({ text: message.sender || "Unknown sender", cls: "ad-mail-message-sender" });
      messageCopy.createDiv({ text: message.subject || "(No subject)", cls: "ad-mail-message-subject" });
      if (message.snippet) {
        messageCopy.createDiv({ text: message.snippet, cls: "ad-mail-message-snippet" });
      }
      row.createSpan({
        text: message.receivedAt ? formatRelativeTime(message.receivedAt) : "Unread",
        cls: "ad-mail-message-time",
      });
      this.registerDomEvent(row, "click", () => {
        if (provider.id === "gmail" && message.threadId) {
          this.openExternal(`https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(message.threadId)}`);
        } else {
          this.openExternal(provider.inboxUrl);
        }
      });
    });

    if (state.data && state.data.hasMore) {
      const loadMore = list.createEl("button", {
        text: `Load ${MAIL_PAGE_SIZE} more`,
        cls: "ad-mail-load-more",
        attr: { type: "button" },
      });
      this.registerDomEvent(loadMore, "click", () => {
        this.mailVisibleCount[provider.id] = Math.min(
          MAIL_MAX_ITEMS,
          this.mailVisibleCount[provider.id] + MAIL_PAGE_SIZE,
        );
        void this.refreshMailProvider(provider.id);
      });
    }
  }

  async refreshMailFeeds(providerId = null) {
    const ids = providerId ? [providerId] : ["gmail", "qq"];
    await Promise.allSettled(ids.map((id) => this.refreshMailProvider(id)));
  }

  async refreshMailProvider(providerId) {
    const connected = providerId === "gmail" ? this.plugin.hasGmailConnection() : this.plugin.hasQqMailConnection();
    if (!connected) {
      this.mailState[providerId] = { status: "setup", data: null, error: "" };
      this.refreshMailHub();
      return;
    }

    this.mailState[providerId] = {
      status: "loading",
      data: this.mailState[providerId].data,
      error: "",
    };
    this.refreshMailHub();

    try {
      const data = providerId === "gmail"
        ? await this.plugin.fetchGmailSummary({
          mode: this.mailFilter.gmail,
          limit: this.mailVisibleCount.gmail,
        })
        : await this.plugin.fetchQqMailSummary({
          mode: this.mailFilter.qq,
          limit: this.mailVisibleCount.qq,
        });
      this.mailState[providerId] = { status: "ready", data, error: "" };
    } catch (error) {
      this.mailState[providerId] = {
        status: "error",
        data: this.mailState[providerId].data,
        error: error && error.message ? error.message : "Mail could not be refreshed.",
      };
    }
    this.refreshMailHub();
  }

  async connectGmailFromDashboard() {
    if (!this.plugin.settings.gmailClientId) {
      new Notice("Add a Google Desktop OAuth client ID in Forest Dashboard settings first.");
      this.openDashboardSettings();
      return;
    }

    this.mailState.gmail = { status: "loading", data: null, error: "" };
    this.refreshMailHub();
    try {
      await this.plugin.connectGmail();
      new Notice("Gmail connected with read-only access.");
      await this.refreshMailProvider("gmail");
    } catch (error) {
      this.mailState.gmail = {
        status: "error",
        data: null,
        error: error && error.message ? error.message : "Gmail connection failed.",
      };
      this.refreshMailHub();
      new Notice(this.mailState.gmail.error);
    }
  }

  openExternal(url) {
    const target = normalizeHttpsUrl(url, "https://mail.google.com/");
    window.open(target, "_blank", "noopener,noreferrer");
  }

  openDashboardSettings() {
    if (!this.app.setting) {
      new Notice("Open Settings → Community plugins → Forest Agent Dashboard.");
      return;
    }

    this.app.setting.open();
    if (typeof this.app.setting.openTabById === "function") {
      this.app.setting.openTabById(this.plugin.manifest.id);
    }
  }

  isMarkdownFile(file) {
    return Boolean(file && typeof file.path === "string" && file.path.toLowerCase().endsWith(".md"));
  }

  async buildSearchIndexEntry(file) {
    if (!this.isMarkdownFile(file)) {
      return null;
    }

    const markdown = await this.app.vault.cachedRead(file);
    const content = markdownToSearchText(markdown);
    const cache = this.app.metadataCache.getFileCache(file);
    const frontmatterTags = cache && cache.frontmatter && cache.frontmatter.tags;
    const inlineTags = Array.isArray(cache && cache.tags) ? cache.tags.map((item) => item.tag || "") : [];
    const tags = Array.isArray(frontmatterTags)
      ? frontmatterTags
      : typeof frontmatterTags === "string"
        ? [frontmatterTags]
        : [];

    return {
      file,
      title: file.basename,
      titleLower: file.basename.toLowerCase(),
      pathLower: file.path.toLowerCase(),
      content,
      contentLower: content.toLowerCase(),
      tagsLower: [...tags, ...inlineTags].join(" ").toLowerCase(),
      modifiedAt: file.stat && file.stat.mtime || 0,
    };
  }

  async ensureNoteSearchIndex() {
    if (this.searchIndexReady) {
      return this.noteSearchIndex;
    }

    if (this.searchIndexPromise) {
      return this.searchIndexPromise;
    }

    this.searchIndexPromise = (async () => {
      let rebuiltIndex;

      for (;;) {
        const buildVersion = this.searchIndexVersion;
        const files = this.app.vault.getMarkdownFiles();
        const entries = [];

        // Limit concurrent reads so large vaults do not create an I/O spike.
        for (let offset = 0; offset < files.length; offset += 24) {
          const batch = await Promise.all(
            files.slice(offset, offset + 24).map(async (file) => {
              try {
                return await this.buildSearchIndexEntry(file);
              } catch (error) {
                console.warn(`Forest Agent Dashboard could not index ${file.path}`, error);
                return null;
              }
            }),
          );

          entries.push(...batch);
        }

        rebuiltIndex = new Map(entries.filter(Boolean).map((entry) => [entry.file.path, entry]));

        if (buildVersion === this.searchIndexVersion) {
          break;
        }
      }

      this.noteSearchIndex = rebuiltIndex;
      this.searchIndexReady = true;
      return this.noteSearchIndex;
    })();

    try {
      return await this.searchIndexPromise;
    } finally {
      this.searchIndexPromise = null;
    }
  }

  async handleSearchIndexChange(file) {
    this.searchIndexVersion += 1;

    if (!this.searchIndexReady || !this.isMarkdownFile(file)) {
      return;
    }

    try {
      const entry = await this.buildSearchIndexEntry(file);

      if (entry) {
        this.noteSearchIndex.set(file.path, entry);
      }
    } catch (error) {
      console.warn(`Forest Agent Dashboard could not refresh search index for ${file.path}`, error);
    }
  }

  removeSearchIndexEntry(path) {
    this.searchIndexVersion += 1;

    if (path) {
      this.noteSearchIndex.delete(path);
    }
  }

  async searchNotes(query) {
    await this.ensureNoteSearchIndex();

    return Array.from(this.noteSearchIndex.values())
      .map((entry) => {
        let score = 0;
        let matchSource = "content";

        if (entry.titleLower === query) {
          score = 120;
          matchSource = "title";
        } else if (entry.titleLower.startsWith(query)) {
          score = 108;
          matchSource = "title";
        } else if (entry.titleLower.includes(query)) {
          score = 94;
          matchSource = "title";
        } else {
          const fuzzyTitleScore = getFuzzyTitleScore(entry.titleLower, query);

          if (fuzzyTitleScore) {
            score = fuzzyTitleScore;
            matchSource = "title";
          }
        }

        if (entry.tagsLower.includes(query)) {
          score = Math.max(score, 76);
          matchSource = score === 76 ? "tag" : matchSource;
        }

        if (entry.pathLower.includes(query)) {
          score = Math.max(score, 70);
          matchSource = score === 70 ? "path" : matchSource;
        }

        if (entry.contentLower.includes(query)) {
          score = Math.max(score, 66);
          matchSource = score === 66 ? "content" : matchSource;
        }

        return score > 0 ? { entry, score, matchSource } : null;
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score || right.entry.modifiedAt - left.entry.modifiedAt)
      .slice(0, 8);
  }

  renderSearchResult(parent, match, query) {
    const { entry, matchSource } = match;
    const item = parent.createEl("button", { cls: "ad-search-result-item", attr: { type: "button" } });
    const title = item.createDiv({ cls: "ad-search-result-title" });
    const snippet = createSearchSnippet(entry.content, matchSource === "content" ? query : "", 132);

    this.appendHighlightedText(title, entry.title, query);

    if (snippet) {
      const snippetEl = item.createDiv({ cls: "ad-search-result-snippet" });
      this.appendHighlightedText(snippetEl, snippet, query);
    }

    item.createDiv({ text: entry.file.path, cls: "ad-search-result-path" });
    this.registerDomEvent(item, "click", () => this.app.workspace.getLeaf(false).openFile(entry.file));
  }

  appendHighlightedText(parent, text, query) {
    const source = String(text || "");
    const normalizedQuery = String(query || "").toLowerCase();

    if (!normalizedQuery) {
      parent.setText(source);
      return;
    }

    const sourceLower = source.toLowerCase();
    let cursor = 0;
    let matchIndex = sourceLower.indexOf(normalizedQuery, cursor);

    if (matchIndex < 0) {
      parent.setText(source);
      return;
    }

    while (matchIndex >= 0) {
      if (matchIndex > cursor) {
        parent.createSpan({ text: source.slice(cursor, matchIndex) });
      }

      parent.createEl("mark", { text: source.slice(matchIndex, matchIndex + normalizedQuery.length), cls: "ad-search-highlight" });
      cursor = matchIndex + normalizedQuery.length;
      matchIndex = sourceLower.indexOf(normalizedQuery, cursor);
    }

    if (cursor < source.length) {
      parent.createSpan({ text: source.slice(cursor) });
    }
  }

  renderHeatmap(root, cells) {
    const section = root.createDiv({ cls: "ad-panel ad-heatmap-panel" });
    const heading = section.createDiv({ cls: "ad-section-heading" });
    heading.createEl("h2", { text: "Vault Activity" });
    heading.createDiv({ text: "Last 13 weeks from created and modified notes", cls: "ad-section-sub" });

    const maxCount = Math.max(...cells.map((cell) => cell.count), 0);
    const body = section.createDiv({ cls: "ad-heatmap-body" });
    const labels = body.createDiv({ cls: "ad-heatmap-labels" });

    ["Mon", "", "Wed", "", "Fri", "", ""].forEach((label) => {
      labels.createDiv({ text: label, cls: "ad-heatmap-label" });
    });

    const weeks = body.createDiv({ cls: "ad-heatmap-weeks" });

    for (let weekIndex = 0; weekIndex < 13; weekIndex += 1) {
      const week = weeks.createDiv({ cls: "ad-heatmap-week" });

      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const cell = cells[weekIndex * 7 + dayIndex];
        const level = this.getHeatmapLevel(cell.count, maxCount);
        const square = week.createDiv({
          cls: "ad-heatmap-cell",
          attr: {
            "data-level": String(level),
            title: `${cell.date}: ${cell.count} activity, ${cell.created} created, ${cell.updated} updated`,
            "aria-label": `${cell.date}: ${cell.count} activity`,
          },
        });

        square.setText("");
      }
    }

    const legend = section.createDiv({ cls: "ad-heatmap-legend" });
    legend.createSpan({ text: "Less" });
    for (let level = 0; level <= 4; level += 1) {
      legend.createDiv({ cls: "ad-heatmap-cell", attr: { "data-level": String(level) } });
    }
    legend.createSpan({ text: "More" });
  }

  getHeatmapLevel(count, maxCount) {
    if (count <= 0 || maxCount <= 0) {
      return 0;
    }

    const ratio = count / maxCount;

    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  renderLists(root) {
    const lists = root.createDiv({ cls: "ad-lists" });
    const taskColumn = lists.createDiv({ cls: "ad-list-col" });
    taskColumn.createEl("h2", { text: "Today Tasks" });

    const taskLabel = taskColumn.createEl("label", { text: "Add task", cls: "ad-sr-only" });
    const taskInput = taskColumn.createEl("input", {
      type: "text",
      placeholder: "Add a new task...",
      cls: "ad-task-input",
    });
    taskInput.id = "ad-task-input";
    taskLabel.setAttr("for", taskInput.id);

    this.registerDomEvent(taskInput, "keydown", async (event) => {
      if (event.key !== "Enter") {
        return;
      }

      const text = taskInput.value.trim();

      if (!text) {
        return;
      }

      this.plugin.settings.tasks.push({ id: Date.now().toString(), text, done: false });
      taskInput.value = "";
      await this.plugin.saveSettings();
      this.renderTaskItems();
    });

    this.tasksContainer = taskColumn.createDiv({ cls: "ad-task-list" });
    this.renderTaskItems();

    const githubColumn = lists.createDiv({ cls: "ad-list-col ad-github-col" });
    const githubHeading = githubColumn.createDiv({ cls: "ad-list-heading-row" });
    githubHeading.createEl("h2", { text: "GitHub Star Radar" });
    const modeSwitch = githubHeading.createDiv({ cls: "ad-segmented" });
    const dailyButton = modeSwitch.createEl("button", { text: "Daily", cls: "ad-segment is-active" });
    const weeklyButton = modeSwitch.createEl("button", { text: "Weekly", cls: "ad-segment" });

    this.registerDomEvent(dailyButton, "click", () => {
      dailyButton.addClass("is-active");
      weeklyButton.removeClass("is-active");
      this.githubMode = "daily";
      this.renderCachedGitHubFeed();
      void this.fetchGitHubFeed("daily");
    });

    this.registerDomEvent(weeklyButton, "click", () => {
      weeklyButton.addClass("is-active");
      dailyButton.removeClass("is-active");
      this.githubMode = "weekly";
      this.renderCachedGitHubFeed();
      void this.fetchGitHubFeed("weekly");
    });

    this.ghStatusEl = githubColumn.createDiv({ cls: "ad-feed-status", attr: { "aria-live": "polite" } });
    this.ghFeedContainer = githubColumn.createDiv({ cls: "ad-gh-list" });
    this.ghFeedContainer.createDiv({ text: "Loading GitHub projects...", cls: "ad-list-item" });

    const radarColumn = lists.createDiv({ cls: "ad-list-col" });
    radarColumn.createEl("h2", { text: "Tech & AI Radar" });
    this.hnFeedContainer = radarColumn.createDiv({ cls: "ad-hn-list" });
    this.hnFeedContainer.createDiv({ text: "Loading news...", cls: "ad-list-item" });
  }

  renderTaskItems() {
    if (!this.tasksContainer) {
      return;
    }

    this.tasksContainer.empty();

    this.plugin.settings.tasks.forEach((task) => {
      const item = this.tasksContainer.createDiv({ cls: `ad-list-item ad-task-wrap${task.done ? " ad-task-done" : ""}` });
      const checkbox = item.createEl("input", { type: "checkbox", cls: "ad-task-checkbox" });
      checkbox.checked = Boolean(task.done);
      this.registerDomEvent(checkbox, "change", async () => {
        task.done = checkbox.checked;
        await this.plugin.saveSettings();
        this.renderTaskItems();
      });

      item.createSpan({ text: task.text, cls: "ad-task-text" });
      const removeButton = item.createEl("button", { text: "x", cls: "ad-task-del", attr: { "aria-label": `Remove task ${task.text}` } });
      this.registerDomEvent(removeButton, "click", async () => {
        this.plugin.settings.tasks = this.plugin.settings.tasks.filter((candidate) => candidate.id !== task.id);
        await this.plugin.saveSettings();
        this.renderTaskItems();
      });
    });
  }

  async fetchGitHubFeed(mode = "daily", force = false) {
    if (!this.ghFeedContainer) {
      return;
    }

    this.githubMode = mode;

    // 缓存新鲜（6h 内）且非强制刷新时，直接吃缓存，避免每次打开都打网络
    const GITHUB_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
    const cache = this.plugin.settings.githubCache && this.plugin.settings.githubCache[mode];
    const cacheFetchedAt = cache && cache.fetchedAt ? Date.parse(cache.fetchedAt) : 0;
    const cacheFresh = !force && cacheFetchedAt > 0 && Date.now() - cacheFetchedAt < GITHUB_CACHE_TTL_MS && Array.isArray(cache.items) && cache.items.length > 0;

    if (cacheFresh) {
      this.renderGitHubFeed(cache.items, { fromCache: true, mode });
      return;
    }

    if (force || !this.getCachedGitHubItems(mode).length) {
      this.ghFeedContainer.empty();
      this.createSignalLoader(this.ghFeedContainer, "github", "Gathering GitHub star signals…");
    }

    try {
      const items = await this.searchGitHubRepos(mode);

      if (!items.length) {
        throw new Error("GitHub returned no repositories for this window.");
      }

      this.plugin.settings.githubCache[mode] = {
        fetchedAt: new Date().toISOString(),
        items,
      };
      await this.plugin.saveSettings();
      this.renderGitHubFeed(items, { fromCache: false, mode });
    } catch (error) {
      const cached = this.getCachedGitHubItems(mode);

      if (cached.length) {
        this.renderGitHubFeed(cached, { fromCache: true, mode, error });
        return;
      }

      this.renderGitHubFeed(ENGINEERING_FALLBACK_ITEMS, { fallback: true, mode, error });
    }
  }

  renderCachedGitHubFeed() {
    const cached = this.getCachedGitHubItems(this.githubMode);

    if (cached.length) {
      this.renderGitHubFeed(cached, { fromCache: true, mode: this.githubMode });
    }
  }

  getCachedGitHubItems(mode) {
    const cache = this.plugin.settings.githubCache && this.plugin.settings.githubCache[mode];
    return cache && Array.isArray(cache.items) ? cache.items : [];
  }

  async getGitHubHeaders() {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "Obsidian-Forest-Agent-Dashboard",
    };
    let token = "";
    try {
      token = await this.plugin.getGitHubToken();
    } catch (_error) {
      token = "";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async searchGitHubRepos(mode) {
    try {
      const trendingItems = await this.fetchGitHubTrending(mode);
      const rankedTrendingItems = rankEngineeringRepos(trendingItems);

      if (rankedTrendingItems.length) {
        return rankedTrendingItems;
      }
    } catch (error) {
      console.warn("GitHub trending fetch failed, falling back to Search API.", error);
    }

    return this.searchGitHubReposByApi(mode);
  }

  async fetchGitHubTrending(mode) {
    const since = mode === "weekly" ? "weekly" : "daily";
    const response = await requestUrl({
      url: `https://github.com/trending?since=${since}`,
      method: "GET",
      headers: {
        Accept: "text/html",
        "User-Agent": "Obsidian-Forest-Agent-Dashboard",
      },
    });

    return parseGitHubTrendingHtml(response.text || "", mode);
  }

  async searchGitHubReposByApi(mode) {
    const plans = this.getGitHubSearchPlans(mode);
    const seen = new Set();
    const collected = [];

    for (const plan of plans) {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(plan.query)}&sort=stars&order=desc&per_page=8`;
      const response = await requestUrl({
        url,
        method: "GET",
        headers: await this.getGitHubHeaders(),
      });
      const repos = response.json && Array.isArray(response.json.items) ? response.json.items : [];

      if (repos.length) {
        const safeRepos = rankEngineeringRepos(repos.map(normalizeRepo));

        safeRepos.forEach((repo) => {
          if (!seen.has(repo.name)) {
            seen.add(repo.name);
            collected.push(repo);
          }
        });

        if (collected.length >= 8) {
          return collected.slice(0, 8);
        }
      }
    }

    return rankEngineeringRepos(collected);
  }

  getGitHubSearchPlans(mode) {
    if (mode === "weekly") {
      const week = formatDateKey(dateDaysAgo(7));

      return [
        { query: `topic:developer-tools created:>=${week} stars:>=20` },
        { query: `topic:cli created:>=${week} stars:>=20` },
        { query: `topic:agent-skill created:>=${week} stars:>=20` },
        { query: `topic:ai-agents created:>=${week} stars:>=20` },
        { query: `topic:mcp created:>=${week} stars:>=20` },
        { query: `topic:llm created:>=${week} stars:>=20` },
        { query: `topic:observability pushed:>=${week} stars:>=300` },
        { query: `topic:database pushed:>=${week} stars:>=500` },
        { query: `topic:kubernetes pushed:>=${week} stars:>=500` },
        { query: `claude-code in:name,description pushed:>=${week} stars:>=50` },
        { query: `codex in:name,description pushed:>=${week} stars:>=50` },
      ];
    }

    const today = formatDateKey(dateDaysAgo(1));

    return [
      { query: `topic:developer-tools created:>=${today} stars:>=5` },
      { query: `topic:cli created:>=${today} stars:>=5` },
      { query: `topic:agent-skill created:>=${today} stars:>=5` },
      { query: `topic:ai-agents created:>=${today} stars:>=5` },
      { query: `topic:mcp created:>=${today} stars:>=5` },
      { query: `topic:llm created:>=${today} stars:>=5` },
      { query: `topic:observability pushed:>=${today} stars:>=300` },
      { query: `topic:database pushed:>=${today} stars:>=500` },
      { query: `topic:kubernetes pushed:>=${today} stars:>=500` },
      { query: `claude-code in:name,description pushed:>=${today} stars:>=30` },
      { query: `codex in:name,description pushed:>=${today} stars:>=30` },
    ];
  }

  renderGitHubFeed(items, options) {
    if (!this.ghFeedContainer) {
      return;
    }

    this.stopLoadingMotion("github");
    const label = options.mode === "weekly" ? "GitHub Trending weekly" : "GitHub Trending daily";
    this.ghFeedContainer.empty();

    if (this.ghStatusEl) {
      const cacheText = options.fallback ? "curated fallback" : options.fromCache ? "cached" : "fresh";
      this.ghStatusEl.setText(`${label} star radar, ${cacheText}`);
    }

    if (options.error && this.ghStatusEl) {
      this.ghStatusEl.setText(options.fallback ? "engineering seed list, GitHub API unavailable" : `${label} star radar, cached because GitHub API failed`);
    }

    items.slice(0, 8).forEach((item) => this.createGitHubItem(this.ghFeedContainer, item));
  }

  createGitHubItem(parent, item) {
    const row = parent.createDiv({ cls: "ad-list-item ad-gh-item" });
    const top = row.createDiv({ cls: "ad-gh-top" });
    const link = top.createEl("a", { text: item.name, href: item.url, cls: "ad-gh-name" });
    link.setAttr("target", "_blank");
    link.setAttr("rel", "noopener noreferrer");
    top.createSpan({ text: item.trend || (item.stars ? `${compactNumber(item.stars)} stars` : "curated"), cls: "ad-gh-stars" });
    row.createDiv({ text: item.description || "No GitHub description provided.", cls: "ad-gh-desc" });

    const meta = row.createDiv({ cls: "ad-gh-meta" });
    meta.createSpan({ text: item.language });
    getRepoTopics(item).forEach((topic) => meta.createSpan({ text: topic }));
  }

  async fetchHackerNewsFeed() {
    if (!this.hnFeedContainer) {
      return;
    }

    this.stopLoadingMotion("news");
    this.hnFeedContainer.empty();
    this.createSignalLoader(this.hnFeedContainer, "news", "Gathering technology news…");

    try {
      const topStories = await requestUrl("https://hacker-news.firebaseio.com/v0/topstories.json");
      const ids = Array.isArray(topStories.json) ? topStories.json.slice(0, 10) : [];

      // 并发拉取，单个失败不影响其余，保持原始顺序
      const stories = await Promise.all(
        ids.map((id) =>
          requestUrl(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((res) => res.json).catch(() => null)
        )
      );

      this.stopLoadingMotion("news");
      this.hnFeedContainer.empty();

      stories.forEach((story, index) => {
        if (story && story.title) {
          this.createHNItem(this.hnFeedContainer, story.title, story.url || `https://news.ycombinator.com/item?id=${ids[index]}`);
        }
      });
    } catch (_error) {
      this.stopLoadingMotion("news");
      this.hnFeedContainer.empty();
      this.hnFeedContainer.createDiv({ text: "Failed to fetch HN.", cls: "ad-list-item ad-error-text" });
    }
  }

  createHNItem(parent, title, url) {
    const row = parent.createDiv({ cls: "ad-list-item ad-hn-item" });
    const link = row.createEl("a", { text: title, href: url, cls: "ad-hn-link" });
    link.setAttr("target", "_blank");
    link.setAttr("rel", "noopener noreferrer");
  }
}

class DashboardSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    let pendingGitHubToken = "";
    new Setting(containerEl)
      .setName("GitHub token")
      .setDesc(this.plugin.settings.githubTokenStored
        ? "Stored securely. Paste a new token only when replacing it."
        : "Optional. Stored securely and used only for GitHub REST API rate limits.")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setPlaceholder("github_pat_...");
        text.setValue("");
        text.onChange((value) => {
          pendingGitHubToken = value.trim();
        });
      })
      .addButton((button) => {
        button.setButtonText(this.plugin.settings.githubTokenStored ? "Replace" : "Save");
        button.onClick(async () => {
          if (!pendingGitHubToken) {
            new Notice("Paste a GitHub token first.");
            return;
          }
          await this.plugin.saveGitHubToken(pendingGitHubToken);
          new Notice("GitHub token stored securely.");
          this.display();
        });
      })
      .addButton((button) => {
        button.setButtonText("Remove");
        button.setDisabled(!this.plugin.settings.githubTokenStored);
        button.onClick(async () => {
          await this.plugin.removeGitHubToken();
          new Notice("GitHub token removed.");
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("Custom mascot image")
      .setDesc("Optional vault-relative image path. The public plugin ships only the original Forest T mark.")
      .addText((text) => {
        text.setPlaceholder(DEFAULT_SETTINGS.mascotImagePath);
        text.setValue(this.plugin.settings.mascotImagePath || DEFAULT_SETTINGS.mascotImagePath);
        text.onChange(async (value) => {
          this.plugin.settings.mascotImagePath = value.trim() || DEFAULT_SETTINGS.mascotImagePath;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl).setName("Mailroom").setHeading();
    containerEl.createEl("p", {
      text: "Read-only mail summaries for desktop Obsidian. OAuth tokens and the QQ authorization code use Obsidian secure storage; message headers remain in memory and are not saved to the vault.",
    });

    new Setting(containerEl)
      .setName("Gmail address")
      .setDesc("Optional. Displayed in the Mailroom and available to copy.")
      .addText((text) => {
        text.setPlaceholder("you@gmail.com");
        text.setValue(this.plugin.settings.gmailAddress || "");
        text.onChange(async (value) => {
          this.plugin.settings.gmailAddress = value.trim();
          await this.plugin.saveSettings();
          this.plugin.refreshMailViews();
        });
      });

    new Setting(containerEl)
      .setName("Gmail inbox URL")
      .setDesc("HTTPS webmail URL opened by the Gmail button.")
      .addText((text) => {
        text.setPlaceholder(DEFAULT_SETTINGS.gmailInboxUrl);
        text.setValue(this.plugin.settings.gmailInboxUrl || DEFAULT_SETTINGS.gmailInboxUrl);
        text.onChange(async (value) => {
          this.plugin.settings.gmailInboxUrl = normalizeHttpsUrl(value.trim(), DEFAULT_SETTINGS.gmailInboxUrl);
          await this.plugin.saveSettings();
          this.plugin.refreshMailViews();
        });
      });

    new Setting(containerEl)
      .setName("Google Desktop OAuth client ID")
      .setDesc("Enable the Gmail API, then create an OAuth client of type Desktop app. Only the gmail.metadata scope is requested.")
      .addText((text) => {
        text.setPlaceholder("000000000000-….apps.googleusercontent.com");
        text.setValue(this.plugin.settings.gmailClientId || "");
        text.onChange(async (value) => {
          this.plugin.settings.gmailClientId = value.trim();
          await this.plugin.saveSettings();
          this.plugin.refreshMailViews();
        });
      });

    let pendingGmailClientSecret = "";
    const gmailSecretSetting = new Setting(containerEl)
      .setName("Google OAuth client secret")
      .setDesc("Some Desktop clients require this during Token exchange. Copy only the Client secret value from Google Cloud; it is stored in Obsidian secure storage.")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setPlaceholder(this.plugin.settings.gmailClientSecretStored
          ? "Saved securely — enter a new secret to replace"
          : "Client secret");
        text.onChange((value) => {
          pendingGmailClientSecret = value;
        });
      })
      .addButton((button) => {
        button.setButtonText("Save secret");
        button.setCta();
        button.onClick(async () => {
          try {
            await this.plugin.saveGmailClientSecret(pendingGmailClientSecret);
            pendingGmailClientSecret = "";
            new Notice("Google OAuth client secret saved securely.");
            this.display();
          } catch (error) {
            new Notice(error && error.message ? error.message : "Could not save the Google client secret.");
          }
        });
      });

    if (this.plugin.settings.gmailClientSecretStored) {
      gmailSecretSetting.addButton((button) => {
        button.setButtonText("Remove secret");
        button.setWarning();
        button.onClick(async () => {
          await this.plugin.removeGmailClientSecret();
          new Notice("Google OAuth client secret removed.");
          this.display();
        });
      });
    }

    const gmailConnection = new Setting(containerEl)
      .setName("Gmail connection")
      .setDesc(this.plugin.hasGmailConnection()
        ? `Connected as ${this.plugin.settings.gmailAddress || "Gmail user"}.`
        : "Authorization opens in your system browser and returns to Obsidian through a local loopback callback.");

    if (this.plugin.hasGmailConnection()) {
      gmailConnection
        .addButton((button) => {
          button.setButtonText("Test connection");
          button.onClick(async () => {
            button.setDisabled(true);
            try {
              const summary = await this.plugin.fetchGmailSummary();
              new Notice(`Gmail connected · ${summary.unreadCount} unread.`);
              this.plugin.refreshMailViews();
            } catch (error) {
              new Notice(error && error.message ? error.message : "Gmail test failed.");
            } finally {
              button.setDisabled(false);
            }
          });
        })
        .addButton((button) => {
          button.setButtonText("Disconnect");
          button.setWarning();
          button.onClick(async () => {
            await this.plugin.disconnectGmail();
            new Notice("Gmail disconnected.");
            this.display();
          });
        });
    } else {
      gmailConnection.addButton((button) => {
        button.setButtonText("Connect Gmail");
        button.setCta();
        button.onClick(async () => {
          button.setDisabled(true);
          try {
            const profile = await this.plugin.connectGmail();
            new Notice(`Gmail connected${profile.emailAddress ? ` as ${profile.emailAddress}` : ""}.`);
            this.display();
          } catch (error) {
            new Notice(error && error.message ? error.message : "Gmail connection failed.");
          } finally {
            button.setDisabled(false);
          }
        });
      });
    }

    new Setting(containerEl)
      .setName("QQ Mail address")
      .setDesc("Optional. Displayed in the Mailroom and available to copy.")
      .addText((text) => {
        text.setPlaceholder("you@qq.com");
        text.setValue(this.plugin.settings.qqMailAddress || "");
        text.onChange(async (value) => {
          this.plugin.settings.qqMailAddress = value.trim();
          await this.plugin.saveSettings();
          this.plugin.refreshMailViews();
        });
      });

    new Setting(containerEl)
      .setName("QQ Mail inbox URL")
      .setDesc("HTTPS webmail URL opened by the QQ Mail button.")
      .addText((text) => {
        text.setPlaceholder(DEFAULT_SETTINGS.qqMailInboxUrl);
        text.setValue(this.plugin.settings.qqMailInboxUrl || DEFAULT_SETTINGS.qqMailInboxUrl);
        text.onChange(async (value) => {
          this.plugin.settings.qqMailInboxUrl = normalizeHttpsUrl(value.trim(), DEFAULT_SETTINGS.qqMailInboxUrl);
          await this.plugin.saveSettings();
          this.plugin.refreshMailViews();
        });
      });

    let pendingQqAuthCode = "";
    new Setting(containerEl)
      .setName("QQ IMAP authorization code")
      .setDesc("Enable IMAP/SMTP in QQ Mail settings and generate an authorization code. This is not your QQ password.")
      .addText((text) => {
        text.inputEl.type = "password";
        text.setPlaceholder(this.plugin.settings.qqAuthCodeEncrypted
          ? "Saved securely — enter a new code to replace"
          : "Authorization code");
        text.onChange((value) => {
          pendingQqAuthCode = value;
        });
      })
      .addButton((button) => {
        button.setButtonText("Save code");
        button.setCta();
        button.onClick(async () => {
          try {
            await this.plugin.saveQqAuthCode(pendingQqAuthCode);
            pendingQqAuthCode = "";
            new Notice("QQ authorization code saved securely.");
            this.display();
          } catch (error) {
            new Notice(error && error.message ? error.message : "Could not save the QQ authorization code.");
          }
        });
      });

    if (this.plugin.hasQqMailConnection()) {
      new Setting(containerEl)
        .setName("QQ IMAP connection")
        .setDesc(`Ready to connect as ${this.plugin.settings.qqMailAddress}.`)
        .addButton((button) => {
          button.setButtonText("Test connection");
          button.onClick(async () => {
            button.setDisabled(true);
            try {
              const summary = await this.plugin.fetchQqMailSummary();
              new Notice(`QQ Mail connected · ${summary.unreadCount} unread.`);
              this.plugin.refreshMailViews();
            } catch (error) {
              new Notice(error && error.message ? error.message : "QQ IMAP test failed.");
            } finally {
              button.setDisabled(false);
            }
          });
        })
        .addButton((button) => {
          button.setButtonText("Remove code");
          button.setWarning();
          button.onClick(async () => {
            await this.plugin.disconnectQqMail();
            new Notice("QQ Mail disconnected.");
            this.display();
          });
        });
    }

    new Setting(containerEl)
      .setName("Clear frequent-note history")
      .setDesc("Resets only the dashboard open counters. It does not change any note.")
      .addButton((button) => {
        button.setButtonText("Clear history");
        button.onClick(async () => {
          this.plugin.settings.noteOpenStats = {};
          await this.plugin.saveSettings();
          this.plugin.refreshFrequentNoteViews();
          new Notice("Frequent-note history cleared.");
        });
      });

    new Setting(containerEl)
      .setName("Clear GitHub cache")
      .setDesc("Use this after changing the token or query direction.")
      .addButton((button) => {
        button.setButtonText("Clear cache");
        button.onClick(async () => {
          this.plugin.settings.githubCache = { daily: null, weekly: null };
          await this.plugin.saveSettings();
          new Notice("GitHub cache cleared.");
        });
      });
  }
}

export default class ForestAgentDashboardPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    await this.migrateCredentialStorage();
    this.lastRecordedOpen = new Map();
    this.registerView(VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
    this.addSettingTab(new DashboardSettingTab(this.app, this));
    this.addRibbonIcon("bot", "Open Forest Agent Dashboard", () => this.activateView());
    this.addCommand({
      id: "open-dashboard",
      name: "Open dashboard",
      callback: () => this.activateView(),
    });
    this.registerEvent(this.app.workspace.on("file-open", (file) => {
      void this.recordNoteOpen(file);
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      void this.renameNoteOpenStats(file, oldPath);
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      void this.deleteNoteOpenStats(file && file.path);
    }));
  }

  onunload() {}

  async loadSettings() {
    const loaded = await this.loadData();
    const settings = Object.assign({}, DEFAULT_SETTINGS, loaded || {});

    settings.tasks = Array.isArray(settings.tasks) ? settings.tasks : [];
    settings.githubToken = typeof settings.githubToken === "string" ? settings.githubToken : "";
    settings.githubTokenStored = typeof settings.githubTokenStored === "string" ? settings.githubTokenStored : "";
    settings.mascotImagePath = typeof settings.mascotImagePath === "string" && settings.mascotImagePath.trim()
      ? settings.mascotImagePath.trim()
      : DEFAULT_SETTINGS.mascotImagePath;
    settings.githubCache = Object.assign({}, DEFAULT_SETTINGS.githubCache, settings.githubCache || {});
    settings.noteOpenStats = this.sanitizeNoteOpenStats(settings.noteOpenStats);
    settings.gmailAddress = typeof settings.gmailAddress === "string" ? settings.gmailAddress.trim() : "";
    settings.gmailInboxUrl = normalizeHttpsUrl(settings.gmailInboxUrl, DEFAULT_SETTINGS.gmailInboxUrl);
    settings.gmailClientId = typeof settings.gmailClientId === "string" ? settings.gmailClientId.trim() : "";
    settings.gmailClientSecretStored = typeof settings.gmailClientSecretStored === "string" ? settings.gmailClientSecretStored : "";
    settings.gmailTokenEncrypted = typeof settings.gmailTokenEncrypted === "string" ? settings.gmailTokenEncrypted : "";
    settings.qqMailAddress = typeof settings.qqMailAddress === "string" ? settings.qqMailAddress.trim() : "";
    settings.qqMailInboxUrl = normalizeHttpsUrl(settings.qqMailInboxUrl, DEFAULT_SETTINGS.qqMailInboxUrl);
    settings.qqAuthCodeEncrypted = typeof settings.qqAuthCodeEncrypted === "string" ? settings.qqAuthCodeEncrypted : "";

    GITHUB_CACHE_KEYS.forEach((key) => {
      if (settings.githubCache[key] && !Array.isArray(settings.githubCache[key].items)) {
        settings.githubCache[key] = null;
      }
    });

    this.settings = settings;
  }

  sanitizeNoteOpenStats(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    const cutoffKey = formatDateKey(dateDaysAgo(29));
    const result = {};

    Object.entries(value).forEach(([path, rawEntry]) => {
      if (!path || !rawEntry || typeof rawEntry !== "object") {
        return;
      }

      const rawDays = rawEntry.days && typeof rawEntry.days === "object" ? rawEntry.days : {};
      const days = {};

      Object.entries(rawDays).forEach(([day, count]) => {
        const safeCount = Math.max(0, Math.floor(Number(count) || 0));
        if (day >= cutoffKey && safeCount > 0) {
          days[day] = safeCount;
        }
      });

      if (Object.keys(days).length) {
        result[path] = {
          days,
          lastOpenedAt: Math.max(0, Number(rawEntry.lastOpenedAt) || 0),
        };
      }
    });

    return result;
  }

  async recordNoteOpen(file) {
    if (!file || file.extension !== "md" || !file.path) {
      return;
    }

    const now = Date.now();
    const lastRecordedAt = this.lastRecordedOpen.get(file.path) || 0;

    if (now - lastRecordedAt < 4000) {
      return;
    }

    this.lastRecordedOpen.set(file.path, now);
    const current = this.settings.noteOpenStats[file.path] || { days: {}, lastOpenedAt: 0 };
    const todayKey = formatDateKey(new Date(now));
    const cutoffKey = formatDateKey(dateDaysAgo(29));
    const days = {};

    Object.entries(current.days || {}).forEach(([day, count]) => {
      if (day >= cutoffKey) {
        days[day] = Math.max(0, Math.floor(Number(count) || 0));
      }
    });
    days[todayKey] = (days[todayKey] || 0) + 1;

    this.settings.noteOpenStats[file.path] = { days, lastOpenedAt: now };
    await this.saveSettings();
    this.refreshFrequentNoteViews();
  }

  async renameNoteOpenStats(file, oldPath) {
    if (!oldPath || !file || file.extension !== "md" || !this.settings.noteOpenStats[oldPath]) {
      return;
    }

    this.settings.noteOpenStats[file.path] = this.settings.noteOpenStats[oldPath];
    delete this.settings.noteOpenStats[oldPath];
    await this.saveSettings();
    this.refreshFrequentNoteViews();
  }

  async deleteNoteOpenStats(path) {
    if (!path || !this.settings.noteOpenStats[path]) {
      return;
    }

    delete this.settings.noteOpenStats[path];
    await this.saveSettings();
    this.refreshFrequentNoteViews();
  }

  getFrequentNoteEntries(limit = 6, days = 7) {
    const files = this.app.vault.getMarkdownFiles();
    const fileByPath = new Map(files.map((file) => [file.path, file]));
    const cutoffKey = formatDateKey(dateDaysAgo(Math.max(0, days - 1)));
    const tracked = Object.entries(this.settings.noteOpenStats || {})
      .map(([path, entry]) => {
        const file = fileByPath.get(path);
        if (!file) return null;

        const openCount = Object.entries(entry.days || {}).reduce((sum, [day, count]) => (
          day >= cutoffKey ? sum + Math.max(0, Number(count) || 0) : sum
        ), 0);

        return openCount > 0 ? {
          file,
          openCount,
          lastOpenedAt: Math.max(0, Number(entry.lastOpenedAt) || 0),
          isFallback: false,
        } : null;
      })
      .filter(Boolean)
      .sort((left, right) => (
        right.openCount - left.openCount
        || right.lastOpenedAt - left.lastOpenedAt
        || right.file.stat.mtime - left.file.stat.mtime
      ));

    const selected = tracked.slice(0, limit);
    const selectedPaths = new Set(selected.map((entry) => entry.file.path));

    if (selected.length < limit) {
      files
        .filter((file) => !selectedPaths.has(file.path))
        .sort((left, right) => right.stat.mtime - left.stat.mtime)
        .slice(0, limit - selected.length)
        .forEach((file) => selected.push({
          file,
          openCount: 0,
          lastOpenedAt: file.stat.mtime,
          isFallback: true,
        }));
    }

    return selected;
  }

  refreshFrequentNoteViews() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
      const view = leaf && leaf.view;
      if (view && typeof view.renderFrequentNoteItems === "function") {
        view.renderFrequentNoteItems();
      }
    });
  }

  refreshMailViews() {
    this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
      const view = leaf && leaf.view;
      if (view && typeof view.refreshMailHub === "function") {
        view.refreshMailHub();
      }
    });
  }

  getKeychainAccount(kind) {
    const crypto = require("crypto");
    const adapter = this.app && this.app.vault && this.app.vault.adapter;
    const vaultIdentity = adapter && typeof adapter.basePath === "string"
      ? adapter.basePath
      : (this.app && this.app.vault && typeof this.app.vault.getName === "function" ? this.app.vault.getName() : "default");
    const vaultHash = crypto.createHash("sha256").update(String(vaultIdentity)).digest("hex").slice(0, 16);
    return `${kind}:${vaultHash}`;
  }

  getSecretStorageId(kind) {
    return `forest-agent-dashboard-${this.getKeychainAccount(kind).replace(":", "-")}`;
  }

  getNativeSecretStorage() {
    const storage = this.app && this.app.secretStorage;
    return storage && typeof storage.setSecret === "function" && typeof storage.getSecret === "function"
      ? storage
      : null;
  }

  async migrateCredentialStorage() {
    let changed = false;
    const legacyGitHubToken = String(this.settings.githubToken || "").trim();
    if (legacyGitHubToken) {
      await this.storeCredential("github-token", legacyGitHubToken);
      this.settings.githubTokenStored = "secure-storage:github-token";
      delete this.settings.githubToken;
      changed = true;
    }

    const storage = this.getNativeSecretStorage();
    if (!storage) {
      if (changed) await this.saveSettings();
      return;
    }

    const credentials = [
      { kind: "github-token", marker: "githubTokenStored" },
      { kind: "gmail-oauth", marker: "gmailTokenEncrypted", validate: (value) => {
        const parsed = JSON.parse(value);
        return Boolean(parsed && parsed.accessToken && parsed.refreshToken);
      } },
      { kind: "gmail-client-secret", marker: "gmailClientSecretStored" },
      { kind: "qq-imap", marker: "qqAuthCodeEncrypted" },
    ];
    for (const credential of credentials) {
      if (!this.settings[credential.marker]) continue;
      const storageId = this.getSecretStorageId(credential.kind);
      let value = storage.getSecret(storageId);

      if (!value) {
        try {
          value = await readKeychainSecret(this.getKeychainAccount(credential.kind));
        } catch (_error) {
          value = "";
        }
      }

      let valid = Boolean(value);
      if (valid && credential.validate) {
        try {
          valid = credential.validate(value);
        } catch (_error) {
          valid = false;
        }
      }

      if (!valid) {
        storage.setSecret(storageId, "");
        this.settings[credential.marker] = "";
        changed = true;
      } else {
        storage.setSecret(storageId, value);
        const marker = `secret-storage:${credential.kind}`;
        if (this.settings[credential.marker] !== marker) {
          this.settings[credential.marker] = marker;
          changed = true;
        }
      }

      try {
        await deleteKeychainSecret(this.getKeychainAccount(credential.kind));
      } catch (_error) {
        // Migration is already complete in Obsidian storage; stale legacy data is harmless.
      }
    }

    if (changed) await this.saveSettings();
  }

  async storeCredential(kind, value) {
    const storage = this.getNativeSecretStorage();
    if (storage) {
      storage.setSecret(this.getSecretStorageId(kind), String(value));
      return;
    }
    await storeKeychainSecret(this.getKeychainAccount(kind), value);
  }

  async readCredential(kind) {
    const storage = this.getNativeSecretStorage();
    if (storage) {
      const value = storage.getSecret(this.getSecretStorageId(kind));
      if (value) return value;
      throw new Error("The saved credential is missing from Obsidian secure storage. Add it again in settings.");
    }

    try {
      return await readKeychainSecret(this.getKeychainAccount(kind));
    } catch (error) {
      if (/could not be found/i.test(String(error && error.message))) {
        throw new Error("The saved credential is missing from macOS Keychain. Add it again in settings.");
      }
      throw error;
    }
  }

  async deleteCredential(kind) {
    const storage = this.getNativeSecretStorage();
    if (storage) storage.setSecret(this.getSecretStorageId(kind), "");
    await deleteKeychainSecret(this.getKeychainAccount(kind));
  }

  async saveGitHubToken(value) {
    const token = String(value || "").trim();
    if (!token) throw new Error("Enter a GitHub token.");
    await this.storeCredential("github-token", token);
    this.settings.githubTokenStored = "secure-storage:github-token";
    delete this.settings.githubToken;
    this.settings.githubCache = { daily: null, weekly: null };
    await this.saveSettings();
  }

  async removeGitHubToken() {
    await this.deleteCredential("github-token");
    this.settings.githubTokenStored = "";
    delete this.settings.githubToken;
    this.settings.githubCache = { daily: null, weekly: null };
    await this.saveSettings();
  }

  async getGitHubToken() {
    if (!this.settings.githubTokenStored) return "";
    return this.readCredential("github-token");
  }

  async saveGmailClientSecret(value) {
    const secret = String(value || "").trim();
    if (!secret) throw new Error("Enter the Google OAuth client secret.");
    await this.storeCredential("gmail-client-secret", secret);
    this.settings.gmailClientSecretStored = "secret-storage:gmail-client-secret";
    await this.saveSettings();
  }

  async removeGmailClientSecret() {
    await this.deleteCredential("gmail-client-secret");
    this.settings.gmailClientSecretStored = "";
    await this.saveSettings();
  }

  async getGmailClientSecret() {
    if (!this.settings.gmailClientSecretStored) return "";
    return this.readCredential("gmail-client-secret");
  }

  hasGmailConnection() {
    return Boolean(this.settings.gmailClientId && this.settings.gmailTokenEncrypted);
  }

  hasQqMailConnection() {
    return Boolean(this.settings.qqMailAddress && this.settings.qqAuthCodeEncrypted);
  }

  async connectGmail() {
    const clientId = String(this.settings.gmailClientId || "").trim();
    if (!clientId) {
      throw new Error("Add a Google Desktop OAuth client ID in Forest Dashboard settings first.");
    }

    const clientSecret = await this.getGmailClientSecret();
    const crypto = require("crypto");
    const http = require("http");
    const shell = getExternalShell();
    if (!shell) {
      throw new Error("The system browser could not be opened from Obsidian.");
    }

    const verifier = base64UrlEncode(crypto.randomBytes(48));
    const challenge = base64UrlEncode(crypto.createHash("sha256").update(verifier).digest());
    const state = base64UrlEncode(crypto.randomBytes(24));
    let resolveCallback;
    let rejectCallback;
    let callbackSettled = false;
    const callbackPromise = new Promise((resolve, reject) => {
      resolveCallback = resolve;
      rejectCallback = reject;
    });
    const server = http.createServer((request, response) => {
      const requestUrlObject = new URL(request.url || "/", "http://127.0.0.1");
      if (requestUrlObject.pathname !== "/oauth2callback") {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not found");
        return;
      }

      const returnedState = requestUrlObject.searchParams.get("state") || "";
      const code = requestUrlObject.searchParams.get("code") || "";
      const oauthError = requestUrlObject.searchParams.get("error") || "";
      response.writeHead(oauthError || !code || returnedState !== state ? 400 : 200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(oauthError || !code || returnedState !== state
        ? "<h2>Gmail connection was not completed.</h2><p>Return to Obsidian and try again.</p>"
        : "<h2>Google authorization received.</h2><p>Return to Obsidian while it finishes connecting Gmail.</p>");

      if (callbackSettled) return;
      callbackSettled = true;
      if (oauthError) {
        rejectCallback(new Error(`Google authorization ended with: ${oauthError}`));
      } else if (!code || returnedState !== state) {
        rejectCallback(new Error("Google authorization state validation failed."));
      } else {
        resolveCallback(code);
      }
    });

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const port = server.address().port;
    const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GMAIL_METADATA_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      login_hint: this.settings.gmailAddress || "",
    }).toString();

    const timeout = window.setTimeout(() => {
      if (callbackSettled) return;
      callbackSettled = true;
      rejectCallback(new Error("Gmail authorization timed out. Try connecting again."));
      server.close();
    }, 5 * 60 * 1000);

    try {
      await shell.openExternal(authorizationUrl.toString());
      const code = await callbackPromise;
      const tokenRequest = {
        client_id: clientId,
        code,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      };
      if (clientSecret) tokenRequest.client_secret = clientSecret;
      const token = await postForm(GMAIL_TOKEN_URL, tokenRequest);
      const tokenBundle = {
        accessToken: token.access_token,
        refreshToken: token.refresh_token || "",
        expiresAt: Date.now() + Math.max(60, Number(token.expires_in) || 3600) * 1000,
        scope: token.scope || GMAIL_METADATA_SCOPE,
      };

      if (!tokenBundle.accessToken || !tokenBundle.refreshToken) {
        throw new Error("Google did not return a reusable Gmail session. Revoke the test grant and connect again.");
      }

      await this.storeCredential("gmail-oauth", JSON.stringify(tokenBundle));
      this.settings.gmailTokenEncrypted = "secret-storage:gmail-oauth";
      await this.saveSettings();
      this.refreshMailViews();

      const profile = await gmailApiRequest("/profile", tokenBundle.accessToken);
      if (profile.emailAddress) {
        this.settings.gmailAddress = String(profile.emailAddress);
      }
      await this.saveSettings();
      this.refreshMailViews();
      return profile;
    } finally {
      window.clearTimeout(timeout);
      if (server.listening) server.close();
    }
  }

  async disconnectGmail() {
    await this.deleteCredential("gmail-oauth");
    this.settings.gmailTokenEncrypted = "";
    await this.saveSettings();
    this.refreshMailViews();
  }

  async getGmailAccessToken() {
    if (!this.settings.gmailClientId || !this.settings.gmailTokenEncrypted) {
      throw new Error("Gmail is not connected.");
    }

    let tokenBundle;
    try {
      tokenBundle = JSON.parse(await this.readCredential("gmail-oauth"));
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("The saved Gmail session is invalid. Reconnect Gmail.");
      }
      throw error;
    }
    if (tokenBundle.accessToken && Number(tokenBundle.expiresAt) > Date.now() + 60 * 1000) {
      return tokenBundle.accessToken;
    }
    if (!tokenBundle.refreshToken) {
      throw new Error("The Gmail refresh token is missing. Reconnect Gmail.");
    }

    const refreshRequest = {
      client_id: this.settings.gmailClientId,
      refresh_token: tokenBundle.refreshToken,
      grant_type: "refresh_token",
    };
    const clientSecret = await this.getGmailClientSecret();
    if (clientSecret) refreshRequest.client_secret = clientSecret;
    const refreshed = await postForm(GMAIL_TOKEN_URL, refreshRequest);
    tokenBundle.accessToken = refreshed.access_token;
    tokenBundle.expiresAt = Date.now() + Math.max(60, Number(refreshed.expires_in) || 3600) * 1000;
    tokenBundle.scope = refreshed.scope || tokenBundle.scope;
    await this.storeCredential("gmail-oauth", JSON.stringify(tokenBundle));
    this.settings.gmailTokenEncrypted = "secret-storage:gmail-oauth";
    await this.saveSettings();
    return tokenBundle.accessToken;
  }

  async fetchGmailSummary(options = {}) {
    const mode = options.mode === "recent" ? "recent" : "unread";
    const limit = Math.max(1, Math.min(MAIL_MAX_ITEMS, Number(options.limit) || MAIL_PAGE_SIZE));
    const accessToken = await this.getGmailAccessToken();
    const listPath = mode === "recent"
      ? `/messages?maxResults=${limit}&labelIds=INBOX`
      : `/messages?maxResults=${limit}&labelIds=INBOX&labelIds=UNREAD`;
    const [profile, messageList, inboxLabel] = await Promise.all([
      gmailApiRequest("/profile", accessToken),
      gmailApiRequest(listPath, accessToken),
      gmailApiRequest("/labels/INBOX", accessToken),
    ]);
    const messages = await mapWithConcurrency((messageList.messages || []).slice(0, limit), 3, async (item) => {
      const detail = await gmailApiRequest(`/messages/${encodeURIComponent(item.id)}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, accessToken);
      return {
        id: detail.id,
        threadId: detail.threadId,
        sender: cleanSender(getGmailHeader(detail, "From")),
        subject: decodeMimeWords(getGmailHeader(detail, "Subject")).trim() || "(No subject)",
        snippet: String(detail.snippet || "").replace(/\s+/g, " ").trim(),
        receivedAt: Number(detail.internalDate) || Date.parse(getGmailHeader(detail, "Date")) || 0,
        unread: Array.isArray(detail.labelIds) && detail.labelIds.includes("UNREAD"),
      };
    });

    if (profile.emailAddress && profile.emailAddress !== this.settings.gmailAddress) {
      this.settings.gmailAddress = String(profile.emailAddress);
      await this.saveSettings();
    }

    return {
      address: profile.emailAddress || this.settings.gmailAddress,
      mode,
      unreadCount: Math.max(0, Number(inboxLabel.messagesUnread) || 0),
      messages,
      hasMore: limit < MAIL_MAX_ITEMS && Boolean(messageList.nextPageToken),
      fetchedAt: Date.now(),
    };
  }

  async saveQqAuthCode(authCode) {
    const cleanCode = String(authCode || "").trim();
    if (!cleanCode) {
      throw new Error("Enter the QQ Mail authorization code.");
    }
    await this.storeCredential("qq-imap", cleanCode);
    this.settings.qqAuthCodeEncrypted = "secret-storage:qq-imap";
    await this.saveSettings();
    this.refreshMailViews();
  }

  async disconnectQqMail() {
    await this.deleteCredential("qq-imap");
    this.settings.qqAuthCodeEncrypted = "";
    await this.saveSettings();
    this.refreshMailViews();
  }

  async fetchQqMailSummary(options = {}) {
    const mode = options.mode === "recent" ? "recent" : "unread";
    const limit = Math.max(1, Math.min(MAIL_MAX_ITEMS, Number(options.limit) || MAIL_PAGE_SIZE));
    const email = String(this.settings.qqMailAddress || "").trim();
    if (!email || !this.settings.qqAuthCodeEncrypted) {
      throw new Error("Add the QQ Mail address and authorization code in Dashboard settings.");
    }

    const authCode = await this.readCredential("qq-imap");
    const client = new SimpleImapClient();
    try {
      await client.connect();
      await client.execute(`LOGIN ${imapQuote(email)} ${imapQuote(authCode)}`);
      await client.execute("SELECT INBOX");
      const unreadResponse = await client.execute("UID SEARCH UNSEEN");
      const unreadIds = parseImapSearchIds(unreadResponse);
      const allIds = mode === "recent"
        ? parseImapSearchIds(await client.execute("UID SEARCH ALL"))
        : unreadIds;
      const previewIds = allIds.slice(-limit).reverse();
      const messages = [];

      for (const uid of previewIds) {
        const response = await client.execute(`UID FETCH ${uid} (BODY.PEEK[HEADER.FIELDS (FROM SUBJECT DATE)] FLAGS)`);
        messages.push(parseImapHeaders(response, uid));
      }

      try {
        await client.execute("LOGOUT");
      } catch (_error) {
        // The server may close immediately after LOGOUT; the data is already complete.
      }

      return {
        address: email,
        mode,
        unreadCount: unreadIds.length,
        messages,
        hasMore: limit < MAIL_MAX_ITEMS && allIds.length > messages.length,
        fetchedAt: Date.now(),
      };
    } catch (error) {
      if (/AUTH|LOGIN|credential|password|NO\b/i.test(String(error && error.message))) {
        throw new Error("QQ Mail rejected the login. Confirm IMAP is enabled and use the authorization code, not the QQ password.");
      }
      throw error;
    } finally {
      client.close();
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async activateView() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE);
    let leaf = leaves.length ? leaves[0] : null;

    if (!leaf) {
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }

    workspace.revealLeaf(leaf);
  }
};
