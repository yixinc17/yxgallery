#!/usr/bin/env node

/**
 * Shared utilities for Artifact Gallery scripts.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const VALID_TYPES = [
  'Slides',
  'Document',
  'Prototype',
  'Demo',
  'Website',
  'Experiment',
];

export const SENSITIVE_PATTERNS = [
  /^\.env(\.|$)/,
  /^\.env\./,
  /\.pem$/,
  /\.key$/,
  /^id_rsa/,
  /credentials\.json$/i,
  /secrets?\.json$/i,
  /\.p12$/,
  /token\.json$/i,
  /api[_-]?key/i,
  /^\.DS_Store$/,
  /^\.git$/,
  /^node_modules$/,
  /^Thumbs\.db$/,
];

export const RESOURCE_ATTR_PATTERN =
  /(?:src|href|srcset|poster)\s*=\s*["']([^"']+)["']/gi;

export const CSS_URL_PATTERN = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;

export const JS_IMPORT_PATTERN =
  /(?:import\s+[^'"]*from\s+|require\s*\(\s*)["']([^"']+)["']/gi;

export function toKebabCase(input) {
  return input
    .replace(/\.html?$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export function readGallery() {
  const galleryPath = path.join(ROOT, 'gallery.json');
  if (!fs.existsSync(galleryPath)) return [];
  const raw = fs.readFileSync(galleryPath, 'utf8');
  return JSON.parse(raw);
}

export function writeGallery(entries) {
  const sorted = [...entries].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );
  const galleryPath = path.join(ROOT, 'gallery.json');
  fs.writeFileSync(galleryPath, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

export function isAbsolutePath(p) {
  if (!p) return false;
  if (p.startsWith('file://')) return true;
  if (/^[a-zA-Z]:\\/.test(p)) return true;
  if (p.startsWith('/Users/') || p.startsWith('/home/') || p.startsWith('C:\\')) return true;
  return path.isAbsolute(p);
}

export function isExternalUrl(p) {
  return /^https?:\/\//i.test(p) || /^\/\//.test(p) || /^data:/i.test(p) || /^mailto:/i.test(p);
}

export function isRootRelativePath(p) {
  return p.startsWith('/') && !p.startsWith('//');
}

export function collectTextFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      collectTextFiles(full, files);
    } else if (/\.(html?|css|js|mjs)$/i.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

export function extractLocalReferences(content) {
  const refs = [];
  let match;

  const patterns = [RESOURCE_ATTR_PATTERN, CSS_URL_PATTERN, JS_IMPORT_PATTERN];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      refs.push(match[1].trim());
    }
  }

  return refs;
}

export function resolveReference(ref, fromFile, projectDir) {
  if (!ref || isExternalUrl(ref) || ref.startsWith('#')) return { kind: 'skip' };
  if (ref.startsWith('file://')) return { kind: 'file-protocol', ref };
  if (isAbsolutePath(ref)) return { kind: 'absolute', ref };

  if (isRootRelativePath(ref)) {
    return { kind: 'root-relative', ref };
  }

  const fromDir = path.dirname(fromFile);
  const resolved = path.normalize(path.join(fromDir, ref.split('?')[0].split('#')[0]));

  if (!resolved.startsWith(projectDir)) {
    // References to gallery root (e.g. ../../index.html) are valid
    if (resolved.startsWith(ROOT) && fs.existsSync(resolved)) {
      return { kind: 'ok', ref, resolved };
    }
    return { kind: 'outside-project', ref, resolved };
  }

  if (!fs.existsSync(resolved)) {
    return { kind: 'missing', ref, resolved };
  }

  return { kind: 'ok', ref, resolved };
}

export function scanProjectResources(projectDir) {
  const issues = {
    missing: [],
    absolute: [],
    fileProtocol: [],
    rootRelative: [],
    outsideProject: [],
  };

  const files = collectTextFiles(projectDir);
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const refs = extractLocalReferences(content);
    const relFile = path.relative(ROOT, file);

    for (const ref of refs) {
      const result = resolveReference(ref, file, projectDir);
      const item = { file: relFile, ref };

      switch (result.kind) {
        case 'missing':
          issues.missing.push({ ...item, resolved: path.relative(ROOT, result.resolved) });
          break;
        case 'absolute':
          issues.absolute.push(item);
          break;
        case 'file-protocol':
          issues.fileProtocol.push(item);
          break;
        case 'root-relative':
          issues.rootRelative.push(item);
          break;
        case 'outside-project':
          issues.outsideProject.push({ ...item, resolved: path.relative(ROOT, result.resolved) });
          break;
      }
    }
  }

  return issues;
}

export function findSensitiveFiles(dir, base = dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (SENSITIVE_PATTERNS.some((p) => p.test(entry.name) || p.test(rel))) {
      found.push(path.relative(ROOT, full));
    }
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
      findSensitiveFiles(full, base, found);
    }
  }
  return found;
}

export function inferTitleFromHtml(htmlPath) {
  try {
    const content = fs.readFileSync(htmlPath, 'utf8');
    const match = content.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match) return match[1].trim();
  } catch {
    /* ignore */
  }
  return null;
}

export function inferTypeFromContent(htmlPath, slug) {
  const lower = slug.toLowerCase();
  if (lower.includes('slide')) return 'Slides';
  if (lower.includes('demo') || lower.includes('interaction')) return 'Demo';
  if (lower.includes('prototype') || lower.includes('proto')) return 'Prototype';
  if (lower.includes('experiment')) return 'Experiment';

  try {
    const content = fs.readFileSync(htmlPath, 'utf8').toLowerCase();
    if (content.includes('slide') || content.includes('presentation')) return 'Slides';
    if (content.includes('prototype')) return 'Prototype';
  } catch {
    /* ignore */
  }

  return 'Document';
}

export function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export function getRepoName() {
  try {
    const gitConfig = fs.readFileSync(path.join(ROOT, '.git', 'config'), 'utf8');
    const match = gitConfig.match(/url\s*=\s*.+\/([^/\s]+?)(?:\.git)?\s*$/m);
    if (match) return match[1].replace(/\.git$/, '');
  } catch {
    /* ignore */
  }
  return 'artifact-gallery';
}

export function formatIssueList(issues, label) {
  if (!issues.length) return [];
  return [`\n${label}:`].concat(
    issues.map((i) => {
      if (typeof i === 'string') return `  - ${i}`;
      const parts = [`  - ${i.file}: "${i.ref}"`];
      if (i.resolved) parts.push(`→ ${i.resolved}`);
      return parts.join(' ');
    })
  );
}

const GALLERY_BACK_CSS = '  <link rel="stylesheet" href="../../assets/css/gallery-back.css">\n';
const GALLERY_BACK_LINK =
  '  <a class="gallery-back" href="../../index.html">← 返回 Gallery</a>\n';

export function injectGalleryBackButton(indexPath) {
  if (!fs.existsSync(indexPath)) return false;

  let html = fs.readFileSync(indexPath, 'utf8');
  if (html.includes('gallery-back')) return false;

  if (!html.includes('gallery-back.css')) {
    html = html.replace(/<\/head>/i, GALLERY_BACK_CSS + '</head>');
  }

  html = html.replace(/<body([^>]*)>/i, `<body$1>\n${GALLERY_BACK_LINK}`);
  fs.writeFileSync(indexPath, html, 'utf8');
  return true;
}
