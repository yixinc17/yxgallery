(function () {
  'use strict';

  const SLUG_PATTERN = /^[a-z0-9-]+$/;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('p');

  const frame = document.getElementById('viewer-frame');
  const titleEl = document.getElementById('viewer-title');
  const directLink = document.getElementById('viewer-direct');
  const errorEl = document.getElementById('viewer-error');

  function showError() {
    frame.hidden = true;
    errorEl.hidden = false;
    titleEl.textContent = '项目不存在';
    document.title = '项目不存在 — Yixin\'s Gallery';
  }

  if (!slug || !SLUG_PATTERN.test(slug)) {
    showError();
    return;
  }

  const projectUrl = './projects/' + slug + '/';
  frame.src = projectUrl;
  directLink.href = projectUrl;

  fetch('./gallery.json', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error('fetch failed');
      return res.json();
    })
    .then(function (data) {
      const project = data.find(function (p) { return p.id === slug; });
      if (project) {
        titleEl.textContent = project.title;
        document.title = project.title + ' — Yixin\'s Gallery';
      } else {
        titleEl.textContent = slug;
        document.title = slug + ' — Yixin\'s Gallery';
      }
    })
    .catch(function () {
      titleEl.textContent = slug;
      document.title = slug + ' — Yixin\'s Gallery';
    });

  frame.addEventListener('error', showError);
})();
