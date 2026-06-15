#!/usr/bin/env node

/**
 * Thumbnail generation: Puppeteer screenshot with SVG placeholder fallback.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { ROOT, VALID_TYPES } from './utils.mjs';

const THUMB_DIR = path.join(ROOT, 'assets', 'thumbnails');
const VIEWPORT = { width: 1280, height: 800 };
const WAIT_MS = parseInt(process.env.THUMB_WAIT_MS || '2000', 10);

const TYPE_COLORS = {
  Slides: { bg: '#fef3c7', accent: '#f59e0b', text: '#92400e' },
  Document: { bg: '#f1f5f9', accent: '#64748b', text: '#334155' },
  Prototype: { bg: '#ede9fe', accent: '#8b5cf6', text: '#5b21b6' },
  Demo: { bg: '#ecfdf5', accent: '#10b981', text: '#065f46' },
  Website: { bg: '#eff6ff', accent: '#3b82f6', text: '#1e40af' },
  Experiment: { bg: '#fce7f3', accent: '#ec4899', text: '#9d174d' },
};

export function thumbnailRelPath(slug, ext = 'png') {
  return `./assets/thumbnails/${slug}.${ext}`;
}

export function thumbnailAbsPath(slug, ext = 'png') {
  return path.join(THUMB_DIR, `${slug}.${ext}`);
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLines(text, maxChars = 28) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function generatePlaceholderSvg({ slug, title, type = 'Document' }) {
  const colors = TYPE_COLORS[type] || TYPE_COLORS.Document;
  const lines = wrapLines(title || slug);
  const lineEls = lines
    .map((line, i) => {
      const y = 200 + i * 36;
      return `<text x="320" y="${y}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" font-weight="600" fill="${colors.text}">${escapeXml(line)}</text>`;
    })
    .join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" role="img" aria-label="${escapeXml(title || slug)}">
  <rect width="640" height="400" fill="${colors.bg}"/>
  <rect x="40" y="40" width="560" height="320" rx="16" fill="#fff" opacity="0.6"/>
  <rect x="40" y="320" width="120" height="32" rx="16" fill="${colors.accent}"/>
  <text x="100" y="342" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#fff">${escapeXml(type)}</text>
  ${lineEls}
</svg>
`;
}

export function writePlaceholder({ slug, title, type }) {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
  const svgPath = thumbnailAbsPath(slug, 'svg');
  fs.writeFileSync(svgPath, generatePlaceholderSvg({ slug, title, type }), 'utf8');
  return { path: svgPath, rel: thumbnailRelPath(slug, 'svg'), method: 'placeholder' };
}

function createProjectServer(projectDir) {
  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.normalize(path.join(projectDir, urlPath.slice(1)));
    if (!filePath.startsWith(projectDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(fs.readFileSync(filePath));
  });
}

function startServer(server) {
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
    server.on('error', reject);
  });
}

async function loadPuppeteer() {
  try {
    const mod = await import('puppeteer');
    return mod.default;
  } catch {
    return null;
  }
}

export async function captureScreenshot({ slug, projectDir, timeout = 30000 }) {
  const puppeteer = await loadPuppeteer();
  if (!puppeteer) {
    return { ok: false, reason: 'puppeteer 未安装，运行 npm install 后重试' };
  }

  const indexPath = path.join(projectDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return { ok: false, reason: '缺少 index.html' };
  }

  fs.mkdirSync(THUMB_DIR, { recursive: true });
  const outPath = thumbnailAbsPath(slug, 'png');

  const server = createProjectServer(projectDir);
  let browser;

  try {
    const { port } = await startServer(server);
    const url = `http://127.0.0.1:${port}/`;

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout,
    });

    // 等待动画 / p5.js 初始化
    await new Promise((r) => setTimeout(r, WAIT_MS));

    await page.screenshot({
      path: outPath,
      type: 'png',
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: Math.min(VIEWPORT.height, 800) },
    });

    return { ok: true, path: outPath, rel: thumbnailRelPath(slug, 'png'), method: 'screenshot' };
  } catch (err) {
    return { ok: false, reason: err.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await new Promise((r) => server.close(r));
  }
}

/**
 * Try screenshot first, fall back to SVG placeholder.
 */
export async function ensureThumbnail({ slug, title, type, projectDir, preferScreenshot = true }) {
  if (preferScreenshot) {
    const result = await captureScreenshot({ slug, projectDir });
    if (result.ok) return result;
    console.warn(`   ⚠️  截图失败 (${result.reason})，改用 SVG 占位图`);
  }

  return writePlaceholder({ slug, title, type });
}

export function updateGalleryThumbnail(slug, thumbnailRel) {
  const galleryPath = path.join(ROOT, 'gallery.json');
  const gallery = JSON.parse(fs.readFileSync(galleryPath, 'utf8'));
  const entry = gallery.find((e) => e.id === slug);
  if (entry) {
    entry.thumbnail = thumbnailRel;
    fs.writeFileSync(galleryPath, JSON.stringify(gallery, null, 2) + '\n', 'utf8');
  }
  return entry;
}

export { VALID_TYPES, TYPE_COLORS };
