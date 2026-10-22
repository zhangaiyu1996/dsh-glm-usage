/**
 * Render verification for the dsh-glm-usage client bundle.
 *
 * The bundle is a `window.__ModuleLoader__.load({id, factory})` handoff, so this
 * harness reproduces that contract exactly: it stages a fake `window`, a
 * `require` that resolves react from the profile's node_modules, and a slot
 * registry that records registrations. It then renders each registered
 * component to static markup to prove the components actually produce DOM.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(process.env.GLM_PROFILE_NODE_MODULES ?? "", "noop.js"));
const React = require("react");
const jsxRuntime = require("react/jsx-runtime");
const ReactDOMServer = require("react-dom/server");

const results = [];
const check = (label, condition, detail) => results.push({ label, ok: Boolean(condition), detail });

// ---------------------------------------------------------------- staging
const registrations = [];
const injectedSlots = new Set();
let localeListeners = [];
let currentLocale = "zh";

const slots = {
  register(options, component) {
    registrations.push({ options, component });
    return () => {};
  },
  inject(key, callback) {
    injectedSlots.add(key);
    // Only declare the seats this fake shell offers, mirroring a deployment
    // that has the layout and settings sections mounted.
    if (["main", "sidebar.footer.action", "settings.plugins.tab"].includes(key)) callback();
    return () => {};
  },
  entries() {
    return [];
  },
  getVersion() {
    return 0;
  },
  subscribe() {
    return () => {};
  },
};

const effects = [];
const ctx = {
  slots,
  locale: {
    getLocale: () => ({ active: currentLocale }),
  },
  on(event, listener) {
    if (event === "locale/change") localeListeners.push(listener);
    return () => {
      localeListeners = localeListeners.filter((entry) => entry !== listener);
    };
  },
  effect(fn) {
    const dispose = fn();
    effects.push(dispose);
    return dispose;
  },
  inject(_services, fn) {
    fn(ctx);
  },
  get(service) {
    if (service === "layout") {
      return {
        panelInfo: { getSnapshot: () => ({ activePanelId: null }) },
        selectPanel() {},
      };
    }
    return undefined;
  },
};

// A document stub good enough for the stylesheet injection.
const styleTags = [];
globalThis.document = {
  querySelector: (selector) => styleTags.find((tag) => `style[data-plugin-css="${tag.dataset.pluginCss}"]` === selector) ?? null,
  createElement: () => ({
    dataset: {},
    textContent: "",
    remove() {
      const index = styleTags.indexOf(this);
      if (index !== -1) styleTags.splice(index, 1);
    },
  }),
  head: {
    appendChild: (tag) => {
      styleTags.push(tag);
    },
  },
  addEventListener() {},
  removeEventListener() {},
  visibilityState: "visible",
};

// A fetch stub so the module's initial reads settle deterministically. The
// unit under test is the RENDER, not the transport (the host harness covers
// that), so the stub answers with a ready document.
globalThis.fetch = async (url) => {
  if (String(url).includes("/settings")) {
    return { ok: true, status: 200, json: async () => ({ value: { region: "cn", hasSavedKey: false, pollMs: 300000, showInSidebar: true }, key: "k".repeat(48) }) };
  }
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: "ready",
      region: "cn",
      keySource: "env",
      authKey: "k".repeat(48),
      quota: {
        level: "max",
        session: { percent: 12.5, resetsAt: Date.now() + 3600_000 },
        weekly: { percent: 3, resetsAt: Date.now() + 86400_000 },
        mcp: { used: 23, total: 4000, percent: 0.575 },
        mcpTools: [{ id: "search-prime", used: 16 }],
        fetchedAt: Date.now(),
      },
    }),
  };
};

// Load the bundle through its own handoff contract.
const bundlePath = join(here, "..", "lib", "client.js");
const source = readFileSync(bundlePath, "utf8");
let handoff;
globalThis.window = {
  __ModuleLoader__: {
    load(entry) {
      handoff = entry;
    },
  },
};
new Function("window", source)(globalThis.window);

check("bundle registers itself", handoff !== undefined, handoff?.id);
check("handoff id matches the package", handoff?.id === "dsh-glm-usage", handoff?.id);

const requireShim = (specifier) => {
  if (specifier === "react") return React;
  if (specifier === "react/jsx-runtime") return jsxRuntime;
  throw new Error(`unexpected require: ${specifier}`);
};

const exportsObject = handoff.factory(requireShim);
check("exports apply", typeof exportsObject.apply === "function", typeof exportsObject.apply);
check("exports inject", Array.isArray(exportsObject.inject), JSON.stringify(exportsObject.inject));

// ---------------------------------------------------------------- activate
exportsObject.apply(ctx);

// Activation kicks off the module's own initial reads; let the stubbed fetch
// settle so the store holds a ready snapshot before anything renders. In the
// browser the same thing happens because React re-renders on the store's
// subscription, which static rendering cannot model.
const settle = () => new Promise((resolve) => setTimeout(resolve, 25));
await settle();

check("stylesheet injected", styleTags.length === 1, String(styleTags.length));
check("stylesheet is namespaced", styleTags[0]?.dataset?.plugin === "dsh-glm-usage", styleTags[0]?.dataset?.plugin);

const bySlot = Object.fromEntries(registrations.map((entry) => [entry.options.name, entry]));
check("registers main panel", bySlot["main"] !== undefined, Object.keys(bySlot).join(", "));
check("registers sidebar card", bySlot["sidebar.footer.action"] !== undefined, Object.keys(bySlot).join(", "));
check("registers settings tab", bySlot["settings.plugins.tab"] !== undefined, Object.keys(bySlot).join(", "));
check("main panel keyed correctly", bySlot["main"]?.options?.key === "glm-usage", bySlot["main"]?.options?.key);

// ---------------------------------------------------------------- rendering
/** Render one registered component with its inject face plus owner props. */
function renderSlot(slotName, ownerProps = {}, wait = true) {
  const entry = bySlot[slotName];
  if (entry === undefined) return "";
  const injected = entry.options.inject === undefined ? {} : entry.options.inject();
  const Component = entry.component;
  return ReactDOMServer.renderToStaticMarkup(React.createElement(Component, { ...ownerProps, ...injected }));
}

const sidebarWide = renderSlot("sidebar.footer.action", { wide: true });
check("sidebar card renders a button", sidebarWide.includes("gu-foot"), sidebarWide.slice(0, 120));
check("sidebar card labels the 5-hour window", sidebarWide.includes("5 小时"), "5 小时");
check("sidebar card labels the weekly window", sidebarWide.includes("每周"), "每周");
check("sidebar card shows a percentage", /\d+%/.test(sidebarWide), sidebarWide.match(/\d+%/)?.[0]);
check("sidebar card renders bars", sidebarWide.includes("gu-footBar"), "gu-footBar");

const sidebarRail = renderSlot("sidebar.footer.action", { wide: false });
check("rail variant renders", sidebarRail.includes("gu-railButton"), sidebarRail.slice(0, 120));
check("rail variant shows the worst percentage", /%/.test(sidebarRail), sidebarRail.match(/\d+%/)?.[0]);

const dashboard = renderSlot("main", {});
check("dashboard renders", dashboard.includes("gu-main"), dashboard.slice(0, 120));
check("dashboard titles itself", dashboard.includes("GLM"), "GLM");
check("dashboard renders the plan level", dashboard.includes("GLM max"), "GLM max");
check("dashboard lists MCP tools", dashboard.includes("search-prime"), "search-prime");
check("dashboard has a refresh control", dashboard.includes("刷新"), "刷新");
check("dashboard has a close control", dashboard.includes("×"), "×");

const settings = renderSlot("settings.plugins.tab", {});
check("settings card renders", settings.includes("gu-form"), settings.slice(0, 120));
check("settings card has a region select", settings.includes("<select"), "select");
check("settings card offers both regions", settings.includes("open.bigmodel.cn") && settings.includes("api.z.ai"), "both regions");
check("settings card has a password key field", settings.includes('type="password"'), "password input");
check("settings card never prints the key", !settings.includes("k".repeat(48)), "key absent");
check("settings card has the sidebar toggle", settings.includes("checkbox"), "checkbox");

// ---------------------------------------------------------------- language
currentLocale = "en";
for (const listener of localeListeners) listener({ active: "en" });
const englishSidebar = renderSlot("sidebar.footer.action", { wide: true });
check("english copy after locale change", englishSidebar.includes("5-hour"), englishSidebar.slice(0, 160));
check("english copy drops the chinese label", !englishSidebar.includes("5 小时"), "5 小时");

currentLocale = "zh";
for (const listener of localeListeners) listener({ active: "zh" });
const chineseSidebar = renderSlot("sidebar.footer.action", { wide: true });
check("chinese copy restored", chineseSidebar.includes("5 小时"), chineseSidebar.slice(0, 160));

// ---------------------------------------------------------------- teardown
for (const dispose of effects) {
  if (typeof dispose === "function") dispose();
}
check("effects are all disposers", effects.every((dispose) => typeof dispose === "function"), String(effects.length));

const failed = results.filter((result) => !result.ok);
for (const result of results) {
  console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.label}${result.ok ? "" : `  -> ${result.detail}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
