/**
 * Standalone verification harness for dsh-glm-usage.
 *
 * Loads the real host half against a minimal cordis-shaped context, mounts its
 * routes on a bare HTTP server, and exercises every path a browser could take.
 * This is how the plugin is checked without restarting the running Harness
 * (which would terminate the session doing the checking).
 */
import { createServer } from "node:http";
import { apply } from "../lib/index.js";
import { QuotaError } from "../lib/quota.js";

/** Minimal Context surface the plugin actually touches. */
function fakeContext() {
  const routes = [];
  const effects = [];
  const ctx = {
    effect(fn, _label) {
      const dispose = fn();
      effects.push(dispose);
      return dispose;
    },
    // The plugin defers route mounting until `webServer` exists, so the fake
    // must run the injected callback (with itself as the injected context —
    // the real one hands a child context that carries the same services).
    inject(services, fn) {
      if (services.includes("webServer")) fn(ctx);
    },
    on() {
      return () => {};
    },
    get(service) {
      if (service === "profileContext") return { dir: process.env.GLM_TEST_DIR };
      if (service === "credentials") return undefined;
      return undefined;
    },
    logger: { warn() {}, info() {} },
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
  };
  return { ctx, routes, effects };
}

const { ctx, routes } = fakeContext();
apply(ctx);

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const route = routes.find((candidate) => candidate.path === url.pathname);
  if (route === undefined) {
    res.writeHead(404).end("no route");
    return;
  }
  route.handler(req, res);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

// The key this suite runs against: GLM_TEST_KEY lets a CI run (or a machine
// without DSH configured) supply one explicitly.
const testKey = process.env.GLM_TEST_KEY ?? process.env.ZAI_API_KEY;
if (testKey === undefined || testKey.trim() === "") {
  console.error("host.test.mjs needs a Coding Plan key in ZAI_API_KEY or GLM_TEST_KEY.");
  console.error("The suite reads the real upstream on purpose: normalizing a captured");
  console.error("shape is the only way to prove the projection, and a fixture would");
  console.error("drift from the service it claims to describe.");
  process.exit(2);
}
process.env.ZAI_API_KEY = testKey;

const results = [];
const check = (label, condition, detail) => {
  results.push({ label, ok: Boolean(condition), detail });
};

// 1. The three routes mounted at the expected paths.
const paths = routes.map((route) => route.path).sort();
check("three routes mounted", paths.length === 3, paths.join(", "));
check("status route", paths.includes("/plugins/dsh-glm-usage/status"), paths.join(", "));
check("settings route", paths.includes("/plugins/dsh-glm-usage/settings"), paths.join(", "));
check("refresh route", paths.includes("/plugins/dsh-glm-usage/refresh"), paths.join(", "));

// 2. Status: reads the real upstream with the environment's key.
const statusResponse = await fetch(`${base}/plugins/dsh-glm-usage/status`);
const statusBody = await statusResponse.json();
check("status 200", statusResponse.status === 200, String(statusResponse.status));
check("status ready", statusBody.status === "ready", JSON.stringify(statusBody).slice(0, 300));
check("status carries session window", statusBody.quota?.session !== undefined, JSON.stringify(statusBody.quota?.session));
check("status carries weekly window", statusBody.quota?.weekly !== undefined, JSON.stringify(statusBody.quota?.weekly));
check("status carries a control key", typeof statusBody.authKey === "string" && statusBody.authKey.length >= 32, String(statusBody.authKey?.length));
check("status never leaks the key", !JSON.stringify(statusBody).includes(process.env.ZAI_API_KEY ?? "\u0000"), "key absent from body");

const controlKey = statusBody.authKey;

// 3. Settings GET: no secret, only presence flags.
const settingsResponse = await fetch(`${base}/plugins/dsh-glm-usage/settings`);
const settingsBody = await settingsResponse.json();
check("settings 200", settingsResponse.status === 200, String(settingsResponse.status));
check("settings reports region", settingsBody.value?.region === "cn" || settingsBody.value?.region === "global", settingsBody.value?.region);
check(
  "settings never carries the key",
  !JSON.stringify(settingsBody).includes(process.env.ZAI_API_KEY ?? "\u0000"),
  "key absent",
);

// 4. Settings POST without the control key is refused.
const unsigned = await fetch(`${base}/plugins/dsh-glm-usage/settings`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ region: "global" }),
});
await unsigned.text();
check("unsigned write refused", unsigned.status === 403, String(unsigned.status));

// 5. Settings POST with the key, an unknown field, is filtered out.
const signed = await fetch(`${base}/plugins/dsh-glm-usage/settings`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Glm-Usage-Key": controlKey },
  body: JSON.stringify({ region: "cn", evil: "x" }),
});
const signedBody = await signed.json();
check("signed write accepted", signedBody.ok === true, JSON.stringify(signedBody));

const afterWrite = await (await fetch(`${base}/plugins/dsh-glm-usage/settings`)).json();
check("unknown field not persisted", afterWrite.value?.evil === undefined, JSON.stringify(afterWrite.value));

// 6. An invalid region is rejected.
const badRegion = await fetch(`${base}/plugins/dsh-glm-usage/settings`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Glm-Usage-Key": controlKey },
  body: JSON.stringify({ region: "mars" }),
});
await badRegion.text();
check("invalid region rejected", badRegion.status === 400, String(badRegion.status));

// 7. Refresh requires the key; with it, it re-reads.
const badRefresh = await fetch(`${base}/plugins/dsh-glm-usage/refresh`, { method: "POST" });
await badRefresh.text();
check("unsigned refresh refused", badRefresh.status === 403, String(badRefresh.status));

const goodRefresh = await fetch(`${base}/plugins/dsh-glm-usage/refresh`, {
  method: "POST",
  headers: { "X-Glm-Usage-Key": controlKey },
});
const refreshBody = await goodRefresh.json();
check("signed refresh works", refreshBody.status === "ready", refreshBody.status);

// 8. A DNS-rebinding style Host header is refused.
const rebound = await new Promise((resolve) => {
  const request = createServerRequest(base, "/plugins/dsh-glm-usage/status", "evil.example.com");
  resolve(request);
});
check("non-loopback Host refused", rebound === 403, String(rebound));

// 9. Wrong HTTP method.
const wrongMethod = await fetch(`${base}/plugins/dsh-glm-usage/status`, { method: "POST", headers: { "X-Glm-Usage-Key": controlKey }, body: "{}" });
await wrongMethod.text();
check("status POST refused", wrongMethod.status === 405, String(wrongMethod.status));

// 10. A stored key that cannot authenticate surfaces as invalid-key, not a crash.
const badKeyWrite = await fetch(`${base}/plugins/dsh-glm-usage/settings`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Glm-Usage-Key": controlKey },
  body: JSON.stringify({ apiKey: "not-a-real-key" }),
});
const badKeyBody = await badKeyWrite.json();
check("invalid key refused at save", badKeyBody.ok === false, JSON.stringify(badKeyBody).slice(0, 200));

const stillWorking = await (await fetch(`${base}/plugins/dsh-glm-usage/status`)).json();
check("a rejected key did not replace the working one", stillWorking.status === "ready", stillWorking.status);

server.close();

// 11. A host that never provides `webServer` must load the plugin inertly
// rather than throwing during boot — that is the whole reason the routes are
// mounted through ctx.inject instead of unconditionally.
{
  const effects = [];
  const silent = {
    effect(fn) {
      effects.push(fn());
      return () => {};
    },
    // The service never arrives, so the callback must never run.
    inject(_services, _fn) {},
    on() {
      return () => {};
    },
    get() {
      return undefined;
    },
    logger: { warn() {}, info() {} },
  };
  let threw = false;
  try {
    apply(silent);
  } catch {
    threw = true;
  }
  check("loads without a webServer service", !threw, "apply threw");
}

/** Issue one raw-socket GET with a forged Host header. */
function createServerRequest(origin, path, hostHeader) {
  return new Promise((resolve, reject) => {
    import("node:http").then(({ request }) => {
      const target = new URL(origin);
      const req = request(
        { host: target.hostname, port: target.port, path, method: "GET", headers: { Host: hostHeader } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on("error", reject);
      req.end();
    });
  });
}

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.label}${result.ok ? "" : `  -> ${result.detail}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
