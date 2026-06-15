(function () {
  'use strict';

  const VALID_TYPES = ['Slides', 'Document', 'Prototype', 'Demo', 'Website', 'Experiment'];
  const DEFAULT_THUMBNAIL = './assets/images/default-thumbnail.svg';

  const gridEl = document.getElementById('gallery-grid');
  const statusEl = document.getElementById('status-message');
  const searchInput = document.getElementById('search-input');
  const resultCountEl = document.getElementById('result-count');
  const filterButtons = document.querySelectorAll('.filter-btn');

  let allProjects = [];
  let activeType = 'all';
  let searchQuery = '';

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function normalizePath(path) {
    if (!path) return './';
    return path.endsWith('/') ? path : path + '/';
  }

  function showStatus(message, type) {
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.className = 'status-message status-message--' + type;
  }

  function hideStatus() {
    statusEl.hidden = true;
    statusEl.textContent = '';
    statusEl.className = 'status-message';
  }

  function sortByDate(projects) {
    return [...projects].sort((a, b) => {
      const dateA = a.date || '0000-00-00';
      const dateB = b.date || '0000-00-00';
      return dateB.localeCompare(dateA);
    });
  }

  function filterProjects() {
    let filtered = allProjects;

    if (activeType !== 'all') {
      filtered = filtered.filter(function (p) {
        return p.type === activeType;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(function (p) {
        const haystack = [
          p.title,
          p.description,
          p.type,
          ...(p.tags || [])
        ].join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }

    return sortByDate(filtered);
  }

  function viewerUrl(project) {
    return './viewer.html?p=' + encodeURIComponent(project.id);
  }

  function renderCard(project) {
    const path = normalizePath(project.path);
    const viewUrl = viewerUrl(project);
    const thumbnail = project.thumbnail || DEFAULT_THUMBNAIL;
    const tags = (project.tags || []).map(function (tag) {
      return '<li class="card__tag">' + escapeHtml(tag) + '</li>';
    }).join('');

    const featuredClass = project.featured ? ' card--featured' : '';

    return (
      '<article class="card' + featuredClass + '" data-id="' + escapeHtml(project.id) + '">' +
        '<a class="card__thumbnail-link" href="' + escapeHtml(viewUrl) + '" tabindex="-1" aria-hidden="true">' +
          '<img class="card__thumbnail" src="' + escapeHtml(thumbnail) + '" alt="" loading="lazy" ' +
            'onerror="this.onerror=null;this.src=\'' + DEFAULT_THUMBNAIL + '\'">' +
        '</a>' +
        '<div class="card__body">' +
          '<div class="card__meta">' +
            '<span class="card__type">' + escapeHtml(project.type || 'Unknown') + '</span>' +
            '<time class="card__date" datetime="' + escapeHtml(project.date || '') + '">' +
              escapeHtml(project.date || '') +
            '</time>' +
          '</div>' +
          '<h2 class="card__title">' +
            '<a href="' + escapeHtml(viewUrl) + '">' + escapeHtml(project.title) + '</a>' +
          '</h2>' +
          '<p class="card__description">' + escapeHtml(project.description || '') + '</p>' +
          (tags ? '<ul class="card__tags" aria-label="标签">' + tags + '</ul>' : '') +
          '<div class="card__actions">' +
            '<a class="btn btn--primary" href="' + escapeHtml(viewUrl) + '">打开项目</a>' +
            '<a class="btn btn--secondary" href="' + escapeHtml(path) + '" target="_blank" rel="noopener noreferrer">独立打开</a>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function render(projects) {
    hideStatus();

    if (allProjects.length === 0) {
      gridEl.innerHTML = '';
      showStatus('暂无项目。将 Artifact 放入 inbox/ 后运行 npm run import 即可添加。', 'empty');
      resultCountEl.textContent = '';
      return;
    }

    if (projects.length === 0) {
      gridEl.innerHTML = '';
      showStatus('没有符合筛选条件的项目。试试调整类型或搜索关键词。', 'empty');
      resultCountEl.textContent = '显示 0 / ' + allProjects.length + ' 个项目';
      return;
    }

    gridEl.innerHTML = projects.map(renderCard).join('');
    resultCountEl.textContent = '显示 ' + projects.length + ' / ' + allProjects.length + ' 个项目';
  }

  function updateView() {
    render(filterProjects());
  }

  function setActiveFilter(btn) {
    filterButtons.forEach(function (b) {
      const isActive = b === btn;
      b.classList.toggle('is-active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    activeType = btn.dataset.type;
    updateView();
  }

  filterButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setActiveFilter(btn);
    });
  });

  searchInput.addEventListener('input', function () {
    searchQuery = searchInput.value;
    updateView();
  });

  async function loadGallery() {
    showStatus('正在加载项目列表…', 'loading');
    gridEl.innerHTML = '';

    try {
      const response = await fetch('./gallery.json', { cache: 'no-cache' });

      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error('gallery.json 格式无效：期望数组');
      }

      allProjects = sortByDate(data);
      updateView();
    } catch (err) {
      gridEl.innerHTML = '';
      showStatus(
        '无法加载 gallery.json。请确认通过本地服务器（npm run dev）或 GitHub Pages 访问，而非直接打开 file:// 链接。错误：' + err.message,
        'error'
      );
      resultCountEl.textContent = '';
    }
  }

  loadGallery();
})();
