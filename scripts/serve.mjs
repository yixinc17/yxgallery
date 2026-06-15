#!/usr/bin/env node

/**
 * Lightweight static file server with GitHub Pages sub-path simulation.
 *
 * Usage:
 *   npm run dev
 *   BASE_PATH=/my-repo/ PORT=4173 npm run dev
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRepoName } from './utils.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = parseInt(process.env.PORT || '4173', 10);
const HOST = process.env.HOST || '127.0.0.1';

function normalizeBasePath(input) {
  if (!input) return '/';
  let base = input.trim();
  if (!base.startsWith('/')) base = '/' + base;
  if (!base.endsWith('/')) base = base + '/';
  return base;
}

const BASE_PATH = normalizeBasePath(
  process.env.BASE_PATH || `/${getRepoName()}/`
);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
};

function send(res, status, body, contentType) {
  res.writeHead(status, {
    'Content-Type': contentType || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(body);
}

function resolveFile(urlPath) {
  // Strip base path
  let relative = urlPath;
  if (BASE_PATH !== '/' && urlPath.startsWith(BASE_PATH)) {
    relative = urlPath.slice(BASE_PATH.length - 1);
  } else if (BASE_PATH !== '/' && (urlPath === BASE_PATH.slice(0, -1) || urlPath + '/' === BASE_PATH)) {
    relative = '/';
  }

  // Default to index.html for directories
  let filePath = path.join(ROOT, relative);

  if (relative.endsWith('/') || relative === '/') {
    filePath = path.join(filePath, 'index.html');
  }

  // Prevent path traversal
  if (!filePath.startsWith(ROOT)) return null;

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  return filePath;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  // Redirect root without base path to base path home
  if (BASE_PATH !== '/' && (pathname === '/' || pathname === '')) {
    res.writeHead(302, { Location: BASE_PATH });
    res.end();
    return;
  }

  const filePath = resolveFile(pathname);

  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const notFound = path.join(ROOT, '404.html');
    if (fs.existsSync(notFound)) {
      const content = fs.readFileSync(notFound);
      send(res, 404, content, MIME_TYPES['.html']);
    } else {
      send(res, 404, '404 Not Found');
    }
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const content = fs.readFileSync(filePath);
  send(res, 200, content, contentType);
});

server.listen(PORT, HOST, () => {
  const base = BASE_PATH === '/' ? '' : BASE_PATH.replace(/\/$/, '');
  console.log(`
🚀 Artifact Gallery 本地预览

   地址:     http://${HOST}:${PORT}${base}/
   子路径:   ${BASE_PATH}
   根目录:   ${ROOT}

   模拟 GitHub Pages Project Pages 子路径环境。
   可通过环境变量调整:
     BASE_PATH=/your-repo/ PORT=4173 npm run dev

   按 Ctrl+C 停止
`);
});
