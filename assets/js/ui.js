  /* ── Right Panel & Bar Buttons ── */
  const rightPanel = document.getElementById('right-panel');
  const btnNowPlaying = document.getElementById('btn-now-playing');
  btnNowPlaying.style.color = 'var(--accent)'; // Set initial active color

  btnNowPlaying.addEventListener('click', () => {
    const isHidden = rightPanel.style.display === 'none';
    rightPanel.style.display = isHidden ? 'flex' : 'none';
    btnNowPlaying.style.color = isHidden ? 'var(--accent)' : 'var(--text-secondary)';
  });
  document.getElementById('btn-close-rp').addEventListener('click', () => {
    rightPanel.style.display = 'none';
    btnNowPlaying.style.color = 'var(--text-secondary)';
  });
  document.getElementById('btn-queue')?.addEventListener('click', () => {
    showView('queue');
  });
  document.getElementById('btn-pb-add-playlist').addEventListener('click', () => {
    if (S.currentTrack) showAddToPlaylistModal(S.currentTrack);
    else showToast('No track playing', 'error');
  });

  /* ═══════════════════════════════════════
     PLAYLISTS
     ═══════════════════════════════════════ */
  async function loadPlaylists() {
    S.playlists = await ipcRenderer.invoke('read-playlists');
    renderSidebarPlaylists();
  }

  async function savePlaylists() {
    await ipcRenderer.invoke('write-playlists', S.playlists);
    renderSidebarPlaylists();
  }

  function ensureLikedSongsPlaylist() {
    if (!S.playlists) S.playlists = [];
    let liked = S.playlists.find(p => p.id === 'liked_songs' || p.isLiked);
    if (!liked) {
      liked = {
        id: 'liked_songs',
        name: 'Liked Songs',
        isLiked: true,
        tracks: []
      };
      S.playlists.unshift(liked);
      savePlaylists();
    }
    return liked;
  }
  window.ensureLikedSongsPlaylist = ensureLikedSongsPlaylist;
  window.savePlaylists = savePlaylists;

  let libSortMode = localStorage.getItem('mockify-lib-sort') || 'recents'; // 'recents', 'alphabetical', 'creator'
  let libGridMode = localStorage.getItem('mockify-lib-grid') === 'true';

  function renderSidebarPlaylists() {
    ensureLikedSongsPlaylist();

    const container = document.getElementById('sidebar-playlists');
    if (container) {
      container.innerHTML = S.playlists.map(p => `
        <div class="playlist-list-item" data-pid="${p.id}">
          ${p.isLiked ? '<svg viewBox="0 0 24 24" style="fill:#1ed760;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>' : SVG.playlist}
          <span>${esc(p.name)}</span>
        </div>
      `).join('');
      container.querySelectorAll('.playlist-list-item').forEach(el => {
        el.addEventListener('click', () => {
          const pl = S.playlists.find(p => p.id === el.dataset.pid);
          if (pl) openPlaylist(pl);
        });
      });
    }

    renderLibraryView();
  }

  function renderLibraryView() {
    const libContainer = document.getElementById('library-items-list');
    if (!libContainer) return;

    ensureLikedSongsPlaylist();

    const liked = S.playlists.find(p => p.id === 'liked_songs' || p.isLiked);
    const otherPlaylists = S.playlists.filter(p => p.id !== 'liked_songs' && !p.isLiked);

    // Sorting
    let sortedPlaylists = [...otherPlaylists];
    if (libSortMode === 'alphabetical') {
      sortedPlaylists.sort((a, b) => a.name.localeCompare(b.name));
    } else if (libSortMode === 'recents') {
      sortedPlaylists.reverse();
    }

    const sortLabel = document.getElementById('lib-sort-label');
    if (sortLabel) {
      sortLabel.textContent = libSortMode === 'alphabetical' ? 'Alphabetical' : 'Recently added';
    }

    libContainer.className = 'library-items-list' + (libGridMode ? ' grid-mode' : '');

    const likedCount = liked && liked.tracks ? liked.tracks.length : 0;

    let html = `
      <div class="lib-item-card" data-pid="${liked.id}">
        <div class="lib-item-thumb lib-liked-cover">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </div>
        <div class="lib-item-info">
          <div class="lib-item-title">Liked Songs</div>
          <div class="lib-item-subtitle">
            <span class="lib-pin-badge">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M16 9V4l1 0c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1l1 0v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/></svg>
              Pinned
            </span>
            <span>&bull;</span>
            <span>Playlist &bull; ${likedCount} song${likedCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    `;

    html += sortedPlaylists.map(p => {
      const count = p.tracks ? p.tracks.length : 0;
      const thumb = (p.tracks && p.tracks[0] && p.tracks[0].thumbnail) 
        ? `<img src="${p.tracks[0].thumbnail}" style="width:100%;height:100%;object-fit:cover;" alt="" />`
        : `<svg viewBox="0 0 24 24" width="24" height="24" fill="var(--text-muted)"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>`;

      return `
        <div class="lib-item-card" data-pid="${p.id}">
          <div class="lib-item-thumb">
            ${thumb}
          </div>
          <div class="lib-item-info">
            <div class="lib-item-title">${esc(p.name)}</div>
            <div class="lib-item-subtitle">
              <span>Playlist &bull; ${count} track${count !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    libContainer.innerHTML = html;

    libContainer.querySelectorAll('.lib-item-card').forEach(card => {
      card.addEventListener('click', () => {
        const pl = S.playlists.find(p => p.id === card.dataset.pid);
        if (pl) openPlaylist(pl);
      });
    });
  }

  // Bind Library View Buttons
  const libAddBtn = document.getElementById('library-add-btn');
  if (libAddBtn && !libAddBtn._bound) {
    libAddBtn._bound = true;
    libAddBtn.addEventListener('click', openCreatePlaylistDialog);
  }

  const libSortTrigger = document.getElementById('lib-sort-trigger');
  if (libSortTrigger && !libSortTrigger._bound) {
    libSortTrigger._bound = true;
    libSortTrigger.addEventListener('click', () => {
      libSortMode = (libSortMode === 'recents') ? 'alphabetical' : 'recents';
      localStorage.setItem('mockify-lib-sort', libSortMode);
      renderLibraryView();
    });
  }

  const libLayoutToggle = document.getElementById('lib-layout-toggle');
  if (libLayoutToggle && !libLayoutToggle._bound) {
    libLayoutToggle._bound = true;
    libLayoutToggle.addEventListener('click', () => {
      libGridMode = !libGridMode;
      localStorage.setItem('mockify-lib-grid', libGridMode);
      renderLibraryView();
    });
  }
  window.renderPlaylists = renderSidebarPlaylists;

  function openPlaylist(pl) {
    S.viewingPlaylist = pl;
    showView('playlist');
    document.querySelectorAll('.playlist-list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.pid === pl.id);
    });
    renderPlaylistDetail();
  }

  let plSearchTerm = '';
  let plSortMode = 'default';

  function renderPlaylistDetail() {
    const pl = S.viewingPlaylist;
    if (!pl) return;
    const container = document.getElementById('playlist-detail');
    let html = `
      <div class="playlist-hero">
        <div class="pl-cover">${SVG.playlist}</div>
        <div class="pl-info" style="width: 100%;">
          <div style="display: flex; align-items: center;">
            <h1 id="pl-title-display">${esc(pl.name)}</h1>
            <input type="text" id="pl-title-input" class="edit-name" value="${esc(pl.name)}" style="display: none;" />
            <button class="pl-edit-btn" id="pl-edit-name-btn" title="Edit name">${SVG.edit}</button>
          </div>
          <p id="pl-track-count">${pl.tracks.length} track${pl.tracks.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div class="playlist-actions pl-toolbar">
        <div class="pl-toolbar-left">
          <button class="pl-play-btn" id="pl-play-all" title="Play All">${SVG.play}</button>
          <button class="pl-delete-btn" id="pl-delete" title="Delete Playlist">${SVG.trash}</button>
        </div>
        <div class="pl-toolbar-right">
          <div style="position: relative; display: flex; align-items: center;">
             <span style="position: absolute; left: 10px; width:16px; height:16px; fill:var(--text-muted);">${SVG.search}</span>
             <input type="text" id="pl-search-input" class="pl-search" placeholder="Search in playlist" value="${esc(plSearchTerm)}" />
          </div>
          <select id="pl-sort-select" class="pl-sort">
            <option value="default" ${plSortMode === 'default' ? 'selected' : ''}>Custom Order</option>
            <option value="title" ${plSortMode === 'title' ? 'selected' : ''}>Title</option>
            <option value="artist" ${plSortMode === 'artist' ? 'selected' : ''}>Artist</option>
          </select>
        </div>
      </div>
      <div id="pl-tracks-container"></div>
    `;
    container.innerHTML = html;

    const tracksContainer = document.getElementById('pl-tracks-container');
    
    function renderTracks() {
      let tracks = [...pl.tracks];
      
      if (plSearchTerm) {
        const lowerTerm = plSearchTerm.toLowerCase();
        tracks = tracks.filter(t => t.title.toLowerCase().includes(lowerTerm) || t.artist.toLowerCase().includes(lowerTerm));
      }
      
      if (plSortMode === 'title') {
        tracks.sort((a, b) => a.title.localeCompare(b.title));
      } else if (plSortMode === 'artist') {
        tracks.sort((a, b) => a.artist.localeCompare(b.artist));
      }

      if (tracks.length === 0) {
        tracksContainer.innerHTML = '<div class="empty-state"><h3>No tracks found</h3><p>Try adjusting your search</p></div>';
      } else {
        tracksContainer.innerHTML = '<div class="track-list">' + tracks.map((t, i) => trackRow(t, i + 1, 'playlist')).join('') + '</div>';
        bindTrackRowEvents(tracksContainer, tracks);
        updateTrackRowHighlights();
        
        tracksContainer.querySelectorAll('.act-playlist').forEach(btn => {
          btn.title = 'Remove from playlist';
          btn.innerHTML = SVG.remove;
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const track = pl.tracks.find(t => String(t.id) === String(btn.dataset.id));
            const trackTitle = track ? track.title : 'this track';
            confirmAction({
              title: 'Remove Track',
              message: `Are you sure you want to remove "${trackTitle}" from "${pl.name}"?`,
              actionText: 'Remove',
              onConfirm: () => {
                pl.tracks = pl.tracks.filter(t => String(t.id) !== String(btn.dataset.id));
                savePlaylists();
                renderPlaylistDetail(); 
                showToast('Removed from playlist');
              }
            });
          });
        });

        if (plSortMode === 'default' && !plSearchTerm) {
          let dragSrcEl = null;
          tracksContainer.querySelectorAll('.track-row').forEach(row => {
             row.addEventListener('dragstart', function(e) {
                dragSrcEl = this;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', this.dataset.id);
                this.classList.add('dragging');
             });
             row.addEventListener('dragover', function(e) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                this.classList.add('drag-over');
                return false;
             });
             row.addEventListener('dragleave', function(e) {
                this.classList.remove('drag-over');
             });
             row.addEventListener('dragend', function(e) {
                this.classList.remove('dragging');
                tracksContainer.querySelectorAll('.track-row').forEach(r => r.classList.remove('drag-over'));
             });
             row.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.remove('drag-over');
                if (dragSrcEl && dragSrcEl !== this) {
                   const srcId = dragSrcEl.dataset.id;
                   const targetId = this.dataset.id;
                   const srcIdx = pl.tracks.findIndex(t => String(t.id) === String(srcId));
                   const targetIdx = pl.tracks.findIndex(t => String(t.id) === String(targetId));
                   if (srcIdx !== -1 && targetIdx !== -1) {
                      const [removed] = pl.tracks.splice(srcIdx, 1);
                      pl.tracks.splice(targetIdx, 0, removed);
                      savePlaylists();
                      renderTracks();
                   }
                }
                return false;
             });
          });
        }
      }
    }

    renderTracks();

    const titleDisplay = document.getElementById('pl-title-display');
    const titleInput = document.getElementById('pl-title-input');
    const editBtn = document.getElementById('pl-edit-name-btn');
    
    editBtn.addEventListener('click', () => {
       titleDisplay.style.display = 'none';
       titleInput.style.display = 'block';
       titleInput.focus();
    });
    
    titleInput.addEventListener('blur', saveTitle);
    titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveTitle(); });
    
    function saveTitle() {
       const newName = titleInput.value.trim();
       if (newName && newName !== pl.name) {
          pl.name = newName;
          savePlaylists();
          renderSidebarPlaylists();
       } else {
          titleInput.value = pl.name;
       }
       titleDisplay.textContent = pl.name;
       titleDisplay.style.display = 'block';
       titleInput.style.display = 'none';
    }

    document.getElementById('pl-search-input').addEventListener('input', e => {
      plSearchTerm = e.target.value;
      renderTracks();
    });

    document.getElementById('pl-sort-select').addEventListener('change', e => {
      plSortMode = e.target.value;
      renderTracks();
    });

    document.getElementById('pl-play-all')?.addEventListener('click', () => {
      if (pl.tracks.length === 0) return;
      S.queue = pl.tracks.map(t => ({ ...t }));
      S.queueIndex = 0;
      playTrack(S.queue[0], false);
      showToast(`Playing "${pl.name}"`);
    });

    document.getElementById('pl-delete')?.addEventListener('click', () => {
      confirmAction({
        title: 'Delete Playlist',
        message: `Are you sure you want to delete "${pl.name}"? This action cannot be undone.`,
        actionText: 'Delete',
        onConfirm: () => {
          S.playlists = S.playlists.filter(p => p.id !== pl.id);
          savePlaylists();
          showView('home');
          showToast(`Deleted "${pl.name}"`);
        }
      });
    });
  }

  /* ── Create playlist modal ── */
  function openCreatePlaylistDialog() {
    showModal(`
      <h2>Create Playlist</h2>
      <input type="text" id="new-pl-name" placeholder="Playlist name" autofocus />
      <div class="modal-actions">
        <button class="modal-btn secondary" id="modal-cancel">Cancel</button>
        <button class="modal-btn primary" id="modal-create">Create</button>
      </div>
    `);
    document.getElementById('modal-cancel').addEventListener('click', hideModal);
    document.getElementById('modal-create').addEventListener('click', () => {
      const name = document.getElementById('new-pl-name').value.trim();
      if (!name) return;
      const pl = { id: 'pl_' + Date.now(), name, tracks: [] };
      S.playlists.push(pl);
      savePlaylists();
      hideModal();
      openPlaylist(pl);
      showToast('Created playlist: ' + name);
    });
  }

  document.getElementById('create-playlist-btn')?.addEventListener('click', openCreatePlaylistDialog);
  document.getElementById('mobile-create-playlist-btn')?.addEventListener('click', openCreatePlaylistDialog);

  document.getElementById('tb-brand-home')?.addEventListener('click', () => {
    showView('home');
  });

  document.getElementById('home-settings-btn')?.addEventListener('click', () => {
    if (typeof showView === 'function') showView('settings');
  });


  /* ── Add to playlist modal ── */
  function showAddToPlaylistModal(track) {
    if (S.playlists.length === 0) {
      showToast('Create a playlist first', 'error');
      return;
    }
    let html = '<h2>Add to Playlist</h2><div class="playlist-pick-list">';
    html += S.playlists.map(p => `<div class="playlist-pick-item" data-pid="${p.id}">${esc(p.name)}</div>`).join('');
    html += '</div><div class="modal-actions"><button class="modal-btn secondary" id="modal-cancel">Cancel</button></div>';
    showModal(html);
    document.getElementById('modal-cancel').addEventListener('click', hideModal);
    document.querySelectorAll('.playlist-pick-item').forEach(el => {
      el.addEventListener('click', () => {
        const pl = S.playlists.find(p => p.id === el.dataset.pid);
        if (pl) {
          if (pl.tracks.some(t => t.id === track.id)) {
            showToast('Already in this playlist');
          } else {
            pl.tracks.push({ id: track.id, title: track.title, artist: track.artist, thumbnail: track.thumbnail, duration: track.duration });
            savePlaylists();
            showToast(`Added to "${pl.name}"`);
          }
        }
        hideModal();
      });
    });
  }

  /* ── Modal ── */
  function showModal(html) {
    document.getElementById('modal').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('visible');
  }
  function hideModal() {
    document.getElementById('modal-overlay').classList.remove('visible');
  }
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) hideModal();
  });
  window.showAddToPlaylistModal = showAddToPlaylistModal;
  window.showModal = showModal;
  window.hideModal = hideModal;

  /* ═══════════════════════════════════════
     SETTINGS
     ═══════════════════════════════════════ */
  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16) || 220;
    const g = parseInt(hex.slice(3, 5), 16) || 20;
    const b = parseInt(hex.slice(5, 7), 16) || 60;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function applyAccentColor(hex) {
    document.documentElement.style.setProperty('--accent', hex);
    document.documentElement.style.setProperty('--accent-hover', hex);
    document.documentElement.style.setProperty('--accent-dim', hexToRgba(hex, 0.15));
    document.documentElement.style.setProperty('--accent-glow', hexToRgba(hex, 0.38));
  }

  let lastBuiltStarColor = null;
  function applyCustomizationSettings(forceRebuildSprites = false) {
    const textColor = document.getElementById('setting-text-color')?.value || '#ffffff';
    const textSecColor = document.getElementById('setting-text-sec-color')?.value || '#a7a7a7';
    const appFont = document.getElementById('setting-app-font')?.value || "'Inter', sans-serif";
    const starColor = document.getElementById('setting-space-star-color')?.value || '#ffffff';
    const cometColor = document.getElementById('setting-space-comet-color')?.value || '#00f3ff';
    const bgColor = document.getElementById('setting-space-bg-color')?.value || '#0e1830';

    document.documentElement.style.setProperty('--text-primary', textColor);
    document.documentElement.style.setProperty('--text-secondary', textSecColor);
    document.documentElement.style.setProperty('--app-font', appFont);
    document.body.style.fontFamily = appFont;

    const spaceBgEl = document.getElementById('space-bg');
    if (spaceBgEl) {
      const bR = parseInt(bgColor.slice(1, 3), 16) || 14;
      const bG = parseInt(bgColor.slice(3, 5), 16) || 24;
      const bB = parseInt(bgColor.slice(5, 7), 16) || 48;
      const midStop = `rgb(${Math.round(bR * 0.12)}, ${Math.round(bG * 0.12)}, ${Math.round(bB * 0.12)})`;
      const outerStop = `rgb(${Math.round(bR * 0.04)}, ${Math.round(bG * 0.04)}, ${Math.round(bB * 0.04)})`;
      spaceBgEl.style.background = `radial-gradient(ellipse at 50% 15%, ${bgColor} 0%, ${midStop} 65%, ${outerStop} 100%)`;
    }

    // Sync pill swatches & hex badges
    ['setting-accent', 'setting-text-color', 'setting-text-sec-color', 'setting-space-star-color', 'setting-space-comet-color', 'setting-space-bg-color'].forEach(id => {
      const val = document.getElementById(id)?.value;
      const preview = document.getElementById('preview-' + id);
      const hexLabel = document.getElementById('hex-' + id);
      if (val && preview) preview.style.background = val;
      if (val && hexLabel) hexLabel.textContent = val.toUpperCase();
    });

    S.settings.textColor = textColor;
    S.settings.textSecColor = textSecColor;
    S.settings.appFont = appFont;
    S.settings.spaceStarColor = starColor;
    S.settings.spaceCometColor = cometColor;
    S.settings.spaceBgColor = bgColor;
    if (window._rebuildStarSprites && (forceRebuildSprites || lastBuiltStarColor !== starColor)) {
      lastBuiltStarColor = starColor;
      window._rebuildStarSprites(forceRebuildSprites);
    }
  }

  let isSettingsLoaded = false;

  async function loadSettings() {
    S.settings = (await ipcRenderer.invoke('read-settings')) || S.settings || {};
    const savedAccent = S.settings.accent || '#DC143C';
    const accentEl = document.getElementById('setting-accent');
    if (accentEl) accentEl.value = savedAccent;
    applyAccentColor(savedAccent);

    // Lyrics Settings
    if (S.settings.lyricSize !== undefined && document.getElementById('setting-lyric-size')) document.getElementById('setting-lyric-size').value = S.settings.lyricSize;
    if (S.settings.lyricOpacity !== undefined && document.getElementById('setting-lyric-opacity')) document.getElementById('setting-lyric-opacity').value = S.settings.lyricOpacity;
    if (S.settings.lyricAlign && document.getElementById('setting-lyric-align')) document.getElementById('setting-lyric-align').value = S.settings.lyricAlign;
    if (S.settings.lyricFont && document.getElementById('setting-lyric-font')) document.getElementById('setting-lyric-font').value = S.settings.lyricFont;
    if (S.settings.lyricStyle && document.getElementById('setting-lyric-style')) document.getElementById('setting-lyric-style').value = S.settings.lyricStyle;
    if (S.settings.lyricGlow && document.getElementById('setting-lyric-glow')) document.getElementById('setting-lyric-glow').value = S.settings.lyricGlow;
    applyLyricsSettings();

    const toastsEl = document.getElementById('setting-toasts');
    if (toastsEl) toastsEl.checked = S.settings.showToasts !== false;

    S.settings.coverSpin = S.settings.coverSpin !== undefined ? S.settings.coverSpin : true;
    const coverSpinEl = document.getElementById('setting-cover-spin');
    if (coverSpinEl) coverSpinEl.checked = S.settings.coverSpin;

    // Starry Space Settings - default to true and sanitize ranges
    S.settings.spaceBg = S.settings.spaceBg !== undefined ? S.settings.spaceBg : true;
    const spaceBgEl = document.getElementById('setting-space-bg');
    if (spaceBgEl) spaceBgEl.checked = S.settings.spaceBg;

    if (!S.settings.spaceBrightness || S.settings.spaceBrightness < 20) S.settings.spaceBrightness = 60;
    if (!S.settings.spaceSize || S.settings.spaceSize < 5) S.settings.spaceSize = 10;
    if (!S.settings.spaceDensity || S.settings.spaceDensity < 100) S.settings.spaceDensity = 300;
    if (S.settings.spaceComets === undefined || typeof S.settings.spaceComets !== 'number') S.settings.spaceComets = 5;

    if (document.getElementById('setting-space-brightness')) document.getElementById('setting-space-brightness').value = S.settings.spaceBrightness;
    if (document.getElementById('setting-space-size')) document.getElementById('setting-space-size').value = S.settings.spaceSize;
    if (document.getElementById('setting-space-density')) document.getElementById('setting-space-density').value = S.settings.spaceDensity;
    if (document.getElementById('setting-space-comets')) document.getElementById('setting-space-comets').value = S.settings.spaceComets;

    if (S.settings.textColor && document.getElementById('setting-text-color')) document.getElementById('setting-text-color').value = S.settings.textColor;
    if (S.settings.textSecColor && document.getElementById('setting-text-sec-color')) document.getElementById('setting-text-sec-color').value = S.settings.textSecColor;
    if (S.settings.appFont && document.getElementById('setting-app-font')) document.getElementById('setting-app-font').value = S.settings.appFont;
    if (S.settings.spaceStarColor && document.getElementById('setting-space-star-color')) document.getElementById('setting-space-star-color').value = S.settings.spaceStarColor;
    if (S.settings.spaceCometColor && document.getElementById('setting-space-comet-color')) document.getElementById('setting-space-comet-color').value = S.settings.spaceCometColor;
    if (S.settings.spaceBgColor && document.getElementById('setting-space-bg-color')) document.getElementById('setting-space-bg-color').value = S.settings.spaceBgColor;

    applyCustomizationSettings(true);
    applySpaceOptions(false);
    applySpaceBg(S.settings.spaceBg);

    S.settings.confirmDelete = S.settings.confirmDelete !== undefined ? S.settings.confirmDelete : true;
    const confirmDelEl = document.getElementById('setting-confirm-delete');
    if (confirmDelEl) confirmDelEl.checked = S.settings.confirmDelete;

    S.settings.compactMode = S.settings.compactMode !== undefined ? S.settings.compactMode : false;
    const compactModeEl = document.getElementById('setting-compact-mode');
    if (compactModeEl) compactModeEl.checked = S.settings.compactMode;
    if (S.settings.compactMode) document.body.classList.add('compact-mode');
    updatePlayBtn();

    if (S.settings.volume !== undefined) {
      S.volume = S.settings.volume;
      if (volSlider) volSlider.value = S.volume;
    }
    if (S.settings.muted !== undefined) {
      S.muted = S.settings.muted;
    }
    updateVolume();

    // Populate Backend API Server Settings
    const backendUrlInput = document.getElementById('setting-backend-url');
    const passcodeEl = document.getElementById('setting-passcode');

    isSettingsLoaded = true;
  }

  // ── Playback Error Diagnostics Banner ──
  window.showPlaybackErrorBanner = function(msg) {
    const banner = document.getElementById('playback-error-banner');
    const msgEl = document.getElementById('peb-msg');
    if (!banner || !msgEl) return;
    msgEl.textContent = msg;
    banner.style.display = 'flex';
    clearTimeout(window._pebTimeout);
    window._pebTimeout = setTimeout(() => {
      banner.style.display = 'none';
    }, 12000);
  };

  const pebClose = document.getElementById('peb-close-btn');
  if (pebClose && !pebClose._bound) {
    pebClose._bound = true;
    pebClose.addEventListener('click', () => {
      const banner = document.getElementById('playback-error-banner');
      if (banner) banner.style.display = 'none';
    });
  }

  const pebSettings = document.getElementById('peb-settings-btn');
  if (pebSettings && !pebSettings._bound) {
    pebSettings._bound = true;
    pebSettings.addEventListener('click', () => {
      const banner = document.getElementById('playback-error-banner');
      if (banner) banner.style.display = 'none';
      if (typeof showView === 'function') showView('settings');
      const input = document.getElementById('setting-backend-url');
      if (input) input.focus();
    });
  }

  let saveSettingsTimer = null;
  function debounceSaveSettings() {
    clearTimeout(saveSettingsTimer);
    saveSettingsTimer = setTimeout(saveSettings, 300);
  }

  function writeSettingsToDisk() {
    if (window.LocalStore) {
      LocalStore.set('settings', S.settings);
    }
    ipcRenderer.invoke('write-settings', S.settings);
  }

  function saveSettings() {
    if (!isSettingsLoaded) return;

    const accentVal = document.getElementById('setting-accent')?.value;
    if (accentVal) S.settings.accent = accentVal;
    S.settings.volume = S.volume;
    S.settings.muted = S.muted;
    const toastsEl = document.getElementById('setting-toasts');
    if (toastsEl) S.settings.showToasts = toastsEl.checked;
    
    const coverSpinEl = document.getElementById('setting-cover-spin');
    if (coverSpinEl) S.settings.coverSpin = coverSpinEl.checked;
    const spaceBgEl = document.getElementById('setting-space-bg');
    if (spaceBgEl) S.settings.spaceBg = spaceBgEl.checked;
    
    const brightEl = document.getElementById('setting-space-brightness');
    if (brightEl) S.settings.spaceBrightness = Number(brightEl.value);
    const sizeEl = document.getElementById('setting-space-size');
    if (sizeEl) S.settings.spaceSize = Number(sizeEl.value);
    const densEl = document.getElementById('setting-space-density');
    if (densEl) S.settings.spaceDensity = Number(densEl.value);
    const comEl = document.getElementById('setting-space-comets');
    if (comEl) S.settings.spaceComets = Number(comEl.value);
    
    const txtEl = document.getElementById('setting-text-color');
    if (txtEl) S.settings.textColor = txtEl.value;
    const txtSecEl = document.getElementById('setting-text-sec-color');
    if (txtSecEl) S.settings.textSecColor = txtSecEl.value;
    const fontEl = document.getElementById('setting-app-font');
    if (fontEl) S.settings.appFont = fontEl.value;
    const starColorEl = document.getElementById('setting-space-star-color');
    if (starColorEl) S.settings.spaceStarColor = starColorEl.value;
    const cometColorEl = document.getElementById('setting-space-comet-color');
    if (cometColorEl) S.settings.spaceCometColor = cometColorEl.value;
    const bgColorEl = document.getElementById('setting-space-bg-color');
    if (bgColorEl) S.settings.spaceBgColor = bgColorEl.value;

    applyCustomizationSettings();
    const confDelEl = document.getElementById('setting-confirm-delete');
    if (confDelEl) S.settings.confirmDelete = confDelEl.checked;
    const compactEl = document.getElementById('setting-compact-mode');
    if (compactEl) S.settings.compactMode = compactEl.checked;
    
    if (S.settings.compactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
    updatePlayBtn();
    localStorage.setItem('mockify-toasts', S.showToasts);

    const lSize = document.getElementById('setting-lyric-size');
    if (lSize) S.settings.lyricSize = lSize.value;
    const lOpac = document.getElementById('setting-lyric-opacity');
    if (lOpac) S.settings.lyricOpacity = lOpac.value;
    const lAlign = document.getElementById('setting-lyric-align');
    if (lAlign) S.settings.lyricAlign = lAlign.value;
    const lFont = document.getElementById('setting-lyric-font');
    if (lFont) S.settings.lyricFont = lFont.value;
    const lStyle = document.getElementById('setting-lyric-style');
    if (lStyle) S.settings.lyricStyle = lStyle.value;
    const lGlow = document.getElementById('setting-lyric-glow');
    if (lGlow) S.settings.lyricGlow = lGlow.value;

    writeSettingsToDisk();
  }

  function applyLyricsSettings() {
    const sizeEl = document.getElementById('setting-lyric-size');
    const opacityEl = document.getElementById('setting-lyric-opacity');
    const size = sizeEl.value;
    const opacity = opacityEl.value;
    const align = document.getElementById('setting-lyric-align').value;
    const font = document.getElementById('setting-lyric-font').value;
    const style = document.getElementById('setting-lyric-style').value;
    const glow = document.getElementById('setting-lyric-glow').value;

    // Update badges
    const badgeSize = document.getElementById('val-lyric-size');
    const badgeOpacity = document.getElementById('val-lyric-opacity');
    if (badgeSize) badgeSize.textContent = size + 'px';
    if (badgeOpacity) badgeOpacity.textContent = opacity + '%';

    // Update slider --fill gradient variable
    const sizePct = ((size - sizeEl.min) / (sizeEl.max - sizeEl.min)) * 100;
    const opacityPct = ((opacity - opacityEl.min) / (opacityEl.max - opacityEl.min)) * 100;
    sizeEl.style.setProperty('--fill', sizePct + '%');
    opacityEl.style.setProperty('--fill', opacityPct + '%');

    document.documentElement.style.setProperty('--lyric-size', size + 'px');
    document.documentElement.style.setProperty('--lyric-opacity', opacity / 100);
    document.documentElement.style.setProperty('--lyric-font', font);
    
    const lc = document.getElementById('lyrics-content');
    // reset classes
    lc.className = 'lyrics-content';
    lc.classList.add('align-' + align, 'style-' + style, 'glow-' + glow);
  }

  async function loadRecent() {
    const saved = await ipcRenderer.invoke('read-recent');
    if (saved && saved.length > 0) {
      S.recent = saved;
    } else {
      S.recent = JSON.parse(localStorage.getItem('mockify-recent') || '[]');
    }
  }

  async function loadQueue() {
    const saved = await ipcRenderer.invoke('read-queue');
    if (saved && saved.queue) {
      S.queue = saved.queue || [];
      S.queueIndex = saved.queueIndex !== undefined ? saved.queueIndex : -1;
      if (S.queueIndex >= 0 && S.queue[S.queueIndex]) {
        S.currentTrack = S.queue[S.queueIndex];
        updatePlayerBar();
      }
    }
  }

  function saveQueue() {
    ipcRenderer.invoke('write-queue', { queue: S.queue, queueIndex: S.queueIndex });
  }

  document.getElementById('setting-quality')?.addEventListener('change', e => {
    S.settings.quality = e.target.value;
    saveSettings();
    showToast('Quality set to ' + e.target.value);
  });

  document.getElementById('setting-accent').addEventListener('input', e => {
    applyAccentColor(e.target.value);
  });

  document.getElementById('setting-accent').addEventListener('change', e => {
    S.settings.accent = e.target.value;
    saveSettings();
  });

  document.getElementById('setting-toasts')?.addEventListener('change', e => {
    S.showToasts = e.target.checked;
    saveSettings();
  });

  document.getElementById('setting-cover-spin').addEventListener('change', e => {
    S.settings.coverSpin = e.target.checked;
    saveSettings();
    if (typeof window.updatePlayBtn === 'function') window.updatePlayBtn();
    showToast(S.settings.coverSpin ? 'Cover spin enabled' : 'Cover spin disabled');
  });

  function applySpaceOptions(reinit = false) {
    const brightnessEl = document.getElementById('setting-space-brightness');
    const sizeEl = document.getElementById('setting-space-size');
    const densityEl = document.getElementById('setting-space-density');
    const cometsEl = document.getElementById('setting-space-comets');
    if (!brightnessEl || !sizeEl || !densityEl || !cometsEl) return;

    const bVal = brightnessEl.value;
    const sVal = sizeEl.value;
    const dVal = densityEl.value;
    const cVal = cometsEl.value;

    const badgeB = document.getElementById('val-space-brightness');
    const badgeS = document.getElementById('val-space-size');
    const badgeD = document.getElementById('val-space-density');
    const badgeC = document.getElementById('val-space-comets');
    if (badgeB) badgeB.textContent = bVal + '%';
    if (badgeS) badgeS.textContent = (sVal / 10).toFixed(1) + 'x';
    if (badgeD) badgeD.textContent = dVal;
    if (badgeC) badgeC.textContent = cVal === '0' ? 'Off' : cVal + 'x';

    brightnessEl.style.setProperty('--fill', (((bVal - brightnessEl.min) / (brightnessEl.max - brightnessEl.min)) * 100) + '%');
    sizeEl.style.setProperty('--fill', (((sVal - sizeEl.min) / (sizeEl.max - sizeEl.min)) * 100) + '%');
    densityEl.style.setProperty('--fill', (((dVal - densityEl.min) / (densityEl.max - densityEl.min)) * 100) + '%');
    cometsEl.style.setProperty('--fill', (((cVal - cometsEl.min) / (cometsEl.max - cometsEl.min)) * 100) + '%');

    S.settings.spaceBrightness = Number(bVal);
    S.settings.spaceSize = Number(sVal);
    S.settings.spaceDensity = Number(dVal);
    S.settings.spaceComets = Number(cVal);

    if (reinit && window._reinitStars) {
      window._reinitStars();
    }
  }

  const spaceBrightEl = document.getElementById('setting-space-brightness');
  if (spaceBrightEl) {
    spaceBrightEl.addEventListener('input', () => applySpaceOptions(false));
    spaceBrightEl.addEventListener('change', () => {
      applySpaceOptions(false);
      saveSettings();
    });
  }

  const spaceCometEl = document.getElementById('setting-space-comets');
  if (spaceCometEl) {
    spaceCometEl.addEventListener('input', () => applySpaceOptions(false));
    spaceCometEl.addEventListener('change', () => {
      applySpaceOptions(false);
      saveSettings();
    });
  }

  const spaceSizeEl = document.getElementById('setting-space-size');
  if (spaceSizeEl) {
    spaceSizeEl.addEventListener('input', () => applySpaceOptions(false));
    spaceSizeEl.addEventListener('change', () => {
      applySpaceOptions(true);
      saveSettings();
    });
  }

  const spaceDensityEl = document.getElementById('setting-space-density');
  if (spaceDensityEl) {
    spaceDensityEl.addEventListener('input', () => applySpaceOptions(false));
    spaceDensityEl.addEventListener('change', () => {
      applySpaceOptions(true);
      saveSettings();
    });
  }

  ['setting-text-color', 'setting-text-sec-color', 'setting-app-font', 'setting-space-star-color', 'setting-space-comet-color', 'setting-space-bg-color'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        applyCustomizationSettings();
      });
      el.addEventListener('change', () => {
        applyCustomizationSettings();
        saveSettings();
      });
    }
  });

  const btnResetColors = document.getElementById('btn-reset-colors');
  if (btnResetColors) {
    btnResetColors.addEventListener('click', () => {
      document.getElementById('setting-accent').value = '#DC143C';
      document.getElementById('setting-text-color').value = '#ffffff';
      document.getElementById('setting-text-sec-color').value = '#a7a7a7';
      document.getElementById('setting-app-font').value = "'Outfit', sans-serif";
      document.getElementById('setting-space-star-color').value = '#ffffff';
      document.getElementById('setting-space-comet-color').value = '#00f3ff';
      document.getElementById('setting-space-bg-color').value = '#0e1830';
      applyAccentColor('#DC143C');
      applyCustomizationSettings();
      saveSettings();
      showToast('Colors & typography reset to default');
    });
  }

  const btnResetLyrics = document.getElementById('btn-reset-lyrics');
  if (btnResetLyrics) {
    btnResetLyrics.addEventListener('click', () => {
      document.getElementById('setting-lyric-size').value = '38';
      document.getElementById('setting-lyric-align').value = 'center';
      document.getElementById('setting-lyric-font').value = "'Inter', sans-serif";
      document.getElementById('setting-lyric-style').value = 'accent';
      document.getElementById('setting-lyric-glow').value = 'normal';
      document.getElementById('setting-lyric-opacity').value = '20';
      applyLyricsSettings();
      saveSettings();
      showToast('Lyrics settings reset to default');
    });
  }

  /* ═══════════════════════════════════════
     INTERACTIVE RADIAL COLOR WHEEL POPUP
     ═══════════════════════════════════════ */
  const cwPopover = document.getElementById('color-wheel-popover');
  const cwCanvas = document.getElementById('cw-canvas');
  const cwCursor = document.getElementById('cw-cursor');
  const cwTitle = document.getElementById('cw-title');
  const cwClose = document.getElementById('cw-close');
  const cwLightness = document.getElementById('cw-lightness');
  const cwHexInput = document.getElementById('cw-hex-input');

  let activeColorTargetId = null;
  let currentHue = 0;
  let currentSat = 100;

  function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  }

  function hexToHsl(hex) {
    if (!hex || hex[0] !== '#') hex = '#FFFFFF';
    let clean = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    let r = parseInt(clean.slice(1, 3), 16) / 255 || 0;
    let g = parseInt(clean.slice(3, 5), 16) / 255 || 0;
    let b = parseInt(clean.slice(5, 7), 16) / 255 || 0;
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function drawWheelCanvas() {
    if (!cwCanvas) return;
    const ctx = cwCanvas.getContext('2d');
    const radius = cwCanvas.width / 2;
    const toRad = Math.PI / 180;
    ctx.clearRect(0, 0, cwCanvas.width, cwCanvas.height);

    for (let angle = 0; angle < 360; angle += 1) {
      const startAngle = (angle - 1) * toRad;
      const endAngle = (angle + 1) * toRad;
      ctx.beginPath();
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius, startAngle, endAngle);
      ctx.closePath();

      const grad = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, `hsl(${angle}, 100%, 50%)`);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }
  drawWheelCanvas();

  function positionWheelCursor(hue, sat) {
    if (!cwCursor) return;
    const cx = 80;
    const cy = 80;
    const maxR = 72; // Keeps 14px cursor dot (radius 7px) fully inside the 80px circle
    const r = maxR * (Math.min(100, Math.max(0, sat)) / 100);
    const rad = (hue || 0) * (Math.PI / 180);
    const px = Math.round(cx + r * Math.cos(rad));
    const py = Math.round(cy + r * Math.sin(rad));
    cwCursor.style.left = px + 'px';
    cwCursor.style.top = py + 'px';
  }

  function updateColorTarget(id, hex, isLiveDrag = false) {
    const preview = document.getElementById('preview-' + id);
    const hexLabel = document.getElementById('hex-' + id);
    const input = document.getElementById(id);
    if (preview) preview.style.background = hex;
    if (hexLabel) hexLabel.textContent = hex.toUpperCase();
    if (input) input.value = hex;

    if (isLiveDrag) {
      if (id === 'setting-accent') {
        applyAccentColor(hex);
      } else if (id === 'setting-text-color') {
        document.documentElement.style.setProperty('--text-primary', hex);
        S.settings.textColor = hex;
      } else if (id === 'setting-text-sec-color') {
        document.documentElement.style.setProperty('--text-secondary', hex);
        S.settings.textSecColor = hex;
      } else if (id === 'setting-space-comet-color') {
        S.settings.spaceCometColor = hex;
      } else if (id === 'setting-space-star-color') {
        S.settings.spaceStarColor = hex;
      } else if (id === 'setting-space-bg-color') {
        S.settings.spaceBgColor = hex;
        const spaceBgEl = document.getElementById('space-bg');
        if (spaceBgEl) {
          const bR = parseInt(hex.slice(1, 3), 16) || 14;
          const bG = parseInt(hex.slice(3, 5), 16) || 24;
          const bB = parseInt(hex.slice(5, 7), 16) || 48;
          const midStop = `rgb(${Math.round(bR * 0.12)}, ${Math.round(bG * 0.12)}, ${Math.round(bB * 0.12)})`;
          const outerStop = `rgb(${Math.round(bR * 0.04)}, ${Math.round(bG * 0.04)}, ${Math.round(bB * 0.04)})`;
          spaceBgEl.style.background = `radial-gradient(ellipse at 50% 15%, ${hex} 0%, ${midStop} 65%, ${outerStop} 100%)`;
        }
      }
    } else {
      if (id === 'setting-accent') {
        applyAccentColor(hex);
      } else {
        applyCustomizationSettings(id === 'setting-space-star-color');
      }
    }
  }

  function setWheelColor(hex, fireEvents = true, isLiveDrag = false) {
    const hsl = hexToHsl(hex);
    currentHue = hsl.h;
    currentSat = hsl.s;
    if (cwLightness && !isLiveDrag) cwLightness.value = hsl.l;
    if (cwHexInput) cwHexInput.value = hex.toUpperCase();

    positionWheelCursor(currentHue, currentSat);

    if (activeColorTargetId && fireEvents) {
      updateColorTarget(activeColorTargetId, hex, isLiveDrag);
    }
  }

  // Open Popover on trigger click
  document.querySelectorAll('.color-picker-trigger').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      activeColorTargetId = pill.dataset.target;
      const title = pill.dataset.title || 'Select Color';
      const hiddenInput = document.getElementById(activeColorTargetId);
      const curHex = hiddenInput ? hiddenInput.value : '#FFFFFF';

      if (cwTitle) cwTitle.textContent = title;
      if (cwPopover) cwPopover.classList.add('visible');
      setWheelColor(curHex, false, false);
    });
  });

  // Dragging & Picking on canvas with unified Pointer Events (mouse, touch, pen)
  let isDraggingWheel = false;
  let pendingWheelRaf = null;
  let latestWheelEvent = null;

  function pickColorFromWheelEvent(e, isLiveDrag = false) {
    if (!cwCanvas) return;
    const rect = cwCanvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : cx);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : cy);
    const x = clientX - rect.left - cx;
    const y = clientY - rect.top - cy;

    let rad = Math.atan2(y, x);
    let deg = Math.round(rad * (180 / Math.PI));
    if (deg < 0) deg += 360;

    let dist = Math.sqrt(x * x + y * y);
    let sat = Math.min(100, Math.round((dist / cx) * 100));

    currentHue = deg;
    currentSat = sat;

    const lightness = Number(cwLightness ? cwLightness.value : 50);
    const hex = hslToHex(currentHue, currentSat, lightness);
    setWheelColor(hex, true, isLiveDrag);
  }

  function processWheelMove() {
    pendingWheelRaf = null;
    if (!isDraggingWheel || !latestWheelEvent) return;
    pickColorFromWheelEvent(latestWheelEvent, true);
  }

  function handleWheelMove(e) {
    latestWheelEvent = e;
    if (!pendingWheelRaf) {
      pendingWheelRaf = requestAnimationFrame(processWheelMove);
    }
  }

  const handlePointerEnd = (e) => {
    if (isDraggingWheel) {
      isDraggingWheel = false;
      if (pendingWheelRaf) {
        cancelAnimationFrame(pendingWheelRaf);
        pendingWheelRaf = null;
      }
      try {
        if (e && e.pointerId && cwContainer) cwContainer.releasePointerCapture(e.pointerId);
      } catch (_) {}
      const curHex = hslToHex(currentHue, currentSat, Number(cwLightness ? cwLightness.value : 50));
      updateColorTarget(activeColorTargetId, curHex, false);
      saveSettings();
    }
  };

  const cwContainer = document.getElementById('cw-wheel-container');
  if (cwContainer) {
    if (window.PointerEvent) {
      cwContainer.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { cwContainer.setPointerCapture(e.pointerId); } catch (_) {}
        isDraggingWheel = true;
        pickColorFromWheelEvent(e, true);
      });

      cwContainer.addEventListener('pointermove', (e) => {
        if (isDraggingWheel) {
          e.preventDefault();
          handleWheelMove(e);
        }
      });

      cwContainer.addEventListener('pointerup', handlePointerEnd);
      cwContainer.addEventListener('pointercancel', handlePointerEnd);
    } else {
      cwContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDraggingWheel = true;
        pickColorFromWheelEvent(e, true);
      }, { passive: false });

      cwContainer.addEventListener('touchmove', (e) => {
        if (isDraggingWheel) {
          e.preventDefault();
          handleWheelMove(e);
        }
      }, { passive: false });

      cwContainer.addEventListener('touchend', handlePointerEnd);
    }
  }

  // Lightness Slider Listener
  if (cwLightness) {
    cwLightness.addEventListener('input', () => {
      const hex = hslToHex(currentHue, currentSat, Number(cwLightness.value));
      setWheelColor(hex, true, true);
    });
    cwLightness.addEventListener('change', () => {
      const hex = hslToHex(currentHue, currentSat, Number(cwLightness.value));
      setWheelColor(hex, true, false);
      saveSettings();
    });
  }

  // Hex Text Input Listener
  if (cwHexInput) {
    cwHexInput.addEventListener('input', (e) => {
      const hex = e.target.value.trim();
      if (/^#[0-9A-F]{6}$/i.test(hex)) {
        setWheelColor(hex, true, true);
      }
    });
    cwHexInput.addEventListener('change', (e) => {
      const hex = e.target.value.trim();
      if (/^#[0-9A-F]{6}$/i.test(hex)) {
        setWheelColor(hex, true, false);
        saveSettings();
      }
    });
  }

  // Presets Click Listener
  document.querySelectorAll('.cw-preset-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const presetHex = dot.dataset.color;
      setWheelColor(presetHex, true, false);
      saveSettings();
    });
  });

  // Close button & Outside Click
  if (cwClose) {
    cwClose.addEventListener('click', () => {
      if (cwPopover) cwPopover.classList.remove('visible');
    });
  }
  document.addEventListener('click', (e) => {
    if (cwPopover && cwPopover.classList.contains('visible') && !cwPopover.contains(e.target) && !e.target.closest('.color-picker-trigger')) {
      cwPopover.classList.remove('visible');
    }
  });

  function applySpaceBg(enabled) {
    const optionsDiv = document.getElementById('space-bg-options');
    if (enabled) {
      document.body.classList.add('theme-space-active');
      if (optionsDiv) optionsDiv.style.display = 'block';
      if (window._startSpaceBg) window._startSpaceBg();
    } else {
      document.body.classList.remove('theme-space-active');
      if (optionsDiv) optionsDiv.style.display = 'none';
    }
  }

  document.getElementById('setting-space-bg').addEventListener('change', e => {
    S.settings.spaceBg = e.target.checked;
    applySpaceBg(S.settings.spaceBg);
    saveSettings();
    showToast(S.settings.spaceBg ? 'Starry Space theme enabled' : 'Starry Space theme disabled');
  });

  document.getElementById('setting-confirm-delete').addEventListener('change', e => {
    S.settings.confirmDelete = e.target.checked;
    saveSettings();
    showToast(S.settings.confirmDelete ? 'Delete confirmation enabled' : 'Delete confirmation disabled');
  });

  document.getElementById('setting-compact-mode').addEventListener('change', e => {
    S.settings.compactMode = e.target.checked;
    saveSettings();
    showToast(S.settings.compactMode ? 'Compact mode enabled' : 'Compact mode disabled');
  });

  // Lyric Setting Listeners
  const lyricSettings = ['size', 'opacity', 'align', 'font', 'style', 'glow'];
  lyricSettings.forEach(key => {
    const el = document.getElementById('setting-lyric-' + key);
    if (el) {
      el.addEventListener('input', applyLyricsSettings);
      el.addEventListener('change', () => {
        applyLyricsSettings();
        saveSettings();
      });
    }
  });

  /* ═══════════════════════════════════════
     LYRICS
     ═══════════════════════════════════════ */
  S.lyrics = { lines: [], plain: '' };
  S.lyricsActiveLine = -1;

  const btnLyrics = document.getElementById('btn-lyrics');
  btnLyrics.addEventListener('click', () => {
    if (S.view === 'lyrics') {
      showView('home');
      btnLyrics.classList.remove('active');
    } else {
      showView('lyrics');
      btnLyrics.classList.add('active');
      
      if (!S.currentTrack) {
        document.getElementById('lyrics-content').innerHTML = '<div class="lyrics-placeholder">Play a song to see lyrics</div>';
      } else {
        fetchAndRenderLyrics(S.currentTrack);
      }
    }
  });

  async function fetchAndRenderLyrics(track) {
    if (!track) return;
    const lc = document.getElementById('lyrics-content');
    const mnpLc = document.getElementById('mnp-lyrics-content');

    const viewTrack = document.getElementById('lyrics-view-track');
    const viewArtist = document.getElementById('lyrics-view-artist');
    if (viewTrack) viewTrack.textContent = track.title || 'Now Playing';
    if (viewArtist) viewArtist.textContent = track.artist || '—';

    const mnpSub = document.getElementById('mnp-lyrics-subheading');
    if (mnpSub) mnpSub.textContent = `${track.title} • ${track.artist || ''}`;

    if (track.captions && track.captions.length > 0) {
      S.lyrics = { lines: track.captions.sort((a, b) => a.time - b.time), plain: '' };
      S.lyricsActiveLine = -1;
      renderSyncedLyrics();
      return;
    }

    const loadingHtml = '<div class="lyrics-placeholder">Loading lyrics...</div>';
    if (lc) lc.innerHTML = loadingHtml;
    if (mnpLc) mnpLc.innerHTML = loadingHtml;
    S.lyrics = { lines: [], plain: '' };
    S.lyricsActiveLine = -1;

    try {
      let cleanTitle = track.title
        .replace(/\s*[\(\[][^()\[\]]*(?:feat\.|ft\.|featuring|official|video|audio|lyrics|remastered|hd|4k|visualizer)[^()\[\]]*[\)\]]/gi, '')
        .replace(/\s*(?:feat\.|ft\.|featuring)\s+[^()\[\]]+/gi, '')
        .replace(/\s*-\s*official\s+.*$/i, '')
        .replace(/["']/g, '')
        .trim();
      let cleanArtist = (track.artist || '')
        .replace(/\s*-\s*Topic$/i, '')
        .replace(/VEVO$/i, '')
        .replace(/\s*[\(\[][^()\[\]]*[\)\]]/gi, '')
        .trim();

      let data = await ipcRenderer.invoke('fetch-lyrics', cleanTitle || track.title, cleanArtist);

      if ((!data || data.error) && cleanTitle && cleanTitle !== track.title) {
        data = await ipcRenderer.invoke('fetch-lyrics', track.title, cleanArtist);
      }

      if (!data || data.error) {
        const noLyricsHtml = '<div class="lyrics-placeholder">No captions available for this track.</div>';
        if (lc) lc.innerHTML = noLyricsHtml;
        if (mnpLc) mnpLc.innerHTML = noLyricsHtml;
        return;
      }

      if (data.syncedLyrics) {
        S.lyrics.lines = parseLRC(data.syncedLyrics).sort((a, b) => a.time - b.time);
        renderSyncedLyrics();
      } else if (data.plainLyrics) {
        S.lyrics.plain = data.plainLyrics;
        const linesHtml = data.plainLyrics.split('\n').map(line => 
          `<div class="lyric-line plain">${esc(line) || '&nbsp;'}</div>`
        ).join('');
        if (lc) lc.innerHTML = linesHtml;
        if (mnpLc) mnpLc.innerHTML = linesHtml;
      } else {
        const noLyricsHtml = '<div class="lyrics-placeholder">No captions available for this track.</div>';
        if (lc) lc.innerHTML = noLyricsHtml;
        if (mnpLc) mnpLc.innerHTML = noLyricsHtml;
      }
    } catch (e) {
      console.warn('[lyrics] Render error:', e);
      const errHtml = '<div class="lyrics-placeholder">No captions available for this track.</div>';
      if (lc) lc.innerHTML = errHtml;
      if (mnpLc) mnpLc.innerHTML = errHtml;
    }
  }
  window.fetchAndRenderLyrics = fetchAndRenderLyrics;

  function parseLRC(lrc) {
    const lines = [];
    const regex = /\[(\d+):(\d+\.\d+)\](.*)/g;
    let match;
    while ((match = regex.exec(lrc)) !== null) {
      const min = parseInt(match[1]);
      const sec = parseFloat(match[2]);
      const text = match[3].trim();
      if (text) {
        lines.push({ time: min * 60 + sec, duration: 0, text, words: [] });
      }
    }
    return lines;
  }

  function renderSyncedLyrics() {
    const lc = document.getElementById('lyrics-content');
    const mnpLc = document.getElementById('mnp-lyrics-content');

    if (lc) {
      lc.innerHTML = S.lyrics.lines.map((l, i) => {
        const wordsHtml = (l.words || []).map((w, j) => 
          `<span class="lyric-word" id="lyric-${i}-word-${j}">${esc(w.text)}</span>`
        ).join('');
        const lineClass = (l.words && l.words.length > 0) ? 'lyric-line' : 'lyric-line no-words';
        return `<div class="${lineClass}" id="lyric-${i}">${wordsHtml || esc(l.text)}</div>`;
      }).join('');

      lc.querySelectorAll('.lyric-line').forEach((el, i) => {
        el.addEventListener('click', () => {
          if (audio.src) audio.currentTime = S.lyrics.lines[i].time;
        });
      });
    }

    if (mnpLc) {
      mnpLc.innerHTML = S.lyrics.lines.map((l, i) => {
        return `<div class="lyric-line no-words" id="mnp-lyric-${i}">${esc(l.text)}</div>`;
      }).join('');

      mnpLc.querySelectorAll('.lyric-line').forEach((el, i) => {
        el.addEventListener('click', () => {
          if (audio.src) audio.currentTime = S.lyrics.lines[i].time;
        });
      });
    }
  }

  function updateLyricsSync(currentTime) {
    if (!S.lyrics || !S.lyrics.lines || S.lyrics.lines.length === 0) return;

    // Find active line
    let activeIdx = -1;
    for (let i = 0; i < S.lyrics.lines.length; i++) {
      if (currentTime >= S.lyrics.lines[i].time - 0.2) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== S.lyricsActiveLine) {
      // Clear previous active line
      if (S.lyricsActiveLine >= 0) {
        const oldEl = document.getElementById(`lyric-${S.lyricsActiveLine}`);
        if (oldEl) {
          oldEl.classList.remove('active');
          oldEl.querySelectorAll('.lyric-word').forEach(w => {
            w.classList.add('passed');
            w.classList.remove('active');
          });
        }
        const oldMnpEl = document.getElementById(`mnp-lyric-${S.lyricsActiveLine}`);
        if (oldMnpEl) {
          oldMnpEl.classList.remove('active');
          oldMnpEl.classList.add('passed');
        }
      }

      S.lyricsActiveLine = activeIdx;

      if (activeIdx >= 0) {
        // Mark past lines and future lines
        for (let i = 0; i < activeIdx; i++) {
          const pastEl = document.getElementById(`lyric-${i}`);
          if (pastEl) {
            pastEl.querySelectorAll('.lyric-word').forEach(w => { w.classList.add('passed'); w.classList.remove('active'); });
            pastEl.classList.remove('active');
            pastEl.classList.add('passed');
          }
          const pastMnpEl = document.getElementById(`mnp-lyric-${i}`);
          if (pastMnpEl) {
            pastMnpEl.classList.remove('active');
            pastMnpEl.classList.add('passed');
          }
        }
        for (let i = activeIdx + 1; i < S.lyrics.lines.length; i++) {
          const futEl = document.getElementById(`lyric-${i}`);
          if (futEl) {
            futEl.querySelectorAll('.lyric-word').forEach(w => { w.classList.remove('passed', 'active'); });
            futEl.classList.remove('active', 'passed');
          }
          const futMnpEl = document.getElementById(`mnp-lyric-${i}`);
          if (futMnpEl) {
            futMnpEl.classList.remove('active', 'passed');
          }
        }

        // Active line in main lyrics view
        const newEl = document.getElementById(`lyric-${activeIdx}`);
        if (newEl) {
          newEl.classList.add('active');
          newEl.classList.remove('passed');
          if (S.view === 'lyrics') {
            const container = document.getElementById('lyrics-container');
            if (container) {
              const scrollPos = newEl.offsetTop - container.clientHeight / 2 + newEl.clientHeight / 2;
              container.scrollTo({ top: scrollPos, behavior: 'smooth' });
            }
          }
        }

        // Active line in mobile lyrics drawer
        const newMnpEl = document.getElementById(`mnp-lyric-${activeIdx}`);
        if (newMnpEl) {
          newMnpEl.classList.add('active');
          newMnpEl.classList.remove('passed');
          const mnpBody = document.getElementById('mnp-lyrics-body');
          if (mnpBody) {
            const scrollPos = newMnpEl.offsetTop - mnpBody.clientHeight / 2 + newMnpEl.clientHeight / 2;
            mnpBody.scrollTo({ top: Math.max(0, scrollPos), behavior: 'smooth' });
          }
        }
      }
    }

    if (activeIdx >= 0) {
      const line = S.lyrics.lines[activeIdx];
      if (line && line.words && line.words.length > 0) {
        let activeWordIdx = -1;
        for (let j = 0; j < line.words.length; j++) {
          if (currentTime >= line.words[j].time - 0.05) {
            activeWordIdx = j;
          } else {
            break;
          }
        }

        const lineEl = document.getElementById(`lyric-${activeIdx}`);
        if (lineEl) {
          const wordEls = lineEl.querySelectorAll('.lyric-word');
          wordEls.forEach((w, j) => {
            if (j < activeWordIdx) {
              w.classList.add('passed');
              w.classList.remove('active');
            } else if (j === activeWordIdx) {
              w.classList.add('active');
              w.classList.remove('passed');
            } else {
              w.classList.remove('active', 'passed');
            }
          });
        }
      }
    }
  }
  window.updateLyricsSync = updateLyricsSync;

  /* ═══════════════════════════════════════
     KEYBOARD SHORTCUTS
     ═══════════════════════════════════════ */
  document.addEventListener('keydown', e => {
    // Don't capture when typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (audio.src) S.isPlaying ? audio.pause() : audio.play();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (audio.src) audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (audio.src) audio.currentTime = Math.max(0, audio.currentTime - 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        S.volume = Math.min(100, S.volume + 5);
        volSlider.value = S.volume;
        S.muted = false;
        updateVolume();
        break;
      case 'ArrowDown':
        e.preventDefault();
        S.volume = Math.max(0, S.volume - 5);
        volSlider.value = S.volume;
        S.muted = false;
        updateVolume();
        break;
      case 'KeyN': playNext(); break;
      case 'KeyP': playPrev(); break;
      case 'KeyM':
        S.muted = !S.muted;
        updateVolume();
        break;
    }
  });

  /* ── Panel Resizing ── */
  const sidebar = document.querySelector('.sidebar');
  const resizerLeft = document.getElementById('resizer-left');
  
  const rpElement = document.getElementById('right-panel');
  const resizerRight = document.getElementById('resizer-right');

  let isDraggingLeft = false;
  let isDraggingRight = false;

  resizerLeft.addEventListener('mousedown', () => {
    isDraggingLeft = true;
    resizerLeft.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
  });

  resizerRight.addEventListener('mousedown', () => {
    isDraggingRight = true;
    resizerRight.classList.add('dragging');
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', e => {
    if (isDraggingLeft) {
      const newWidth = Math.min(Math.max(180, e.clientX), 500);
      sidebar.style.width = newWidth + 'px';
      localStorage.setItem('mockify-sidebar-width', newWidth);
    }
    if (isDraggingRight) {
      const rightEdge = document.body.clientWidth;
      const newWidth = Math.min(Math.max(250, rightEdge - e.clientX), 500);
      rpElement.style.width = newWidth + 'px';
      localStorage.setItem('mockify-rp-width', newWidth);
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDraggingLeft || isDraggingRight) {
      isDraggingLeft = false;
      isDraggingRight = false;
      resizerLeft.classList.remove('dragging');
      resizerRight.classList.remove('dragging');
      document.body.style.cursor = '';
    }
  });
  
  // Load saved widths
  const savedSidebar = localStorage.getItem('mockify-sidebar-width');
  if (savedSidebar) sidebar.style.width = savedSidebar + 'px';
  const savedRp = localStorage.getItem('mockify-rp-width');
  if (savedRp) rpElement.style.width = savedRp + 'px';

  ipcRenderer.on('track-extras', (event, data) => {
    // If the currently playing track matches, update the UI
    if (S.currentTrack && S.currentTrack.id === data.id) {
      if (data.channelPfp) {
        S.currentTrack.channelPfp = data.channelPfp;
      }
      if (data.captions) {
        S.currentTrack.captions = data.captions;
      }
      if (data.subCountText) {
        S.currentTrack.subCountText = data.subCountText;
      }
      updatePlayerBar();
      if (S.view === 'lyrics') {
        fetchAndRenderLyrics(S.currentTrack);
      }
    }
    // Update queue to hold the new data
    S.queue.forEach(t => {
      if (t.id === data.id) {
        if (data.channelPfp) t.channelPfp = data.channelPfp;
        if (data.captions) t.captions = data.captions;
        if (data.subCountText) t.subCountText = data.subCountText;
      }
    });
  });

  async function loadLastState() {
    try {
      const state = await ipcRenderer.invoke('read-last-state');
      if (state && state.track) {
        S.currentTrack = state.track;
        if (typeof state.queueIndex === 'number' && state.queueIndex >= 0) {
          S.queueIndex = state.queueIndex;
        }
        updatePlayerBar();
        fetchAndRenderLyrics(state.track);

        const audioSrc = state.track.audioUrl || state.track.src || state.track.url;
        if (audioSrc) {
          S.currentTrack.audioUrl = audioSrc;
          
          const onMeta = () => {
            audio.removeEventListener('loadedmetadata', onMeta);
            if (state.currentTime > 0 && state.currentTime < (audio.duration || 9999)) {
              audio.currentTime = state.currentTime;
              const slider = document.getElementById('progress-slider');
              if (slider) slider.value = state.currentTime;
              const curEl = document.getElementById('time-cur');
              if (curEl) curEl.textContent = fmt(state.currentTime);
              const pct = audio.duration ? (state.currentTime / audio.duration) * 100 : 0;
              if (slider) updateSliderFill(slider, pct);
            }
          };

          audio.addEventListener('loadedmetadata', onMeta);
          audio.src = audioSrc;
        }
      }
    } catch (e) {
      console.log('[Init] Could not restore last track state:', e);
    }
  }

  /* ═══════════════════════════════════════
     STARRY SKY & COMET ENGINE
     ═══════════════════════════════════════ */
  (function initSpaceBg() {
    const canvas = document.getElementById('space-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let width = window.innerWidth;
    let height = window.innerHeight;

    function resizeCanvas() {
      const newDpr = Math.max(1, window.devicePixelRatio || 1);
      const newWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 360;
      const newHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 640;

      const dimsChanged = (width !== newWidth || height !== newHeight || dpr !== newDpr);
      dpr = newDpr;
      width = newWidth;
      height = newHeight;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      if (dimsChanged || stars.length === 0) {
        initStars();
      }
    }

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', () => {
      setTimeout(resizeCanvas, 150);
    });

    function hexToRgb(hex) {
      if (!hex || hex[0] !== '#') return { r: 255, g: 255, b: 255 };
      const clean = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
      const r = parseInt(clean.slice(1, 3), 16) || 255;
      const g = parseInt(clean.slice(3, 5), 16) || 255;
      const b = parseInt(clean.slice(5, 7), 16) || 255;
      return { r, g, b };
    }

    // Natural stellar color palette (Astronavigation temperature classes)
    const STAR_TEMPS = [
      { id: 'diamond', r: 255, g: 255, b: 255, weight: 0.38 }, // Pure Diamond White (Class A - Sirius/Vega)
      { id: 'ice', r: 214, g: 234, b: 255, weight: 0.26 },     // Ice / Electric Blue (Class O/B - Rigel/Spica)
      { id: 'gold', r: 255, g: 242, b: 215, weight: 0.20 },    // Pale Amber / Solar Gold (Class F/G - Sol/Capella)
      { id: 'peach', r: 255, g: 214, b: 178, weight: 0.10 },   // Warm Sunset Peach (Class K - Arcturus/Aldebaran)
      { id: 'lavender', r: 236, g: 220, b: 255, weight: 0.06 } // Radiant Nebula Lavender (Pleiades reflection)
    ];

    function pickStarColor() {
      const rand = Math.random();
      let accum = 0;
      for (let i = 0; i < STAR_TEMPS.length; i++) {
        accum += STAR_TEMPS[i].weight;
        if (rand <= accum) return STAR_TEMPS[i];
      }
      return STAR_TEMPS[0];
    }

    /* ── Offscreen Star Sprite Caching ── */
    function createOffscreenCanvas(w, h) {
      if (typeof OffscreenCanvas !== 'undefined') {
        try {
          return new OffscreenCanvas(w, h);
        } catch (e) {}
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      return c;
    }

    // Cache holding pre-baked high-res offscreen canvas sprites for each star class
    let starSpriteCache = {};

    function drawTaperedRayDirect(rayCtx, cx, cy, len, halfWidth, angle, rgb) {
      rayCtx.save();
      rayCtx.translate(cx, cy);
      rayCtx.rotate(angle);

      rayCtx.beginPath();
      rayCtx.moveTo(-len, 0);
      rayCtx.lineTo(0, -halfWidth);
      rayCtx.lineTo(len, 0);
      rayCtx.lineTo(0, halfWidth);
      rayCtx.closePath();

      const rayGrad = rayCtx.createLinearGradient(-len, 0, len, 0);
      rayGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      rayGrad.addColorStop(0.35, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
      rayGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
      rayGrad.addColorStop(0.65, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      rayCtx.fillStyle = rayGrad;
      rayCtx.fill();
      rayCtx.restore();
    }

    let lastBuiltStarHex = null;
    function assignStarSprites() {
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const cacheEntry = starSpriteCache[s.tempId] || starSpriteCache['diamond'];
        if (!cacheEntry) continue;
        if (s.type === 'brilliant') s.sprite = cacheEntry.brilliant;
        else if (s.type === 'luminous') s.sprite = cacheEntry.luminous;
        else if (s.type === 'field') s.sprite = cacheEntry.field;
        s.deepColorStyle = `rgba(${cacheEntry.color.r}, ${cacheEntry.color.g}, ${cacheEntry.color.b}, 0.9)`;
      }
    }

    function buildStarSprites(force = false) {
      const userStarHex = S.settings.spaceStarColor || '#ffffff';
      if (!force && lastBuiltStarHex === userStarHex && Object.keys(starSpriteCache).length > 0) {
        assignStarSprites();
        return;
      }
      lastBuiltStarHex = userStarHex;
      starSpriteCache = {};
      const userStarRgb = hexToRgb(userStarHex);
      const isCustomStarColor = userStarHex.toLowerCase() !== '#ffffff';

      STAR_TEMPS.forEach(temp => {
        const starColor = isCustomStarColor ? {
          r: Math.round((temp.r / 255) * userStarRgb.r),
          g: Math.round((temp.g / 255) * userStarRgb.g),
          b: Math.round((temp.b / 255) * userStarRgb.b)
        } : { r: temp.r, g: temp.g, b: temp.b };

        // 1. Brilliant star sprite (128 x 128 px, center at 64, 64)
        const bCanvas = createOffscreenCanvas(128, 128);
        const bCtx = bCanvas.getContext('2d');
        const bCx = 64;
        const bCy = 64;

        // Luminous Gaussian corona
        const corona = bCtx.createRadialGradient(bCx, bCy, 0, bCx, bCy, 38);
        corona.addColorStop(0, `rgba(${starColor.r}, ${starColor.g}, ${starColor.b}, 0.6)`);
        corona.addColorStop(0.35, `rgba(${starColor.r}, ${starColor.g}, ${starColor.b}, 0.25)`);
        corona.addColorStop(0.75, `rgba(${starColor.r}, ${starColor.g}, ${starColor.b}, 0.07)`);
        corona.addColorStop(1, 'rgba(0, 0, 0, 0)');
        bCtx.beginPath();
        bCtx.arc(bCx, bCy, 38, 0, Math.PI * 2);
        bCtx.fillStyle = corona;
        bCtx.fill();

        // Primary 4-point tapered optical diffraction spikes
        const rayLen = 54;
        const rayW = 3.8;
        drawTaperedRayDirect(bCtx, bCx, bCy, rayLen, rayW, 0, starColor);
        drawTaperedRayDirect(bCtx, bCx, bCy, rayLen, rayW, Math.PI / 2, starColor);

        // Secondary 45° delicate micro-glints
        const diagLen = rayLen * 0.42;
        const diagW = rayW * 0.52;
        drawTaperedRayDirect(bCtx, bCx, bCy, diagLen, diagW, Math.PI / 4, starColor);
        drawTaperedRayDirect(bCtx, bCx, bCy, diagLen, diagW, -Math.PI / 4, starColor);

        // Brilliant white nucleus core
        bCtx.beginPath();
        bCtx.arc(bCx, bCy, 4.5, 0, Math.PI * 2);
        bCtx.fillStyle = 'rgba(255, 255, 255, 1)';
        bCtx.fill();

        // 2. Luminous star sprite (64 x 64 px, center at 32, 32)
        const lCanvas = createOffscreenCanvas(64, 64);
        const lCtx = lCanvas.getContext('2d');
        const lCx = 32;
        const lCy = 32;

        const halo = lCtx.createRadialGradient(lCx, lCy, 0, lCx, lCy, 26);
        halo.addColorStop(0, `rgba(${starColor.r}, ${starColor.g}, ${starColor.b}, 0.45)`);
        halo.addColorStop(0.5, `rgba(${starColor.r}, ${starColor.g}, ${starColor.b}, 0.15)`);
        halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
        lCtx.beginPath();
        lCtx.arc(lCx, lCy, 26, 0, Math.PI * 2);
        lCtx.fillStyle = halo;
        lCtx.fill();

        lCtx.beginPath();
        lCtx.arc(lCx, lCy, 5.5, 0, Math.PI * 2);
        lCtx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        lCtx.fill();

        // 3. Field star sprite (32 x 32 px, center at 16, 16)
        const fCanvas = createOffscreenCanvas(32, 32);
        const fCtx = fCanvas.getContext('2d');
        const fCx = 16;
        const fCy = 16;

        const glow = fCtx.createRadialGradient(fCx, fCy, 0, fCx, fCy, 13);
        glow.addColorStop(0, `rgba(${starColor.r}, ${starColor.g}, ${starColor.b}, 0.5)`);
        glow.addColorStop(0.6, `rgba(${starColor.r}, ${starColor.g}, ${starColor.b}, 0.15)`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        fCtx.beginPath();
        fCtx.arc(fCx, fCy, 13, 0, Math.PI * 2);
        fCtx.fillStyle = glow;
        fCtx.fill();

        fCtx.beginPath();
        fCtx.arc(fCx, fCy, 3.5, 0, Math.PI * 2);
        fCtx.fillStyle = `rgba(${starColor.r}, ${starColor.g}, ${starColor.b}, 0.95)`;
        fCtx.fill();

        starSpriteCache[temp.id] = {
          brilliant: bCanvas,
          luminous: lCanvas,
          field: fCanvas,
          color: starColor
        };
      });

      assignStarSprites();
    }
    window._rebuildStarSprites = buildStarSprites;

    /* ── Stars Initialization ── */
    let stars = [];
    function initStars() {
      stars = [];
      const density = Math.max(100, S.settings.spaceDensity || 300);
      const count = Math.max(80, Math.floor((width * height) / Math.max(700, 560000 / density)));
      const sizeMult = Math.max(0.7, (S.settings.spaceSize || 10) / 10);

      for (let i = 0; i < count; i++) {
        const raw = Math.random();
        let starType = 'deep';
        let radius = (Math.random() * 0.35 + 0.35) * sizeMult;
        let baseAlpha = Math.random() * 0.35 + 0.25;
        let baseDrawSize = radius * 2;

        if (raw > 0.93) {
          starType = 'brilliant';
          radius = (Math.random() * 0.8 + 1.3) * sizeMult;
          baseAlpha = Math.random() * 0.25 + 0.75;
          baseDrawSize = radius * 14.5;
        } else if (raw > 0.76) {
          starType = 'luminous';
          radius = (Math.random() * 0.5 + 0.85) * sizeMult;
          baseAlpha = Math.random() * 0.3 + 0.55;
          baseDrawSize = radius * 8.5;
        } else if (raw > 0.42) {
          starType = 'field';
          radius = (Math.random() * 0.4 + 0.55) * sizeMult;
          baseAlpha = Math.random() * 0.3 + 0.4;
          baseDrawSize = radius * 5.0;
        }

        const colorObj = pickStarColor();
        const originX = Math.random() * width;
        const originY = Math.random() * height;

        stars.push({
          originX,
          originY,
          x: originX,
          y: originY,
          vx: 0,
          vy: 0,
          radius,
          type: starType,
          tempId: colorObj.id,
          sprite: null,
          baseDrawSize,
          deepColorStyle: `rgb(${colorObj.r}, ${colorObj.g}, ${colorObj.b})`,
          baseAlpha,
          phase: Math.random() * Math.PI * 2,
          phase2: Math.random() * Math.PI * 2,
          twinkleSpeed: (Math.random() * 0.016 + 0.007) * (Math.random() < 0.5 ? 1 : -1)
        });
      }
      buildStarSprites();
    }
    window._reinitStars = initStars;

    /* ── Interactive Pointer & Constellations ── */
    const pointer = {
      x: -9999,
      y: -9999,
      active: false,
      lastMoveTime: 0,
      radius: 130
    };

    function onPointerMove(e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
      pointer.lastMoveTime = performance.now();
    }

    function onPointerLeave() {
      pointer.active = false;
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });

    /* ── Audio Energy & Bass / Kick Pulse ── */
    let bassPulse = 0;
    function getBassPulse() {
      if (!S.isPlaying || (audio && audio.paused)) {
        bassPulse += (0 - bassPulse) * 0.12;
        return bassPulse;
      }

      let rawTarget = 0;
      // 1. Real Web Audio frequency data if available from visualizer
      if (window._mockifyFreqData && window._mockifyFreqData.some(v => v > 0)) {
        const fd = window._mockifyFreqData;
        rawTarget = ((fd[0] || 0) * 0.45 + (fd[1] || 0) * 0.35 + (fd[2] || 0) * 0.20) / 255;
      } else {
        // 2. High-precision musical kick/groove model synced to audio.currentTime
        const curTime = (audio && audio.currentTime > 0) ? audio.currentTime : (performance.now() * 0.001);
        const beatCycle = (curTime * (124 / 60)) % 4; // ~124 BPM 4/4 meter
        const beatFrac = beatCycle % 1;
        const isMainBeat = (beatCycle < 1 || (beatCycle >= 2 && beatCycle < 3));
        const kickStrength = isMainBeat ? 0.95 : 0.65;
        const kick = Math.pow(Math.max(0, 1 - beatFrac * 3.8), 2.2) * kickStrength;
        const groove = (Math.sin(curTime * 13) * 0.5 + 0.5) * 0.25;
        rawTarget = Math.min(1, kick + groove);
      }

      // Snappy attack, smooth exponential decay
      if (rawTarget > bassPulse) {
        bassPulse += (rawTarget - bassPulse) * 0.45;
      } else {
        bassPulse += (rawTarget - bassPulse) * 0.07;
      }
      return bassPulse;
    }

    /* ── Comets ── */
    const comets = [];
    let lastSpawnX = -9999;
    let lastSpawnY = -9999;

    function spawnComet() {
      let startX = 0;
      let startY = 0;
      const minDistance = Math.min(width, height) * 0.45; // Enforce generous spatial dispersion

      // Attempt to pick coordinates substantially far from the last comet spawn
      for (let attempt = 0; attempt < 8; attempt++) {
        // Can enter from top edge, upper field, or mid/lower-left field to streak across the bottom
        const spawnZone = Math.random();
        if (spawnZone < 0.45) {
          // Mid & lower screen zone (down to 85% height)
          startX = Math.random() * (width * 0.65);
          startY = height * 0.40 + Math.random() * (height * 0.45);
        } else if (spawnZone < 0.75) {
          // Upper screen zone
          startX = Math.random() * (width * 0.85);
          startY = Math.random() * (height * 0.38);
        } else {
          // Left-edge entry streaking across middle and lower viewport
          startX = -20;
          startY = Math.random() * (height * 0.80);
        }

        const dist = Math.hypot(startX - lastSpawnX, startY - lastSpawnY);
        if (dist >= minDistance || attempt === 7) {
          break;
        }
      }

      lastSpawnX = startX;
      lastSpawnY = startY;

      // Trajectory: slight natural variation around ~35-50 degrees
      const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.22;

      comets.push({
        x: startX,
        y: startY,
        length: 140 + Math.random() * 180,
        speed: 3.2 + Math.random() * 2.8,
        angle: angle,
        opacity: 0,
        maxOpacity: 0.85 + Math.random() * 0.15,
        life: 0,
        maxLife: 140 + Math.random() * 50
      });
    }

    let lastCometTime = Date.now();
    let nextCometDelay = 1500 + Math.random() * 2000;

    /* ── Tab & Blur Throttling ── */
    let spaceAnimRunning = false;
    let spaceAnimId = null;
    let isWindowFocused = (typeof document.hasFocus === 'function') ? document.hasFocus() : true;
    let lastFrameTime = performance.now();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (spaceAnimRunning) {
          cancelAnimationFrame(spaceAnimId);
          spaceAnimRunning = false;
        }
      } else {
        if (document.body.classList.contains('theme-space-active')) {
          lastCometTime = Date.now();
          lastFrameTime = performance.now();
          if (!spaceAnimRunning) {
            spaceAnimRunning = true;
            spaceAnimId = requestAnimationFrame(render);
          }
        }
      }
    });

    window.addEventListener('focus', () => {
      isWindowFocused = true;
      lastFrameTime = performance.now();
    });

    window.addEventListener('blur', () => {
      isWindowFocused = false;
    });

    initStars();

    /* ── Main Canvas Render Loop ── */
    function render(timestamp) {
      if (!document.body.classList.contains('theme-space-active')) {
        spaceAnimRunning = false;
        return;
      }

      // Throttling when window is blurred/unfocused (preserves battery & CPU)
      if (!isWindowFocused) {
        const elapsed = timestamp - lastFrameTime;
        if (elapsed < 45) { // ~22 FPS when unfocused
          spaceAnimId = requestAnimationFrame(render);
          return;
        }
      }
      lastFrameTime = timestamp;

      // Audio Bass / Kick Pulse value [0.0 - 1.0]
      const pulse = getBassPulse();

      // Render clear uniform cosmic background with no top-heavy blurry nebula blob
      ctx.fillStyle = '#030408';
      ctx.fillRect(0, 0, width, height);

      const brightMult = (S.settings.spaceBrightness || 60) / 50;
      const cometRgb = hexToRgb(S.settings.spaceCometColor || '#00f3ff');
      const starHex = S.settings.spaceStarColor || '#ffffff';
      const starRgb = hexToRgb(starHex);

      // Pointer active alpha (smoothly fades out if cursor is stationary for >2.5s)
      let pointerAlpha = 0;
      if (pointer.active) {
        const timeSinceMove = performance.now() - pointer.lastMoveTime;
        if (timeSinceMove < 2500) {
          pointerAlpha = 1;
        } else if (timeSinceMove < 3500) {
          pointerAlpha = 1 - (timeSinceMove - 2500) / 1000;
        }
      }

      // ── Starfield Physics & Offscreen Sprite Blitting ──
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Atmospheric harmonic scintillation
        s.phase += s.twinkleSpeed;
        const wave = Math.sin(s.phase) * 0.65 + Math.sin(s.phase * 2.3 + s.phase2) * 0.35;
        const currentAlpha = Math.min(1, Math.max(0.12, (s.baseAlpha + wave * 0.28) * brightMult));

        // Interactive pointer disturbance physics (gentle spring-repulsion)
        if (pointerAlpha > 0.02) {
          const dx = s.x - pointer.x;
          const dy = s.y - pointer.y;
          const distSq = dx * dx + dy * dy;
          const maxR = pointer.radius;
          if (distSq < maxR * maxR && distSq > 4) {
            const dist = Math.sqrt(distSq);
            const force = (1 - dist / maxR) * 3.6 * pointerAlpha;
            s.vx += (dx / dist) * force * 0.22;
            s.vy += (dy / dist) * force * 0.22;
          }
        }

        // Elastic return to home coordinates
        s.vx += (s.originX - s.x) * 0.05;
        s.vy += (s.originY - s.y) * 0.05;
        s.vx *= 0.82;
        s.vy *= 0.82;
        s.x += s.vx;
        s.y += s.vy;

        // Blit pre-cached offscreen canvas sprites (zero gradient allocations in loop)
        if (s.type === 'brilliant') {
          const flareScale = 1 + pulse * 0.35;
          const drawSize = s.baseDrawSize * flareScale;
          ctx.globalAlpha = Math.min(1, currentAlpha * (1 + pulse * 0.2));
          if (s.sprite) ctx.drawImage(s.sprite, s.x - drawSize * 0.5, s.y - drawSize * 0.5, drawSize, drawSize);
        } else if (s.type === 'luminous') {
          const flareScale = 1 + pulse * 0.18;
          const drawSize = s.baseDrawSize * flareScale;
          ctx.globalAlpha = currentAlpha;
          if (s.sprite) ctx.drawImage(s.sprite, s.x - drawSize * 0.5, s.y - drawSize * 0.5, drawSize, drawSize);
        } else if (s.type === 'field') {
          ctx.globalAlpha = currentAlpha;
          if (s.sprite) ctx.drawImage(s.sprite, s.x - s.baseDrawSize * 0.5, s.y - s.baseDrawSize * 0.5, s.baseDrawSize, s.baseDrawSize);
        } else {
          // Deep cosmic field pinpoint
          ctx.globalAlpha = currentAlpha;
          ctx.fillStyle = s.deepColorStyle;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // ── Comets ──
      const cometsFreq = S.settings.spaceComets !== undefined ? S.settings.spaceComets : 5;
      if (cometsFreq > 0) {
        const now = Date.now();
        // Extra shooting star chance on sharp bass kick attack
        const kickDropBonus = (pulse > 0.82 && Math.random() < 0.025);
        if (now - lastCometTime > nextCometDelay || kickDropBonus) {
          spawnComet();
          lastCometTime = now;
          const baseDelay = 8000 / cometsFreq;
          nextCometDelay = baseDelay * (0.6 + Math.random() * 0.8);
        }
      }

      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.life++;
        c.x += Math.cos(c.angle) * c.speed;
        c.y += Math.sin(c.angle) * c.speed;

        const progress = c.life / c.maxLife;
        if (progress < 0.15) {
          c.opacity = (progress / 0.15) * c.maxOpacity;
        } else if (progress > 0.65) {
          c.opacity = ((1 - progress) / 0.35) * c.maxOpacity;
        } else {
          c.opacity = c.maxOpacity;
        }

        const tailX = c.x - Math.cos(c.angle) * c.length;
        const tailY = c.y - Math.sin(c.angle) * c.length;

        // Pass 1: Ion glow sheath
        const sheathGrad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
        sheathGrad.addColorStop(0, `rgba(${cometRgb.r}, ${cometRgb.g}, ${cometRgb.b}, ${c.opacity * 0.5})`);
        sheathGrad.addColorStop(0.25, `rgba(${cometRgb.r}, ${cometRgb.g}, ${cometRgb.b}, ${c.opacity * 0.25})`);
        sheathGrad.addColorStop(0.6, `rgba(${cometRgb.r}, ${cometRgb.g}, ${cometRgb.b}, ${c.opacity * 0.08})`);
        sheathGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = sheathGrad;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Pass 2: Luminous comet streak core
        const hlR = Math.min(255, Math.round(cometRgb.r * 0.6 + 102));
        const hlG = Math.min(255, Math.round(cometRgb.g * 0.6 + 102));
        const hlB = Math.min(255, Math.round(cometRgb.b * 0.6 + 102));
        const coreGrad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
        coreGrad.addColorStop(0, `rgba(${hlR}, ${hlG}, ${hlB}, ${c.opacity})`);
        coreGrad.addColorStop(0.1, `rgba(${cometRgb.r}, ${cometRgb.g}, ${cometRgb.b}, ${c.opacity})`);
        coreGrad.addColorStop(0.5, `rgba(${cometRgb.r}, ${cometRgb.g}, ${cometRgb.b}, ${c.opacity * 0.4})`);
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = coreGrad;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Head Glow
        const headCR = Math.min(255, Math.round(cometRgb.r * 0.5 + 128));
        const headCG = Math.min(255, Math.round(cometRgb.g * 0.5 + 128));
        const headCB = Math.min(255, Math.round(cometRgb.b * 0.5 + 128));
        const headGrad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 8);
        headGrad.addColorStop(0, `rgba(${headCR}, ${headCG}, ${headCB}, ${c.opacity})`);
        headGrad.addColorStop(0.3, `rgba(${cometRgb.r}, ${cometRgb.g}, ${cometRgb.b}, ${c.opacity * 0.85})`);
        headGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = headGrad;
        ctx.fill();

        // Nucleus
        ctx.beginPath();
        ctx.arc(c.x, c.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${hlR}, ${hlG}, ${hlB}, ${c.opacity})`;
        ctx.fill();

        if (c.life >= c.maxLife || c.x > width + c.length || c.y > height + c.length) {
          comets.splice(i, 1);
        }
      }

      spaceAnimId = requestAnimationFrame(render);
    }

    window._startSpaceBg = function() {
      if (stars.length === 0) {
        resizeCanvas();
      }
      if (!spaceAnimRunning) {
        spaceAnimRunning = true;
        lastFrameTime = performance.now();
        spaceAnimId = requestAnimationFrame(render);
      }
    };

    // Start starry space animation
    if (document.body.classList.contains('theme-space-active') || S.settings.spaceBg !== false) {
      document.body.classList.add('theme-space-active');
      window._startSpaceBg();
    }
  })();

  /* ═══════════════════════════════════════
     RIGHT PANEL SPECTRUM VISUALIZER ENGINE
     ═══════════════════════════════════════ */
  (function initRpVisualizer() {
    const canvas = document.getElementById('rp-vis-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const numBars = 22;
    const barHeights = new Array(numBars).fill(4);

    let audioCtx = null;
    let analyser = null;
    let freqData = null;

    function setupWebAudio() {
      // Audio playback routes directly via native HTML5 <audio> to speakers.
      // We avoid createMediaElementSource(audio) because:
      // 1. Browsers start AudioContext in 'suspended' state, which completely silences the first song.
      // 2. Routing through Web Audio API breaks or mutes playback on mobile iOS Safari / Android PWA without extra CORS headers.
      // Instead, we maintain a synthetic frequency response and smoothly animated audio visualizer.
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
    }

    audio.addEventListener('play', setupWebAudio);

    function renderRpVis() {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#DC143C';
      const gap = 4;
      const barWidth = (width - (numBars - 1) * gap) / numBars;

      if (analyser && freqData && S.isPlaying) {
        analyser.getByteFrequencyData(freqData);
        window._mockifyFreqData = freqData;
      }

      const hasAudioData = freqData && S.isPlaying && freqData.some(v => v > 0);

      for (let i = 0; i < numBars; i++) {
        let target = 3;

        if (S.isPlaying) {
          if (hasAudioData) {
            const binIdx = Math.floor((i / numBars) * (freqData.length * 0.75));
            const val = freqData[binIdx] || 0;
            target = (val / 255) * (height - 4) + 4;
          } else {
            const t = Date.now() * 0.006 + i * 0.45;
            target = Math.sin(t) * 16 + Math.cos(t * 1.6 + i * 0.3) * 12 + 22;
          }
          barHeights[i] += (target - barHeights[i]) * 0.35;
        } else {
          barHeights[i] += (3 - barHeights[i]) * 0.15;
        }

        const barH = Math.max(3, Math.min(height, barHeights[i]));
        const x = i * (barWidth + gap);
        const y = height - barH;

        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, accentColor);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barH, [3, 3, 0, 0]);
        } else {
          ctx.rect(x, y, barWidth, barH);
        }
        ctx.fill();
      }

      requestAnimationFrame(renderRpVis);
    }

    requestAnimationFrame(renderRpVis);
  })();

  /* ═══════════════════════════════════════
     INIT
     ═══════════════════════════════════════ */
  (async function init() {
    await loadPlaylists();
    await loadSettings();
    await loadRecent();
    await loadQueue();
    renderHome();
    await loadLastState();
  })();