/**
 * GLM Coding Plan quota client.
 *
 * The endpoint is undocumented but stable, and identical in shape across both
 * regions — only the host differs:
 *
 *   China        https://open.bigmodel.cn/api/monitor/usage/quota/limit
 *   International https://api.z.ai/api/monitor/usage/quota/limit
 *
 * Two things about this API are worth stating up front, because both are traps
 * a naive client falls into:
 *
 * 1. **Business failures arrive as HTTP 200.** A revoked key or an account with
 *    no Coding Plan answers `200 OK` with `success:false` and a `code` in the
 *    body. Only a genuinely broken route gives a non-2xx. So the status code is
 *    checked for transport health and the body is checked for the real answer.
 *
 * 2. **Bucket identity comes from `unit`, never from array position.** The 5-hour
 *    window is `unit:3` and the weekly window is `unit:6`; `number` is the count
 *    (`5` hours, `1` week) and has been observed as both `1` and `7` for the
 *    weekly bucket. Splitting by index would silently swap the two windows the
 *    moment the upstream reorders its array, which it is free to do.
 *
 * @module dsh-glm-usage/quota
 */

/** The two regions this plugin can talk to. */
export const REGIONS = {
  cn: {
    id: "cn",
    label: "智谱开放平台",
    host: "https://open.bigmodel.cn",
  },
  global: {
    id: "global",
    label: "Z.AI 国际站",
    host: "https://api.z.ai",
  },
};

/** Path of the quota endpoint, identical on both hosts. */
const QUOTA_PATH = "/api/monitor/usage/quota/limit";

/** `unit` code of the rolling 5-hour window. */
const UNIT_SESSION = 3;
/** `unit` code of the weekly window. */
const UNIT_WEEKLY = 6;
/** `unit` code of the monthly MCP tool ceiling. */
const UNIT_MONTHLY = 5;

/** How long one quota read may take before it is aborted. */
const REQUEST_TIMEOUT_MS = 15000;

/**
 * A failure the caller should show to the user verbatim.
 *
 * `kind` lets the card pick its copy without pattern-matching a message: a
 * rejected key reads differently from an account that simply has no plan.
 */
export class QuotaError extends Error {
  /**
   * @param {string} kind - one of `auth`, `no-plan`, `network`, `upstream`, `shape`.
   * @param {string} message - human-readable reason.
   */
  constructor(kind, message) {
    super(message);
    this.name = "QuotaError";
    this.kind = kind;
  }
}

/**
 * Clamp a percentage into the range a progress bar can render.
 * @param {number} value - raw percentage.
 * @returns {number} value within 0..100.
 */
function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/**
 * Read one numeric field, tolerating the string form some gateways emit.
 * @param {unknown} value - candidate.
 * @returns {number | undefined} the finite number, or undefined.
 */
function num(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Turn one `limits[]` entry into the window shape the card renders.
 *
 * The percentage is recomputed from the absolute counts whenever the upstream
 * supplies them: the `percentage` field is a coarse server-rounded integer
 * (71 of 2000 is reported as 3, 71 of 10000 as 1), so it is only a fallback for
 * the TOKENS_LIMIT entries that carry no counts at all.
 *
 * @param {Record<string, unknown>} entry - one raw limit row.
 * @returns {{ used: number | undefined, total: number | undefined, percent: number, resetsAt: number | undefined } | undefined}
 */
function toWindow(entry) {
  const total = num(entry.usage) ?? num(entry.total);
  const used = num(entry.currentValue);
  const remaining = num(entry.remaining);

  let percent;
  if (total !== undefined && total > 0 && used !== undefined) {
    percent = clampPercent((used / total) * 100);
  } else if (total !== undefined && total > 0 && remaining !== undefined) {
    percent = clampPercent(((total - remaining) / total) * 100);
  } else {
    const reported = num(entry.percentage);
    if (reported === undefined) return undefined;
    percent = clampPercent(reported);
  }

  const resetsAt = num(entry.nextResetTime);
  return {
    used,
    total,
    percent,
    resetsAt: resetsAt !== undefined && resetsAt > 0 ? resetsAt : undefined,
  };
}

/**
 * Find the single entry matching a predicate, refusing to guess when the
 * upstream sends more than one.
 * @param {Record<string, unknown>[]} limits - the raw rows.
 * @param {(entry: Record<string, unknown>) => boolean} predicate - matcher.
 * @returns {Record<string, unknown> | undefined} the unique match.
 */
function uniqueEntry(limits, predicate) {
  const matches = limits.filter(predicate);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Whether a row is a session/weekly usage bucket under either spelling. */
function isUsageBucket(entry) {
  const type = entry.type;
  return type === "TOKENS_LIMIT" || type === "CREDIT_LIMIT";
}

/**
 * Project an upstream body into the snapshot the browser half renders.
 *
 * Unknown bucket types are skipped rather than rejected: the upstream adding a
 * fourth window should make that window invisible, not break the whole card.
 *
 * @param {unknown} body - the parsed response body.
 * @returns {object} the normalized snapshot.
 * @throws {QuotaError} when the body reports a business failure or carries no usable data.
 */
export function projectQuota(body) {
  if (typeof body !== "object" || body === null) {
    throw new QuotaError("shape", "额度接口返回了非对象响应");
  }
  const envelope = /** @type {Record<string, unknown>} */ (body);

  // Business failures ride a 200: trust `success` over the status code.
  if (envelope.success === false) {
    const code = num(envelope.code);
    const message =
      typeof envelope.msg === "string" && envelope.msg !== ""
        ? envelope.msg
        : typeof envelope.message === "string" && envelope.message !== ""
          ? envelope.message
          : "额度接口返回失败";
    // The "no plan" answer is a 500-code body with a message naming the plan,
    // while a bad key is a 401-code body. Both are shown, but they are not the
    // same problem and the card words them differently.
    const noPlan = /coding\s*plan/i.test(message) || /不存在\s*coding/i.test(message);
    const kind = noPlan ? "no-plan" : code === 401 || code === 403 ? "auth" : "upstream";
    throw new QuotaError(kind, message);
  }
  if (envelope.code !== undefined && envelope.code !== null && num(envelope.code) !== 200) {
    const message = typeof envelope.msg === "string" ? envelope.msg : "额度接口返回失败";
    throw new QuotaError("upstream", message);
  }

  const data = envelope.data;
  if (typeof data !== "object" || data === null) {
    throw new QuotaError("shape", "额度接口未返回 data");
  }
  const payload = /** @type {Record<string, unknown>} */ (data);
  const limits = Array.isArray(payload.limits)
    ? payload.limits.filter((entry) => typeof entry === "object" && entry !== null)
    : [];

  const sessionEntry = uniqueEntry(limits, (entry) => isUsageBucket(entry) && num(entry.unit) === UNIT_SESSION);
  const weeklyEntry = uniqueEntry(limits, (entry) => isUsageBucket(entry) && num(entry.unit) === UNIT_WEEKLY);
  const mcpEntry = uniqueEntry(limits, (entry) => entry.type === "TIME_LIMIT" && num(entry.unit) === UNIT_MONTHLY);

  const session = sessionEntry === undefined ? undefined : toWindow(sessionEntry);
  const weekly = weeklyEntry === undefined ? undefined : toWindow(weeklyEntry);
  const mcp = mcpEntry === undefined ? undefined : toWindow(mcpEntry);

  if (session === undefined && weekly === undefined) {
    throw new QuotaError("no-plan", "该 API Key 没有可读的 Coding Plan 额度");
  }

  const level = typeof payload.level === "string" && payload.level !== "" ? payload.level : undefined;

  return {
    level,
    session,
    weekly,
    mcp,
    // The monthly MCP row carries a per-tool breakdown; the card's detail view
    // lists it so a surprising MCP figure can be traced to a tool.
    mcpTools: Array.isArray(mcpEntry?.usageDetails)
      ? mcpEntry.usageDetails
          .filter((tool) => typeof tool === "object" && tool !== null)
          .map((tool) => ({
            id: typeof tool.modelCode === "string" ? tool.modelCode : "unknown",
            used: num(tool.usage) ?? 0,
          }))
      : [],
    fetchedAt: Date.now(),
  };
}

/**
 * Build the request headers.
 *
 * The vendor's own tooling sends the raw key with no `Bearer` prefix, and the
 * live service accepts both — verified against a real key on both hosts. The
 * raw form is sent first because it is the documented-by-example one.
 *
 * @param {string} apiKey - the Coding Plan key.
 * @param {boolean} bearer - whether to prefix the scheme.
 * @returns {Record<string, string>} request headers.
 */
function headersFor(apiKey, bearer) {
  return {
    Authorization: bearer ? `Bearer ${apiKey}` : apiKey,
    Accept: "application/json",
    "Content-Type": "application/json",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  };
}

/**
 * Fetch one region's quota.
 *
 * A 401/403 retries once with the `Bearer` scheme: implementations in the wild
 * disagree about which form the service wants, and both are accepted in
 * practice, so a single retry converts that ambiguity from a failure into a
 * slower success.
 *
 * @param {{ region: string, apiKey: string, signal?: AbortSignal }} options - region id, key, and caller cancellation.
 * @returns {Promise<object>} the normalized snapshot.
 * @throws {QuotaError} on any failure.
 */
export async function fetchQuota({ region, apiKey, signal }) {
  const target = REGIONS[region] ?? REGIONS.cn;
  if (typeof apiKey !== "string" || apiKey.trim() === "") {
    throw new QuotaError("auth", "未配置 API Key");
  }

  const url = `${target.host}${QUOTA_PATH}`;
  const attempt = async (bearer) => {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const composed = signal === undefined ? timeout : AbortSignal.any([signal, timeout]);
    const response = await fetch(url, { headers: headersFor(apiKey.trim(), bearer), signal: composed });
    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new QuotaError("shape", `额度接口返回了非 JSON 响应（HTTP ${response.status}）`);
    }
    return { response, parsed };
  };

  let result;
  try {
    result = await attempt(false);
  } catch (error) {
    if (error instanceof QuotaError) throw error;
    throw new QuotaError("network", `无法连接 ${target.host}：${error instanceof Error ? error.message : String(error)}`);
  }

  if (result.response.status === 401 || result.response.status === 403) {
    try {
      result = await attempt(true);
    } catch (error) {
      if (error instanceof QuotaError) throw error;
      throw new QuotaError("network", `无法连接 ${target.host}：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!result.response.ok && result.response.status !== 401 && result.response.status !== 403) {
    throw new QuotaError("upstream", `额度接口返回 HTTP ${result.response.status}`);
  }

  return projectQuota(result.parsed);
}
