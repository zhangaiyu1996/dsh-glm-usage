# DSH GLM Usage

在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 侧栏展示**智谱 GLM Coding Plan** 的用量 —— 无需切到控制台，也不用记 5 小时窗口什么时候刷新。

同时支持两个区域，凭据一份、按卡片切换：

| 区域 | 额度接口 | 控制台 |
|---|---|---|
| 智谱开放平台（默认） | `https://open.bigmodel.cn/api/monitor/usage/quota/limit` | [bigmodel.cn](https://bigmodel.cn) |
| Z.AI 国际站 | `https://api.z.ai/api/monitor/usage/quota/limit` | [z.ai](https://z.ai) |

> 两站的 API Key **不互通**：国内 Key 调国际站会失败，反之亦然。

## 功能

- **侧栏常驻小卡**：底部一行显示各窗口的「已用 / 总量 + 百分比 + 进度条」，并带最后更新时间；侧栏收起到 56px 轨道时自动变成只显示最紧张那个窗口百分比的图标。
- **点击打开明细面板**：在中间栏打开完整面板，逐行展示 5 小时窗口、每周窗口与 MCP 工具额度，含重置时间；再点一次收起。
- **MCP 工具明细**：面板里额外列出 `search-prime` / `web-reader` / `zread` 各自的调用次数，MCP 数字异常时能立刻定位到是哪个工具。
- **零配置起步**：默认直接复用 DSH 凭据库里已有的 `ZAI_API_KEY`（以及同名环境变量），不必再粘贴一次。
- **Key 只在宿主侧**：浏览器永远拿不到 Key —— 所有上游读取都由宿主进程完成，卡片只拿到归一化后的数字。
- **保存前先校验**：粘贴新 Key 时先真的打一次上游，通过才落盘，打错不会把可用的凭据弄丢。
- **中英双语**：跟随 DSH 的界面语言。
- **低调的轮询**：默认 5 分钟一次，页面不可见时跳过；所有界面共享同一份快照与同一个定时器，面板与侧栏永远显示同一组数字。

## 界面

侧栏底部小卡：

```
GLM 用量                        更新于 10:32
5 小时           1,234 / 12,000        10%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
每周             23,456 / 60,000       39%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MCP 工具          1,203 / 4,000        30%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

点开后中间栏是明细面板，带套餐徽标、Key 来源、刷新与关闭按钮。

## 安装

```sh
dsh plugin --profile desktop add /path/to/dsh-glm-usage
```

或直接放进 profile 的 `package.json` 依赖，并在 `dsh.profile.bundles` 里追加 `dsh-glm-usage`。装好后重启 DSH。

## 配置

**设置 → 插件设置 → GLM 用量**，或侧栏「插件」面板里本插件的详情页：

| 项 | 说明 |
|---|---|
| 区域 | 智谱开放平台 / Z.AI 国际站 |
| Coding Plan API Key | 留空则用 DSH 的 `ZAI_API_KEY` |
| 侧栏显示 | 关掉后侧栏不再出现小卡，其余功能不变 |

Key 的解析优先级：**卡片保存的 Key > DSH 凭据库的 `ZAI_API_KEY` > 环境变量 `ZAI_API_KEY`**。面板上的徽标会显示当前生效来源。

### 数据文件

```
<profile>/.dsh-glm-usage/settings.json
```

只有区域、Key（若保存过）与显示开关。可用 `DSH_GLM_USAGE_DATA_DIR` 覆盖目录。

### 用 CLI 排查

不想起 DSH 就能确认 Key 和区域是否可用（走的是插件同一条代码路径）：

```sh
ZAI_API_KEY=... node test/live-check.mjs        # 两个区域都试
ZAI_API_KEY=... node test/live-check.mjs cn     # 只试国内站
```

```
cn      OK    plan=max  5h=1.00%  week=3.00%  mcp=0.57% (23/4000)
             tools: search-prime:16, web-reader:7, zread:0
global  FAIL  [auth] 令牌已过期或验证不正确
             hint: the key is stale, revoked, or belongs to the other region.
```

失败时打印的是卡片上会显示的同一套分类（`auth` / `no-plan` / `upstream` / `network` / `shape`），所以「区域选错了」和「Key 过期了」一眼能分清。

## 关于上游接口

额度接口没有公开文档，实现按实测响应字段归一化，两个关键点：

1. **业务失败也是 HTTP 200**。Key 失效或账号没有套餐时，服务返回 `200 OK` 加 `success:false`，所以判断依据是响应体而不是状态码。本体区分三种失败：`auth`（Key 无效）、`no-plan`（按量计费账号，读不到套餐）、`upstream`（其它）。
2. **窗口靠 `unit` 识别，不靠数组位置**。5 小时窗口是 `unit:3`，每周窗口是 `unit:6`。上游随时可能调整 `limits` 的顺序，按位置切分会把两个窗口张冠李戴。

百分比优先用绝对值算（`currentValue / usage`），因为上游的 `percentage` 是取整后的整数，会把 0.71% 报成 1%、算成整数倍误差；只有在没有绝对数值时（旧版 `TOKENS_LIMIT`）才回退到 `percentage`。

`CREDIT_LIMIT` 的字段名与直觉相反：**`usage` 是总额度**，`currentValue` 才是已用。三种桶（`TOKENS_LIMIT` / `CREDIT_LIMIT` / `TIME_LIMIT`）都会被读取，未知类型跳过而不是报错。

## 开发

```sh
npm test                    # 两个套件一起跑
node test/host.test.mjs     # 宿主：路由、鉴权、Key 解析、错误分类
node test/client.test.mjs   # 浏览器：注册、渲染、语言切换、清理
```

两个套件都不需要启动 DSH：宿主测试把路由挂在裸 `node:http` server 上跑，浏览器测试复现 `window.__ModuleLoader__` 的 handoff 契约、用 `react-dom/server` 静态渲染每个已注册组件。

`client.test.mjs` 需要 react，通过 `GLM_PROFILE_NODE_MODULES` 指向装了 react 的 `node_modules`：

```sh
# Windows
$env:GLM_PROFILE_NODE_MODULES = "$env:USERPROFILE\.dsh\profiles\node_modules"
# macOS / Linux
export GLM_PROFILE_NODE_MODULES="$HOME/.dsh/profiles/node_modules"
npm test
```

`test/host.test.mjs` 会用 `ZAI_API_KEY`（或 `GLM_TEST_KEY`）做真实上游读取；没有可用 Key 时，涉及真实读取的用例会失败 —— 这是有意的，因为「归一化结果对不对」只有对着真实响应才验证得了。设置 `GLM_TEST_DIR` 可把测试用的设置文件写到临时目录，避免污染真实 profile。

`lib/quota.js` 是完全纯函数（归一化 + 抓取），可以单独引用来验证上游字段。

## 许可

MIT。与智谱、Z.AI、DeepSeek 官方均无关联，是社区插件 —— 上游接口随时可能变化，届时可能只有等作者跟进。

