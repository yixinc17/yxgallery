# Artifact Gallery

个人 HTML Artifact 档案库 — 集中展示 HTML 文档、Slides、交互 Demo 和网页原型。

通过 GitHub Pages 免费静态托管，无需构建工具或框架。

## 这是什么

Artifact Gallery 是一个轻量、可长期维护的静态网站。你把 HTML 作品放入 `inbox/`，运行导入脚本，它们就会出现在 Gallery 首页，并可通过 GitHub Pages 公开访问。

每个 Artifact 作为独立页面打开，CSS 和 JavaScript 互不干扰。

## 目录结构

```
artifact-gallery/
├── index.html              # Gallery 首页
├── viewer.html             # 项目查看器（顶栏 + iframe，含返回按钮）
├── 404.html                # 404 页面
├── .nojekyll               # 禁用 GitHub Pages Jekyll 处理
├── gallery.json            # 项目元数据（首页数据源）
├── package.json            # npm 脚本
├── AGENTS.md               # Agent 发布流程指南
├── assets/
│   ├── css/gallery.css     # 首页样式
│   ├── js/gallery.js       # 首页逻辑（筛选、搜索、渲染）
│   ├── images/             # 默认占位图等
│   └── thumbnails/         # 项目缩略图
├── inbox/                  # 待导入的 Artifact（放入这里）
├── projects/               # 已发布的 Artifact
└── scripts/
    ├── import-artifact.mjs # 导入脚本
    ├── capture-thumbnails.mjs
    ├── thumbnail.mjs
    ├── validate-gallery.mjs# 校验脚本
    ├── serve.mjs           # 本地预览服务器
    └── utils.mjs           # 共享工具函数
```

## 快速参考：inbox 还是 projects？

**一句话：`inbox/` 是你放作品的地方，`projects/` 由脚本自动维护，不要手动往里面放新文件夹。**

| 目录 | 作用 | 你要做什么 |
|------|------|------------|
| **`inbox/`** | 待导入的源文件 | 把文件夹或 HTML **放这里** |
| **`projects/`** | 已发布、线上展示的作品 | **不要手动放**，由 `npm run import` 生成或覆盖 |

### 上传新文件夹（第一次发布）

```bash
# 1. 放进 inbox/
inbox/my-new-demo/
  ├── index.html
  └── ...

# 2. 导入
npm run import -- inbox/my-new-demo

# 3. 校验 + 预览
npm run validate
npm run dev

# 4. 上线
git add .
git commit -m "add: my-new-demo"
git push origin main
```

导入后自动完成：
- 复制到 `projects/my-new-demo/`
- 写入 `gallery.json`
- 生成缩略图（如 Puppeteer 可用）

单个 HTML 文件同样支持：

```bash
npm run import -- inbox/report.html --type Document
```

### 更新已有文件夹（改了 HTML 之后）

```bash
# 1. 把更新后的文件夹放进 inbox/（文件夹名须与 slug 一致，如 eye-demo）
# 2. 用 --update 覆盖 projects/ 里的旧版本
npm run import -- inbox/eye-demo --update

# 可选：同时改标题、日期等元数据
npm run import -- inbox/eye-demo --update --date 2026-06-20

npm run validate
```

`--update` 会覆盖 `projects/{slug}/` 的全部文件，**不会**向你的 HTML 里注入返回按钮（返回在 `viewer.html` 顶栏）。

**更省事的方式**：若只改了 HTML/CSS/图片、标题日期不变，可直接替换 `projects/{slug}/` 里的文件，不必走 inbox。

**保留旧版本**：创建新 slug 导入，如 `my-demo-v2`。

### 常见误区

| ❌ 不要这样 | ✅ 应该这样 |
|------------|------------|
| 直接把新文件夹放进 `projects/` | 放 `inbox/` → `npm run import` |
| 只更新了 `inbox/` 却不跑命令 | `npm run import -- inbox/xxx --update` |
| 在 Artifact HTML 里加返回按钮 | 首页「打开项目」走 `viewer.html`，HTML 保持原样 |

### 完整流程一览

```
新作品：  inbox/ → import → validate → push
更新：    inbox/ → import --update → validate → push
```

## 如何放入新 HTML

1. 将内容放入 `inbox/`：
   - **单个 HTML 文件**：`inbox/my-demo.html`
   - **完整文件夹**（含 `index.html` 及资源）：`inbox/my-slides/`

2. 确保资源使用**相对路径**（`./images/a.png`），不要用 `/images/a.png`

3. 检查不含敏感文件（见下方「不应上传的内容」）

## 如何导入项目

```bash
npm run import -- inbox/项目名或文件
```

示例：

```bash
# 导入文件夹
npm run import -- inbox/my-slides

# 导入单个 HTML
npm run import -- inbox/report.html

# 带元数据
npm run import -- inbox/my-demo.html \
  --title "My Demo" \
  --description "A quick interaction demo." \
  --type Demo \
  --tags "CSS,Interaction" \
  --date 2026-06-15
```

导入后：
- 内容复制到 `projects/{slug}/`
- `gallery.json` 自动更新
- 脚本报告资源路径问题

## 如何本地预览

```bash
npm run dev
```

浏览器打开终端显示的地址（默认 `http://127.0.0.1:4173/<仓库名>/`）。

本地服务器模拟 GitHub Pages 的**子路径**环境。不要直接双击 `index.html`，因为浏览器在 `file://` 下无法加载 `gallery.json`。

自定义子路径：

```bash
BASE_PATH=/my-repo/ npm run dev
```

## 如何运行校验

```bash
npm run validate
```

检查 JSON 格式、ID 唯一性、目录存在、资源路径、敏感文件等。只报告问题，不自动删除。

## 如何提交 Git

```bash
git add .
git status
git commit -m "add: 项目名称"
git push origin main
```

## 如何开启 GitHub Pages

1. 将仓库推送到 GitHub
2. 打开仓库 **Settings**
3. 打开 **Pages**
4. **Source** 选择 **Deploy from a branch**
5. **Branch** 选择 **main**
6. **Folder** 选择 **/(root)**
7. 保存并等待部署完成

部署完成后访问：

```
https://<你的用户名>.github.io/<仓库名>/
```

## 常见资源路径错误

| 错误写法 | 问题 | 正确写法 |
|----------|------|----------|
| `/images/a.png` | GitHub Pages 子路径下 404 | `./images/a.png` |
| `/Users/me/a.png` | 本机绝对路径 | `./images/a.png` |
| `file:///Users/...` | 仅本机可用 | `./images/a.png` |
| `https://cdn.example.com/lib.js` | ✅ 外部 CDN，保持不变 | — |

## 如何更新项目

详见上方 [快速参考：inbox 还是 projects？](#快速参考inbox-还是-projects) 中的「更新已有文件夹」。

## 项目查看方式

从首页「打开项目」会进入 `viewer.html` —— 顶部是 Gallery 顶栏（含返回按钮），下方 iframe 加载你的 Artifact。这样返回导航与作品 HTML 完全分离，更新作品时无需改 HTML。

「独立打开」则直接进入 `projects/{slug}/`，无顶栏，适合全屏演示。

## 如何删除项目

```bash
rm -rf projects/my-project
# 编辑 gallery.json，移除对应条目
npm run validate
```

## 如何替换缩略图

导入时会**自动截取**项目首页截图（需 Puppeteer）。也可手动批量生成：

```bash
npm install          # 首次需安装 puppeteer
npm run thumbnails   # 为全部项目生成/更新缩略图
npm run thumbnails -- eye-demo   # 仅单个项目
npm run thumbnails -- --force    # 覆盖已有缩略图
npm run thumbnails -- --placeholder-only   # 仅 SVG 占位图（不截图）
```

截图保存在 `assets/thumbnails/{slug}.png`。若 Puppeteer 不可用或截图失败，会自动生成带标题和类型的 SVG 占位图。

也可手动将图片放入 `assets/thumbnails/` 并更新 `gallery.json` 中的 `thumbnail` 字段。

## 不应上传的内容

- `.env` 和环境变量文件
- 私钥（`.pem`、`.key`、`id_rsa`）
- API Key 和 token 配置
- `credentials.json`、`secrets.json`
- 不应公开的源数据
- `.DS_Store`、`node_modules/`

## gallery.json 字段说明

| 字段 | 说明 |
|------|------|
| `id` | 小写 kebab-case，与 `projects/` 目录名一致 |
| `title` | 项目标题 |
| `description` | 一句话描述 |
| `type` | Slides / Document / Prototype / Demo / Website / Experiment |
| `date` | YYYY-MM-DD |
| `tags` | 标签数组 |
| `path` | 相对路径，如 `./projects/my-slides/` |
| `thumbnail` | 缩略图相对路径 |
| `featured` | 是否精选（可选） |

未来可扩展：`author`、`status`、`version`、`externalUrl` 等字段。

## 给 Agent 的指令

告诉 Agent：

> 发布 inbox 中的这个项目

Agent 会阅读 `AGENTS.md` 并按流程完成导入、校验和预览。详见 [AGENTS.md](./AGENTS.md)。

## 许可

个人项目，自由使用。
