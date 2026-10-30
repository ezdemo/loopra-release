# 更新日志

这里归档正式发布版本的更新说明。2026-10-29 之前是 Loopra，之后是 LoopraX。

<!-- loopra-changelog:start -->

<!-- loopra-release:v26.10.3001:start -->
## [26.10.3001](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.3001)

发布日期：2026-10-30 09:58（UTC+8）

### 新增
- 启动命令统一为 `loopra`。
- ACP 支持在同一工作区内让空闲会话复用同一个 agent 进程，减少重复启动。

### 修复
- Web 控制台保持安静，并复用上一次使用的 ACP 工具栏。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/aae592b87981a0c0f862c31697955c91863427b4...8e0849e010451f5cb58fe3a896a1f7492bc2c72b>) · 从 v26.10.2904 到本次构建
<!-- loopra-release:v26.10.3001:end -->

---

<!-- loopra-release:v26.10.2904:start -->
## [26.10.2904](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2904)

发布日期：2026-10-29 20:37（UTC+8）

### 改进

- 项目已替换为 LoopraX 代码库。本次变更涉及整体代码替换，更新时建议按全新安装方式处理，并留意原有配置与数据的兼容情况。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/c7b70f846985b0fd1b488c431c7f2c64551c89ba...aae592b87981a0c0f862c31697955c91863427b4>) · 从 v26.10.2703 到本次构建
<!-- loopra-release:v26.10.2904:end -->

---

<!-- loopra-release:v26.10.2903:start -->
## [26.10.2903](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2903)

发布日期：2026-10-29 19:40（UTC+8）

### 修复
- 修复桌面端启动时闪现命令窗口的问题。

[查看完整源码变更](<https://github.com/ezdemo/looprax/compare/f392ee9757903a62c03b61e217ef9d5c698aeb06...58514089a462185681879c5c526a75ba75bc4a9c>) · 从 v26.10.2902 到本次构建
<!-- loopra-release:v26.10.2903:end -->

---

<!-- loopra-release:v26.10.2902:start -->
## [26.10.2902](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2902)

发布日期：2026-10-29 18:53（UTC+8）

### 更新内容

- fix: 为 xlsx 压缩包补上完整性校验 ([f392ee9](https://github.com/ezdemo/looprax/commit/f392ee9757903a62c03b61e217ef9d5c698aeb06))
- feat: 让应用内更新读取 loopra-release 的 LoopraX 安装包 ([ba852ea](https://github.com/ezdemo/looprax/commit/ba852ea3642da08c53ba6ba88165707b314ef6a8))
- docs: 按 Loopra 的产品说明重写 README ([1acde0c](https://github.com/ezdemo/looprax/commit/1acde0c6b409ae7139ac4acf8505a5c5a3c4f1d2))
- feat: 刷新后恢复上次选中的项目并展开它 ([ea117ad](https://github.com/ezdemo/looprax/commit/ea117ad76625acc7a71292f95781c3917a3c029c))
- feat: 初次进入时默认折叠全部工作区会话 ([b055c96](https://github.com/ezdemo/looprax/commit/b055c96c0b81137acb718f5bf69a6f47014aea0e))
- feat: 修复获取模型的选择，并按模型 ID 生成展示名称 ([58d44b1](https://github.com/ezdemo/looprax/commit/58d44b1b8328fa28b94a3b301f4c314a4deca1a8))
- feat: 让纯聊天脱离项目工具，并改用统一的 web 检索 ([7159670](https://github.com/ezdemo/looprax/commit/715967099bb0f880dca30112ef5029058141f984))
- feat: 增加多平台打包，并把 LoopraX 图标打进桌面产物 ([2f886e5](https://github.com/ezdemo/looprax/commit/2f886e5b060f7021efa26aa298aa3696118154ca))
- feat: 用 acp-go-sdk 对外提供 looprax acp，工作台继续走 Native ([f27f985](https://github.com/ezdemo/looprax/commit/f27f985e4c1bd7439056d17b9ac664478fdc7cb2))
- chore: 不再跟踪 looprax.exe ([d09f8d4](https://github.com/ezdemo/looprax/commit/d09f8d46efdf633d04d8c9344e6fdc17f6960318))
- feat: 把 React 工作台放进仓库，并用 mygo 打开桌面窗口 ([8e6f898](https://github.com/ezdemo/looprax/commit/8e6f8985c703607fd6442e8ae2cb8b6e7e9faf89))
- feat: 控制台日志改成 Spring Boot 风格的多色一行 ([79c9e5a](https://github.com/ezdemo/looprax/commit/79c9e5ab81d352a77afa9785f1153e85d55d9fc5))
- refactor: 把 ACP 会话进程从 Controller 移到 service/acp ([e3eb5a7](https://github.com/ezdemo/looprax/commit/e3eb5a7706d719764ac06a67305ee24fb25befd9))
- refactor: 按工作区缓存 ProjectRuntime，不再复制整份 Controller ([75ea206](https://github.com/ezdemo/looprax/commit/75ea2064e38871b5da2bc4295486605963a227a4))
- refactor: 把需求、定时任务、Git 和会话文件从 Controller 拆出 ([318cfae](https://github.com/ezdemo/looprax/commit/318cfae753a5b1102777f6e06d50e0dd8f10e97b))
- refactor: 迁移到 GoFrame + Spring 风格 IoC ([c1e689e](https://github.com/ezdemo/looprax/commit/c1e689e3ed5a7450e2caf217eb87680fbf6e7ba5))
- test: HITL elicitation 测试增加超时防止用例挂死 ([646b50c](https://github.com/ezdemo/looprax/commit/646b50ce57285e78231042943101bb484f6ab92e))
- feat: 原生接入外部 ACP 引擎，统一会话、审批与运行日志 ([1716eca](https://github.com/ezdemo/looprax/commit/1716eca0acc3b0f3c413670f998f3578278907a6))
- fix: 兼容 reasoning 思考字段并修正会话与工具结果契约 ([c5870cb](https://github.com/ezdemo/looprax/commit/c5870cb87875dc071fd218e4315f8ab002f1204e))
- fix: 会话日志惰性创建，列表仅返回有消息的会话 ([4216650](https://github.com/ezdemo/looprax/commit/4216650522b00350a4fb01fc611e231d83fc52a5))
- fix: 对齐 Git API 契约，修复未跟踪项、init 参数与环境提交 ([ae084f6](https://github.com/ezdemo/looprax/commit/ae084f69720fce1ef9ad9066351325638e28f29f))
- fix: 修复工具参数 JSON Schema 下发与并行 tool\_call 解析 ([82c4300](https://github.com/ezdemo/looprax/commit/82c430037473492c6b355eaa4d27c85bce6b162d))
- fix: 改用 InstructionProvider 避免提示词花括号被当作状态占位符 ([db7e96f](https://github.com/ezdemo/looprax/commit/db7e96fb24b3eb58f843ae9398cf957b3c806e24))
- feat: shell 工具新增 cwd、max\_char 与超时控制并优化输出截断 ([846c235](https://github.com/ezdemo/looprax/commit/846c23551fc9b593fbed4c55a5aab043f1416a01))
- feat: 内嵌原生 ripgrep 并以 rg 工具替换 grep/glob/ls ([506f58c](https://github.com/ezdemo/looprax/commit/506f58c25d07305d6ff1f24ddc8ee2ab74ddbecc))
- feat: 新增跨平台进程树管理并优化 bash 会话进程终止 ([d721ed1](https://github.com/ezdemo/looprax/commit/d721ed1a347a957d7734be3596df32a5ff7051cc))
- feat: 按运行环境动态选择 shell 工具并注入环境提示 ([d3d6314](https://github.com/ezdemo/looprax/commit/d3d631404cbed2136aac8874d9a2e2f94de07490))
- feat: 新增 MCP 工具检索与动态调用入口 ([9307898](https://github.com/ezdemo/looprax/commit/93078980ef63fcf1cc7729d459a128ff9f2f3bef))
- refactor: structure backend with Echo and gontainer ([eb4acaf](https://github.com/ezdemo/looprax/commit/eb4acaf4691675641f313d32c31d42e40c099b7b))
- fix: generate conversation titles with message fallback ([2fdb607](https://github.com/ezdemo/looprax/commit/2fdb607d40446af680571f13141d6123dfc26177))
- docs(i18n): translate code comments and docs to Chinese ([b5f6b3e](https://github.com/ezdemo/looprax/commit/b5f6b3e765eb71398c4e9b57e73602e3f5b49bb6))
- feat(web): expand Loopra API compatibility ([c870134](https://github.com/ezdemo/looprax/commit/c870134c69dedd7a8d3c9812e188ba9ec2b29a34))
- test(subagent): isolate the flow test under a temp home ([0d61567](https://github.com/ezdemo/looprax/commit/0d615670a1b207298a745664a8fb09d28b0f2673))
- feat(subagent): native sub-agent runtime with live sub\_\* streaming ([47744db](https://github.com/ezdemo/looprax/commit/47744db79977e8db54eb33f4058ade84d62ac0d6))
- fix(hitl): Java-parity chain details from agent4j spec ([ad861f9](https://github.com/ezdemo/looprax/commit/ad861f90780dfb74abd858ba9476d7e85442f376))
- feat(hitl): auto-mode AI pre-review and abort cancellation ([e707c18](https://github.com/ezdemo/looprax/commit/e707c1877cad7fbf0bbb66d28a2b40d5dd64484a))
- feat(hitl): six-stage approval chain over ADK tool confirmation ([e932ff7](https://github.com/ezdemo/looprax/commit/e932ff7e9daaeb6c2cbfe5d305ee9304e01ebf8f))
- feat(web): version/update endpoints in honest no-updater state ([c6d2b23](https://github.com/ezdemo/looprax/commit/c6d2b235285acc5fbe12c8da882a81203609061a))
- feat(web): files image preview, name search and guarded delete ([2e84957](https://github.com/ezdemo/looprax/commit/2e849571239a0d22863f727608c3a3e458c01bcc))
- feat(web): pets surface over ~/.loopra/pets directories ([1a4b91f](https://github.com/ezdemo/looprax/commit/1a4b91fd8db8a4a5d4979aba5f686e100532da27))
- feat(web): frontend bundle hosting with SPA fallback ([0db3089](https://github.com/ezdemo/looprax/commit/0db308939bddcd4ef2f26b576cf830edb34decf1))
- feat(web): chat permissions endpoints in truthful pre-HITL state ([cfec16d](https://github.com/ezdemo/looprax/commit/cfec16d0aeacea9fdf86c5a01309acc0a127d789))
- feat(web): sub-sessions read surface (list, events, delete) ([2cf778b](https://github.com/ezdemo/looprax/commit/2cf778b161bc6fa9f33a3a766d97803a7c122a06))
- feat(web): file-changes/revert with whole-file diff reverse-apply ([ed51ac2](https://github.com/ezdemo/looprax/commit/ed51ac23543044bfe3bb3dcc8d7331af3c3ffbcd))
- feat(web): agent history and session-status endpoints ([e9176ed](https://github.com/ezdemo/looprax/commit/e9176ed0e7d14113403c1dea46cdaee149e73774))
- feat(web): session deep endpoints and agent cfg wiring fix ([a2ff213](https://github.com/ezdemo/looprax/commit/a2ff2134ee90e72dc36a5bcce74f7ca202082716))
- feat(mcp): servers CRUD with dual-format interop, export config ([22e024e](https://github.com/ezdemo/looprax/commit/22e024ecee148b410041fe653de7559754313cb1))
- feat(web): schedules surface with 6-field cron engine ([8fd5bc2](https://github.com/ezdemo/looprax/commit/8fd5bc2201789c058bf652f68b4cf10cdee38c35))
- feat(web): requirements surface with real turn execution ([3f9f3a8](https://github.com/ezdemo/looprax/commit/3f9f3a85a30b10c6ec8e51c5c5a8adaecd491017))
- feat(web): sub-agents profiles with builtin restore semantics ([ae4a4dc](https://github.com/ezdemo/looprax/commit/ae4a4dc43b0b234d977161eab7d174a68096c7cf))
- feat(tools): interactive bash session quartet with panel endpoints ([e91c75d](https://github.com/ezdemo/looprax/commit/e91c75d1d0ed98c9635b15331443128930f7c719))
- feat(web): plugin/extpack/skill-market/openapi surfaces ([69cc9d0](https://github.com/ezdemo/looprax/commit/69cc9d09821dba932e0b6cde89c744cde832db8e))
- feat(mcp): McpServer DTO with transport validation ([c66db5f](https://github.com/ezdemo/looprax/commit/c66db5fde1f3c08b40e908a4d2993fd26877be12))
- feat(web): CORS parity with the Java CrossFilter chain ([9dd9f95](https://github.com/ezdemo/looprax/commit/9dd9f9506f7248f190d7d8f0b8fe2fec67adff75))
- feat(git): git, worktree and snapshot surfaces over git plumbing ([6a60fac](https://github.com/ezdemo/looprax/commit/6a60fac9c1ecaa85e3db73905a162e7a2bd68498))
- feat(web): agent-engines list endpoint (native) ([cf9f153](https://github.com/ezdemo/looprax/commit/cf9f153ad793c70cb2e3e8e1b4be73bd4ca6db9f))
- feat(web): pets list and model-meta refresh endpoints ([cf5c5d1](https://github.com/ezdemo/looprax/commit/cf5c5d1f74c50a6b844394080c849f6c352cc04d))
- feat(web): agent status, system, version-check and files controllers ([da457bf](https://github.com/ezdemo/looprax/commit/da457bf000a5bcc8623a3787ec1638ad8cd03c9d))
- feat(tools): built-in tool registry with dynamic enable/disable and core controllers ([041f80e](https://github.com/ezdemo/looprax/commit/041f80eb39b8e274f4c3655eac7042a5ac2e03b5))
- feat(echo): stream thought deltas so reasoning reaches the SSE contract ([15c0400](https://github.com/ezdemo/looprax/commit/15c0400e9cc52147cf1a8d78d8fa46c4f0ec4659))
- feat(web): 1:1 Loopra chat stream endpoint over the ADK agent ([58eadf2](https://github.com/ezdemo/looprax/commit/58eadf29c2c1516b059dafaa5010e88253b0d2d4))
- feat(adk): Loopra-compatible JSONL session service for ADK ([fcb386a](https://github.com/ezdemo/looprax/commit/fcb386ac09d50f8c9c44e59e5b8169e8a6fd7c23))
- feat(adk): adopt ADK Go v2 with three-protocol model providers ([f4f0760](https://github.com/ezdemo/looprax/commit/f4f0760da75d9ee6fc2e8cf2d5fcaa2a3bf324d2))
- feat(cutin-go): add durable human approval, crash-safe tool journal and recovery ([9ba31e2](https://github.com/ezdemo/looprax/commit/9ba31e2a84964fa899eccbafa819e47bd9a704f8))
- test(cutin-go): send real SSE newlines in Anthropic error fixture ([f5d0516](https://github.com/ezdemo/looprax/commit/f5d05167dfac2c0df3442bef5569dfc896828f32))
- docs(cutin-go): integrate graph streaming step, CLI example and provider migration map ([664c1d4](https://github.com/ezdemo/looprax/commit/664c1d42d54acd0c8a5d4cf0e7e471f758dfbb5c))
- feat(cutin-go): add Anthropic Messages sync and SSE tool-use provider ([0ecf1cb](https://github.com/ezdemo/looprax/commit/0ecf1cba0b4d526941d694306835869df278569a))
- feat(cutin-go): add OpenAI Responses synchronous and streaming provider ([1bbf317](https://github.com/ezdemo/looprax/commit/1bbf3179f4945636b82c8ae34952185ac9fa79ab))
- feat(cutin-go): stream OpenAI Chat Completions text and function call deltas ([73f1fa8](https://github.com/ezdemo/looprax/commit/73f1fa87aeaffdb200fcf4682b500cf8d3cd1a44))
- feat(cutin-go): introduce SSE decoder and streaming model/agent contracts ([9eef3c5](https://github.com/ezdemo/looprax/commit/9eef3c5bd280fa8e2073086d20cf5df09ce5b2a3))
- fix(cutin-go): allow before-exit suspension and retry to resume safely ([89773cc](https://github.com/ezdemo/looprax/commit/89773ccdf246fc1423b4269eb2c3363953f91de2))
- feat(cutin-go): port graph engine, lifecycle interceptors, durable checkpoints and chat provider ([3939bb4](https://github.com/ezdemo/looprax/commit/3939bb4f37b6707327576eabfa54cfe566c62837))
- feat(cutin-go): bootstrap protocol-neutral agent runtime, tools, sessions and tests ([c22b844](https://github.com/ezdemo/looprax/commit/c22b844fff3e66e16c2333c22bea7d247c53b594))
- chore: initialize LoopraX repository ([2771cde](https://github.com/ezdemo/looprax/commit/2771cde7f78c69cfa7125f4b86edff1e36c904e0))

[查看完整源码变更](<https://github.com/ezdemo/looprax/commits/f392ee9757903a62c03b61e217ef9d5c698aeb06>) · 首次发版，从源码初始历史到本次构建
<!-- loopra-release:v26.10.2902:end -->

---

<!-- loopra-release:v26.10.2703:start -->
## [26.10.2703](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2703)

发布日期：2026-10-27 15:43（UTC+8）

### 新增
- Web 端工作区文件支持内联显示 Git 变更。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/fbc53efd8f9ee8df790f0e9fe66b95984cc77905...c7b70f846985b0fd1b488c431c7f2c64551c89ba>) · 从 v26.10.2702 到本次构建
<!-- loopra-release:v26.10.2703:end -->

---

<!-- loopra-release:v26.10.2702:start -->
## [26.10.2702](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2702)

发布日期：2026-10-27 12:51（UTC+8）

### 新增
- 增强日程功能。
- 增强编辑器消息队列功能。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/3d358a5fa3e4e0158c75b2993847d113ec8b71dc...fbc53efd8f9ee8df790f0e9fe66b95984cc77905>) · 从 v26.10.2701 到本次构建
<!-- loopra-release:v26.10.2702:end -->

---

<!-- loopra-release:v26.10.2701:start -->
## [26.10.2701](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2701)

发布日期：2026-10-27 09:18（UTC+8）

### 修复
- 文件变更卡片现在会显示文件名，便于识别具体改动的是哪个文件。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/30ca721c239e5dcd5c774e24dbc61afc3f1577db...3d358a5fa3e4e0158c75b2993847d113ec8b71dc>) · 从 v26.10.2606 到本次构建
<!-- loopra-release:v26.10.2701:end -->

---

<!-- loopra-release:v26.10.2606:start -->
## [26.10.2606](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2606)

发布日期：2026-10-26 22:33（UTC+8）

### 新增
- MCP 支持按 Agent 单独开启或关闭转发。

### 修复
- 内置技能会保持安装状态，不再允许被移除。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/b0733cacef5e421507f7762699f2824e79578fef...30ca721c239e5dcd5c774e24dbc61afc3f1577db>) · 从 v26.10.2605 到本次构建
<!-- loopra-release:v26.10.2606:end -->

---

<!-- loopra-release:v26.10.2605:start -->
## [26.10.2605](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2605)

发布日期：2026-10-26 21:43（UTC+8）

### 修复

- 侧边栏个人资料行现在整行区域均可点击打开设置，不再局限于局部点击。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/a0997feba3379e34394cc4248c3d12aae626d647...b0733cacef5e421507f7762699f2824e79578fef>) · 从 v26.10.2604 到本次构建
<!-- loopra-release:v26.10.2605:end -->

---

<!-- loopra-release:v26.10.2604:start -->
## [26.10.2604](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2604)

发布日期：2026-10-26 21:06（UTC+8）

### 新增
- UI 新增可选的本地头像和昵称设置。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/633e5749af86785814d75e100d73425b0977acb4...a0997feba3379e34394cc4248c3d12aae626d647>) · 从 v26.10.2603 到本次构建
<!-- loopra-release:v26.10.2604:end -->

---

<!-- loopra-release:v26.10.2603:start -->
## [26.10.2603](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2603)

发布日期：2026-10-26 19:08（UTC+8）

### 新增

- 界面新增智能体图标。

### 改进

- 优化桌面端拖拽区域的稳定性。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/d2113c34e21c7859af61c3881a6ce3346485e3c8...633e5749af86785814d75e100d73425b0977acb4>) · 从 v26.10.2602 到本次构建
<!-- loopra-release:v26.10.2603:end -->

---

<!-- loopra-release:v26.10.2602:start -->
## [26.10.2602](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2602)

发布日期：2026-10-26 17:45（UTC+8）

### 更新内容

本次源码无新增提交。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/d2113c34e21c7859af61c3881a6ce3346485e3c8...d2113c34e21c7859af61c3881a6ce3346485e3c8>) · 从 v26.10.2601 到本次构建
<!-- loopra-release:v26.10.2602:end -->

---

<!-- loopra-release:v26.10.2601:start -->
## [26.10.2601](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2601)

发布日期：2026-10-26 12:27（UTC+8）

### 改进
- 更新介绍页下载内容，并统一镜像更新方式。

### 修复
- 桌面端首页先显示骨架屏，再呈现工作区。
- 设置页滚动时保持顶部栏固定。
- 介绍页静态资源增加版本标识，Agent 列表保持单行显示。
- 恢复 AI 会话标题，并在会话压缩时保留使用的模型。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/463f11239edab0bf118ab00ed9314fa9e9d2179e...d2113c34e21c7859af61c3881a6ce3346485e3c8>) · 从 v26.10.2504 到本次构建
<!-- loopra-release:v26.10.2601:end -->

---

<!-- loopra-release:v26.10.2504:start -->
## [26.10.2504](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2504)

发布日期：2026-10-25 22:20（UTC+8）

### 改进
- 重新整理技能与设置界面，提升操作与浏览体验。
- 统一桌面端外部链接的打开方式。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/9c8c85286f2fa8d580f5b9c6c7d37d60ae99bcbe...463f11239edab0bf118ab00ed9314fa9e9d2179e>) · 从 v26.10.2503 到本次构建
<!-- loopra-release:v26.10.2504:end -->

---

<!-- loopra-release:v26.10.2503:start -->
## [26.10.2503](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2503)

发布日期：2026-10-25 20:18（UTC+8）

### 新增
- ACP 新增 Pi 与 DeepSeek Harness 两个提供方，并补充了相关能力验证与模式限制说明。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/6c2907e2d34407adbc039b842015e6575a586799...9c8c85286f2fa8d580f5b9c6c7d37d60ae99bcbe>) · 从 v26.10.2502 到本次构建
<!-- loopra-release:v26.10.2503:end -->

---

<!-- loopra-release:v26.10.2502:start -->
## [26.10.2502](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2502)

发布日期：2026-10-25 19:09（UTC+8）

### 改进
- 优化模型设置、会话标题及图片预览体验。

### 修复
- 修复智能体未将工具图片纳入模型上下文的问题。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/94523ded9386f3ae7b9eed757d05195f300abf15...6c2907e2d34407adbc039b842015e6575a586799>) · 从 v26.10.2501 到本次构建
<!-- loopra-release:v26.10.2502:end -->

---

<!-- loopra-release:v26.10.2501:start -->
## [26.10.2501](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2501)

发布日期：2026-10-25 12:11（UTC+8）

### 改进
- 重新设计“关于”设置页面，并为内置核心更新增加保护机制。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/e88c55737ccdd34454b757a07df3341efa6e0f4f...94523ded9386f3ae7b9eed757d05195f300abf15>) · 从 v26.10.2402 到本次构建
<!-- loopra-release:v26.10.2501:end -->

---

<!-- loopra-release:v26.10.2402:start -->
## [26.10.2402](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2402)

发布日期：2026-10-24 23:54（UTC+8）

### 改进
- ACP：在隔离会话之间复用已初始化的适配器，减少重复初始化。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/c2069261b650c003eb62378df668ec9b4627a6cc...e88c55737ccdd34454b757a07df3341efa6e0f4f>) · 从 v26.10.2401 到本次构建
<!-- loopra-release:v26.10.2402:end -->

---

<!-- loopra-release:v26.10.2401:start -->
## [26.10.2401](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2401)

发布日期：2026-10-24 20:39（UTC+8）

### 新增
- Web 端访问新增访问密钥要求；开发环境下可继续复用现有后端。

### 改进
- 提升会话查找与 Agent 配置加载速度。
- 优化访问密钥对话框。
- 将运行中会话的脉冲提示替换为小型加载指示器。
- 简化模型提供商设置布局。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/287ba5d986cc84ae1a49f7ed7f9c82d1e304cc58...c2069261b650c003eb62378df668ec9b4627a6cc>) · 从 v26.10.2305 到本次构建
<!-- loopra-release:v26.10.2401:end -->

---

<!-- loopra-release:v26.10.2305:start -->
## [26.10.2305](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2305)

发布日期：2026-10-23 23:15（UTC+8）

### 新增
- 内置 SelfSkill，并支持挂载常用 Agent 技能。
- 支持多个会话并发运行。

### 改进
- 降低流式渲染与上下文估算的开销。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/87840e8f10be75fdceb51c361c7c6ee2de8cdaae...287ba5d986cc84ae1a49f7ed7f9c82d1e304cc58>) · 从 v26.10.2304 到本次构建
<!-- loopra-release:v26.10.2305:end -->

---

<!-- loopra-release:v26.10.2304:start -->
## [26.10.2304](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2304)

发布日期：2026-10-23 22:03（UTC+8）

### 新增
- 为模型增加显示名称。

### 改进
- 优化加载体验。

### 修复
- 精简搜索对话框，并让结果布局更清晰。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/b418a3c51a47b1987dc35f359c14bfb96bce0662...87840e8f10be75fdceb51c361c7c6ee2de8cdaae>) · 从 v26.10.2303 到本次构建
<!-- loopra-release:v26.10.2304:end -->

---

<!-- loopra-release:v26.10.2303:start -->
## [26.10.2303](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2303)

发布日期：2026-10-23 18:46（UTC+8）

### 改进
- 浏览器模块移除旧版网关，同时保留桌面端生命周期行为。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/a9cf36f8cd03869d6e2efecb0d9847f9a209da11...b418a3c51a47b1987dc35f359c14bfb96bce0662>) · 从 v26.10.2302 到本次构建
<!-- loopra-release:v26.10.2303:end -->

---

<!-- loopra-release:v26.10.2302:start -->
## [26.10.2302](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2302)

发布日期：2026-10-23 16:08（UTC+8）

### 新增
- ACP 支持从历史回复派生（fork）Codex 和 Claude 会话。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/c10975e31968513aed924e260f1d63e516951814...a9cf36f8cd03869d6e2efecb0d9847f9a209da11>) · 从 v26.10.2301 到本次构建
<!-- loopra-release:v26.10.2302:end -->

---

<!-- loopra-release:v26.10.2301:start -->
## [26.10.2301](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2301)

发布日期：2026-10-23 15:51（UTC+8）

### 新增
- 聊天模块支持纯聊天模式隔离，让纯聊天与其他能力分开运行。

### 修复
- 修复 ACP 会话被占用时的处理逻辑，并明确提示可执行的恢复操作。

### 改进
- 移除旧版浏览器网关，聊天不再依赖该通道。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/42578ef0620385c8dba0fe1586609989cf9b0733...c10975e31968513aed924e260f1d63e516951814>) · 从 v26.10.2202 到本次构建
<!-- loopra-release:v26.10.2301:end -->

---

<!-- loopra-release:v26.10.2202:start -->
## [26.10.2202](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2202)

发布日期：2026-10-22 11:09（UTC+8）

### 修复
- 修复桌面端启动过程中的稳定性问题，减少启动异常。

### 改进
- 优化设置页面的加载与响应速度。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/69423a14f5121c62a15461a381d928b6f27afb9b...42578ef0620385c8dba0fe1586609989cf9b0733>) · 从 v26.10.2105 到本次构建
<!-- loopra-release:v26.10.2202:end -->

---

<!-- loopra-release:v26.10.2105:start -->
## [26.10.2105](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2105)

发布日期：2026-10-21 19:46（UTC+8）

### 新增
- 未签名的 macOS 版本现已支持自动更新。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/908e0eb7e5bab822e58a5e90f2a802afbbcbbe55...69423a14f5121c62a15461a381d928b6f27afb9b>) · 从 v26.10.2104 到本次构建
<!-- loopra-release:v26.10.2105:end -->

---

<!-- loopra-release:v26.10.2104:start -->
## [26.10.2104](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2104)

发布日期：2026-10-21 16:42（UTC+8）

### 新增
- 桌面端新增原生右键菜单，并支持主题同步。

### 修复
- 同步 pnpm 锁文件，确保发布安装时依赖版本一致。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/dc67179c5bb6801f973fb623292eb8fb7c02ad58...908e0eb7e5bab822e58a5e90f2a802afbbcbbe55>) · 从 v26.10.2102 到本次构建
<!-- loopra-release:v26.10.2104:end -->

---

<!-- loopra-release:v26.10.2102:start -->
## [26.10.2102](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2102)

发布日期：2026-10-21 13:32（UTC+8）

### 新增
- 保存智能体偏好设置，重启后无需重新配置。

### 修复
- 修复外部智能体场景下流式工具输出丢失、退出状态未正确保留的问题。
- 对外部智能体隐藏其不支持的历史记录操作，避免误点无效入口。

### 改进
- 优化对话过程摘要的展示，并调整回复内容的间距，提升阅读体验。
- 打磨桌面端工作流，操作衔接更顺畅。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/e984abf5640bf91ad7f2b2ff5538253b82403057...dc67179c5bb6801f973fb623292eb8fb7c02ad58>) · 从 v26.10.2101 到本次构建
<!-- loopra-release:v26.10.2102:end -->

---

<!-- loopra-release:v26.10.2101:start -->
## [26.10.2101](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2101)

发布日期：2026-10-21 10:07（UTC+8）

### 新增

- 更新页面新增发布历史记录，便于查看过往版本信息。
- 桌面端更新将获得更醒目的提示。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/47232ccd2b44b1103f75d3fe7304ca3a2c5f2a83...e984abf5640bf91ad7f2b2ff5538253b82403057>) · 从 v26.10.2014 到本次构建
<!-- loopra-release:v26.10.2101:end -->

---

<!-- loopra-release:v26.10.2014:start -->
## [26.10.2014](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2014)

发布日期：2026-10-20 23:28（UTC+8）

### 新增
- 桌面端新增对 macOS 和 Linux 的自动更新支持。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/f44c6c2ae9bc91c64c655b09396ac8b9f27d06c2...47232ccd2b44b1103f75d3fe7304ca3a2c5f2a83>) · 从 v26.10.2011 到本次构建
<!-- loopra-release:v26.10.2014:end -->

---

<!-- loopra-release:v26.10.2011:start -->
## [26.10.2011](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2011)

发布日期：2026-10-20 22:06（UTC+8）

### 新增
- Windows 桌面端支持自动下载并安装更新。

### 修复
- 修复推理设置不稳定问题，并调整界面缩放级别。
- 修复核心启动后无法自动打开工作区的问题。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/3880e0cac7e8c0cfc7552b5e63c62921a341f2db...f44c6c2ae9bc91c64c655b09396ac8b9f27d06c2>) · 从 v26.10.2009 到本次构建
<!-- loopra-release:v26.10.2011:end -->

---

<!-- loopra-release:v26.10.2009:start -->
## [26.10.2009](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2009)

发布日期：2026-10-20 20:45（UTC+8）

### 修复

- 统一桌面端启动界面，并优先处理随应用内置的核心更新。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/3f9226d30df210530ebb1089d550834ec6ca0b93...3880e0cac7e8c0cfc7552b5e63c62921a341f2db>) · 从 v26.10.2008 到本次构建
<!-- loopra-release:v26.10.2009:end -->

---

<!-- loopra-release:v26.10.2008:start -->
## [26.10.2008](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2008)

发布日期：2026-10-20 19:59（UTC+8）

### 新增
- 更新时增加版本确认和更新来源选择对话框。
- 核心更新支持实时日志查看，并支持停止更新。
- 外部智能体可显示上下文组成百分比。

### 修复
- 更新日志可在对话框中打开，并支持 Windows PowerShell。
- 更新器保持对 Java 17 的兼容。
- 输入区工具菜单保持在视口范围内，避免溢出。

### 改进
- 简化智能体菜单，调整推理内容间距。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/b13b5a0839d39dee714b1612c9f3a7e7cc025f1c...3f9226d30df210530ebb1089d550834ec6ca0b93>) · 从 v26.10.2007 到本次构建
<!-- loopra-release:v26.10.2008:end -->

---

<!-- loopra-release:v26.10.2007:start -->
## [26.10.2007](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2007)

发布日期：2026-10-20 16:49（UTC+8）

### 改进
- Web 端改进会话维护与文件预览体验。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/69c41386550e5bcf368d0e1beb428bb74094904a...b13b5a0839d39dee714b1612c9f3a7e7cc025f1c>) · 从 v26.10.2006 到本次构建
<!-- loopra-release:v26.10.2007:end -->

---

<!-- loopra-release:v26.10.2006:start -->
## [26.10.2006](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2006)

发布日期：2026-10-20 16:26（UTC+8）

### 修复
- 网页端在配置加载期间会阻止发送消息，并调整了背景按钮的对齐。
- 被中断的回复会保留在原来的会话中。
- 消息编辑区的任务操作按钮改为透明样式。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/8abe99841227010163d1f7a34f4d235f13082557...69c41386550e5bcf368d0e1beb428bb74094904a>) · 从 v26.10.2005 到本次构建
<!-- loopra-release:v26.10.2006:end -->

---

<!-- loopra-release:v26.10.2005:start -->
## [26.10.2005](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2005)

发布日期：2026-10-20 15:55（UTC+8）

### 修复
- 恢复 Codex 子代理标签页的正常显示，并统一编辑器中的任务面板。
- Web 端兼容历史消息回显中的 `contentParts` 与图片字段，修复旧数据展示异常。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/e14c7ae503d7263e09bc0b6ce627d0b88e47e4c4...8abe99841227010163d1f7a34f4d235f13082557>) · 从 v26.10.2004 到本次构建
<!-- loopra-release:v26.10.2005:end -->

---

<!-- loopra-release:v26.10.2004:start -->
## [26.10.2004](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2004)

发布日期：2026-10-20 14:38（UTC+8）

### 新增
- 新增 Codex 提供方及共享外部 Agent 注册表，支持原生 Codex 子代理与 elicitation 表单。
- Git 新增忽略目录。

### 修复
- Agent 选择菜单会根据可用空间自适应展开。

### 改进
- 优化回合时长显示，并简化输入区。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/b6430da7b937f8ca25b47db2b3f42ebcc6a335bb...e14c7ae503d7263e09bc0b6ce627d0b88e47e4c4>) · 从 v26.10.2003 到本次构建
<!-- loopra-release:v26.10.2004:end -->

---

<!-- loopra-release:v26.10.2003:start -->
## [26.10.2003](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2003)

发布日期：2026-10-20 10:35（UTC+8）

### 修复

- 修复 Windows 上关联技能（linked skills）与 MCP 命令的兼容性问题，恢复其正常使用。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/80765a6475d61e451771b651efe7ff1ad73fa07e...b6430da7b937f8ca25b47db2b3f42ebcc6a335bb>) · 从 v26.10.2002 到本次构建
<!-- loopra-release:v26.10.2003:end -->

---

<!-- loopra-release:v26.10.2002:start -->
## [26.10.2002](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2002)

发布日期：2026-10-20 09:55（UTC+8）

### 修复
- 修复 Web 端工作区菜单在空间不足时展开方向不合理的问题，菜单现在会根据可用空间自动选择展开方向。

### 改进
- 更新日志的入口改为指向 loopra-release 仓库，便于查看各版本发布信息。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/8f38092d00490be6583249c9b6dbeeb7f9f82fd7...80765a6475d61e451771b651efe7ff1ad73fa07e>) · 从 v26.10.2001 到本次构建
<!-- loopra-release:v26.10.2002:end -->

---

<!-- loopra-release:v26.10.2001:start -->
## [26.10.2001](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2001)

发布日期：2026-10-20 09:24（UTC+8）

### 修复
- 修复 MCP 通过 stdio 连接时的协议版本协商问题，确保使用双方支持的协议版本。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/e039080d90cc661bc3967b534f27c10dc5ce4bab...8f38092d00490be6583249c9b6dbeeb7f9f82fd7>) · 从 v26.10.1906 到本次构建
<!-- loopra-release:v26.10.2001:end -->

---

<!-- loopra-release:v26.10.1906:start -->
## [26.10.1906](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.1906)

发布日期：2026-10-19 23:07（UTC+8）

### 改进
- 升级 Solon 与 Solon AI 依赖至 4.1.1，保持底层框架与 AI 组件同步更新。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/ebd1e6477b40c8e62142a5c17a5d607200180012...e039080d90cc661bc3967b534f27c10dc5ce4bab>) · 从 v26.10.1905 到本次构建
<!-- loopra-release:v26.10.1906:end -->

---

<!-- loopra-release:v26.10.1905:start -->
## [26.10.1905](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.1905)

发布日期：2026-10-19 22:49（UTC+8）

### 新增
- 在 ACP 中向代理提供由系统管理的项目级和全局 MCP 服务器。

### 修复
- 修复 MCP 配置处理，保留原生及 Magpie 库配置。
- 修复推理预览在流式输出结束后未重置滚动位置的问题。
- 修复在较矮窗口中欢迎页无法保持居中的问题。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/d73c9a28461d9ba0205b36836c62ade9dd195757...ebd1e6477b40c8e62142a5c17a5d607200180012>) · 从 v26.10.1904 到本次构建
<!-- loopra-release:v26.10.1905:end -->

---

<!-- loopra-release:v26.10.1904:start -->
## [26.10.1904](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.1904)

发布日期：2026-10-19 21:16（UTC+8）

### 新增

- React 工作台恢复出站代理设置，可继续配置对外请求所使用的代理。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/549a191dc748ad309cd04ecc468b8b2239538bd4...d73c9a28461d9ba0205b36836c62ade9dd195757>) · 从 v26.10.1902 到本次构建
<!-- loopra-release:v26.10.1904:end -->

---

<!-- loopra-release:v26.10.1902:start -->
## [26.10.1902](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.1902)

发布日期：2026-10-19 20:36（UTC+8）

### 新增
- 支持为 Java 与 Electron 配置出站代理。

### 修复
- 修复流式推理内容未能自动滚动到最新文本的问题。
- 修复 Claude Code 在跨平台环境下的安装检测与启动兼容性问题。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/d86a1fec3a8d5e3c94aac5ec3a449f93bb66745f...549a191dc748ad309cd04ecc468b8b2239538bd4>) · 从 v26.10.1901 到本次构建
<!-- loopra-release:v26.10.1902:end -->

---

<!-- loopra-release:v26.10.1901:start -->
## [26.10.1901](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.1901)

发布日期：2026-10-19 17:09（UTC+8）

### 新增
- ACP 运行时支持：未安装运行时提供可复制的 ACP 安装提示词；ACP 统一驱动 Agent 配置与前端选择器。
- ACP 展示增强：Claude Code 子代理支持回放与标签页展示；Native 工具结果以标准 ACP diff 上报文件变更并生成文件变更摘要；通过 ACP usage_update 展示真实上下文用量。
- 侧边栏会话列表支持折叠、拖动排序、时间分级和标题悬停滚动。
- 桌面端整合标题栏布局并支持侧边栏调宽；共享工具面板支持内嵌浏览器，AI 浏览器支持多会话管理。
- Web 首页新增隔离分支滑块；新会话自动加载并继承 Agent 配置，优化切换体验。
- 工作区新增原生项目管理，并移除 LSP 子系统。
- 后台任务弹窗支持缓存和按任务控制。

### 修复
- 修复 Web 发送时的进程锁竞争。
- 修复会话内选择的模型/推理强度被全局配置覆盖。
- 后台会话输出与状态不再依赖 agent 轮询。
- 未配置 API key 时，状态和工作区 API 可正常响应。
- 分离审批模式并复用审查链；审批继续时保留最新上下文。
- 统一会话回合清理并修复 SSE 完成问题。
- macOS 侧栏下移为红绿灯让位，右侧面板上移至顶。

### 改进
- 默认 Web 界面迁移到 React + NextUI 工作台，重设计工作台、会话记录和系统提示查看器，并与旧 Vue UI 对齐。
- 核心主逻辑通过 ACP 协议驱动；模型请求使用 LoopraAgent User-Agent。
- 环境面板并入 Git 页并统一使用 Java Git 能力；统一会话成本统计。
- 精简侧栏会话区头部按钮并固定滚动条占位；优化右侧栏、动画和上下文弹出框。
- 移除冗余命令按钮，打开方式仅展示宿主真正可用的入口；移除“无工具调用时结束”配置并收紧推理设置弹层。
- 推理强度滑条改为渐变条与流动星芒效果。
- 稳定系统提示，隔离动态状态通知。
- 发版流程迁移到独立 release 仓库。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/7576a14973d86b975a280332c61ab3237d392734...d86a1fec3a8d5e3c94aac5ec3a449f93bb66745f>) · 从 v26.9.91 到本次构建
<!-- loopra-release:v26.10.1901:end -->

<!-- loopra-changelog:end -->
