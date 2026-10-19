# Loopra Releases

Loopra 的独立构建、安装与发布仓库。源码和问题反馈位于 [ezdemo/loopra](https://github.com/ezdemo/loopra)，下载见 [Releases](https://github.com/ezdemo/loopra-release/releases/latest)。

参考 [yetone/magpie-releases](https://github.com/yetone/magpie-releases) 的源码与发布仓库分离方式。此仓库固定从 `ezdemo/loopra` 的 **main** 分支获取源码，开始构建时锁定提交 SHA，核心包和所有桌面安装包都使用该提交。

## 构建与发版

1. 在源码仓库运行 `./bump-version.ps1 -Version 26.10.1`，把源码和版本变更合并到 **main**。工作流校验根 `pom.xml` 的 `loopra.version`、核心 `version.txt` 和 Electron `package.json` 的版本一致性。
2. 在本仓库 Actions → **Build & Release** → **Run workflow** 选择 `main`。默认只构建；勾选 `create_release` 会创建 `v<源码版本>` 的 Release **草稿**。
3. 也可在**本仓库**推送 `v26.10.1` 标签触发构建和草稿创建。标签版本必须与构建开始时源码 `main` 的版本一致。源码仓库打标签不会自动触发此仓库。
4. 检查草稿产物后手动发布。npm 工作流在 Release 正式发布后，将同一份核心包发布为 `loopra-dist`。

普通提交只运行轻量检查。构建失败时不会创建新草稿。草稿和只构建模式不会发布 npm。

Release 下载区只保留四个软件包：`Loopra-macos-arm64.zip`、`Loopra-windows-x64.exe`、`Loopra-linux-x64.deb`、`loopra-dist.tar.gz`。文件名不带版本号，应用内部仍保留实际版本。安装脚本在仓库中提供，更新说明直接显示在 Release 正文；源码 SHA 和校验信息保存在正文隐藏记录中。

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

未配置 Key、API 超时/失败或返回不完整时，自动保留原始提交列表。AI 摘要附带可展开的原始提交记录和源码比较链接，正式发布前可在草稿中核对、修改。没有新增提交时不调用 AI。

首次迁入此仓库时，使用源码历史中可追溯的上一个较低版本标签作为基准；没有旧标签时从源码初始历史开始。旧正式 Release 若没有元数据，尝试使用其同名源码标签；如果基准无法追溯或不是本次源码的祖先，工作流会报错，避免生成错误的变更范围。

更新说明在 `prepare` 阶段生成。只构建模式也能在该 job 的 Summary 和 `release-metadata` Artifact 中查看 **`release-changes.md`**；创建 Release 时自动并入草稿正文，不作为下载附件。元数据的 `releaseNotes` 记录比较基准、提交数量和生成方式。提交过多时最多展示最近 500 条，AI 输入还设有长度上限，发生截断时会明确标记，并保留完整源码比较链接。

## 首次迁移配置

- 先把源码仓库中的迁移修改合并到 `ezdemo/loopra/main`，再发第一个正式版本；源码中的更新地址和版本检查必须指向此仓库。
- 此仓库启用 GitHub Actions。工作流仅在创建草稿的 job 申请 `contents: write`，npm job 申请 `id-token: write`。
- 公开源码不需要额外凭据。若以后改为私有源码，在此仓库添加 `SOURCE_READ_TOKEN`，授予对 `ezdemo/loopra` 的只读 Contents 权限。
- 如需 macOS Developer ID 签名，把原仓库的 `MAC_CERTIFICATE_P12`、`MAC_CERTIFICATE_P12_PASSWORD` 迁到此仓库；公证还需要 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`。无证书时使用 ad-hoc 签名。
- 在 npm 的 `loopra-dist` 包设置中，将 Trusted Publisher 配置为用户 **ezdemo**、仓库 **loopra-release**、工作流文件 **npm-publish.yml**。允许直接 `npm publish`，文件名不要填写完整路径。npm 发布使用 OIDC，无需长效 token。
- 保留已有 Release 和已发布 npm 版本。npm 版本沿用源码版本的前三段，已发布的版本不能覆盖；使用新的版本号。npm 失败后可手动运行 **Publish core to npm**，输入已正式发布的 Release 标签重试。
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

`main` 上的脚本默认安装最新的**正式** Release。使用 `setup-mirror` 变体可通过 GitHub 镜像下载核心包；`LOOPRA_MIRROR` 可指定镜像。`setup-gui` 安装独立桌面核心运行时到 `~/.loopra-gui`。安装脚本不作为 Release 附件。对 `main` 脚本设置 `LOOPRA_VERSION=v26.10.1` 可指定要安装的版本。

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
