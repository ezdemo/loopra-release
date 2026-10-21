# Loopra Releases

Loopra 的独立构建、安装与发布仓库。源码和问题反馈位于 [ezdemo/loopra](https://github.com/ezdemo/loopra)，下载见 [Releases](https://github.com/ezdemo/loopra-release/releases/latest)。

参考 [yetone/magpie-releases](https://github.com/yetone/magpie-releases) 的源码与发布仓库分离方式。此仓库固定从 `ezdemo/loopra` 的 **main** 分支获取源码，开始构建时锁定提交 SHA，核心包和所有桌面安装包都使用该提交。

## 构建与发版

1. 把要发布的源码合并到 `ezdemo/loopra` 的 **main**，无需为发版手动修改源码版本号。
2. 在本仓库 Actions → **Build & Release** → **Run workflow** 选择 `main`。`create_release` 默认勾选：构建成功后自动正式发布，无需手动发布草稿；取消勾选则只构建。
3. 工作流自动领取版本，锁定源码提交，在核心和三平台桌面构建前统一注入该版本。无需手动打标签；标签由流水线自动创建，推送标签不会触发新构建。
4. 核心与三平台安装包全部构建成功后，流水线先上传到临时草稿，核对软件包、各平台更新清单及差分文件的 SHA-256 和构建身份，再自动正式发布。各平台更新清单还会逐项核对版本、软件包文件名、大小及 SHA-512。随后分别启动 npm 发布、源码仓库 Release 同步和 `CHANGELOG.md` 归档。

普通提交只运行轻量检查。构建失败不会创建 Release；上传或校验失败时临时草稿不会正式发布，也不会启动 npm 与源码同步。只构建模式不会发布 Release 或 npm。

GitHub 不会为使用 `GITHUB_TOKEN` 发布的 Release 自动触发其他 `release.published` 工作流，因此构建流程在正式发布成功后，通过 `workflow_dispatch` 分别启动 **Publish core to npm**、**Sync release to source repository** 和 **Update release changelog**。三个任务独立运行，失败时可以从各自入口重试。人工正式发布已有草稿时，原来的 `release.published` 入口仍然有效。npm 继续使用 `npm-publish.yml` 的 OIDC 信任配置，无需新增凭据。

### 自动归档变更列表

每次正式发布后，**Update release changelog** 会将更新说明归档到本仓库的 [CHANGELOG.md](CHANGELOG.md)，文件不存在时自动创建并提交到 `main`。按版本倒序排列，标注精确到分钟的发布时间，格式为 `YYYY-MM-DD HH:mm（UTC+8）`；同一版本重复运行会更新原条目，内容不变则不提交。

归档保留更新内容和源码比较链接，去掉下载列表、打包元数据和重复的原始提交折叠区。草稿、预发布、试构建与失败构建不归档。手动发布或编辑正式 Release 也会触发更新；补齐历史或失败重试可从 Actions → **Update release changelog** → **Run workflow** 执行。

文件中的自动生成区域由工作流管理，区域以外的人工说明会保留。归档、npm 发布和源码同步独立运行，归档失败不会阻断其他两项；不需要新增 Secret。

### 自动同步源码仓库 Release

正式发布本仓库的 Release 后，**Sync release to source repository** 工作流会将同一版本单向同步到 `ezdemo/loopra`。npm 发布与同步独立运行，任一失败不会阻塞另一项，也不会重新构建软件包。

首次配置：创建 Fine-grained PAT，Repository access 只选择 **ezdemo/loopra**，Repository permissions 授予 **Contents: Read and write**。在本仓库 [Actions Secrets](https://github.com/ezdemo/loopra-release/settings/secrets/actions) 添加 **`SOURCE_RELEASE_TOKEN`**。该凭据用于反向创建源码标签和 Release，与源码仓库触发构建用的凭据不同；不要把 token 写进代码或更新说明。

同步复制标题、说明和全部软件包及自动更新文件，下载与上传都校验 SHA-256。兼容旧版四附件 Release。源码仓库同名标签指向发布元数据中的 `sourceSha`，而不是当前 `main` 或发布工具提交。说明中的下载链接改为源码仓库的对应附件，其余正文与构建元数据保留。目标先创建草稿，附件齐全后才发布；预发布状态同步保留，补同步旧版本不会抢占最新正式版本。

历史版本补同步或失败重试：Actions → **Sync release to source repository** → **Run workflow**，选择 `main`，填写已正式发布的标签（例如 `v26.10.1901`）。勾选 `dry_run` 可只检查元数据、源码提交和现有目标，预览过程不会上传或发布。发布后修改更新说明时，也可通过这个入口重新同步。

重试会复用已有草稿并跳过相同附件；已正式发布但内容不同的附件、指向其他提交的同名标签、缺少构建元数据的旧 Release 会报错，不会覆盖。同步不删除历史 Release。源码仓库应只保留测试和构建触发入口，不应在 `v*` 标签上再次构建或发布 npm，以免形成循环。

### 自动版本号

使用 **上海时区（Asia/Shanghai）** 的 `年.月.日期＋两位日内序号`。第三段的数值等于 `日期 × 100 + 序号`，序号范围 `01–99`。

| 构建 | 版本 |
| --- | --- |
| 2026-10-19 第一次 | `26.10.1901` |
| 2026-10-19 第二次 | `26.10.1902` |
| 2026-10-20 第一次 | `26.10.2001` |
| 2027-01-01 第一次 | `27.1.101` |

编号根据本仓库已有标签和 Release（包含草稿）递增，再原子创建版本标签占号。试构建、失败构建和重新完整运行都可能占用序号，已领取的号不回收；每天最多 99 次。各平台使用 `prepare` 领取的同一个版本，不会分别编号。

Maven 根 `loopra.version`、Loopra 模块版本、Electron `package.json`、核心 `version.txt`、Release 标签和 npm 包版本全部一致。修改只发生在 CI 拉取的源码副本，源码仓库保留开发版本；发版元数据同时记录原源码版本、源码提交 SHA 和实际构建版本。软件包文件名保持不带版本号。

Release 下载区包含五个软件包：`Loopra-macos-arm64.zip`、`Loopra-windows-x64.exe`、`Loopra-linux-x64.deb`、`Loopra-linux-x64.AppImage` 和 `loopra-dist.tar.gz`。Windows 自动更新使用 `latest.yml` 和 EXE 的 `.blockmap`；Linux 会把 electron-builder 清单中的 `amd64/x86_64` 条目规范化为发布名 `x64`，最终以同时列出 DEB/AppImage 的 `latest-linux.yml` 发布；所有 macOS 构建发布独立的 `latest-unsigned-mac.yml`，正式签名构建另发布 `latest-mac.yml` 和 ZIP 的 `.blockmap`。文件名不带版本号，应用内部仍保留实际版本。安装脚本在仓库中提供，更新说明直接显示在 Release 正文；源码 SHA 和校验信息保存在正文隐藏记录中。

Windows、Linux DEB/AppImage、正式签名和 ad-hoc/未签名的 macOS 桌面端使用 electron-updater 从本仓库获取正式版，启动后自动检查并下载；下载后可点击“重启并安装”，也会在正常退出时安装。未正式签名的 Mac 使用独立清单和自定义安装器，校验 ZIP 并在主进程退出后替换应用，失败恢复旧版本；应用必须位于可写目录，不能从磁盘镜像或 App Translocation 目录更新。正常退出安装后不重新打开。Linux DEB 安装可能需要管理员授权。开发环境不启动更新器。旧版桌面端和此前禁用更新的未签名 Mac 需要先手动安装一次包含此功能的版本。首次发布前，需要将源码仓库与本仓库的更新代码都合入 main。首次打开仍受 Gatekeeper 规则约束。

macOS 正式签名复用现有 `MAC_CERTIFICATE_P12` / `MAC_CERTIFICATE_P12_PASSWORD`，证书必须是 Developer ID Application。流水线会验证生成的 `.app` 签名，并在包内记录正式签名标记；正式签名客户端还会等待 Squirrel 验证更新包后才提供安装按钮。未配置证书时继续构建 ad-hoc ZIP，移除该版本的 `latest-mac.yml`，避免已正式签名的客户端收到临时签名更新；发布准备阶段基于 ZIP 的实际大小及 SHA-512 生成 `latest-unsigned-mac.yml`，供自定义安装器使用。正式签名构建也提供该独立清单，允许未签名客户端迁移到正式签名版。Apple 公证继续使用已有 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`。

## 自动生成更新说明

工作流从上次**正式、非预发布** Release 正文中的隐藏记录读取 `sourceSha`（兼容旧版 `release-metadata.json` 附件），与本次构建锁定的源码 SHA 比较，提取期间的非合并提交。读取的是 `ezdemo/loopra` 的源码历史。草稿、预发布以及晚于本次版本的 Release 不作为基准。

使用 **OpenAI 兼容的 Chat Completions 协议**（JSON 请求、`Authorization: Bearer <Key>`）。默认网关为 `https://amr-link.open-design.ai/v1`，实际请求 `POST https://amr-link.open-design.ai/v1/chat/completions`。请求只使用通用 Chat Completions 字段。

在本仓库 [Settings → Secrets and variables → Actions](https://github.com/ezdemo/loopra-release/settings/secrets/actions) 配置：

| 名称 | 类型 | 内容 |
| --- | --- | --- |
| `RELEASE_NOTES_API_KEY` | Secret | 该网关的 API Key，必填才能启用 AI 摘要 |
| `RELEASE_NOTES_BASE_URL` | Variable | 可选，默认 `https://amr-link.open-design.ai/v1` |
| `RELEASE_NOTES_MODEL` | Variable | 网关支持的模型 ID，沿用默认 `deepseek-v4-pro`，可按网关实际模型修改 |

API Key 只在生成摘要步骤使用，不会写进产物或日志。原 `DEEPSEEK_API_KEY` 已改为 `RELEASE_NOTES_API_KEY`；更换网关时请在新 Secret 中填写该网关的 Key。

未配置 Key、API 超时/失败或返回不完整时，自动保留原始提交列表。AI 摘要附带可展开的原始提交记录和源码比较链接；如需提前审阅，可先用只构建模式查看更新说明，再启动自动发版。没有新增提交时不调用 AI。

首次迁入此仓库时，使用源码历史中可追溯的上一个较低版本标签作为基准；没有旧标签时从源码初始历史开始。旧正式 Release 若没有元数据，尝试使用其同名源码标签；如果基准无法追溯或不是本次源码的祖先，工作流会报错，避免生成错误的变更范围。

更新说明在 `prepare` 阶段生成。只构建模式也能在该 job 的 Summary 和 `release-metadata` Artifact 中查看 **`release-changes.md`**；创建 Release 时自动并入正文，不作为下载附件。元数据的 `releaseNotes` 记录比较基准、提交数量和生成方式。提交过多时最多展示最近 500 条，AI 输入还设有长度上限，发生截断时会明确标记，并保留完整源码比较链接。

## 首次迁移配置

- 先把源码仓库中的迁移修改合并到 `ezdemo/loopra/main`，再发第一个正式版本；源码中的更新地址和版本检查必须指向此仓库。
- 此仓库启用 GitHub Actions。领取版本标签和发布 Release 的 job 申请 `contents: write`，启动后续工作流的 job 申请 `actions: write`，npm job 申请 `id-token: write`。
- 公开源码不需要额外凭据。若以后改为私有源码，在此仓库添加 `SOURCE_READ_TOKEN`，授予对 `ezdemo/loopra` 的只读 Contents 权限。
- 如需 macOS Developer ID 签名，把原仓库的 `MAC_CERTIFICATE_P12`、`MAC_CERTIFICATE_P12_PASSWORD` 迁到此仓库；公证还需要 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`。无证书时使用 ad-hoc 签名。
- 在 npm 的 `loopra-dist` 包设置中，将 Trusted Publisher 配置为用户 **ezdemo**、仓库 **loopra-release**、工作流文件 **npm-publish.yml**。允许直接 `npm publish`，文件名不要填写完整路径。npm 发布使用 OIDC，无需长效 token。
- 保留已有 Release 和已发布 npm 版本。npm 使用流水线领取的同一构建版本，已发布版本不能覆盖。npm 失败后可手动运行 **Publish core to npm**，输入已正式发布的 Release 标签重试。
- 老版本应用中已写死的旧地址不会自动变更，可在旧仓库 README / 最后一个 Release 中提供此仓库的迁移入口。

## 安装

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup.ps1 | iex
```

macOS / Linux：

```bash
curl -fsSL https://raw.githubusercontent.com/ezdemo/loopra-release/main/.release/setup.sh | bash
```

`main` 上的脚本默认安装最新的**正式** Release。使用 `setup-mirror` 变体可通过 GitHub 镜像下载核心包；`LOOPRA_MIRROR` 可指定镜像。`setup-gui` 安装独立桌面核心运行时到 `~/.loopra-gui`。安装脚本不作为 Release 附件。对 `main` 脚本设置 `LOOPRA_VERSION=v26.10.1901` 可指定要安装的版本。

## 本地构建

在此仓库目录中准备源码（Node 22.14+、pnpm 10、Java 17、Maven）：

```bash
git clone --branch main --single-branch https://github.com/ezdemo/loopra.git source
bash .release/ci-sync-web-assets.sh
cd source
mvn -B -ntp -DskipTests -gs ../.release/maven-central-settings.xml -s ../.release/maven-central-settings.xml clean verify
cd ..
bash .release/ci-package-electron.sh
```

脚本默认操作此仓库的 `source/`，也可通过 `LOOPRA_SOURCE_DIR` 指定已有源码目录。桌面包在对应系统上原生构建，输出到 `source/loopra-front/release/`。Windows 可用 `.release/windows_package.ps1 -SourceDir <源码目录>` 同步前端，用 `.release/embed-core.ps1 -SourceDir <源码目录>` 嵌入核心包。

源码仓库保留后端测试工作流；旧 Gitee 打包流水线由本仓库 GitHub Actions 替代。Maven / Electron 的应用构建配置仍属于源码，发布编排和分发脚本属于本仓库。

本地验证：`node --test tests/*.test.mjs`，以及逐文件执行 `bash -n .release/<脚本>.sh`。
