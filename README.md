# LoopraX Releases

LoopraX 的独立构建、安装与发布仓库。源码和问题反馈位于 [ezdemo/loopra](https://github.com/ezdemo/loopra)，下载见 [Releases](https://github.com/ezdemo/loopra-release/releases/latest)。

参考 [yetone/magpie-releases](https://github.com/yetone/magpie-releases) 的源码与发布仓库分离方式。此仓库固定从 `ezdemo/loopra` 的 **main** 分支获取源码，开始构建时锁定提交 SHA，服务端和桌面端都使用该提交。`main` 现在是 LoopraX 源码树。

2026-10-29 起只发布 LoopraX。更早的 Release 是 Java / Electron 版 Loopra，仍然可以下载，但流水线不再构建它。

## 构建与发版

1. 把要发布的源码合并到 `ezdemo/loopra` 的 **main**。开发版本留在源码里的 `internal/controller/version.go`，无需为发版手动改版本号。
2. 在本仓库 Actions → **Build & Release** → **Run workflow** 选择 `main`。`create_release` 默认勾选：构建成功后自动正式发布；取消勾选则只构建。
3. 工作流自动领取版本，锁定源码提交，并在打包前把该版本写入检出的 `version.go`。无需手动打标签；标签由流水线创建，推送标签不会触发新构建。
4. 全部安装包构建成功后，流水线先上传到临时草稿，核对每个附件的 SHA-256 和构建身份，再自动正式发布。随后分别启动源码仓库 Release 同步和 `CHANGELOG.md` 归档。

普通提交只运行轻量检查。构建失败不会创建 Release；上传或校验失败时临时草稿不会正式发布，也不会启动源码同步。只构建模式不会发布 Release。

GitHub 不会为使用 `GITHUB_TOKEN` 发布的 Release 自动触发其他 `release.published` 工作流，因此构建流程在正式发布成功后，通过 `workflow_dispatch` 启动 **Sync release to source repository** 和 **Update release changelog**。两个任务独立运行，失败时可以从各自入口重试。人工正式发布已有草稿时，原来的 `release.published` 入口仍然有效。

LoopraX 不再发布 npm 上的 `loopra-dist`。**Publish historical Loopra core to npm** 只用于手动重试旧的 Loopra 标签，不会在新版本发布后自动运行。

### 自动归档变更列表

每次正式发布后，**Update release changelog** 会将更新说明归档到本仓库的 [CHANGELOG.md](CHANGELOG.md)，文件不存在时自动创建并提交到 `main`。按版本倒序排列，标注精确到分钟的发布时间，格式为 `YYYY-MM-DD HH:mm（UTC+8）`；同一版本重复运行会更新原条目，内容不变则不提交。

归档保留更新内容和源码比较链接，去掉下载列表、打包元数据和重复的原始提交折叠区。草稿、预发布、试构建与失败构建不归档。手动发布或编辑正式 Release 也会触发更新；补齐历史或失败重试可从 Actions → **Update release changelog** → **Run workflow** 执行。

文件中的自动生成区域由工作流管理，区域以外的人工说明会保留。归档和源码同步独立运行，归档失败不会阻断同步；不需要新增 Secret。

### 自动同步源码仓库 Release

正式发布本仓库的 Release 后，**Sync release to source repository** 工作流会将同一版本单向同步到发布元数据里的源码仓库。现在的 LoopraX 和更早的 Java 版 Loopra 都写回 `ezdemo/loopra`。如果某次发布的元数据仍是 `ezdemo/looprax`，同步会写回那个仓库。同步不会重新构建软件包。

首次配置：创建 Fine-grained PAT，Repository access 选择 **ezdemo/loopra**（若要补同步曾经从 `ezdemo/looprax` 构建的版本，再加入 **ezdemo/looprax**），Repository permissions 授予 **Contents: Read and write**。在本仓库 [Actions Secrets](https://github.com/ezdemo/loopra-release/settings/secrets/actions) 添加 **`SOURCE_RELEASE_TOKEN`**。该凭据用于反向创建源码标签和 Release，与源码仓库触发构建用的凭据不同；不要把 token 写进代码或更新说明。

同步复制标题、说明和全部安装包，下载与上传都校验 SHA-256。补同步旧的 Loopra Release 时，仍接受当时的安装包和自动更新附件。源码仓库同名标签指向发布元数据中的 `sourceSha`，而不是当前 `main` 或发布工具提交。说明中的下载链接改为源码仓库的对应附件，其余正文与构建元数据保留。目标先创建草稿，附件齐全后才发布；预发布状态同步保留，补同步旧版本不会抢占最新正式版本。

历史版本补同步或失败重试：Actions → **Sync release to source repository** → **Run workflow**，选择 `main`，填写已正式发布的标签（例如 `v26.10.2901`）。勾选 `dry_run` 可只检查元数据、源码提交和现有目标，预览过程不会上传或发布。发布后修改更新说明时，也可通过这个入口重新同步。

重试会复用已有草稿并跳过相同附件；已正式发布但内容不同的附件、指向其他提交的同名标签、缺少构建元数据的旧 Release 会报错，不会覆盖。同步不删除历史 Release。源码仓库应只保留测试入口，不应在 `v*` 标签上再次构建，以免形成循环。

### 自动版本号

使用 **上海时区（Asia/Shanghai）** 的 `年.月.日期＋两位日内序号`。第三段的数值等于 `日期 × 100 + 序号`，序号范围 `01–99`。

| 构建 | 版本 |
| --- | --- |
| 2026-10-19 第一次 | `26.10.1901` |
| 2026-10-19 第二次 | `26.10.1902` |
| 2026-10-20 第一次 | `26.10.2001` |
| 2027-01-01 第一次 | `27.1.101` |

编号根据本仓库已有标签和 Release（包含草稿）递增，再原子创建版本标签占号。试构建、失败构建和重新完整运行都可能占用序号，已领取的号不回收；每天最多 99 次。同一次构建的全部安装包使用同一个版本。

版本写入检出副本的 `internal/controller/version.go`。源码仓库保留开发版本 `0.1.0-go`。发版元数据同时记录原源码版本、源码提交 SHA 和实际构建版本。软件包文件名不带版本号，应用内部仍是这次构建的版本。

Release 下载区包含 `scripts/package-matrix.txt` 里的服务端二进制，以及桌面端安装包。Darwin 桌面端是带可执行权限的 `.zip`，里面是 `LoopraX.app`。安装脚本在仓库中提供，不作为 Release 附件。更新说明直接显示在 Release 正文；源码 SHA 和校验信息保存在正文隐藏记录中。

## 自动生成更新说明

工作流从上次正式、非预发布 Release 正文中的隐藏记录读取 `sourceSha`（兼容旧版 `release-metadata.json` 附件），与本次构建锁定的源码 SHA 比较，提取期间的非合并提交。读取的是 `ezdemo/loopra` 的源码历史。源码仓库不同的 Release 不作为比较基准。同一仓库上更早的 Release，只要其源码提交是本次提交的祖先，就作为比较基准。草稿、预发布以及晚于本次版本的 Release 也不作为基准。

使用 **OpenAI 兼容的 Chat Completions 协议**（JSON 请求、`Authorization: Bearer <Key>`）。默认网关为 `https://amr-link.open-design.ai/v1`，实际请求 `POST https://amr-link.open-design.ai/v1/chat/completions`。请求只使用通用 Chat Completions 字段。

在本仓库 [Settings → Secrets and variables → Actions](https://github.com/ezdemo/loopra-release/settings/secrets/actions) 配置：

| 名称 | 类型 | 内容 |
| --- | --- | --- |
| `RELEASE_NOTES_API_KEY` | Secret | 该网关的 API Key，必填才能启用 AI 摘要 |
| `RELEASE_NOTES_BASE_URL` | Variable | 可选，默认 `https://amr-link.open-design.ai/v1` |
| `RELEASE_NOTES_MODEL` | Variable | 网关支持的模型 ID，沿用默认 `deepseek-v4-pro`，可按网关实际模型修改 |

API Key 只在生成摘要步骤使用，不会写进产物或日志。未配置 Key、API 超时/失败或返回不完整时，自动保留原始提交列表。AI 摘要附带可展开的原始提交记录和源码比较链接。没有新增提交时不调用 AI。

第一次从当前 `main` 发版时，比较基准是上一份正式 Release 的源码提交。没有可比较的正式 Release、源码仓库也没有更低版本标签时，才从源码初始历史开始，并受 500 条提交的展示上限约束。

更新说明在 `prepare` 阶段生成。只构建模式也能在该 job 的 Summary 和 `release-metadata` Artifact 中查看 **`release-changes.md`**；创建 Release 时自动并入正文，不作为下载附件。

## 安装

服务端（命令行里的 `looprax`）：

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup.ps1 | iex
```

macOS / Linux：

```bash
curl -fsSL https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup.sh | bash
```

桌面端：

```powershell
irm https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup-gui.ps1 | iex
```

```bash
curl -fsSL https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup-gui.sh | bash
```

`main` 上的脚本默认安装最新的**正式** Release，并按当前系统选择安装包。服务端装到 `~/.looprax/bin`（Windows 为 `%LOCALAPPDATA%\LoopraX\bin`）。macOS 桌面端解压到 `~/Applications/LoopraX.app`。使用 `setup-mirror` 变体可通过 GitHub 镜像下载；`LOOPRA_MIRROR` 可指定镜像。`LOOPRA_VERSION=v26.10.2901` 可指定版本。

应用内更新默认读取本仓库的最新 Release。`arm` 对应安装包名里的 `armv7`，不会误选 `arm64`。桌面进程只更新带 `desktop` 的附件。

## 本地构建

在此仓库目录中准备源码（Go 见 `go.mod`，Node 22、pnpm 10）：

```bash
git clone --branch main --single-branch https://github.com/ezdemo/loopra.git source
bash source/scripts/package.sh --out dist
```

脚本按 `source/scripts/package-matrix.txt` 交叉编译服务端和桌面端，输出文件名与 Release 附件一致。需要图标时安装 Python 和 Pillow。

本地验证：`node --test tests/*.test.mjs`，以及逐文件执行 `bash -n .release/<脚本>.sh`。
