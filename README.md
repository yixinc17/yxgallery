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
    ├── validate-gallery.mjs# 校验脚本
    ├── serve.mjs           # 本地预览服务器
    └── utils.mjs           # 共享工具函数
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

1. 修改 `inbox/` 中的源文件
2. 手动删除旧的 `projects/{slug}/` 和 `gallery.json` 条目
3. 重新运行 `npm run import -- inbox/...`

或创建新 slug（如 `my-project-v2`）保留旧版本。

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
