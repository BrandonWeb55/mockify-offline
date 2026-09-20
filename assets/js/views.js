

  /* ── Greeting ── */
  (function() {
    const h = new Date().getHours();
    document.getElementById('greeting').textContent =
      h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
  })();

  /* ═══════════════════════════════════════
     DISCOVERY & GENRE DATA
     ═══════════════════════════════════════ */
  const GENRES = [
    { name: 'Pop', color1: '#af2896', color2: '#509bf5', query: 'Top Pop Hits 2024', icon: '🎤' },
    { name: 'Hip-Hop', color1: '#ba5d07', color2: '#f59b23', query: 'Hip Hop Bangers', icon: '🔥' },
    { name: 'Rock', color1: '#e91429', color2: '#8c1932', query: 'Classic Rock Anthems', icon: '🎸' },
    { name: 'Chill & Lo-Fi', color1: '#477d95', color2: '#1e3264', query: 'Lofi Chill Beats', icon: '☕' },
    { name: 'Workout', color1: '#777777', color2: '#e13300', query: 'Beast Mode Workout Music', icon: '⚡' },
    { name: 'Deep Focus', color1: '#503750', color2: '#2d46b9', query: 'Deep Focus Study Music', icon: '🎧' },
    { name: 'R&B & Soul', color1: '#dc148c', color2: '#68183c', query: 'R&B Soul Favorites', icon: '💜' },
    { name: 'Dance & EDM', color1: '#0d73ec', color2: '#1ed760', query: 'Dance EDM Festival Hits', icon: '🪩' },
    { name: 'Indie & Alt', color1: '#608108', color2: '#148a08', query: 'Indie Rock Pop Anthems', icon: '🌿' },
    { name: 'Gaming', color1: '#e8115b', color2: '#8400e7', query: 'Gaming Mix High Energy', icon: '🎮' },
    { name: 'Acoustic', color1: '#8c67ac', color2: '#431f47', query: 'Acoustic Chill Favorites', icon: '🪕' },
    { name: 'Sleep & Relax', color1: '#1e3264', color2: '#0b112c', query: 'Deep Sleep Ambient Relaxing', icon: '🌙' },
  ];

  const FEATURED_MIXES = [
    { title: "Today's Top Hits", desc: 'The hottest chart-toppers right now', query: "Today's Top Hits", bg: 'linear-gradient(135deg, #1db954, #191414)', icon: '🔥' },
    { title: 'Chill Lo-Fi Beats', desc: 'Mellow beats to relax, study & unwind', query: 'Lofi Hip Hop Chill Beats', bg: 'linear-gradient(135deg, #2b5876, #4e4376)', icon: '☕' },
    { title: 'Beast Mode Gym', desc: 'High-energy tracks to power your workout', query: 'Workout Motivation Music Mix', bg: 'linear-gradient(135deg, #ff416c, #ff4b2b)', icon: '⚡' },
    { title: 'Late Night Vibes', desc: 'Smooth melodic R&B and night drive tunes', query: 'Late Night Drive Vibes', bg: 'linear-gradient(135deg, #8a2387, #e94057)', icon: '🌙' },
    { title: 'Pop Rising', desc: 'The next generation of pop anthems', query: 'Pop Rising 2024', bg: 'linear-gradient(135deg, #f12711, #f5af19)', icon: '✨' },
    { title: 'Deep Focus Flow', desc: 'Ambient soundscapes for uninterrupted flow', query: 'Deep Focus Ambient Flow', bg: 'linear-gradient(135deg, #00c6ff, #0072ff)', icon: '🎧' }
  ];

  function renderGenreGrid(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = GENRES.map(g => `
      <div class="genre-card" style="background: linear-gradient(135deg, ${g.color1}, ${g.color2});" data-query="${esc(g.query)}" data-name="${esc(g.name)}">
        <span class="genre-title">${esc(g.name)}</span>
        <span class="genre-icon">${g.icon}</span>
      </div>
    `).join('');

    el.querySelectorAll('.genre-card').forEach(card => {
      card.addEventListener('click', () => {
        const query = card.dataset.query || card.dataset.name;
        quickSearchGenre(query);
      });
    });
  }

  function renderFeaturedSection() {
    const el = document.getElementById('featured-grid');
    if (!el) return;
    el.innerHTML = FEATURED_MIXES.map((m, idx) => `
      <div class="track-card featured-card" data-idx="${idx}">
        <div class="card-thumb featured-thumb" style="background: ${m.bg};">
          <span class="featured-icon">${m.icon}</span>
          <button class="card-play-btn featured-play-btn" data-idx="${idx}" title="Play Mix">${SVG.play}</button>
        </div>
        <div class="card-title">${esc(m.title)}</div>
        <div class="card-artist">${esc(m.desc)}</div>
      </div>
    `).join('');

    el.querySelectorAll('.featured-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mix = FEATURED_MIXES[btn.dataset.idx];
        if (mix) quickSearchGenre(mix.query);
      });
    });

    el.querySelectorAll('.featured-card').forEach(card => {
      card.addEventListener('click', () => {
        const mix = FEATURED_MIXES[card.dataset.idx];
        if (mix) quickSearchGenre(mix.query);
      });
    });
  }

  function quickSearchGenre(query) {
    if (S.view !== 'search') showView('search');
    if (searchInput) searchInput.value = query;
    if (tbSearchInput) tbSearchInput.value = query;
    doSearch();
  }

  let moodChipsBound = false;
  function setupMoodChips() {
    const container = document.getElementById('mood-chips');
    if (!container || moodChipsBound) return;
    moodChipsBound = true;
    container.querySelectorAll('.mood-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        container.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const genre = chip.dataset.genre;
        if (genre) {
          quickSearchGenre(genre);
        } else {
          if (S.view !== 'home') showView('home');
        }
      });
    });
  }

  /* ═══════════════════════════════════════
     HOME VIEW (Clean & Bare-Bones)
     ═══════════════════════════════════════ */
  function renderHome() {
    const grid = document.getElementById('recent-grid');
    const section = document.getElementById('recent-section');
    const navBtns = document.getElementById('recent-carousel-nav');
    const prevBtn = document.getElementById('recent-carousel-prev');
    const nextBtn = document.getElementById('recent-carousel-next');

    if (grid && section) {
      if (S.recent.length === 0) {
        if (navBtns) navBtns.style.display = 'none';
        grid.innerHTML = `
          <div class="empty-state" id="recent-empty" style="padding: 48px 20px; text-align: center; color: var(--text-secondary); width: 100%;">
            <div style="font-size: 32px; margin-bottom: 12px; opacity: 0.6;">🎵</div>
            <p style="font-size: 15px; font-weight: 500; margin-bottom: 6px; color: var(--text-primary);">No recent music played yet</p>
            <p style="font-size: 13px; opacity: 0.7; max-width: 320px; margin: 0 auto;">Search for songs, artists, or paste any YouTube link in the Search tab to begin listening.</p>
          </div>
        `;
      } else {
        if (navBtns) navBtns.style.display = S.recent.length > 2 ? 'flex' : 'none';
        grid.innerHTML = S.recent.slice(0, 20).map(t => `
          <div class="track-card" data-id="${t.id}">
            <div class="card-thumb">
              <img src="${t.thumbnail || ''}" alt="" />
              <button class="card-play-btn" data-id="${t.id}">${SVG.play}</button>
              <div class="card-hover-actions">
                <button class="card-act-btn card-playlist-btn" data-id="${t.id}" title="Add to Playlist">${SVG.plus}</button>
                <button class="card-act-btn card-delete-btn" data-id="${t.id}" title="Remove from Recent">${SVG.trash}</button>
              </div>
            </div>
            <div class="card-title" title="${esc(t.title)}">${esc(t.title)}</div>
            <div class="card-artist">${esc(t.artist)}</div>
          </div>
        `).join('');

        // Wire up carousel buttons
        if (prevBtn && !prevBtn._bound) {
          prevBtn._bound = true;
          prevBtn.addEventListener('click', () => {
            const el = document.getElementById('recent-grid');
            if (el) el.scrollBy({ left: -360, behavior: 'smooth' });
          });
        }
        if (nextBtn && !nextBtn._bound) {
          nextBtn._bound = true;
          nextBtn.addEventListener('click', () => {
            const el = document.getElementById('recent-grid');
            if (el) el.scrollBy({ left: 360, behavior: 'smooth' });
          });
        }

        grid.querySelectorAll('.card-play-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const track = S.recent.find(t => t.id === btn.dataset.id);
            if (track) playTrack({ ...track });
          });
        });
        
        grid.querySelectorAll('.card-playlist-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const track = S.recent.find(t => t.id === btn.dataset.id);
            if (track) showAddToPlaylistModal(track);
          });
        });
        
        grid.querySelectorAll('.card-delete-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const track = S.recent.find(t => t.id === btn.dataset.id);
            const title = track ? track.title : 'this track';
            confirmAction({
              title: 'Remove from History',
              message: `Are you sure you want to remove "${title}" from your listening history?`,
              actionText: 'Remove',
              onConfirm: () => {
                S.recent = S.recent.filter(t => t.id !== btn.dataset.id);
                ipcRenderer.invoke('write-recent', S.recent);
                localStorage.setItem('mockify-recent', JSON.stringify(S.recent));
                renderHome();
                showToast('Removed from history');
              }
            });
          });
        });

        grid.querySelectorAll('.track-card').forEach(card => {
          card.addEventListener('click', () => {
            const track = S.recent.find(t => t.id === card.dataset.id);
            if (track) playTrack({ ...track });
          });
        });
      }
    }
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  /* ═══════════════════════════════════════
     SEARCH & RECENT SEARCHES
     ═══════════════════════════════════════ */
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const searchResults = document.getElementById('search-results');
  const searchRecentSection = document.getElementById('search-recent-section');
  const searchRecentList = document.getElementById('search-recent-list');
  const clearRecentSearchesBtn = document.getElementById('clear-recent-searches-btn');

  function getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem('mockify-recent-searches') || '[]');
    } catch (_) {
      return [];
    }
  }

  function addRecentSearchTrack(track) {
    if (!track || !track.id) return;
    let list = getRecentSearches();
    list = list.filter(t => t.id !== track.id);
    list.unshift(track);
    if (list.length > 8) list = list.slice(0, 8);
    localStorage.setItem('mockify-recent-searches', JSON.stringify(list));
  }

  function renderSearchBrowse() {
    const q = searchInput ? searchInput.value.trim() : '';
    if (!q) {
      if (searchResults) searchResults.innerHTML = '';
      const recent = getRecentSearches();
      if (recent.length > 0 && searchRecentSection && searchRecentList) {
        searchRecentSection.style.display = 'block';
        searchRecentList.innerHTML = '<div class="track-list">' + recent.map((t, i) => trackRow(t, i + 1, 'search')).join('') + '</div>';
        bindTrackRowEvents(searchRecentList, recent);
        updateTrackRowHighlights();
      } else if (searchRecentSection) {
        searchRecentSection.style.display = 'none';
      }
    } else {
      if (searchRecentSection) searchRecentSection.style.display = 'none';
    }
  }

  if (clearRecentSearchesBtn) {
    clearRecentSearchesBtn.addEventListener('click', () => {
      localStorage.removeItem('mockify-recent-searches');
      renderSearchBrowse();
    });
  }

  async function doSearch() {
    const raw = (searchInput && searchInput.value ? searchInput.value : (tbSearchInput && tbSearchInput.value ? tbSearchInput.value : '')).trim();
    if (!raw) {
      if (searchResults) searchResults.innerHTML = '';
      renderSearchBrowse();
      return;
    }

    const q = raw.toLowerCase();
    if (searchRecentSection) searchRecentSection.style.display = 'none';

    // Search existing tracks in queue, recents, and playlists
    const pool = [...S.queue, ...S.recent];
    (S.playlists || []).forEach(p => {
      if (Array.isArray(p.tracks)) pool.push(...p.tracks);
    });

    const seen = new Set();
    const matches = [];
    for (const t of pool) {
      const key = t.id || t.title;
      if (!seen.has(key)) {
        seen.add(key);
        const matchTitle = (t.title || '').toLowerCase().includes(q);
        const matchArtist = (t.artist || '').toLowerCase().includes(q);
        if (matchTitle || matchArtist) {
          matches.push(t);
        }
      }
    }

    S.searchResults = matches;
    if (matches.length === 0) {
      searchResults.innerHTML = `<div class="empty-state"><h3>No results found</h3><p>No offline songs match "${esc(raw)}"</p></div>`;
      return;
    }
    renderSearchResults();
  }

  const tbSearchInput = document.getElementById('tb-search-input');
  const tbSearchClear = document.getElementById('tb-search-clear');
  const tbSearchDropdown = document.getElementById('tb-search-dropdown');
  let tbSearchTimer = null;
  let currentDropdownResults = [];

  function closeTbDropdown() {
    if (tbSearchDropdown) tbSearchDropdown.style.display = 'none';
  }

  function renderTbDropdown(query, results) {
    if (!tbSearchDropdown) return;
    if (!query.trim() || results.length === 0) {
      closeTbDropdown();
      return;
    }

    currentDropdownResults = results.slice(0, 6);

    let html = `<div class="tb-dropdown-header">Quick Songs</div>`;
    html += currentDropdownResults.map((t, idx) => `
      <div class="tb-dropdown-item" data-idx="${idx}">
        <img src="${t.thumbnail || ''}" alt="" />
        <div class="tb-dropdown-info">
          <div class="tb-dropdown-title">${esc(t.title)}</div>
          <div class="tb-dropdown-artist">${esc(t.artist)}</div>
        </div>
        <button class="tb-dropdown-play">${SVG.play}</button>
      </div>
    `).join('');

    html += `<div class="tb-dropdown-footer" id="tb-dropdown-footer">See all results for "${esc(query)}" &rarr;</div>`;

    tbSearchDropdown.innerHTML = html;
    tbSearchDropdown.style.display = 'block';

    tbSearchDropdown.querySelectorAll('.tb-dropdown-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(el.dataset.idx);
        const track = currentDropdownResults[idx];
        if (track) playTrack(track);
        closeTbDropdown();
      });
    });

    const footer = document.getElementById('tb-dropdown-footer');
    if (footer) {
      footer.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTbDropdown();
        if (S.view !== 'search') showView('search');
        doSearch();
      });
    }
  }

  async function updateTbDropdown(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      closeTbDropdown();
      return;
    }

    let matches = [];
    const allLocal = [];
    if (S.playlists) {
      S.playlists.forEach(pl => {
        if (pl.tracks) allLocal.push(...pl.tracks);
      });
    }
    if (S.recent) allLocal.push(...S.recent);

    const localMatched = allLocal.filter(t => 
      (t.title && t.title.toLowerCase().includes(q)) || 
      (t.artist && t.artist.toLowerCase().includes(q))
    );

    const seenLocal = new Set();
    localMatched.forEach(t => {
      if (!seenLocal.has(t.id)) {
        matches.push(t);
        seenLocal.add(t.id);
      }
    });

    renderTbDropdown(query, matches);

    try {
      const res = await ipcRenderer.invoke('search-youtube', query);
      if (res && res.entries && res.entries.length > 0) {
        const existingIds = new Set(matches.map(m => m.id));
        res.entries.forEach(t => {
          if (!existingIds.has(t.id)) {
            matches.push(t);
            existingIds.add(t.id);
          }
        });
        renderTbDropdown(query, matches);
      }
    } catch (e) {
      console.log('Dropdown quick search error:', e);
    }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.tb-search-wrapper')) {
      closeTbDropdown();
    }
  });

  let searchDebounceTimer = null;

  function syncSearchValue(val) {
    if (tbSearchInput && tbSearchInput.value !== val) tbSearchInput.value = val;
    if (searchInput && searchInput.value !== val) searchInput.value = val;
    if (tbSearchClear) tbSearchClear.style.display = val.length > 0 ? 'block' : 'none';
    if (searchClearBtn) searchClearBtn.style.display = val.length > 0 ? 'flex' : 'none';
    
    if (!val.trim()) {
      if (searchResults) searchResults.innerHTML = '';
      renderSearchBrowse();
    }
  }

  if (tbSearchInput) {
    tbSearchInput.addEventListener('focus', () => {
      if (tbSearchInput.value.trim()) {
        updateTbDropdown(tbSearchInput.value);
      }
    });

    tbSearchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      syncSearchValue(val);
      clearTimeout(tbSearchTimer);
      if (val.trim()) {
        tbSearchTimer = setTimeout(() => updateTbDropdown(val), 200);
      } else {
        closeTbDropdown();
      }
    });

    tbSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        closeTbDropdown();
        if (S.view !== 'search') showView('search');
        doSearch();
      } else if (e.key === 'Escape') {
        closeTbDropdown();
      }
    });
  }

  if (tbSearchClear) {
    tbSearchClear.addEventListener('click', () => {
      syncSearchValue('');
      closeTbDropdown();
      if (tbSearchInput) tbSearchInput.focus();
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      syncSearchValue('');
      closeTbDropdown();
      if (searchInput) searchInput.focus();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      syncSearchValue(val);
      clearTimeout(searchDebounceTimer);
      if (val.trim().length >= 2) {
        searchDebounceTimer = setTimeout(() => {
          doSearch();
        }, 400);
      }
    });

    searchInput.addEventListener('keydown', e => { 
      if (e.key === 'Enter') {
        clearTimeout(searchDebounceTimer);
        closeTbDropdown();
        if (S.view !== 'search') showView('search');
        doSearch(); 
      }
    });
  }

  function renderSearchResults() {
    const searchBrowse = document.getElementById('search-browse');
    if (S.searchResults.length === 0) {
      if (searchBrowse) searchBrowse.style.display = 'block';
      searchResults.innerHTML = '<div class="empty-state" style="padding: 24px 0;"><h3>No results</h3><p>Try searching for a different song or artist</p></div>';
      return;
    }
    if (searchBrowse) searchBrowse.style.display = 'none';
    searchResults.innerHTML = '<div class="track-list">' + S.searchResults.map((t, i) => trackRow(t, i + 1, 'search')).join('') + '</div>';
    bindTrackRowEvents(searchResults, S.searchResults);
    updateTrackRowHighlights();
  }

  /* ═══════════════════════════════════════
     TRACK ROW COMPONENT
     ═══════════════════════════════════════ */
  function trackRow(t, num, context) {
    const playing = S.currentTrack && String(S.currentTrack.id) === String(t.id);
    const isPlaylist = context === 'playlist';
    const dragAttr = isPlaylist ? 'draggable="true"' : '';
    const dragHandle = isPlaylist ? `<div class="pl-drag-handle" title="Drag to reorder">${SVG.dragHandle}</div>` : '';
    const rowIndicator = playing 
      ? `<div class="mini-eq ${S.isPlaying ? '' : 'paused'}"><span class="eq-bar bar-1"></span><span class="eq-bar bar-2"></span><span class="eq-bar bar-3"></span></div>`
      : (num !== undefined ? num : '');
    return `<div class="track-row ${playing ? 'playing' : ''}" data-id="${t.id}" data-ctx="${context}" ${dragAttr}>
      ${dragHandle}
      <span class="row-num" data-num="${num !== undefined ? num : ''}">${rowIndicator}</span>
      <div class="row-thumb"><img src="${t.thumbnail || ''}" alt="" /></div>
      <div class="row-info">
        <div class="row-title">${esc(t.title)}</div>
        <div class="row-artist">${esc(t.artist)}</div>
      </div>
      <span class="row-duration">${fmt(t.duration)}</span>
      <div class="row-actions">
        <button class="action-btn act-queue" title="Add to queue" data-id="${t.id}">${SVG.queue}</button>
        <button class="action-btn act-playlist" title="Add to playlist" data-id="${t.id}">${SVG.plus}</button>
      </div>
    </div>`;
  }

  function bindTrackRowEvents(container, sourceArray) {
    container.querySelectorAll('.track-row').forEach(row => {
      row.addEventListener('dblclick', () => {
        const track = sourceArray.find(t => String(t.id) === String(row.dataset.id));
        if (!track) return;

        if (row.dataset.ctx === 'playlist') {
          S.queue = sourceArray.map(t => ({ ...t }));
          const idx = sourceArray.findIndex(t => String(t.id) === String(track.id));
          S.queueIndex = idx >= 0 ? idx : 0;
          playTrack(S.queue[S.queueIndex], false);
        } else {
          if (row.dataset.ctx === 'search') addRecentSearchTrack(track);
          playTrack({ ...track });
        }
      });
      row.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn') || e.target.closest('.pl-drag-handle')) return;
        const track = sourceArray.find(t => String(t.id) === String(row.dataset.id));
        if (!track) return;

        if (row.dataset.ctx === 'playlist') {
          S.queue = sourceArray.map(t => ({ ...t }));
          const idx = sourceArray.findIndex(t => String(t.id) === String(track.id));
          S.queueIndex = idx >= 0 ? idx : 0;
          playTrack(S.queue[S.queueIndex], false);
        } else {
          if (row.dataset.ctx === 'search') addRecentSearchTrack(track);
          playTrack({ ...track });
        }
      });
      row.addEventListener('mouseenter', () => {
        ipcRenderer.invoke('prefetch-audio', row.dataset.id).catch(() => {});
      });
    });
    container.querySelectorAll('.act-queue').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const track = sourceArray.find(t => String(t.id) === String(btn.dataset.id));
        if (track) addToQueue({ ...track });
      });
    });
    container.querySelectorAll('.act-playlist').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const track = sourceArray.find(t => String(t.id) === String(btn.dataset.id));
        if (track) showAddToPlaylistModal(track);
      });
    });
  }

  /* ═══════════════════════════════════════
     QUEUE
     ═══════════════════════════════════════ */
  function addToQueue(track) {
    S.queue.push(track);
    saveQueue();
    showToast(`Added to queue`);
    if (S.view === 'queue') renderQueue();
  }

  function renderQueue() {
    const container = document.getElementById('queue-content');
    if (S.queue.length === 0) {
      container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h12v2H3v-2z"/></svg><h3>Queue is empty</h3><p>Add songs to your queue to play them next</p></div>';
      return;
    }

    let html = '';
    if (S.currentTrack && S.queueIndex >= 0) {
      html += '<div class="queue-section-label">Now Playing</div><div class="track-list">';
      html += trackRow(S.queue[S.queueIndex], '♪', 'queue');
      html += '</div>';
    }

    const upcoming = S.queue.slice(S.queueIndex + 1);
    if (upcoming.length > 0) {
      html += '<div class="queue-section-label">Next Up</div><div class="track-list">';
      upcoming.forEach((t, i) => { html += trackRow(t, S.queueIndex + 2 + i, 'queue'); });
      html += '</div>';
    }
    container.innerHTML = html;

    container.querySelectorAll('.track-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn')) return;
        const idx = S.queue.findIndex(t => String(t.id) === String(row.dataset.id));
        if (idx >= 0) { S.queueIndex = idx; playTrack(S.queue[idx], false); }
      });
    });
  }

  function confirmAction({ title = 'Are you sure?', message = 'Are you sure you want to proceed?', actionText = 'Delete', onConfirm }) {
    if (S.settings.confirmDelete === false) {
      onConfirm();
      return;
    }
    showModal(`
      <h2>${esc(title)}</h2>
      <p style="color:var(--text-secondary); margin-bottom: 24px; font-size:14px; line-height: 1.5;">${esc(message)}</p>
      <div class="modal-actions">
        <button class="modal-btn secondary" id="modal-cancel">Cancel</button>
        <button class="modal-btn primary" id="modal-confirm-btn" style="background: var(--error); color:#fff;">${esc(actionText)}</button>
      </div>
    `);
    document.getElementById('modal-cancel').addEventListener('click', hideModal);
    document.getElementById('modal-confirm-btn').addEventListener('click', () => {
      hideModal();
      onConfirm();
    });
  }

  document.getElementById('clear-queue-btn').addEventListener('click', () => {
    confirmAction({
      title: 'Clear Queue',
      message: 'Are you sure you want to clear your current queue?',
      actionText: 'Clear Queue',
      onConfirm: () => {
        S.queue = [];
        S.queueIndex = -1;
        saveQueue();
        renderQueue();
        showToast('Queue cleared');
      }
    });
  });

  /* ═══════════════════════════════════════
     PLAYBACK ENGINE
     ═══════════════════════════════════════ */
  let activePlayRequestId = 0;

  async function playTrack(track, addToQ = true) {
    if (!track) return;

    // Immediately prime audio engine within the user gesture before async IPC fetch
    if (typeof window.primeAudioEngine === 'function') {
      window.primeAudioEngine();
    }

    activePlayRequestId++;
    const currentReqId = activePlayRequestId;

    try { audio.pause(); } catch(e){}

    if (addToQ) {
      const existing = S.queue.findIndex(t => t.id === track.id);
      if (existing >= 0) {
        S.queueIndex = existing;
      } else {
        S.queue.push(track);
        S.queueIndex = S.queue.length - 1;
      }
    }

    S.currentTrack = track;
    S.isLoading = false;
    updatePlayerBar();

    if (S.queueIndex >= 0 && S.queue[S.queueIndex]) {
      Object.assign(S.queue[S.queueIndex], track);
    }

    const audioSource = track.audioUrl || track.src || track.url;
    if (!audioSource) {
      console.log('[Offline Player] Selected track:', track.title || track.id);
      updatePlayerBar();
      return;
    }

    try {
      audio.src = audioSource;
      audio.loop = (S.repeat === 'one');
      audio.muted = Boolean(S.muted);
      audio.volume = S.muted ? 0 : (S.volume !== undefined ? S.volume / 100 : 0.8);
      audio.load();

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise;
      }

      if (currentReqId !== activePlayRequestId) return;

      S.isLoading = false;
      S.isPlaying = true;
      S.currentTrack = track;

      addToRecent(track);
      updatePlayerBar();
      if (typeof window.fetchAndRenderLyrics === 'function') {
        window.fetchAndRenderLyrics(track);
      } else if (typeof fetchAndRenderLyrics === 'function') {
        fetchAndRenderLyrics(track);
      }
    } catch (err) {
      if (currentReqId !== activePlayRequestId) return;
      console.error('[Offline Audio Playback Error]', err);
      S.isLoading = false;
      S.isPlaying = false;
      updatePlayerBar();
      if (err.name === 'NotAllowedError') {
        if (typeof window.showPlaybackErrorBanner === 'function') {
          window.showPlaybackErrorBanner('Audio playback requires user gesture. Tap Play to listen.');
        }
      }
    }
  }

  async function addToRecent(track) {
    S.recent = S.recent.filter(t => t.id !== track.id);
    S.recent.unshift({ id: track.id, title: track.title, artist: track.artist, thumbnail: track.thumbnail, duration: track.duration, audioUrl: track.audioUrl || track.src || track.url });
    if (S.recent.length > 50) S.recent.length = 50;
    localStorage.setItem('mockify-recent', JSON.stringify(S.recent));
    if (S.view === 'home') renderHome();
  }

  function playNext() {
    if (S.repeat === 'one') {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    if (S.queue.length === 0) return;
    let next = S.queueIndex + 1;
    if (S.shuffle && S.queue.length > 1) {
      let r = Math.floor(Math.random() * (S.queue.length - 1));
      if (r >= S.queueIndex) r++;
      next = r;
    } else if (S.shuffle) {
      next = 0;
    }
    if (next >= S.queue.length) {
      if (S.repeat === 'all') next = 0; else return;
    }
    S.queueIndex = next;
    playTrack(S.queue[next], false);
  }

  function playPrev() {
    if (S.queue.length === 0) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    let prev = S.queueIndex - 1;
    if (prev < 0) { if (S.repeat === 'all') prev = S.queue.length - 1; else prev = 0; }
    S.queueIndex = prev;
    playTrack(S.queue[prev], false);
  }

  function saveQueue() {
    if (typeof ipcRenderer !== 'undefined' && ipcRenderer) {
      ipcRenderer.invoke('save-queue', { queue: S.queue, queueIndex: S.queueIndex });
    }
  }

  window.addToQueue = addToQueue;
  window.renderQueue = renderQueue;
  window.saveQueue = saveQueue;
  window.playNext = playNext;
  window.playPrev = playPrev;
  window.playTrack = playTrack;
  window.doSearch = doSearch;
