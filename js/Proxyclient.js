(function() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
  } else {
    document.documentElement.classList.add('light');
    document.documentElement.classList.remove('dark');
  }
})();

tailwind.config = {
  darkMode: 'class',
  important: '#client-list-app-root',
  corePlugins: {
    preflight: false,
  }
}

tailwind.config = {
  darkMode: 'class',
  important: '#client-list-app-root',
  corePlugins: {
    preflight: false,
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const platformSelect = document.getElementById('platform-select');
  const searchInput = document.getElementById('search-input');
  const visibleCountSpan = document.getElementById('visible-count');
  const activeBadge = document.getElementById('active-badge');
  const clientRows = document.querySelectorAll('.client-row');

  const downloadModal = document.getElementById('download-modal');
  const modalCard = document.getElementById('modal-card');
  const modalCloseX = document.getElementById('modal-close-x');
  const modalClientName = document.getElementById('modal-client-name');
  const modalClientDesc = document.getElementById('modal-client-desc');
  const modalClientBadges = document.getElementById('modal-client-badges');
  
  const modalLoadingState = document.getElementById('modal-loading-state');
  const modalErrorState = document.getElementById('modal-error-state');
  const modalErrorMsg = document.getElementById('modal-error-msg');
  const modalFallbackBtn = document.getElementById('modal-fallback-btn');
  const modalLoadedState = document.getElementById('modal-loaded-state');

  const modalReleasesSubtitle = document.getElementById('modal-releases-subtitle');
  const modalReleaseBtn = document.getElementById('modal-release-btn');
  const modalReleaseMenu = document.getElementById('modal-release-menu');
  const modalReleaseText = document.getElementById('modal-release-text');
  const releaseMenuSearch = document.getElementById('release-menu-search');
  const releaseMenuItems = document.getElementById('release-menu-items');

  const releaseNotesTag = document.getElementById('release-notes-tag');
  const releaseNotesContent = document.getElementById('release-notes-content');

  const assetSearchInput = document.getElementById('asset-search-input');
  const assetPlatformSelect = document.getElementById('asset-platform-select');
  const assetsTableWrapper = document.getElementById('assets-table-wrapper');
  const modalScrollBody = document.getElementById('modal-scroll-body');

  let selectedPlatform = 'all';
  let fetchedReleases = [];
  let activeReleaseIndex = 0;
  let needsReleaseScrollReset = false;

  const escapeHTML = (str) => {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
  };

  document.addEventListener('click', () => {
    if (modalReleaseMenu) {
      modalReleaseMenu.classList.add('hidden');
    }
  });

  if (platformSelect) {
    platformSelect.addEventListener('change', () => {
      selectedPlatform = platformSelect.value;
      filterData();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', filterData);
  }

  function filterData() {
    const query = searchInput.value.toLowerCase().trim();
    let visibleCount = 0;

    clientRows.forEach(row => {
      const clientCell = row.cells[0];
      const clientText = clientCell ? clientCell.textContent.toLowerCase() : '';
      const platformCell = row.cells[1];
      const platformText = platformCell ? platformCell.textContent.toLowerCase() : '';
      const interfaceCell = row.cells[2];
      const interfaceText = interfaceCell ? interfaceCell.textContent.toLowerCase() : '';
      const searchDataBlob = [clientText, platformText, interfaceText].join(' ');

      const platformSpans = row.querySelectorAll('.platform-tag');
      const rowPlatforms = Array.from(platformSpans).map(span => span.textContent.trim().toLowerCase());

      const matchesPlatform = (selectedPlatform === 'all') || rowPlatforms.includes(selectedPlatform.toLowerCase());
      const matchesSearch = !query || searchDataBlob.includes(query);

      if (matchesPlatform && matchesSearch) {
        row.style.display = '';
        visibleCount++;
      } else {
        row.style.display = 'none';
      }
    });

    visibleCountSpan.textContent = visibleCount;

    if (selectedPlatform === 'all') {
      activeBadge.classList.add('hidden');
    } else {
      activeBadge.classList.remove('hidden');
      activeBadge.textContent = selectedPlatform;
    }
  }

  const viewDownloadButtons = document.querySelectorAll('.view-download-btn');

  viewDownloadButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();

      document.body.style.overflow = 'hidden';
      needsReleaseScrollReset = true;

      if (modalScrollBody) modalScrollBody.scrollTop = 0;
      if (assetsTableWrapper) assetsTableWrapper.scrollLeft = 0;

      assetSearchInput.value = '';
      assetPlatformSelect.value = 'all';

      downloadModal.classList.remove('opacity-0', 'pointer-events-none');
      downloadModal.classList.add('opacity-100', 'pointer-events-auto');
      modalCard.classList.remove('scale-95', 'opacity-0');
      modalCard.classList.add('scale-100', 'opacity-100');

      modalLoadingState.classList.remove('hidden');
      modalLoadedState.classList.add('hidden');
      modalErrorState.classList.add('hidden');

      const repoPath = btn.getAttribute('data-repo');
      const clientName = btn.getAttribute('data-name');
      const clientDesc = btn.getAttribute('data-desc');

      const activeRow = btn.closest('tr');
      const rowBadgeContainers = activeRow.cells[0].querySelectorAll('span');
      modalClientBadges.innerHTML = '';
      rowBadgeContainers.forEach(span => {
        modalClientBadges.appendChild(span.cloneNode(true));
      });

      modalClientName.textContent = clientName;
      modalClientDesc.textContent = clientDesc;
      modalReleasesSubtitle.innerHTML = `${escapeHTML(repoPath)} · 获取中...`;
      modalFallbackBtn.href = `https://github.com/${repoPath}/releases`;

      try {
        const response = await fetch(`https://api.github.com/repos/${repoPath}/releases`);
        if (!response.ok) throw new Error(`HTTP 异常！状态码: ${response.status}`);
        
        fetchedReleases = await response.json();
        if (fetchedReleases.length === 0) throw new Error('仓库没有发布任何 Release 版本。');

        modalLoadingState.classList.add('hidden');
        modalLoadedState.classList.remove('hidden');
        modalReleasesSubtitle.innerHTML = `${escapeHTML(repoPath)} · ${fetchedReleases.length} 个版本`;

        activeReleaseIndex = 0;
        buildReleaseMenu();
        renderSelectedRelease();

        if (modalScrollBody) modalScrollBody.scrollTop = 0;
        if (assetsTableWrapper) assetsTableWrapper.scrollLeft = 0;

      } catch (err) {
        modalLoadingState.classList.add('hidden');
        modalErrorState.classList.remove('hidden');
        modalErrorMsg.textContent = `在获取实时资产列表时发生错误。错误信息: ${err.message}`;
      }
    });
  });

  function closeModal() {
    document.body.style.overflow = '';
    downloadModal.classList.remove('opacity-100', 'pointer-events-auto');
    downloadModal.classList.add('opacity-0', 'pointer-events-none');
    modalCard.classList.remove('scale-100', 'opacity-100');
    modalCard.classList.add('scale-95', 'opacity-0');
  }

  if (modalCloseX) modalCloseX.addEventListener('click', closeModal);
  if (downloadModal) {
    downloadModal.addEventListener('click', (e) => {
      if (e.target === downloadModal) closeModal();
    });
  }

  if (modalReleaseBtn) {
    modalReleaseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      modalReleaseMenu.classList.toggle('hidden');
      if (!modalReleaseMenu.classList.contains('hidden')) {
        if (needsReleaseScrollReset) {
          releaseMenuItems.scrollTop = 0; 
          releaseMenuSearch.value = ''; 
          buildReleaseMenu(); 
          needsReleaseScrollReset = false; 
        }
        setTimeout(() => {
          releaseMenuSearch.focus();
        }, 50);
      }
    });
  }

  if (releaseMenuSearch) {
    releaseMenuSearch.addEventListener('click', (e) => e.stopPropagation());
    releaseMenuSearch.addEventListener('input', () => {
      buildReleaseMenu(releaseMenuSearch.value.trim().toLowerCase());
    });
  }

  function buildReleaseMenu(query = '') {
    releaseMenuItems.innerHTML = '';
    fetchedReleases.forEach((rel, index) => {
      const tagName = rel.tag_name;
      const relName = rel.name || rel.tag_name;
      const fullText = `${tagName} · ${relName}`.toLowerCase();

      if (query && !fullText.includes(query)) {
        return;
      }

      const btn = document.createElement('button');
      const isSelected = (index === activeReleaseIndex);
      btn.className = `w-full text-left px-4 py-2.5 rounded-lg flex items-center justify-between gap-4 border-b border-slate-50 dark:border-slate-800/40 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all duration-150 ${isSelected ? 'bg-slate-100 dark:bg-slate-800 font-medium text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`;
      
      const date = new Date(rel.published_at);
      const formattedDate = date.toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).replace(/\//g, '/');

      btn.innerHTML = `
        <div class="space-y-0.5 truncate flex-1 pointer-events-none">
          <p class="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">${tagName} · ${relName}</p>
          <p class="text-xs text-slate-400 dark:text-slate-500 font-normal">${formattedDate} · ${rel.assets.length} 个文件</p>
        </div>
        <span class="check-mark iconify i-lucide-check text-slate-900 dark:text-slate-100 size-4 shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}"></span>
      `;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeReleaseIndex = index;

        const allButtons = releaseMenuItems.querySelectorAll('button');
        allButtons.forEach((btnEl, btnIndex) => {
          const check = btnEl.querySelector('.check-mark');
          if (btnIndex === index) {
            check.classList.remove('opacity-0');
            check.classList.add('opacity-100');
            btnEl.classList.add('bg-slate-100', 'dark:bg-slate-800', 'font-medium', 'text-slate-900', 'dark:text-slate-100');
          } else {
            check.classList.remove('opacity-100');
            check.classList.add('opacity-0');
            btnEl.classList.remove('bg-slate-100', 'dark:bg-slate-800', 'font-medium', 'text-slate-900', 'dark:text-slate-100');
          }
        });

        modalReleaseMenu.classList.add('hidden');
        renderSelectedRelease();
      });
      releaseMenuItems.appendChild(btn);
    });
  }

  function renderSelectedRelease() {
    const rel = fetchedReleases[activeReleaseIndex];
    if (!rel) return;

    modalReleaseText.innerHTML = `${escapeHTML(rel.tag_name)} · ${escapeHTML(rel.name || rel.tag_name)}`;
    releaseNotesTag.textContent = rel.tag_name;
    
    if (rel.body) {
      releaseNotesContent.innerHTML = marked.parse(rel.body);
    } else {
      releaseNotesContent.innerHTML = `<p class="text-slate-400 dark:text-slate-500 italic">该版本没有提供详细的版本说明。</p>`;
    }

    renderAssetsTable();
  }

  if (assetSearchInput) assetSearchInput.addEventListener('input', renderAssetsTable);
  if (assetPlatformSelect) assetPlatformSelect.addEventListener('change', renderAssetsTable);

  function renderAssetsTable() {
    const rel = fetchedReleases[activeReleaseIndex];
    if (!rel || !rel.assets) return;

    const tbody = document.getElementById('assets-tbody');
    tbody.innerHTML = '';

    const searchQuery = assetSearchInput.value.toLowerCase().trim();
    const platformFilter = assetPlatformSelect.value;

    const filteredAssets = rel.assets.filter(asset => {
      const name = asset.name.toLowerCase();
      const platform = detectPlatform(asset.name).toLowerCase();
      
      let searchBlob = name + " " + platform;
      if (platform === 'windows') searchBlob += " win setup exe msi pc intel x64 x86 amd64";
      if (platform === 'macos') searchBlob += " mac os osx dmg dmg pkg darwin apple m1 m2 m3 silicon intel";
      if (platform === 'linux') searchBlob += " deb rpm appimage tar gz linux ubuntu arch deepin fedora redhat";
      if (platform === 'android') searchBlob += " apk android phone mobile";

      const matchesSearch = !searchQuery || searchBlob.includes(searchQuery);
      const matchesPlatform = (platformFilter === 'all') || (platform === platformFilter.toLowerCase());

      return matchesSearch && matchesPlatform;
    });

    if (filteredAssets.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-sm text-slate-400 dark:text-slate-500">没有找到匹配的文件资产</td></tr>`;
      return;
    }

    filteredAssets.forEach(asset => {
      const platform = detectPlatform(asset.name);
      const sizeFormatted = formatBytes(asset.size);
      const downloadsText = `${asset.download_count.toLocaleString()} 次`;
      
      const date = new Date(asset.updated_at);
      const dateFormatted = date.toLocaleDateString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });

      const extBadges = getExtensionBadges(asset.name);
      const rawUrl = asset.browser_download_url;
      const proxyUrl = `https://proxy.nbb.qzz.io/${rawUrl}`;

      const tr = document.createElement('tr');
      tr.className = ""; 
      
      tr.innerHTML = `
        <td class="pl-4 pr-16 py-5 text-sm text-highlighted font-semibold max-w-[360px] sm:max-w-[440px] truncate whitespace-nowrap">
          <div class="flex flex-col">
            <span class="truncate" title="${asset.name}">${asset.name}</span>
            <div class="flex flex-wrap gap-1 mt-1">
              ${extBadges}
            </div>
          </div>
        </td>
        <td class="px-4 py-5 text-sm text-muted font-normal whitespace-nowrap">${platform}</td>
        <td class="px-4 py-5 text-sm text-muted font-normal whitespace-nowrap">${sizeFormatted}</td>
        <td class="px-4 py-5 text-sm text-muted font-normal whitespace-nowrap">${downloadsText}</td>
        <td class="px-4 py-5 text-sm text-muted font-normal whitespace-nowrap">${dateFormatted}</td>
        <td class="px-4 py-5 text-sm text-right sticky right-0 bg-default/75 whitespace-nowrap">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="copy-link-btn font-medium inline-flex items-center px-2.5 py-1.5 text-xs gap-1.5 ring ring-inset ring-accented text-default bg-default transition-all duration-200 rounded-lg whitespace-nowrap" data-url="${rawUrl}">
              <span class="iconify i-lucide-copy shrink-0 size-4"></span>拷贝链接
            </button>
            <a href="${proxyUrl}" target="_blank" class="modal-download-btn font-medium inline-flex items-center px-2.5 py-1.5 text-xs gap-1.5 text-inverted bg-primary hover:opacity-80 transition-opacity duration-200 rounded-lg whitespace-nowrap">
              <span class="iconify i-lucide-download shrink-0 size-4"></span>下载
            </a>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  document.getElementById('assets-tbody').addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-link-btn');
    if (copyBtn) {
      const rawUrl = copyBtn.getAttribute('data-url');
      const proxyUrl = `https://proxy.nbb.qzz.io/${rawUrl}`;
      
      navigator.clipboard.writeText(proxyUrl).then(() => {
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `<span class="iconify i-lucide-check shrink-0 size-4 text-emerald-600 dark:text-emerald-400"></span>已复制`;
        copyBtn.classList.add('text-emerald-600', 'dark:text-emerald-400', 'ring-emerald-200', 'dark:ring-emerald-800/50');
        
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
          copyBtn.classList.remove('text-emerald-600', 'dark:text-emerald-400', 'ring-emerald-200', 'dark:ring-emerald-800/50');
        }, 1500);
      }).catch(err => {
        console.error('复制失败:', err);
      });
    }
  });

  function detectPlatform(filename) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.apk') || lower.includes('android')) return 'Android';
    if (lower.endsWith('.exe') || lower.includes('win') || lower.includes('setup')) return 'Windows';
    if (lower.endsWith('.dmg') || lower.endsWith('.pkg') || lower.includes('mac') || lower.includes('darwin')) return 'macOS';
    if (lower.endsWith('.deb') || lower.endsWith('.rpm') || lower.endsWith('.appimage') || lower.includes('linux') || lower.includes('ubuntu')) return 'Linux';
    return '其它';
  }

  function getExtensionBadges(filename) {
    const badges = [];
    const lower = filename.toLowerCase();
    
    if (lower.includes('arm64') || lower.includes('aarch64')) {
      badges.push(`<span class="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded">arm64</span>`);
    } else if (lower.includes('x64') || lower.includes('amd64') || lower.includes('x86_64')) {
      badges.push(`<span class="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded">x64</span>`);
    } else if (lower.includes('x86') || lower.includes('i385')) {
      badges.push(`<span class="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded">x86</span>`);
    }
    
    const ext = filename.split('.').pop();
    if (ext && ext.length < 5) {
      badges.push(`<span class="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded">${ext}</span>`);
    }
    
    return badges.join('');
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
});
