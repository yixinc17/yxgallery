#!/usr/bin/env node

/**
 * One-command publish: import → validate → git commit → optional push
 *
 * Usage:
 *   npm run publish -- inbox/my-project
 *   npm run publish -- inbox/eye-demo --update
 *   npm run publish -- inbox/eye-demo --auto --push
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, toKebabCase, readGallery } from './utils.mjs';

const IMPORT_FLAGS = new Set([
  '--slug',
  '--title',
  '--description',
  '--type',
  '--tags',
  '--date',
  '--thumbnail',
  '--featured',
  '--move',
  '--no-thumbnail',
  '--placeholder-only',
]);

function parseArgs(argv) {
  const args = {
    input: null,
    update: false,
    auto: false,
    push: false,
    message: null,
    help: false,
    importArgs: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--update') {
      args.update = true;
    } else if (arg === '--auto') {
      args.auto = true;
    } else if (arg === '--push') {
      args.push = true;
    } else if (arg === '--message' || arg === '-m') {
      args.message = argv[++i];
    } else if (IMPORT_FLAGS.has(arg)) {
      args.importArgs.push(arg);
      if (arg !== '--featured' && argv[i + 1] && !argv[i + 1].startsWith('-')) {
        args.importArgs.push(argv[++i]);
      }
    } else if (!arg.startsWith('-')) {
      args.input = arg;
    } else {
      console.error(`未知参数: ${arg}`);
      process.exit(1);
    }
  }

  return args;
}

function printHelp() {
  console.log(`
Artifact Gallery — Publish

一键：import → validate → git commit →（可选）push

Usage:
  npm run publish -- <inbox-path> [options]

模式:
  （默认）    新项目导入；若 projects/{slug}/ 已存在则报错
  --update    明确更新已有项目（覆盖 projects/{slug}/）
  --auto      自动判断：存在则更新，不存在则新建

Git:
  --push      commit 后推送到 origin/main（默认不 push）
  -m, --message <text>  自定义 commit 信息

其余参数会传给 import（--title、--type、--tags 等）:

Examples:
  npm run publish -- inbox/my-new-demo --type Demo
  npm run publish -- inbox/eye-demo --update -m "update: eye-demo"
  npm run publish -- inbox/eye-demo --auto --push
  npm run publish -- inbox/report.html --title "Weekly Notes" --type Document
`);
}

function runNode(script, scriptArgs, label) {
  console.log(`\n▶ ${label}\n`);
  const result = spawnSync(process.execPath, [script, ...scriptArgs], {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(`\n❌ 失败: ${label}`);
    process.exit(result.status || 1);
  }
}

function runGit(args, label) {
  console.log(`\n▶ ${label}\n`);
  const result = spawnSync('git', args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.error?.code === 'ENOENT') {
    console.error('❌ 未找到 git 命令');
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n❌ 失败: ${label}`);
    process.exit(result.status || 1);
  }
}

function resolveInputPath(input) {
  const abs = path.isAbsolute(input) ? input : path.resolve(ROOT, input);
  if (!fs.existsSync(abs)) {
    throw new Error(`输入路径不存在: ${input}`);
  }
  return abs;
}

function inferSlug(inputPath, importArgs) {
  const slugIdx = importArgs.indexOf('--slug');
  if (slugIdx !== -1 && importArgs[slugIdx + 1]) {
    return toKebabCase(importArgs[slugIdx + 1]);
  }
  return toKebabCase(path.basename(inputPath));
}

function projectExists(slug) {
  const destDir = path.join(ROOT, 'projects', slug);
  const inGallery = readGallery().some((e) => e.id === slug);
  return fs.existsSync(destDir) || inGallery;
}

function defaultCommitMessage({ slug, isUpdate, title }) {
  const name = title || slug;
  return isUpdate ? `update: ${name}` : `add: ${name}`;
}

function inferTitleFromArgs(importArgs, slug) {
  const idx = importArgs.indexOf('--title');
  if (idx !== -1 && importArgs[idx + 1]) return importArgs[idx + 1];

  const projectDir = path.join(ROOT, 'projects', slug);
  const indexPath = path.join(projectDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, 'utf8');
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match) return match[1].trim();
  }

  return slug;
}

function collectGitPaths(slug) {
  const paths = ['gallery.json', `projects/${slug}`];

  const thumbDir = path.join(ROOT, 'assets', 'thumbnails');
  if (fs.existsSync(thumbDir)) {
    for (const file of fs.readdirSync(thumbDir)) {
      if (file.startsWith(slug + '.')) {
        paths.push(`assets/thumbnails/${file}`);
      }
    }
  }

  return paths;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.input) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = resolveInputPath(args.input);
  const slug = inferSlug(inputPath, args.importArgs);
  const exists = projectExists(slug);

  let isUpdate = args.update;

  if (args.auto) {
    isUpdate = exists;
    console.log(exists ? `\n🔄 --auto: 检测到已有项目 "${slug}"，按更新处理` : `\n✨ --auto: 新项目 "${slug}"`);
  } else if (exists && !args.update) {
    console.error(`\n❌ 项目已存在: projects/${slug}/`);
    console.error('   若要更新，请加上 --update 或 --auto');
    process.exit(1);
  } else if (!exists && args.update) {
    console.log(`\nℹ️  项目不存在，按新导入处理`);
    isUpdate = false;
  }

  const importArgs = [path.relative(ROOT, inputPath), ...args.importArgs];
  if (isUpdate) importArgs.push('--update');

  console.log('\n🚀 Artifact Gallery — Publish\n');
  console.log(`   输入: ${path.relative(ROOT, inputPath)}`);
  console.log(`   Slug: ${slug}`);
  console.log(`   模式: ${isUpdate ? '更新' : '新建'}`);

  runNode(path.join(ROOT, 'scripts/import-artifact.mjs'), importArgs, 'import');

  // macOS .DS_Store 会导致 validate 失败
  spawnSync('find', [path.join(ROOT, 'projects', slug), '-name', '.DS_Store', '-delete'], {
    cwd: ROOT,
    stdio: 'ignore',
  });

  runNode(path.join(ROOT, 'scripts/validate-gallery.mjs'), [], 'validate');

  const status = spawnSync('git', ['status', '--porcelain'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if (!status.stdout.trim()) {
    console.log('\n✅ 没有需要提交的改动（可能内容与线上一致）');
    if (args.push) {
      console.log('   跳过 commit，仍尝试 push…');
      runGit(['push', 'origin', 'main'], 'git push');
    }
    console.log('');
    return;
  }

  const gitPaths = collectGitPaths(slug);
  runGit(['add', ...gitPaths], `git add ${gitPaths.join(' ')}`);

  const title = inferTitleFromArgs(args.importArgs, slug);
  const commitMessage = args.message || defaultCommitMessage({ slug, isUpdate, title });

  runGit(['commit', '-m', commitMessage], `git commit -m "${commitMessage}"`);

  if (args.push) {
    runGit(['push', 'origin', 'main'], 'git push');
  } else {
    console.log('\n💡 未推送。若要发布到 GitHub Pages，请运行:');
    console.log('   git push origin main');
    console.log('   或下次加上 --push');
  }

  console.log('\n✅ Publish 完成\n');
}

try {
  main();
} catch (err) {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
}
