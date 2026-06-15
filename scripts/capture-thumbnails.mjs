#!/usr/bin/env node

/**
 * Generate or capture thumbnails for gallery projects.
 *
 * Usage:
 *   npm run thumbnails              # all projects
 *   npm run thumbnails -- eye-demo    # single project
 *   npm run thumbnails -- --placeholder-only
 *   npm run thumbnails -- --force
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readGallery } from './utils.mjs';
import {
  ensureThumbnail,
  updateGalleryThumbnail,
  thumbnailAbsPath,
  captureScreenshot,
  writePlaceholder,
} from './thumbnail.mjs';

function parseArgs(argv) {
  const args = {
    slugs: [],
    placeholderOnly: false,
    force: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--placeholder-only') args.placeholderOnly = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--help' || arg === '-h') args.help = true;
    else if (!arg.startsWith('-')) args.slugs.push(arg);
  }

  return args;
}

function printHelp() {
  console.log(`
缩略图生成

Usage:
  npm run thumbnails [slug...] [options]

Options:
  --placeholder-only   仅生成 SVG 占位图（不截取屏幕）
  --force              覆盖已有缩略图
  --help               显示帮助

Examples:
  npm run thumbnails
  npm run thumbnails -- eye-demo pawbie-style-report
  npm run thumbnails -- --placeholder-only
`);
}

async function processProject(entry, options) {
  const slug = entry.id;
  const projectDir = path.resolve(ROOT, entry.path);
  const pngPath = thumbnailAbsPath(slug, 'png');
  const svgPath = thumbnailAbsPath(slug, 'svg');

  if (!options.force && (fs.existsSync(pngPath) || fs.existsSync(svgPath))) {
    const existing = fs.existsSync(pngPath) ? pngPath : svgPath;
    const ext = path.extname(existing).slice(1);
    const rel = `./assets/thumbnails/${slug}.${ext}`;
    if (entry.thumbnail !== rel) {
      updateGalleryThumbnail(slug, rel);
      console.log(`   ↻ 已同步 gallery.json → ${rel}`);
    } else {
      console.log(`   ⏭  已存在，跳过（使用 --force 覆盖）`);
    }
    return { slug, skipped: true };
  }

  console.log(`\n🖼  ${entry.title} (${slug})`);

  let result;
  if (options.placeholderOnly) {
    result = writePlaceholder({
      slug,
      title: entry.title,
      type: entry.type,
    });
    console.log(`   ✅ SVG 占位图 → ${result.rel}`);
  } else {
    result = await ensureThumbnail({
      slug,
      title: entry.title,
      type: entry.type,
      projectDir,
      preferScreenshot: true,
    });
    console.log(`   ✅ ${result.method === 'screenshot' ? '截图' : '占位图'} → ${result.rel}`);
  }

  updateGalleryThumbnail(slug, result.rel);
  return { slug, ...result };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('\n🖼  Artifact Gallery — 缩略图生成\n');

  const gallery = readGallery();
  let targets = gallery;

  if (args.slugs.length) {
    targets = gallery.filter((e) => args.slugs.includes(e.id));
    const missing = args.slugs.filter((s) => !targets.some((e) => e.id === s));
    if (missing.length) {
      console.warn(`⚠️  未找到项目: ${missing.join(', ')}`);
    }
  }

  if (!targets.length) {
    console.log('没有可处理的项目。');
    process.exit(0);
  }

  const results = [];
  for (const entry of targets) {
    results.push(await processProject(entry, args));
  }

  const captured = results.filter((r) => r.method === 'screenshot').length;
  const placeholders = results.filter((r) => r.method === 'placeholder').length;
  const skipped = results.filter((r) => r.skipped).length;

  console.log('\n--- 完成 ---');
  console.log(`   截图: ${captured}  占位图: ${placeholders}  跳过: ${skipped}`);
  console.log('   gallery.json 已更新\n');
}

main().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
