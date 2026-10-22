/**
 * Host half of dsh-glm-usage: a same-origin status route, a settings face, and
 * the key resolution behind both.
 *
 * The browser half never talks to Zhipu directly. Two reasons, and the second
 * is the important one:
 *
 * 1. The quota host is cross-origin, so a page fetch would need CORS the
 *    upstream does not grant.
 * 2. The API key must not reach the browser at all. Routing every read through
 *    this process keeps the secret on the host side, exactly where the
 *    credential store already keeps it.
 *
 * @module dsh-glm-usage
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fetchQuota, QuotaError } from "./quota.js";

/** Stable Cordis plugin name. */
export const name = "glm-usage";

/** Services this plugin needs before it can activate. */
export const inject = [];

/** Route prefix owned by this plugin. */
const ROUTE_BASE = "/plugins/dsh-glm-usage";

/** The status document route the sidebar card and dashboard both read. */
const STATUS_PATH = `${ROUTE_BASE}/status`;
/** The settings face route (read + write). */
const SETTINGS_PATH = `${ROUTE_BASE}/settings`;
/** The control route that mints nothing but forces a fresh upstream read. */
const REFRESH_PATH = `${ROUTE_BASE}/refresh`;

/** Settings file name inside the plugin data directory. */
const SETTINGS_FILE = "settings.json";

/** Environment variable consulted when no card-saved key exists. */
const ENV_KEY = "ZAI_API_KEY";

/** Loopback hostnames a local plugin surface may be addressed by. */
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

/** Largest settings body accepted; these payloads are a few dozen bytes. */
const MAX_BODY_BYTES = 8192;

/**
 * Strip the port from a Host header value, IPv6-bracket aware.
 * @param {string} host - the raw Host header.
 * @returns {string} the hostname.
 */
function hostnameOf(host) {
  let hostname = host.trim().toLowerCase();
  if (hostname.startsWith("[")) {
    const end = hostname.indexOf("]");
    return end === -1 ? hostname : hostname.slice(0, end + 1);
  }
  const colon = hostname.lastIndexOf(":");
  if (colon !== -1 && !hostname.slice(0, colon).includes(":") && /^\d+$/.test(hostname.slice(colon + 1))) {
    hostname = hostname.slice(0, colon);
  }
  return hostname;
}

/**
 * Whether the request is addressed to the loopback interface.
 *
 * A DNS-rebinding page sends its own domain in Host, so this drops those before
 * any routing happens. A browser-sent Origin must also be loopback; the card's
 * own same-origin fetches carry no Origin and pass on Host alone.
 *
 * @param {import('node:http').IncomingMessage} req - the request.
 * @returns {boolean} true when the request may be served.
 */
function trustedRequest(req) {
  const host = req.headers.host;
  if (typeof host !== "string" || host.trim() === "") return false;
  if (!LOOPBACK_HOSTS.has(hostnameOf(host))) return false;
  const origin = req.headers.origin;
  if (origin === undefined || origin.trim() === "") return true;
  try {
    const { hostname } = new URL(origin);
    return LOOPBACK_HOSTS.has(hostname) || hostname === "::1";
  } catch {
    return false;
  }
}

/**
 * Write a JSON response.
 * @param {import('node:http').ServerResponse} res - the response.
 * @param {number} status - HTTP status.
 * @param {unknown} body - JSON-serializable body.
 */
function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

/**
 * Read a request body under a hard ceiling.
 * @param {import('node:http').IncomingMessage} req - the request.
 * @returns {Promise<string | undefined>} the body, or undefined when too large.
 */
async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) return undefined;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/**
 * Mint the per-process control key handed to the card with its status document.
 *
 * Loopback alone is not authentication — any local process can address
 * 127.0.0.1 — so the state-changing routes require proof the caller was told
 * this key.
 *
 * @returns {string} a fresh key.
 */
function createControlKey() {
  return randomBytes(24).toString("hex");
}

/**
 * Constant-time key comparison; a length mismatch is a failure, not a crash.
 * @param {string} expected - the minted key.
 * @param {unknown} presented - the key the request carried.
 * @returns {boolean} whether they match.
 */
function keyMatches(expected, presented) {
  if (typeof presented !== "string" || presented.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(presented));
}

/**
 * Redact token-like content before a message crosses to the browser.
 * @param {unknown} error - the failure.
 * @returns {string} a short, safe message.
 */
function safeMessage(error) {
  return (error instanceof Error ? error.message : String(error))
    .replace(/\b[A-Za-z0-9]{20,}\.[A-Za-z0-9_-]{8,}\b/gu, "[redacted key]")
    .slice(0, 300);
}

/**
 * Resolve the directory this plugin's own data lives in.
 *
 * `profileContext` is the host's own answer for which profile is running, so it
 * outranks any guess. The fallback exists for a checkout that boots without a
 * profile (tests), and an env override exists for diagnostics.
 *
 * @param {import('@deepseek-ai/cordis').Context} ctx - the plugin context.
 * @returns {string} absolute data directory.
 */
function dataDir(ctx) {
  const override = process.env["DSH_GLM_USAGE_DATA_DIR"];
  if (typeof override === "string" && override.trim() !== "") return override;
  const profileDir = ctx.get("profileContext")?.dir;
  if (typeof profileDir === "string" && profileDir !== "") return join(profileDir, ".dsh-glm-usage");
  return join(process.env["DSH_HOME"] ?? process.cwd(), ".dsh-glm-usage");
}

/**
 * This plugin's own settings file: one small JSON object, written atomically.
 *
 * Storing the key here rather than in the profile patch keeps a toggle from
 * reconciling the whole loader tree: a write is a local file write plus an
 * in-memory apply, with no fiber reload.
 */
class SettingsStore {
  /**
   * @param {() => string} resolveDir - data-directory resolver.
   */
  constructor(resolveDir) {
    this.resolveDir = resolveDir;
    this.values = {};
    this.load();
  }

  /** Path of the settings file. */
  get path() {
    return join(this.resolveDir(), SETTINGS_FILE);
  }

  /** Read the file into memory; a missing or unreadable file is an empty layer. */
  load() {
    const path = this.path;
    if (!existsSync(path)) {
      this.values = {};
      return;
    }
    try {
      const parsed = JSON.parse(readFileSync(path, "utf8"));
      this.values = parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      this.values = {};
    }
  }

  /** @returns {Record<string, unknown>} the current values. */
  read() {
    return this.values;
  }

  /**
   * Apply one patch and persist it.
   * @param {Record<string, unknown>} patch - field → value; `null` clears a field.
   * @returns {Record<string, unknown>} the new values.
   */
  patch(patch) {
    const next = { ...this.values };
    for (const [field, value] of Object.entries(patch)) {
      if (value === null) delete next[field];
      else next[field] = value;
    }
    const path = this.path;
    mkdirSync(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    renameSync(tmp, path);
    this.values = next;
    return next;
  }
}

/**
 * The plugin body.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the plugin context.
 */
export function apply(ctx) {
  const store = new SettingsStore(() => dataDir(ctx));
  const controlKey = createControlKey();

  /**
   * Resolve the API key to use, and say where it came from.
   *
   * Order is deliberate: an explicitly saved key wins over the environment,
   * because the card is where a user states intent for THIS plugin, while the
   * env var is usually there for the model provider. The credential store is
   * the last resort so a deployment that already configured `ZAI_API_KEY` needs
   * no setup here at all.
   *
   * @returns {Promise<{ key: string | undefined, source: string }>} the key and its provenance.
   */
  const resolveKey = async () => {
    const saved = store.read()["apiKey"];
    if (typeof saved === "string" && saved.trim() !== "") return { key: saved.trim(), source: "card" };

    const credentials = ctx.get("credentials");
    if (credentials !== undefined) {
      try {
        const resolved = await credentials.resolve("ZAI_API_KEY");
        if (resolved !== undefined && typeof resolved.value === "string" && resolved.value.trim() !== "") {
          return { key: resolved.value.trim(), source: `credentials:${resolved.source}` };
        }
      } catch {
        // A credential provider that cannot answer is not a failure here; the
        // env fallback below still applies.
      }
    }

    const fromEnv = process.env[ENV_KEY];
    if (typeof fromEnv === "string" && fromEnv.trim() !== "") return { key: fromEnv.trim(), source: "env" };
    return { key: undefined, source: "none" };
  };

  /** @returns {{ region: string }} the configured region, defaulting to China. */
  const regionSetting = () => {
    const value = store.read()["region"];
    return { region: value === "global" ? "global" : "cn" };
  };

  /**
   * Read the quota for the current settings.
   * @returns {Promise<object>} the status document.
   */
  const readStatus = async () => {
    const { region } = regionSetting();
    const { key, source } = await resolveKey();
    if (key === undefined) {
      return { status: "unconfigured", region, authKey: controlKey };
    }
    try {
      const quota = await fetchQuota({ region, apiKey: key });
      return { status: "ready", region, keySource: source, quota, authKey: controlKey };
    } catch (error) {
      const kind = error instanceof QuotaError ? error.kind : "upstream";
      return {
        status: kind === "auth" ? "invalid-key" : "error",
        region,
        keySource: source,
        error: safeMessage(error),
        errorKind: kind,
        authKey: controlKey,
      };
    }
  };

  // ---------------------------------------------------------------- routes

  /**
   * Mount all three routes once the web server service exists.
   *
   * `ctx.inject` rather than a bare `ctx.effect`: this plugin declares no
   * service dependency (it must load on a host with no web surface at all), so
   * nothing guarantees `webServer` has been provided by the time `apply` runs.
   * Injecting defers the registration until it is, and a deployment that never
   * provides one simply never mounts the routes — the plugin is then inert
   * rather than throwing during boot.
   */
  ctx.inject(["webServer"], (webCtx) => {
    webCtx.effect(() => {
      const dispose = webCtx.webServer.register({
        kind: "exact",
        path: STATUS_PATH,
        handler: async (req, res) => {
          if (req.method !== "GET") {
            json(res, 405, { error: "method not allowed" });
            return;
          }
          if (!trustedRequest(req)) {
            json(res, 403, { error: "request-not-trusted" });
            return;
          }
          try {
            json(res, 200, await readStatus());
          } catch (error) {
            json(res, 500, { error: safeMessage(error) });
          }
        },
      });
      return () => dispose();
    }, "dsh-glm-usage: status route");

    webCtx.effect(() => {
      const dispose = webCtx.webServer.register({
        kind: "exact",
        path: SETTINGS_PATH,
        handler: async (req, res) => {
          if (!trustedRequest(req)) {
            json(res, 403, { error: "request-not-trusted" });
            return;
          }
          if (req.method === "GET") {
            const { region } = regionSetting();
            const saved = store.read()["apiKey"];
            json(res, 200, {
              value: {
                region,
                // The key itself never crosses to the browser: the card only
                // needs to know whether one is on file, and where it came from.
                hasSavedKey: typeof saved === "string" && saved.trim() !== "",
                pollMs: typeof store.read()["pollMs"] === "number" ? store.read()["pollMs"] : 300000,
                showInSidebar: store.read()["showInSidebar"] !== false,
              },
              key: controlKey,
            });
            return;
          }
          if (req.method !== "POST") {
            json(res, 405, { error: "method not allowed" });
            return;
          }
          if (!keyMatches(controlKey, req.headers["x-glm-usage-key"])) {
            json(res, 403, { error: "invalid-auth-key" });
            return;
          }
          const body = await readBody(req);
          if (body === undefined) {
            json(res, 413, { error: "body too large" });
            return;
          }
          let patch;
          try {
            patch = JSON.parse(body);
          } catch {
            json(res, 400, { error: "invalid json" });
            return;
          }
          if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
            json(res, 400, { error: "invalid patch" });
            return;
          }
          // Only known fields are written; an unknown key is a caller bug, not a
          // reason to persist whatever was sent.
          const allowed = new Set(["region", "apiKey", "pollMs", "showInSidebar"]);
          const accepted = {};
          for (const [field, value] of Object.entries(patch)) {
            if (!allowed.has(field)) continue;
            accepted[field] = value;
          }
          if (
            accepted["region"] !== undefined &&
            accepted["region"] !== null &&
            accepted["region"] !== "cn" &&
            accepted["region"] !== "global"
          ) {
            json(res, 400, { error: "invalid region" });
            return;
          }
          // A key is validated before it is stored, so a typo cannot replace a
          // working credential with one that never resolves.
          if (typeof accepted["apiKey"] === "string" && accepted["apiKey"].trim() !== "") {
            const region = accepted["region"] ?? regionSetting().region;
            try {
              await fetchQuota({ region, apiKey: accepted["apiKey"].trim() });
            } catch (error) {
              json(res, 200, { ok: false, error: safeMessage(error) });
              return;
            }
          }
          try {
            store.patch(accepted);
          } catch (error) {
            json(res, 500, { ok: false, error: safeMessage(error) });
            return;
          }
          json(res, 200, { ok: true });
        },
      });
      return () => dispose();
    }, "dsh-glm-usage: settings route");

    webCtx.effect(() => {
      const dispose = webCtx.webServer.register({
        kind: "exact",
        path: REFRESH_PATH,
        handler: async (req, res) => {
          if (req.method !== "POST") {
            json(res, 405, { error: "method not allowed" });
            return;
          }
          if (!trustedRequest(req)) {
            json(res, 403, { error: "request-not-trusted" });
            return;
          }
          if (!keyMatches(controlKey, req.headers["x-glm-usage-key"])) {
            json(res, 403, { error: "invalid-auth-key" });
            return;
          }
          try {
            json(res, 200, await readStatus());
          } catch (error) {
            json(res, 500, { error: safeMessage(error) });
          }
        },
      });
      return () => dispose();
    }, "dsh-glm-usage: refresh route");
  });
}
