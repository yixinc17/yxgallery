#!/usr/bin/env node

/**
 * Validate gallery.json and all project artifacts.
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  VALID_TYPES,
  readGallery,
  scanProjectResources,
  findSensitiveFiles,
  isAbsolutePath,
  isRootRelativePath,
  collectTextFiles,
  extractLocalReferences,
} from './utils.mjs';

const errors = [];
const warnings = [];

function error(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function validateGalleryJson() {
  const galleryPath = path.join(ROOT, 'gallery.json');
  if (!fs.existsSync(galleryPath)) {
    error('gallery.json 不存在');
    return null;
  }

  let data;
  try {
    const raw = fs.readFileSync(galleryPath, 'utf8');
    data = JSON.parse(raw);
  } catch (err) {
    error(`gallery.json 不是有效 JSON: ${err.message}`);
    return null;
  }

  if (!Array.isArray(data)) {
    error('gallery.json 必须是数组');
    return null;
  }

  console.log(`✓ gallery.json 格式有效（${data.length} 个项目）`);
  return data;
}

function validateEntry(entry, index, seenIds, seenSlugs) {
  const prefix = `[${entry.id || `#${index}`}]`;

  if (!entry.id) {
    error(`${prefix} 缺少 id 字段`);
  } else {
    if (seenIds.has(entry.id)) {
      error(`${prefix} 重复的 id: ${entry.id}`);
    }
    seenIds.add(entry.id);

    if (entry.id !== entry.id.toLowerCase() || /[^a-z0-9-]/.test(entry.id)) {
      warn(`${prefix} id 应使用小写 kebab-case: ${entry.id}`);
    }
  }

  if (seenSlugs.has(entry.id)) {
    error(`${prefix} 重复的 slug: ${entry.id}`);
  }
  seenSlugs.add(entry.id);

  if (!entry.title) warn(`${prefix} 缺少 title`);
  if (!entry.description) warn(`${prefix} 缺少 description`);

  if (!entry.type) {
    warn(`${prefix} 缺少 type`);
  } else if (!VALID_TYPES.includes(entry.type)) {
    warn(`${prefix} 未知类型: ${entry.type}（有效: ${VALID_TYPES.join(', ')}）`);
  }

  if (!entry.date) {
    warn(`${prefix} 缺少 date`);
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    error(`${prefix} 无效日期格式: ${entry.date}（期望 YYYY-MM-DD）`);
  } else {
    const d = new Date(entry.date + 'T00:00:00');
    if (isNaN(d.getTime())) {
      error(`${prefix} 无效日期: ${entry.date}`);
    }
  }

  if (!entry.path) {
    error(`${prefix} 缺少 path`);
    return;
  }

  if (entry.path.startsWith('/')) {
    error(`${prefix} path 不应以 / 开头: ${entry.path}`);
  }

  const projectDir = path.resolve(ROOT, entry.path);
  if (!fs.existsSync(projectDir)) {
    error(`${prefix} 项目目录不存在: ${entry.path}`);
    return;
  }

  const indexPath = path.join(projectDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    error(`${prefix} 缺少 index.html: ${entry.path}`);
  }

  if (entry.thumbnail) {
    const thumbPath = path.resolve(ROOT, entry.thumbnail);
    if (!fs.existsSync(thumbPath)) {
      warn(`${prefix} 缩略图不存在: ${entry.thumbnail}（首页将显示默认占位图）`);
    }
  }

  // Scan project resources
  const issues = scanProjectResources(projectDir);
  for (const item of issues.missing) {
    warn(`${prefix} 缺失资源 ${item.file}: "${item.ref}"`);
  }
  for (const item of issues.absolute) {
    error(`${prefix} 绝对路径 ${item.file}: "${item.ref}"`);
  }
  for (const item of issues.fileProtocol) {
    error(`${prefix} file:// 引用 ${item.file}: "${item.ref}"`);
  }
  for (const item of issues.rootRelative) {
    warn(`${prefix} 根路径引用 ${item.file}: "${item.ref}"（GitHub Pages 子路径下可能失效）`);
  }
  for (const item of issues.outsideProject) {
    warn(`${prefix} 外部相对路径 ${item.file}: "${item.ref}"`);
  }

  // Case sensitivity check
  checkCaseConsistency(projectDir, prefix);

  // Sensitive files
  const sensitive = findSensitiveFiles(projectDir);
  for (const file of sensitive) {
    error(`${prefix} 潜在敏感文件: ${file}`);
  }
}

function checkCaseConsistency(projectDir, prefix) {
  const files = collectTextFiles(projectDir);
  const dirListingCache = new Map();

  function listDir(dir) {
    if (!dirListingCache.has(dir)) {
      if (!fs.existsSync(dir)) {
        dirListingCache.set(dir, []);
      } else {
        dirListingCache.set(dir, fs.readdirSync(dir));
      }
    }
    return dirListingCache.get(dir);
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const refs = extractLocalReferences(content);
    const relFile = path.relative(ROOT, file);

    for (const ref of refs) {
      if (!ref || ref.startsWith('http') || ref.startsWith('//') || ref.startsWith('#') || ref.startsWith('data:')) continue;
      if (isAbsolutePath(ref) || isRootRelativePath(ref)) continue;

      const fromDir = path.dirname(file);
      const parts = ref.split('?')[0].split('#')[0].split('/');
      let current = fromDir;

      for (const part of parts) {
        if (part === '.' || part === '') continue;
        if (part === '..') {
          current = path.dirname(current);
          continue;
        }
        const listing = listDir(current);
        const match = listing.find((name) => name.toLowerCase() === part.toLowerCase());
        if (match && match !== part) {
          warn(`${prefix} 大小写不一致 ${relFile}: "${ref}"（磁盘上为 "${match}"）`);
          break;
        }
        current = path.join(current, part);
      }
    }
  }
}

function checkOrphanProjects(gallery) {
  const projectsDir = path.join(ROOT, 'projects');
  if (!fs.existsSync(projectsDir)) return;

  const galleryIds = new Set(gallery.map((e) => e.id));
  for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    if (!galleryIds.has(entry.name)) {
      warn(`projects/${entry.name}/ 存在于磁盘但未在 gallery.json 中注册`);
    }
  }
}

function main() {
  console.log('\n🔍 Artifact Gallery 校验\n');

  const gallery = validateGalleryJson();
  if (!gallery) {
    printSummary();
    process.exit(1);
  }

  const seenIds = new Set();
  const seenSlugs = new Set();

  for (let i = 0; i < gallery.length; i++) {
    validateEntry(gallery[i], i, seenIds, seenSlugs);
  }

  checkOrphanProjects(gallery);

  // Check sort order
  for (let i = 1; i < gallery.length; i++) {
    const prev = gallery[i - 1].date || '';
    const curr = gallery[i].date || '';
    if (prev && curr && prev < curr) {
      warn('gallery.json 未按日期从新到旧排序');
      break;
    }
  }

  printSummary();
  process.exit(errors.length > 0 ? 1 : 0);
}

function printSummary() {
  console.log('\n--- 校验结果 ---');
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 全部通过，未发现问题。\n');
    return;
  }

  if (errors.length) {
    console.log(`\n❌ 错误 (${errors.length}):`);
    errors.forEach((e) => console.log(`   • ${e}`));
  }

  if (warnings.length) {
    console.log(`\n⚠️  警告 (${warnings.length}):`);
    warnings.forEach((w) => console.log(`   • ${w}`));
  }

  console.log('');
}

main();
