# Agent 工作指南 — Artifact Gallery

本文档规定 Agent 在执行 **「发布 inbox 中的这个项目」** 时必须遵循的流程。

## 核心原则

- **不覆盖**现有 `projects/` 中的项目
- **不泄露**敏感文件（`.env`、密钥、token 等）
- **不重新设计** Artifact 的视觉和交互，保持原样
- **不擅自 push**，除非用户明确要求发布

## 发布流程

### 1. 了解当前状态

```bash
# 阅读目录结构
ls -la
cat gallery.json

# 确认 inbox 中的待发布内容
ls -la inbox/
```

### 2. 检查 inbox 内容

- 确认是单个 `.html` 文件还是包含 `index.html` 的文件夹
- 检查是否含有敏感文件（`.env`、私钥、API Key、credentials、token）
- 检查 HTML/CSS/JS 中的资源路径：
  - ❌ 绝对路径（`/Users/...`、`C:\...`）
  - ❌ `file://` 协议
  - ❌ 根路径（`/images/foo.png`）— 在 GitHub Pages 子路径下会失效
  - ✅ 相对路径（`./images/foo.png`、`../shared/style.css`）
  - ✅ 外部 URL（`https://...`）— 保持不变

### 3. 执行导入

```bash
npm run import -- inbox/<项目名或文件>
```

可选参数：

```bash
npm run import -- inbox/my-slides \
  --title "项目标题" \
  --description "一句话描述" \
  --type Slides \
  --tags "标签1,标签2" \
  --date 2026-06-15
```

有效类型：`Slides` | `Document` | `Prototype` | `Demo` | `Website` | `Experiment`

导入脚本会：
- 复制/移动到 `projects/{slug}/`
- 单文件 HTML 自动重命名为 `index.html`
- 扫描资源路径并报告问题
- 更新 `gallery.json`（按日期从新到旧排序）

### 4. 完善元数据

导入后检查 `gallery.json` 中新增条目的：
- `title` — 标题是否准确
- `description` — 描述是否清晰
- `type` — 类型是否正确
- `tags` — 标签是否有意义（替换「待补充」）
- `thumbnail` — 是否需要添加缩略图到 `assets/thumbnails/`

### 5. 生成缩略图

导入时会自动尝试截图。如需补生成或更新：

```bash
npm run thumbnails
npm run thumbnails -- <slug> --force
```

### 6. 运行校验

```bash
npm run validate
```

必须修复所有 **错误**，评估 **警告** 是否需要处理。

### 7. 本地预览

```bash
npm run dev
```

在浏览器中检查：
- [ ] Gallery 首页正常加载
- [ ] 新项目卡片显示正确
- [ ] 筛选和搜索功能正常
- [ ] 点击「打开项目」能正常进入 Artifact
- [ ] Artifact 的视觉和交互完整
- [ ] 404 页面链接正常

### 8. 汇报

向用户汇报：
- 导入的项目 slug 和路径
- 校验发现的问题及处理情况
- 本地预览地址
- 未来的 GitHub Pages 地址格式
- 仍需用户手动完成的事项（如缩略图、元数据完善）

### 9. Git 提交

**仅在用户明确要求时**执行 commit：

```bash
git add .
git status
git commit -m "add: <项目标题>"
```

**未经用户明确要求，不要执行 `git push`。**

### 10. 发布到 GitHub Pages

**仅在用户明确要求发布时**：

```bash
git push origin main
```

GitHub Pages 设置见 README.md。

## 禁止事项

1. ❌ 不要覆盖 `projects/` 中已有项目
2. ❌ 不要提交 `.env`、密钥、token 等敏感文件
3. ❌ 不要修改 Artifact 的 HTML/CSS/JS（除非修复路径问题且用户同意）
4. ❌ 不要在 Gallery 首页用 iframe 嵌入 Artifact
5. ❌ 不要写死 GitHub 用户名或仓库名
6. ❌ 不要使用 `/assets/` 或 `/projects/` 作为 Artifact 内的绝对路径
7. ❌ 不要擅自 `git push`
8. ❌ 不要删除校验脚本报告的文件

## 更新已有项目

如需更新已发布的 Artifact：

1. 确认用户意图（替换 vs 新建版本）
2. 替换通常需要用户先手动删除旧 `projects/{slug}/` 和 `gallery.json` 条目
3. 或创建新 slug（如 `my-project-v2`）以避免覆盖

## 删除项目

1. 删除 `projects/{slug}/` 目录
2. 从 `gallery.json` 移除对应条目
3. 可选：删除 `assets/thumbnails/{slug}.*`
4. 运行 `npm run validate`

## 路径问题修复指南

| 问题 | 示例 | 修复 |
|------|------|------|
| 根路径 | `/images/a.png` | `./images/a.png` |
| 绝对路径 | `/Users/me/img.png` | 改为项目内相对路径 |
| file:// | `file:///Users/...` | 改为相对路径 |
| 外部 URL | `https://cdn.example.com/lib.js` | 保持不变 |

修复路径时只改引用，不改 Artifact 的功能和样式。
