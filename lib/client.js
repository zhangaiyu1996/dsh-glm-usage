window.__ModuleLoader__.load({
	id: "dsh-glm-usage",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const react = require("react");
		const jsx = require("react/jsx-runtime");

		//#region src/client/constants.ts
		/** The host half's status route — the one read this bundle performs. */
		const STATUS_PATH = "/plugins/dsh-glm-usage/status";
		/** The settings face: read on start, written by the card. */
		const SETTINGS_PATH = "/plugins/dsh-glm-usage/settings";
		/** The key-guarded forced refresh. */
		const REFRESH_PATH = "/plugins/dsh-glm-usage/refresh";
		/** Keyed id of this plugin's center panel in the layout's `main` slot. */
		const PANEL_ID = "glm-usage";
		/** Entry id of the sidebar footer card. */
		const FOOTER_ID = "glm-usage";
		/** Default poll interval, matching the host's own default. */
		const DEFAULT_POLL_MS = 300000;
		//#endregion

		//#region src/client/i18n.ts
		/**
		 * Copy for both surfaces. The cards are written against one dictionary so
		 * the sidebar and the dashboard can never disagree about a window's name.
		 */
		const DICT = {
			zh: {
				title: "GLM \u7528\u91cf",
				cardTitle: "GLM Coding Plan",
				footTitle: "GLM \u7528\u91cf",
				session: "5 \u5c0f\u65f6",
				weekly: "\u6bcf\u5468",
				mcp: "MCP \u5de5\u5177",
				usedOf: (used, total) => `${fmt(used)} / ${fmt(total)}`,
				resetAt: (when) => `${when} \u91cd\u7f6e`,
				noReset: "\u65e0\u91cd\u7f6e\u65f6\u95f4",
				updated: "\u66f4\u65b0\u4e8e",
				refreshing: "\u5237\u65b0\u4e2d\u2026",
				refresh: "\u5237\u65b0",
				close: "\u5173\u95ed",
				dashboardTitle: "GLM Coding Plan \u7528\u91cf",
				dashboardSubtitle: "\u667a\u8c31 Coding Plan \u7684\u6eda\u52a8\u7a97\u53e3\u4e0e\u5de5\u5177\u989d\u5ea6",
				unconfigured: "\u5c1a\u672a\u914d\u7f6e API Key",
				unconfiguredHint: "\u5728\u300c\u8bbe\u7f6e \u2192 \u63d2\u4ef6\u8bbe\u7f6e \u2192 GLM \u7528\u91cf\u300d\u91cc\u586b\u5165 Coding Plan \u7684 API Key\uff0c\u6216\u8ba9 DSH \u7684 ZAI_API_KEY \u4fdd\u6301\u53ef\u7528\u3002",
				invalidKey: "API Key \u65e0\u6548\u6216\u5df2\u8fc7\u671f",
				invalidKeyHint: "\u8bf7\u5230\u667a\u8c31\u5f00\u653e\u5e73\u53f0\u91cd\u65b0\u751f\u6210 Coding Plan \u4e13\u7528\u7684 API Key\u3002",
				noPlan: "\u8be5\u8d26\u53f7\u6ca1\u6709 Coding Plan",
				noPlanHint: "\u5f53\u524d API Key \u5c5e\u4e8e\u6309\u91cf\u8ba1\u8d39\u8d26\u53f7\uff0c\u8bfb\u4e0d\u5230\u5957\u9910\u989d\u5ea6\u3002\u8bf7\u5728\u63a7\u5236\u53f0\u8ba2\u9605 Coding Plan\uff0c\u6216\u6362\u6210\u5957\u9910\u4e13\u7528 Key\u3002",
				errorTitle: "\u8bfb\u53d6\u989d\u5ea6\u5931\u8d25",
				keyFrom: "\u6765\u6e90",
				sourceCard: "\u63d2\u4ef6\u8bbe\u7f6e",
				sourceEnv: "\u73af\u5883\u53d8\u91cf",
				sourceCredentials: "\u51ed\u636e\u5e93",
				level: "\u5957\u9910",
				levelUnknown: "\u672a\u77e5\u5957\u9910",
				used: "\u5df2\u7528",
				remaining: "\u5269\u4f59",
				notReported: "\u4e0a\u6e38\u672a\u62a5\u544a\u6570\u503c",
				railLabel: "GLM \u7528\u91cf",
				tool: "\u5de5\u5177",
				region: "\u533a\u57df",
				regionHint: "\u4e24\u4e2a\u533a\u57df\u7684 Key \u4e0d\u4e92\u901a\uff1b\u5207\u6362\u540e\u8bf7\u786e\u8ba4\u5f53\u524d Key \u5c5e\u4e8e\u8be5\u533a\u57df\u3002",
				apiKey: "Coding Plan API Key",
				placeholderSaved: "\u5df2\u4fdd\u5b58\uff08\u7559\u7a7a\u5219\u4e0d\u4fee\u6539\uff09",
				placeholderEmpty: "\u7c98\u8d34 API Key\uff0c\u7559\u7a7a\u5219\u4f7f\u7528 DSH \u7684 ZAI_API_KEY",
				save: "\u4fdd\u5b58",
				saving: "\u4fdd\u5b58\u4e2d\u2026",
				clear: "\u6e05\u9664",
				saved: "\u5df2\u4fdd\u5b58",
				saveFailed: "\u4fdd\u5b58\u5931\u8d25",
				cleared: "\u5df2\u6e05\u9664\u63d2\u4ef6\u4fdd\u5b58\u7684 Key",
				clearFailed: "\u6e05\u9664\u5931\u8d25",
				effectiveSource: "\u5f53\u524d\u751f\u6548\u6765\u6e90",
				validateHint: "\u4fdd\u5b58\u524d\u4f1a\u5148\u6821\u9a8c Key \u662f\u5426\u53ef\u7528\uff1b\u6821\u9a8c\u5931\u8d25\u4e0d\u4f1a\u843d\u76d8\u3002",
				showInSidebar: "\u5728\u4fa7\u680f\u5e95\u90e8\u663e\u793a\u989d\u5ea6\u5c0f\u5361",
			},
			en: {
				title: "GLM Usage",
				cardTitle: "GLM Coding Plan",
				footTitle: "GLM Usage",
				session: "5-hour",
				weekly: "Weekly",
				mcp: "MCP tools",
				usedOf: (used, total) => `${fmt(used)} / ${fmt(total)}`,
				resetAt: (when) => `resets ${when}`,
				noReset: "No reset time",
				updated: "Updated",
				refreshing: "Refreshing\u2026",
				refresh: "Refresh",
				close: "Close",
				dashboardTitle: "GLM Coding Plan usage",
				dashboardSubtitle: "Rolling windows and tool allowance of the Zhipu Coding Plan",
				unconfigured: "No API key configured",
				unconfiguredHint: "Add a Coding Plan API key under Settings \u2192 Plugin settings \u2192 GLM Usage, or keep DSH's ZAI_API_KEY available.",
				invalidKey: "API key invalid or expired",
				invalidKeyHint: "Generate a Coding Plan key again in the Zhipu console.",
				noPlan: "This account has no Coding Plan",
				noPlanHint: "The key belongs to a pay-as-you-go account, so plan quota cannot be read. Subscribe to a Coding Plan or use a plan key.",
				errorTitle: "Could not read quota",
				keyFrom: "Source",
				sourceCard: "plugin settings",
				sourceEnv: "environment",
				sourceCredentials: "credentials",
				level: "Plan",
				levelUnknown: "Unknown plan",
				used: "Used",
				remaining: "Remaining",
				notReported: "Upstream reported no figure",
				railLabel: "GLM usage",
				tool: "Tool",
				region: "Region",
				regionHint: "Keys are not interchangeable between the two regions; after switching, confirm the key belongs to that region.",
				apiKey: "Coding Plan API Key",
				placeholderSaved: "Saved (leave blank to keep)",
				placeholderEmpty: "Paste a key, or leave blank to use ZAI_API_KEY",
				save: "Save",
				saving: "Saving\u2026",
				clear: "Clear",
				saved: "Saved",
				saveFailed: "Save failed",
				cleared: "Cleared the key saved by this plugin",
				clearFailed: "Clear failed",
				effectiveSource: "Effective source",
				validateHint: "A key is validated before it is stored; a failed check writes nothing.",
				showInSidebar: "Show the usage card at the sidebar foot",
			},
		};

		/** The active language, mirrored from ctx.locale. */
		let lang = "zh";

		/** Record the host's locale; anything but `en` keeps the Chinese copy. */
		function setLanguage(id) {
			lang = typeof id === "string" && id.toLowerCase().startsWith("en") ? "en" : "zh";
		}

		/** @returns {object} the dictionary for the active language. */
		function dict() {
			return DICT[lang] ?? DICT.zh;
		}

		/** Thousands-separated integer. */
		function fmt(value) {
			return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "\u2014";
		}

		/** `HH:mm` for a timestamp. */
		function timeText(ms) {
			try {
				return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
			} catch {
				return "\u2014";
			}
		}

		/** `MM-DD HH:mm` for a timestamp — the reset stamps are days out. */
		function dateText(ms) {
			try {
				const date = new Date(ms);
				const month = String(date.getMonth() + 1).padStart(2, "0");
				const day = String(date.getDate()).padStart(2, "0");
				const hh = String(date.getHours()).padStart(2, "0");
				const mm = String(date.getMinutes()).padStart(2, "0");
				return `${month}-${day} ${hh}:${mm}`;
			} catch {
				return "\u2014";
			}
		}
		//#endregion

		//#region src/client/store.ts
		/**
		 * The one shared status source.
		 *
		 * Every surface (sidebar card, dashboard, settings card) reads this single
		 * snapshot, and one ticker refreshes it. Each surface fetching for itself
		 * would let a dashboard click and a sidebar tick race, and the two would
		 * then show different numbers for the same account.
		 *
		 * `useSyncExternalStore` requires `getSnapshot` to return the SAME
		 * reference between changes — a fresh object per call re-renders forever —
		 * so the snapshot is cached and replaced wholesale on every publish.
		 */
		let snapshot = { status: "loading" };
		const listeners = new Set();

		function publish(next) {
			snapshot = next;
			for (const listener of listeners) listener();
		}

		function getSnapshot() {
			return snapshot;
		}

		function subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}

		/** The control key handed out by the host alongside the status document. */
		let controlKey;

		/** The settings document the card edits. */
		let settings = { region: "cn", hasSavedKey: false, pollMs: DEFAULT_POLL_MS, showInSidebar: true };
		const settingsListeners = new Set();

		function getSettings() {
			return settings;
		}

		function subscribeSettings(listener) {
			settingsListeners.add(listener);
			return () => {
				settingsListeners.delete(listener);
			};
		}

		function publishSettings(next) {
			settings = next;
			for (const listener of settingsListeners) listener();
		}

		/** Accept one status document from the host. */
		function acceptStatus(document) {
			if (typeof document !== "object" || document === null) return;
			const status = document.status;
			if (status !== "ready" && status !== "unconfigured" && status !== "invalid-key" && status !== "error") return;
			if (typeof document.authKey === "string") controlKey = document.authKey;
			publish(document);
		}

		/** Read the status route once. */
		async function loadStatus() {
			try {
				const response = await fetch(STATUS_PATH, { credentials: "same-origin", headers: { accept: "application/json" } });
				if (!response.ok) {
					publish({ status: "error", error: `HTTP ${response.status}`, errorKind: "upstream" });
					return;
				}
				acceptStatus(await response.json());
			} catch (error) {
				publish({ status: "error", error: error instanceof Error ? error.message : String(error), errorKind: "network" });
			}
		}

		/** Read the settings face once. */
		async function loadSettings() {
			try {
				const response = await fetch(SETTINGS_PATH, { credentials: "same-origin", headers: { accept: "application/json" } });
				if (!response.ok) return;
				const document = await response.json();
				if (typeof document?.key === "string") controlKey = document.key;
				if (document?.value !== undefined) publishSettings({ ...settings, ...document.value });
			} catch {
				// A settings read failure leaves the defaults in place; the card
				// still shows the status error, which is the actionable one.
			}
		}

		/**
		 * Write one settings field.
		 * @returns {Promise<{ok: boolean, error?: string}>} the host's answer.
		 */
		async function writeSetting(field, value) {
			const optimistic = { ...settings, [field]: value };
			if (field === "apiKey") optimistic.hasSavedKey = true;
			publishSettings(optimistic);
			try {
				const response = await fetch(SETTINGS_PATH, {
					method: "POST",
					credentials: "same-origin",
					headers: { "Content-Type": "application/json", "X-Glm-Usage-Key": controlKey ?? "" },
					body: JSON.stringify({ [field]: value }),
				});
				const answer = await response.json().catch(() => undefined);
				if (!response.ok || answer?.ok === false) {
					// Roll back to the host's truth rather than leaving the card
					// showing a value that was never stored.
					await loadSettings();
					return { ok: false, error: typeof answer?.error === "string" ? answer.error : `HTTP ${response.status}` };
				}
				await loadSettings();
				await loadStatus();
				return { ok: true };
			} catch (error) {
				await loadSettings();
				return { ok: false, error: error instanceof Error ? error.message : String(error) };
			}
		}

		/** Force one upstream read through the key-guarded route. */
		async function refreshNow() {
			try {
				const response = await fetch(REFRESH_PATH, {
					method: "POST",
					credentials: "same-origin",
					headers: { "X-Glm-Usage-Key": controlKey ?? "" },
				});
				if (!response.ok) return;
				acceptStatus(await response.json());
			} catch {
				// The next tick will try again; a failed manual refresh is not
				// worth its own error surface on top of the one already shown.
			}
		}
		//#endregion

		//#region src/client/styles.ts
		/** Stylesheet id (the `data-plugin-css` value that makes injection idempotent). */
		const CSS_ID = "dsh-glm-usage/panel.css";

		/** The plugin's stylesheet. Every colour is a harness theme alias. */
		const CSS = `
/* ---------------------------------------------------------- sidebar foot */
[class*="_footArea"] [class*="_footerActions"]{flex-direction:column}
.gu-foot{box-sizing:border-box;flex:0 0 auto;width:100%;min-width:0;font:inherit;color:var(--dsw-alias-label-secondary);text-align:left;cursor:pointer;background:0 0;border:1px solid transparent;border-radius:10px;flex-direction:column;gap:6px;margin:0 0 4px;padding:8px;display:flex}
.gu-foot:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover);border-color:var(--dsw-alias-border-l2)}
.gu-foot:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.gu-footTop{align-items:center;gap:8px;min-width:0;display:flex}
.gu-footName{white-space:nowrap;text-overflow:ellipsis;color:var(--dsw-alias-label-primary);min-width:0;overflow:hidden;font-size:13px;font-weight:500;line-height:20px}
.gu-updated{flex:none;color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:14px;font-variant-numeric:tabular-nums;white-space:nowrap}
.gu-footRow{flex-direction:column;gap:4px;min-width:0;display:flex}
.gu-footHead{align-items:baseline;gap:8px;min-width:0;display:flex}
.gu-footLabel{flex:1;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gu-footAmount{flex:none;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
.gu-footPct{flex:none;width:38px;color:var(--dsw-alias-label-secondary);text-align:right;font-size:11px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
/* The card renders inside the shell's own button, so its markup must stay
   phrasing content: these bars are spans, and display:block is load-bearing on
   both (an inline box ignores width and height, so the fill would vanish). */
.gu-footBar{display:block;background:var(--dsw-alias-bg-layer-2);border-radius:999px;height:5px;overflow:hidden}
.gu-footFill{display:block;background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%;transition:width .3s ease}
.gu-footFillWarn{background:var(--dsw-alias-state-error-primary)}

/* The 56px rail: one glyph on the shell's own 36px cell. */
.gu-railButton{box-sizing:border-box;width:36px;height:36px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:1px solid transparent;border-radius:8px;flex:none;justify-content:center;align-items:center;margin:0 0 4px;padding:0;display:inline-flex}
.gu-railButton:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.gu-railButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.gu-railPct{font-size:9px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums}

/* ------------------------------------------------------------- dashboard */
.gu-main{background:var(--dsw-alias-bg-layer-1);width:100%;height:100%;overflow:auto;display:block}
.gu-mainInner{max-width:760px;margin:0 auto;padding:24px 20px 40px;flex-direction:column;gap:16px;display:flex;color:var(--dsw-alias-label-primary)}
.gu-header{align-items:center;gap:10px;display:flex;flex-wrap:wrap}
.gu-headerText{flex-direction:column;gap:2px;display:flex;min-width:0}
.gu-title{margin:0;font-size:18px;font-weight:600;line-height:1.4}
.gu-subtitle{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}
.gu-spacer{flex:1}
.gu-meta{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.5;font-variant-numeric:tabular-nums}
.gu-btn{box-sizing:border-box;align-items:center;cursor:pointer;font:inherit;color:var(--dsw-alias-label-secondary);background:0 0;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:4px 12px;display:inline-flex;gap:6px;font-size:12px;line-height:18px}
.gu-btn:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.gu-btn:disabled{opacity:.5;cursor:default}
.gu-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.gu-close{min-width:28px;justify-content:center;padding-left:0;padding-right:0;height:28px}
.gu-close span{font-size:16px;line-height:1}
.gu-badge{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-brand-primary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:600;line-height:17px}
.gu-badgeMuted{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}

/* One block per window. */
.gu-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:14px;padding:16px 18px;flex-direction:column;gap:16px;display:flex}
.gu-windows{flex-direction:column;gap:16px;display:flex}
.gu-window{flex-direction:column;gap:6px;display:flex}
.gu-windowHead{align-items:baseline;gap:8px;display:flex}
.gu-windowLabel{color:var(--dsw-alias-label-secondary);font-size:13px;font-weight:600;line-height:1.5}
.gu-windowValue{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5;font-variant-numeric:tabular-nums;white-space:nowrap}
.gu-windowPct{margin-left:auto;color:var(--dsw-alias-label-primary);min-width:44px;text-align:right;font-size:13px;font-weight:600;line-height:1.5;font-variant-numeric:tabular-nums}
.gu-bar{overflow:hidden;background:var(--dsw-alias-bg-layer-1);border-radius:999px;height:8px}
.gu-barFill{background:var(--dsw-alias-brand-primary);border-radius:999px;height:100%;transition:width .3s ease}
.gu-barFillWarn{background:var(--dsw-alias-state-error-primary)}
.gu-windowReset{color:var(--dsw-alias-label-tertiary);margin:0;font-size:11px;line-height:1.5;font-variant-numeric:tabular-nums}

/* Notices. */
.gu-notice{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;padding:14px 16px;flex-direction:column;gap:6px;display:flex}
.gu-noticeError{border-color:var(--dsw-alias-state-error-primary)}
.gu-noticeTitle{margin:0;font-size:13px;font-weight:600;line-height:1.5}
.gu-noticeHint{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.6}

/* Tool detail table. */
.gu-table{width:100%;border-collapse:collapse;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary)}
.gu-table th{text-align:left;color:var(--dsw-alias-label-tertiary);font-size:11px;font-weight:600;border-bottom:1px solid var(--dsw-alias-border-l2);padding:4px 8px}
.gu-table td{padding:6px 8px;border-bottom:1px solid var(--dsw-alias-border-l2);font-variant-numeric:tabular-nums}
.gu-table tr:last-child td{border-bottom:0}
.gu-num{text-align:right}

/* -------------------------------------------------------------- settings */
.gu-form{flex-direction:column;gap:14px;display:flex}
.gu-field{flex-direction:column;gap:6px;display:flex}
.gu-label{color:var(--dsw-alias-label-primary);font-size:12px;font-weight:600;line-height:1.5}
.gu-hint{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:1.6;margin:0}
.gu-input{box-sizing:border-box;width:100%;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;line-height:1.5}
.gu-input:focus{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-1px}
.gu-row{align-items:center;gap:8px;display:flex;flex-wrap:wrap}
.gu-select{font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:6px 10px;line-height:1.5}
.gu-check{align-items:center;gap:8px;display:flex;font-size:12px;color:var(--dsw-alias-label-secondary)}
.gu-error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:1.5;margin:0}
.gu-ok{color:var(--dsw-alias-brand-primary);font-size:12px;line-height:1.5;margin:0}

@media (prefers-reduced-motion:reduce){.gu-footFill,.gu-barFill{transition:none}}
`;

		/**
		 * Install the stylesheet once; returns its disposer. No DOM side effects
		 * happen at import time — the client entry calls this inside ctx.effect.
		 */
		function injectCss() {
			if (typeof document === "undefined") return () => {};
			if (document.querySelector(`style[data-plugin-css="${CSS_ID}"]`) !== null) return () => {};
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-glm-usage";
			tag.dataset.pluginCss = CSS_ID;
			tag.textContent = CSS;
			document.head.appendChild(tag);
			return () => {
				tag.remove();
			};
		}
		//#endregion

		//#region src/client/format.ts
		/**
		 * Project a status document into the window rows the card renders.
		 *
		 * A window absent from the response is simply not a row: the monthly MCP
		 * bucket only exists on some plans, and inventing a 0% row for it would
		 * claim a quota that is not there.
		 *
		 * @param {object} status - the status document.
		 * @returns {Array<object>} rows.
		 */
		function windowRows(status) {
			const quota = status?.quota;
			if (quota === undefined || quota === null) return [];
			const t = dict();
			const rows = [];
			if (quota.session !== undefined) rows.push({ id: "session", label: t.session, ...quota.session });
			if (quota.weekly !== undefined) rows.push({ id: "weekly", label: t.weekly, ...quota.weekly });
			if (quota.mcp !== undefined) rows.push({ id: "mcp", label: t.mcp, ...quota.mcp });
			return rows;
		}

		/** The worst percentage among the rows, for the rail glyph and the warning colour. */
		function highestPercent(rows) {
			let max = 0;
			for (const row of rows) if (Number.isFinite(row.percent) && row.percent > max) max = row.percent;
			return max;
		}
		//#endregion

		//#region src/client/SidebarCard.tsx
		/**
		 * The sidebar footer card.
		 *
		 * It renders one block per reported window — label, `used / total`, the
		 * percentage and a full-width bar — and opens the dashboard on click. In
		 * the 56px rail it collapses to a single glyph carrying the worst
		 * percentage, because the shell's rail cell cannot fit a bar.
		 */
		function SidebarCard(props) {
			const status = react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
			const settingsValue = react.useSyncExternalStore(subscribeSettings, getSettings, getSettings);
			const t = dict();
			const wide = props.wide !== false;
			const open = props.open;

			if (settingsValue.showInSidebar === false) return null;

			const rows = windowRows(status);
			const worst = highestPercent(rows);
			const warn = worst >= 80;
			const fetchedAt = status?.quota?.fetchedAt;
			const ready = status.status === "ready";

			const title = [t.footTitle]
				.concat(rows.map((row) => `${row.label} ${row.total !== undefined ? t.usedOf(row.used ?? 0, row.total) : ""} ${Math.round(row.percent)}%`))
				.concat(fetchedAt !== undefined ? `${t.updated} ${timeText(fetchedAt)}` : "")
				.join(" \u00b7 ");

			if (!wide) {
				return jsx.jsx("button", {
					type: "button",
					className: "gu-railButton",
					title,
					"aria-label": title,
					onClick: () => open?.(),
					children: jsx.jsx("span", {
						className: "gu-railPct",
						style: { color: warn ? "var(--dsw-alias-state-error-primary)" : "var(--dsw-alias-brand-primary)" },
						children: ready ? `${Math.round(worst)}%` : "\u2014",
					}),
				});
			}

			return jsx.jsxs("button", {
				type: "button",
				className: "gu-foot",
				title,
				"aria-label": title,
				onClick: () => open?.(),
				children: [
					jsx.jsxs("span", {
						className: "gu-footTop",
						children: [
							jsx.jsx("span", { className: "gu-footName", children: t.footTitle }),
							jsx.jsx("span", { style: { flex: 1 } }),
							fetchedAt !== undefined
								? jsx.jsxs("span", { className: "gu-updated", children: [t.updated, " ", timeText(fetchedAt)] })
								: null,
						],
					}),
					rows.length === 0
						? jsx.jsx("span", {
								className: "gu-footRow",
								children: jsx.jsx("span", {
									className: "gu-footLabel",
									children:
										status.status === "loading"
											? "\u2026"
											: status.status === "unconfigured"
												? t.unconfigured
												: status.status === "invalid-key"
													? t.invalidKey
													: status.errorKind === "no-plan"
														? t.noPlan
														: t.errorTitle,
								}),
							})
						: rows.map((row) =>
								jsx.jsxs(
									"span",
									{
										className: "gu-footRow",
										children: [
											jsx.jsxs("span", {
												className: "gu-footHead",
												children: [
													jsx.jsx("span", { className: "gu-footLabel", children: row.label }),
													jsx.jsx("span", {
														className: "gu-footAmount",
														children: row.total !== undefined ? t.usedOf(row.used ?? 0, row.total) : "",
													}),
													jsx.jsx("span", { className: "gu-footPct", children: `${Math.round(row.percent)}%` }),
												],
											}),
											jsx.jsx("span", {
												className: "gu-footBar",
												children: jsx.jsx("span", {
													className: row.percent >= 80 ? "gu-footFill gu-footFillWarn" : "gu-footFill",
													style: { width: `${Math.max(2, Math.min(100, row.percent))}%` },
												}),
											}),
										],
									},
									row.id,
								),
							),
				],
			});
		}
		//#endregion

		//#region src/client/Dashboard.tsx
		/**
		 * The center-column dashboard, registered into the layout's keyed `main`
		 * slot under `PANEL_ID` so the sidebar card and the panel are one
		 * navigation entry.
		 *
		 * It reads the shared store, so it is never stale relative to the card,
		 * and its Refresh button is the one action that re-reads upstream.
		 */
		function Dashboard(props) {
			const status = react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
			const [busy, setBusy] = react.useState(false);
			const t = dict();

			react.useEffect(() => {
				loadStatus();
			}, []);

			const rows = windowRows(status);
			const fetchedAt = status?.quota?.fetchedAt;
			const close = props.close;

			const refresh = async () => {
				if (busy) return;
				setBusy(true);
				try {
					await refreshNow();
				} finally {
					setBusy(false);
				}
			};

			const notice = () => {
				if (status.status === "loading") {
					return jsx.jsx("div", { className: "gu-notice", children: jsx.jsx("p", { className: "gu-noticeTitle", children: "\u2026" }) });
				}
				if (status.status === "unconfigured") {
					return jsx.jsxs("div", {
						className: "gu-notice",
						children: [
							jsx.jsx("p", { className: "gu-noticeTitle", children: t.unconfigured }),
							jsx.jsx("p", { className: "gu-noticeHint", children: t.unconfiguredHint }),
						],
					});
				}
				if (status.status === "invalid-key") {
					return jsx.jsxs("div", {
						className: "gu-notice gu-noticeError",
						children: [
							jsx.jsx("p", { className: "gu-noticeTitle", children: t.invalidKey }),
							jsx.jsx("p", { className: "gu-noticeHint", children: t.invalidKeyHint }),
							status.error !== undefined ? jsx.jsx("p", { className: "gu-noticeHint", children: status.error }) : null,
						],
					});
				}
				if (status.status === "error") {
					const noPlan = status.errorKind === "no-plan";
					return jsx.jsxs("div", {
						className: "gu-notice gu-noticeError",
						children: [
							jsx.jsx("p", { className: "gu-noticeTitle", children: noPlan ? t.noPlan : t.errorTitle }),
							jsx.jsx("p", { className: "gu-noticeHint", children: noPlan ? t.noPlanHint : status.error ?? "" }),
						],
					});
				}
				return null;
			};

			const level = status?.quota?.level;
			const sourceLabel = status?.keySource?.startsWith("credentials")
				? t.sourceCredentials
				: status?.keySource === "env"
					? t.sourceEnv
					: t.sourceCard;
			const tools = status?.quota?.mcpTools ?? [];

			return jsx.jsx("div", {
				className: "gu-main",
				role: "region",
				"aria-label": t.dashboardTitle,
				children: jsx.jsxs("div", {
					className: "gu-mainInner",
					children: [
						jsx.jsxs("header", {
							className: "gu-header",
							children: [
								jsx.jsxs("div", {
									className: "gu-headerText",
									children: [
										jsx.jsx("h2", { className: "gu-title", children: t.dashboardTitle }),
										jsx.jsx("p", { className: "gu-subtitle", children: t.dashboardSubtitle }),
									],
								}),
								jsx.jsx("span", { className: "gu-spacer" }),
								fetchedAt !== undefined ? jsx.jsxs("span", { className: "gu-meta", children: [t.updated, " ", timeText(fetchedAt)] }) : null,
								jsx.jsx("button", {
									type: "button",
									className: "gu-btn",
									disabled: busy,
									onClick: refresh,
									children: busy ? t.refreshing : t.refresh,
								}),
								jsx.jsx("button", {
									type: "button",
									className: "gu-btn gu-close",
									"aria-label": t.close,
									title: t.close,
									onClick: () => close?.(),
									children: jsx.jsx("span", { "aria-hidden": "true", children: "\u00d7" }),
								}),
							],
						}),
						jsx.jsxs("div", {
							className: "gu-row",
							children: [
								jsx.jsx("span", { className: "gu-badge", children: level !== undefined ? `GLM ${level}` : t.levelUnknown }),
								status?.keySource !== undefined
									? jsx.jsxs("span", { className: "gu-badgeMuted", children: [t.keyFrom, ": ", sourceLabel] })
									: null,
							],
						}),
						notice(),
						rows.length > 0
							? jsx.jsx("div", {
									className: "gu-card",
									children: jsx.jsx("div", {
										className: "gu-windows",
										children: rows.map((row) =>
											jsx.jsxs(
												"div",
												{
													className: "gu-window",
													children: [
														jsx.jsxs("div", {
															className: "gu-windowHead",
															children: [
																jsx.jsx("span", { className: "gu-windowLabel", children: row.label }),
																jsx.jsx("span", {
																	className: "gu-windowValue",
																	children: row.total !== undefined ? t.usedOf(row.used ?? 0, row.total) : t.notReported,
																}),
																jsx.jsx("span", {
																	className: "gu-windowPct",
																	children: `${row.percent.toFixed(row.percent < 10 ? 1 : 0)}%`,
																}),
															],
														}),
														jsx.jsx("div", {
															className: "gu-bar",
															children: jsx.jsx("div", {
																className: row.percent >= 80 ? "gu-barFill gu-barFillWarn" : "gu-barFill",
																style: { width: `${Math.max(1, Math.min(100, row.percent))}%` },
															}),
														}),
														jsx.jsx("p", {
															className: "gu-windowReset",
															children: row.resetsAt !== undefined ? t.resetAt(dateText(row.resetsAt)) : t.noReset,
														}),
													],
												},
												row.id,
											),
										),
									}),
								})
							: null,
						tools.length > 0
							? jsx.jsxs("div", {
									className: "gu-card",
									children: [
										jsx.jsx("span", { className: "gu-windowLabel", children: t.mcp }),
										jsx.jsxs("table", {
											className: "gu-table",
											children: [
												jsx.jsx("thead", {
													children: jsx.jsxs("tr", {
														children: [
															jsx.jsx("th", { children: t.tool }),
															jsx.jsx("th", { className: "gu-num", children: t.used }),
														],
													}),
												}),
												jsx.jsx("tbody", {
													children: tools.map((tool) =>
														jsx.jsxs(
															"tr",
															{
																children: [
																	jsx.jsx("td", { children: tool.id }),
																	jsx.jsx("td", { className: "gu-num", children: fmt(tool.used) }),
																],
															},
															tool.id,
														),
													),
												}),
											],
										}),
									],
								})
							: null,
					],
				}),
			});
		}
		//#endregion

		//#region src/client/SettingsCard.tsx
		/**
		 * The settings card: region, API key, and the sidebar toggle.
		 *
		 * The key field starts EMPTY even when one is on file — the host never
		 * sends the secret back, only whether one exists — so saving is always an
		 * explicit replacement, and an untouched field never overwrites.
		 */
		function SettingsCard() {
			const settingsValue = react.useSyncExternalStore(subscribeSettings, getSettings, getSettings);
			const status = react.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
			const [keyDraft, setKeyDraft] = react.useState("");
			const [message, setMessage] = react.useState(undefined);
			const [busy, setBusy] = react.useState(false);
			const t = dict();

			react.useEffect(() => {
				loadSettings();
				loadStatus();
			}, []);

			const save = async () => {
				setBusy(true);
				setMessage(undefined);
				try {
					if (keyDraft.trim() !== "") {
						const answer = await writeSetting("apiKey", keyDraft.trim());
						if (!answer.ok) {
							setMessage({ kind: "error", text: answer.error ?? t.saveFailed });
							return;
						}
						setKeyDraft("");
					}
					setMessage({ kind: "ok", text: t.saved });
				} finally {
					setBusy(false);
				}
			};

			const clear = async () => {
				setBusy(true);
				try {
					const answer = await writeSetting("apiKey", null);
					setMessage(answer.ok ? { kind: "ok", text: t.cleared } : { kind: "error", text: answer.error ?? t.clearFailed });
				} finally {
					setBusy(false);
				}
			};

			const rows = windowRows(status);

			return jsx.jsxs("div", {
				className: "gu-card",
				children: [
					jsx.jsxs("div", {
						className: "gu-windowHead",
						children: [
							jsx.jsx("span", { className: "gu-windowLabel", children: t.cardTitle }),
							jsx.jsx("span", { style: { flex: 1 } }),
							status?.quota?.level !== undefined ? jsx.jsx("span", { className: "gu-badge", children: `GLM ${status.quota.level}` }) : null,
						],
					}),
					status?.status === "ready"
						? jsx.jsx("div", {
								className: "gu-windows",
								children: rows.map((row) =>
									jsx.jsxs(
										"div",
										{
											className: "gu-window",
											children: [
												jsx.jsxs("div", {
													className: "gu-windowHead",
													children: [
														jsx.jsx("span", { className: "gu-windowLabel", style: { fontSize: 12 }, children: row.label }),
														jsx.jsx("span", { className: "gu-windowValue", children: row.total !== undefined ? t.usedOf(row.used ?? 0, row.total) : "" }),
														jsx.jsx("span", { className: "gu-windowPct", children: `${Math.round(row.percent)}%` }),
													],
												}),
												jsx.jsx("div", {
													className: "gu-bar",
													children: jsx.jsx("div", {
														className: row.percent >= 80 ? "gu-barFill gu-barFillWarn" : "gu-barFill",
														style: { width: `${Math.max(2, Math.min(100, row.percent))}%` },
													}),
												}),
											],
										},
										row.id,
									),
								),
							})
						: jsx.jsx("p", {
								className: "gu-hint",
								children:
									status?.status === "unconfigured"
										? t.unconfigured
										: status?.status === "invalid-key"
											? t.invalidKey
											: status?.errorKind === "no-plan"
												? t.noPlan
												: status?.status === "error"
													? `${t.errorTitle}: ${status.error ?? ""}`
													: "\u2026",
							}),
					jsx.jsxs("div", {
						className: "gu-form",
						children: [
							jsx.jsxs("div", {
								className: "gu-field",
								children: [
									jsx.jsx("label", { className: "gu-label", children: t.region }),
									jsx.jsxs("select", {
										className: "gu-select",
										value: settingsValue.region,
										onChange: async (event) => {
											const next = event.target.value;
											setBusy(true);
											try {
												const answer = await writeSetting("region", next);
												if (!answer.ok) setMessage({ kind: "error", text: answer.error ?? t.saveFailed });
											} finally {
												setBusy(false);
											}
										},
										children: [
											jsx.jsx("option", { value: "cn", children: "\u667a\u8c31\u5f00\u653e\u5e73\u53f0 (open.bigmodel.cn)" }),
											jsx.jsx("option", { value: "global", children: "Z.AI (api.z.ai)" }),
										],
									}),
									jsx.jsx("p", { className: "gu-hint", children: t.regionHint }),
								],
							}),
							jsx.jsxs("div", {
								className: "gu-field",
								children: [
									jsx.jsx("label", { className: "gu-label", children: t.apiKey }),
									jsx.jsxs("div", {
										className: "gu-row",
										children: [
											jsx.jsx("input", {
												className: "gu-input",
												type: "password",
												style: { flex: 1, minWidth: 180 },
												value: keyDraft,
												placeholder: settingsValue.hasSavedKey ? t.placeholderSaved : t.placeholderEmpty,
												onChange: (event) => setKeyDraft(event.target.value),
												onKeyDown: (event) => {
													if (event.key === "Enter") save();
												},
											}),
											jsx.jsx("button", { type: "button", className: "gu-btn", disabled: busy, onClick: save, children: busy ? t.saving : t.save }),
											settingsValue.hasSavedKey
												? jsx.jsx("button", { type: "button", className: "gu-btn", disabled: busy, onClick: clear, children: t.clear })
												: null,
										],
									}),
									jsx.jsx("p", {
										className: "gu-hint",
										children:
											status?.keySource !== undefined
												? `${t.effectiveSource}: ${status.keySource.startsWith("credentials") ? t.sourceCredentials : status.keySource === "env" ? t.sourceEnv : t.sourceCard}`
												: t.validateHint,
									}),
								],
							}),
							jsx.jsx("div", {
								className: "gu-field",
								children: jsx.jsxs("label", {
									className: "gu-check",
									children: [
										jsx.jsx("input", {
											type: "checkbox",
											checked: settingsValue.showInSidebar !== false,
											onChange: async (event) => {
												const next = event.target.checked;
												setBusy(true);
												try {
													await writeSetting("showInSidebar", next);
												} finally {
													setBusy(false);
												}
											},
										}),
										jsx.jsx("span", { children: t.showInSidebar }),
									],
								}),
							}),
							message !== undefined ? jsx.jsx("p", { className: message.kind === "error" ? "gu-error" : "gu-ok", children: message.text }) : null,
						],
					}),
				],
			});
		}
		//#endregion

		//#region src/client/index.tsx
		/** Browser half of dsh-glm-usage: the sidebar card, dashboard, and settings. */
		const name = "dsh-glm-usage-client";

		/**
		 * Client services this bundle waits for: `slots` is the registry the
		 * registrations go through and `locale` supplies the active language.
		 * `layout` is reached through ctx.get, so the bundle never blocks on a
		 * deployment that ships no layout service.
		 */
		const inject = ["slots", "locale"];

		/**
		 * The plugin body.
		 *
		 * Each registration is individually guarded so a slot-API breaking change
		 * degrades one surface to a console error instead of raising the loader's
		 * red banner — the host half stays reachable through its routes either way.
		 */
		function apply(ctx) {
			try {
				ctx.effect(() => {
					setLanguage(ctx.locale.getLocale().active);
					const off = ctx.on("locale/change", (snapshot) => {
						setLanguage(snapshot.active);
					});
					return () => off();
				}, "dsh-glm-usage: language");

				ctx.effect(() => injectCss(), "dsh-glm-usage: styles");

				// One initial read feeds every surface; the interval keeps it fresh,
				// and a hidden page skips its tick so a background tab does not poll
				// upstream. The interval restarts whenever the setting changes.
				ctx.effect(() => {
					loadSettings();
					loadStatus();
					let timer;
					const stop = () => {
						if (timer !== undefined) clearInterval(timer);
						timer = undefined;
					};
					const start = () => {
						stop();
						const ms = typeof settings.pollMs === "number" && settings.pollMs >= 60000 ? settings.pollMs : DEFAULT_POLL_MS;
						timer = setInterval(() => {
							if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
							loadStatus();
						}, ms);
					};
					const off = subscribeSettings(start);
					const onVisibility = () => {
						if (document.visibilityState === "visible") loadStatus();
					};
					document.addEventListener("visibilitychange", onVisibility);
					start();
					return () => {
						off();
						stop();
						document.removeEventListener("visibilitychange", onVisibility);
					};
				}, "dsh-glm-usage: poll");

				/** Toggle this plugin's panel in the layout's center column. */
				const openPanel = () => {
					const layout = ctx.get("layout");
					if (layout === undefined) return;
					try {
						const current = layout.panelInfo?.getSnapshot?.()?.activePanelId;
						layout.selectPanel(current === PANEL_ID ? null : PANEL_ID);
					} catch (error) {
						console.error("[dsh-glm-usage] could not open the dashboard:", error);
					}
				};

				// The center panel, keyed by PANEL_ID in the layout's `main` slot.
				try {
					ctx.slots.inject("main", () =>
						ctx.slots.register(
							{
								name: "main",
								key: PANEL_ID,
								inject: () => ({
									close: () => {
										try {
											ctx.get("layout")?.selectPanel?.(null);
										} catch (error) {
											console.error("[dsh-glm-usage] could not close the dashboard:", error);
										}
									},
								}),
							},
							Dashboard,
						),
					);
				} catch (error) {
					console.error("[dsh-glm-usage] could not register the dashboard panel:", error);
				}

				// The sidebar footer card.
				try {
					ctx.slots.inject("sidebar.footer.action", () =>
						ctx.slots.register(
							{
								name: "sidebar.footer.action",
								id: FOOTER_ID,
								order: 30,
								inject: () => ({ open: openPanel }),
							},
							SidebarCard,
						),
					);
				} catch (error) {
					console.error("[dsh-glm-usage] could not register the sidebar card:", error);
				}

				// The settings card, contributed as a tab in the Plugins settings
				// section. A deployment without that section never runs the
				// callback, and the plugin still works from the sidebar.
				try {
					ctx.slots.inject("settings.plugins.tab", () =>
						ctx.slots.register(
							{
								name: "settings.plugins.tab",
								id: "glm-usage",
								order: 60,
								label: () => dict().title,
								inject: () => ({}),
							},
							SettingsCard,
						),
					);
				} catch (error) {
					console.error("[dsh-glm-usage] could not register the settings tab:", error);
				}
			} catch (error) {
				console.error("[dsh-glm-usage] client bundle failed to load (host routes unaffected):", error);
			}
		}

		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	},
});
