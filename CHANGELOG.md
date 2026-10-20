# 更新日志

这里归档 Loopra 正式发布版本的更新说明。

<!-- loopra-changelog:start -->

<!-- loopra-release:v26.10.2001:start -->
## [26.10.2001](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.2001)

发布日期：2026-10-20（上海时间）

### 修复
- 修复 MCP 通过 stdio 连接时的协议版本协商问题，确保使用双方支持的协议版本。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/e039080d90cc661bc3967b534f27c10dc5ce4bab...8f38092d00490be6583249c9b6dbeeb7f9f82fd7>) · 从 v26.10.1906 到本次构建
<!-- loopra-release:v26.10.2001:end -->

---

<!-- loopra-release:v26.10.1906:start -->
## [26.10.1906](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.1906)

发布日期：2026-10-19（上海时间）

### 改进
- 升级 Solon 与 Solon AI 依赖至 4.1.1，保持底层框架与 AI 组件同步更新。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/ebd1e6477b40c8e62142a5c17a5d607200180012...e039080d90cc661bc3967b534f27c10dc5ce4bab>) · 从 v26.10.1905 到本次构建
<!-- loopra-release:v26.10.1906:end -->

---

<!-- loopra-release:v26.10.1905:start -->
## [26.10.1905](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.1905)

发布日期：2026-10-19（上海时间）

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

发布日期：2026-10-19（上海时间）

### 新增

- React 工作台恢复出站代理设置，可继续配置对外请求所使用的代理。

[查看完整源码变更](<https://github.com/ezdemo/loopra/compare/549a191dc748ad309cd04ecc468b8b2239538bd4...d73c9a28461d9ba0205b36836c62ade9dd195757>) · 从 v26.10.1902 到本次构建
<!-- loopra-release:v26.10.1904:end -->

---

<!-- loopra-release:v26.10.1902:start -->
## [26.10.1902](https://github.com/ezdemo/loopra-release/releases/tag/v26.10.1902)

发布日期：2026-10-19（上海时间）

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

发布日期：2026-10-19（上海时间）

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
