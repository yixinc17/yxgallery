#!/usr/bin/env node

/**
 * Import an artifact from inbox/ into projects/ and update gallery.json.
 *
 * Usage:
 *   npm run import -- inbox/my-project
 *   npm run import -- inbox/single-file.html --title "My Title" --type Demo --tags "a,b"
 *   npm run import -- inbox/my-project --move
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  VALID_TYPES,
  toKebabCase,
  readGallery,
  writeGallery,
  scanProjectResources,
  findSensitiveFiles,
  inferTitleFromHtml,
  inferTypeFromContent,
  copyRecursive,
  getRepoName,
  formatIssueList,
} from './utils.mjs';
import { ensureThumbnail, thumbnailRelPath } from './thumbnail.mjs';

function parseArgs(argv) {
  const args = {
    input: null,
    slug: null,
    title: null,
    description: null,
    type: null,
    tags: null,
    date: null,
    featured: false,
    move: false,
    thumbnail: null,
    noThumbnail: false,
    placeholderOnly: false,
  };

  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--slug') args.slug = argv[++i];
    else if (arg === '--title') args.title = argv[++i];
    else if (arg === '--description') args.description = argv[++i];
    else if (arg === '--type') args.type = argv[++i];
    else if (arg === '--tags') args.tags = argv[++i];
    else if (arg === '--date') args.date = argv[++i];
    else if (arg === '--thumbnail') args.thumbnail = argv[++i];
    else if (arg === '--featured') args.featured = true;
    else if (arg === '--move') args.move = true;
    else if (arg === '--no-thumbnail') args.noThumbnail = true;
    else if (arg === '--placeholder-only') args.placeholderOnly = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (!arg.startsWith('-')) positional.push(arg);
  }

  args.input = positional[0] || null;
  return args;
}

function printHelp() {
  console.log(`
Artifact Gallery — Import

Usage:
  npm run import -- <inbox-path> [options]

Options:
  --slug <id>           自定义 kebab-case slug（默认从名称推断）
  --title <title>       项目标题
  --description <text>  一句话描述
  --type <type>         类型: ${VALID_TYPES.join(', ')}
  --tags <a,b,c>        逗号分隔标签
  --date <YYYY-MM-DD>   发布日期
  --thumbnail <path>    缩略图相对路径（默认自动截取）
  --no-thumbnail        跳过缩略图生成
  --placeholder-only    仅生成 SVG 占位图，不截图
  --featured            标记为精选
  --move                移动而非复制（默认复制）
  --help                显示帮助

Examples:
  npm run import -- inbox/my-slides
  npm run import -- inbox/report.html --type Document --tags "Notes"
`);
}

function resolveInputPath(input) {
  const abs = path.isAbsolute(input) ? input : path.resolve(ROOT, input);
  if (!fs.existsSync(abs)) {
    throw new Error(`输入路径不存在: ${input}`);
  }
  return abs;
}

function detectInputKind(inputPath) {
  const stat = fs.statSync(inputPath);
  if (stat.isDirectory()) return 'folder';
  if (stat.isFile() && /\.html?$/i.test(inputPath)) return 'single-html';
  throw new Error('输入必须是文件夹或单个 .html 文件');
}

function prepareProject(inputPath, kind, slug) {
  const destDir = path.join(ROOT, 'projects', slug);

  if (fs.existsSync(destDir)) {
    throw new Error(`目标项目已存在，拒绝覆盖: projects/${slug}/`);
  }

  fs.mkdirSync(destDir, { recursive: true });

  if (kind === 'folder') {
    return { destDir, indexPath: path.join(destDir, 'index.html'), copiedFrom: inputPath };
  }

  // single HTML → projects/{slug}/index.html
  const indexPath = path.join(destDir, 'index.html');
  fs.copyFileSync(inputPath, indexPath);
  return { destDir, indexPath, copiedFrom: inputPath };
}

function copyFolderContents(src, dest, move) {
  if (move) {
    fs.renameSync(src, dest);
  } else {
    copyRecursive(src, dest);
  }
}

function validateDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function buildEntry(args, slug, indexPath) {
  const title =
    args.title ||
    inferTitleFromHtml(indexPath) ||
    slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const type =
    args.type && VALID_TYPES.includes(args.type)
      ? args.type
      : inferTypeFromContent(indexPath, slug);

  const description =
    args.description || `Imported artifact: ${title}.`;

  const date =
    args.date && validateDate(args.date)
      ? args.date
      : new Date().toISOString().slice(0, 10);

  const tags = args.tags
    ? args.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : ['待补充'];

  const thumbnail =
    args.thumbnail || thumbnailRelPath(slug, 'png');

  return {
    id: slug,
    title,
    description,
    type,
    date,
    tags,
    path: `./projects/${slug}/`,
    thumbnail,
    featured: args.featured,
  };
}

function suggestRootRelativeFix(ref, projectSlug) {
  // /images/foo.png → ./images/foo.png (within project)
  if (ref.startsWith('/projects/')) {
    return null; // ambiguous cross-project reference
  }
  const stripped = ref.replace(/^\//, '');
  return `./${stripped}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = resolveInputPath(args.input);
  const kind = detectInputKind(inputPath);

  const defaultSlug = toKebabCase(path.basename(inputPath));
  const slug = args.slug ? toKebabCase(args.slug) : defaultSlug;

  if (!slug) {
    console.error('无法生成有效的 slug，请使用 --slug 指定。');
    process.exit(1);
  }

  console.log(`\n📦 导入 Artifact: ${path.relative(ROOT, inputPath)}`);
  console.log(`   类型: ${kind === 'folder' ? '完整文件夹' : '单个 HTML 文件'}`);
  console.log(`   Slug: ${slug}`);

  if (kind === 'folder') {
    const indexInFolder = path.join(inputPath, 'index.html');
    if (!fs.existsSync(indexInFolder)) {
      console.error('文件夹缺少 index.html 入口文件。');
      process.exit(1);
    }
  }

  const destDir = path.join(ROOT, 'projects', slug);
  if (fs.existsSync(destDir)) {
    console.error(`❌ 目标已存在: projects/${slug}/ — 拒绝静默覆盖。`);
    process.exit(1);
  }

  if (kind === 'folder') {
    copyFolderContents(inputPath, destDir, args.move);
  } else {
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(inputPath, path.join(destDir, 'index.html'));
  }

  const indexPath = path.join(destDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.error('导入后未找到 index.html。');
    process.exit(1);
  }

  // Resource scan
  const issues = scanProjectResources(destDir);
  const sensitive = findSensitiveFiles(destDir);

  const warnings = [];
  warnings.push(...formatIssueList(issues.missing, '⚠️  可能失效的资源路径'));
  warnings.push(...formatIssueList(issues.absolute, '⚠️  本机绝对路径'));
  warnings.push(...formatIssueList(issues.fileProtocol, '⚠️  file:// 引用'));
  warnings.push(...formatIssueList(issues.rootRelative, '⚠️  根路径引用（/...）— 在 GitHub Pages 子路径下可能失效'));
  warnings.push(...formatIssueList(issues.outsideProject, '⚠️  指向项目外部的相对路径'));
  warnings.push(...formatIssueList(sensitive, '🔒 潜在敏感文件'));

  if (issues.rootRelative.length) {
    console.log('\n💡 根路径引用修复建议（请手动确认后再改）:');
    for (const item of issues.rootRelative) {
      const suggestion = suggestRootRelativeFix(item.ref, slug);
      if (suggestion) {
        console.log(`   ${item.file}: "${item.ref}" → 建议改为 "${suggestion}"`);
      } else {
        console.log(`   ${item.file}: "${item.ref}" → 无法自动转换，请改为相对路径`);
      }
    }
  }

  if (warnings.some((w) => w.startsWith('\n'))) {
    console.log(warnings.join('\n'));
  } else {
    console.log('\n✅ 未发现资源路径问题。');
  }

  // Update gallery.json
  const gallery = readGallery();
  if (gallery.some((e) => e.id === slug)) {
    console.error(`❌ gallery.json 中已存在 id: ${slug}`);
    process.exit(1);
  }

  const entry = buildEntry(args, slug, indexPath);
  gallery.push(entry);
  writeGallery(gallery);

  console.log('\n✅ 已更新 gallery.json');
  console.log(`   标题: ${entry.title}`);
  console.log(`   类型: ${entry.type}`);
  console.log(`   日期: ${entry.date}`);

  // Thumbnail
  if (!args.thumbnail && !args.noThumbnail) {
    console.log('\n🖼  生成缩略图…');
    const thumb = await ensureThumbnail({
      slug,
      title: entry.title,
      type: entry.type,
      projectDir: destDir,
      preferScreenshot: !args.placeholderOnly,
    });
    entry.thumbnail = thumb.rel;
    writeGallery(gallery);
    console.log(`   ✅ ${thumb.method === 'screenshot' ? '截图' : '占位图'} → ${thumb.rel}`);
  } else if (args.noThumbnail) {
    entry.thumbnail = './assets/images/default-thumbnail.svg';
    writeGallery(gallery);
  }

  const repoName = getRepoName();
  const port = process.env.PORT || 4173;

  console.log('\n🔗 预览地址:');
  console.log(`   本地:     http://localhost:${port}/${repoName}/projects/${slug}/`);
  console.log(`   本地首页: http://localhost:${port}/${repoName}/`);
  console.log(`   Pages:    https://<用户名>.github.io/${repoName}/projects/${slug}/`);

  if (entry.tags.includes('待补充') || entry.description.startsWith('Imported artifact:')) {
    console.log('\n📝 提示: 部分元数据使用了默认值，可在 gallery.json 中手动完善。');
  }

  console.log('\n下一步: npm run validate && npm run dev\n');
}

try {
  await main();
} catch (err) {
  console.error(`\n❌ 导入失败: ${err.message}\n`);
  process.exit(1);
}
