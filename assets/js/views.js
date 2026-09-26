/**
 * Mockify Offline — Views & Playback Engine
 * Pure offline player views: Home, Queue, Playlist, and Local Playback.
 */
(function() {
  'use strict';
  const ipcRenderer = window.ipcRenderer || { invoke: async () => ({}) };

  /* ── Greeting ── */
  (function() {
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      const h = new Date().getHours();
      greetingEl.textContent = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
    }
  })();

  const esc = window.esc || function(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };
  window.esc = esc;

  /* ═══════════════════════════════════════
     HOME VIEW (Offline Music & Recents)
     ═══════════════════════════════════════ */
  function renderHome() {
    const grid = document.getElementById('recent-grid');
    const section = document.getElementById('recent-section');
    const navBtns = document.getElementById('recent-carousel-nav');
    const prevBtn = document.getElementById('recent-carousel-prev');
    const nextBtn = document.getElementById('recent-carousel-next');

    if (grid && section) {
      if (!S.recent || S.recent.length === 0) {
        if (navBtns) navBtns.style.display = 'none';
        grid.innerHTML = `
          <div class="empty-state" id="recent-empty" style="padding: 48px 20px; text-align: center; color: var(--text-secondary); width: 100%;">
            <div style="font-size: 36px; margin-bottom: 12px; opacity: 0.7;">🎵</div>
            <p style="font-size: 16px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary);">No offline music played yet</p>
            <p style="font-size: 13px; opacity: 0.75; max-width: 340px; margin: 0 auto; line-height: 1.5;">Your offline songs, albums, and playlists will appear here.</p>
          </div>
        `;
      } else {
        if (navBtns) navBtns.style.display = S.recent.length > 2 ? 'flex' : 'none';
        grid.innerHTML = S.recent.slice(0, 20).map(t => `
          <div class="track-card" data-id="${t.id}">
            <div class="card-thumb">
              <img src="${t.thumbnail || ''}" alt="" onerror="this.style.display='none'" />
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

        // Wire up carousel navigation
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
            if (track && typeof showAddToPlaylistModal === 'function') showAddToPlaylistModal(track);
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

  /* ═══════════════════════════════════════
     TRACK ROW COMPONENT
     ═══════════════════════════════════════ */
  function trackRow(t, num, context) {
    const playing = S.currentTrack && String(S.currentTrack.id) === String(t.id);
    const isPlaylist = context === 'playlist';
    const isCatalog = context === 'catalog';
    const dragAttr = isPlaylist ? 'draggable="true"' : '';
    const dragHandle = isPlaylist ? `<div class="pl-drag-handle" title="Drag to reorder">${SVG.dragHandle}</div>` : '';
    const rowIndicator = playing
      ? `<div class="mini-eq ${S.isPlaying ? '' : 'paused'}"><span class="eq-bar bar-1"></span><span class="eq-bar bar-2"></span><span class="eq-bar bar-3"></span></div>`
      : (num !== undefined ? num : '');
    const deleteBtn = (isCatalog && t.isLocal)
      ? `<button class="action-btn act-delete-local" title="Remove from catalog" data-id="${t.id}">${SVG.trash}</button>`
      : '';

    return `<div class="track-row ${playing ? 'playing' : ''}" data-id="${t.id}" data-ctx="${context}" ${dragAttr}>
      ${dragHandle}
      <span class="row-num" data-num="${num !== undefined ? num : ''}">${rowIndicator}</span>
      <div class="row-thumb"><img src="${t.thumbnail || ''}" alt="" onerror="this.style.display='none'" /></div>
      <div class="row-info">
        <div class="row-title">${esc(t.title)}</div>
        <div class="row-artist">${esc(t.artist)}</div>
      </div>
      <span class="row-duration">${fmt(t.duration)}</span>
      <div class="row-actions">
        ${deleteBtn}
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
          playTrack({ ...track });
        }
      });
    });

    container.querySelectorAll('.act-delete-local').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const track = sourceArray.find(t => String(t.id) === String(btn.dataset.id));
        const title = track ? track.title : 'this song';
        confirmAction({
          title: 'Remove Song',
          message: `Are you sure you want to remove "${title}" from your offline catalog?`,
          actionText: 'Remove',
          onConfirm: () => {
            const saved = LocalStore.get('catalog', []);
            const updated = saved.filter(t => String(t.id) !== String(btn.dataset.id));
            LocalStore.set('catalog', updated);
            if (typeof loadCatalog === 'function') loadCatalog();
            if (typeof renderCatalogSearch === 'function') renderCatalogSearch();
            showToast('Removed from catalog');
          }
        });
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
        if (track && typeof showAddToPlaylistModal === 'function') showAddToPlaylistModal(track);
      });
    });
  }

  /* ═══════════════════════════════════════
     QUEUE
     ═══════════════════════════════════════ */
  function addToQueue(track) {
    S.queue.push(track);
    saveQueue();
    showToast('Added to queue');
    if (S.view === 'queue') renderQueue();
  }

  function renderQueue() {
    const container = document.getElementById('queue-content');
    if (!container) return;

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
    document.getElementById('modal-cancel')?.addEventListener('click', hideModal);
    document.getElementById('modal-confirm-btn')?.addEventListener('click', () => {
      hideModal();
      onConfirm();
    });
  }

  const clearQueueBtn = document.getElementById('clear-queue-btn');
  if (clearQueueBtn) {
    clearQueueBtn.addEventListener('click', () => {
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
  }

  /* ═══════════════════════════════════════
     SYNTHETIC AUDIO GENERATOR FOR OFFLINE TRACKS
     ═══════════════════════════════════════ */
  const generatedAudioMap = new Map();
  function getOrGenerateSyntheticAudio(track) {
    if (!track) return '';
    if (track.audioUrl && track.audioUrl.trim()) return track.audioUrl;
    if (generatedAudioMap.has(track.id)) return generatedAudioMap.get(track.id);

    try {
      const sampleRate = 22050;
      const durationSec = 30;
      const numSamples = sampleRate * durationSec;
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

      function writeString(offset, str) {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      }
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, numSamples * 2, true);

      let hash = 0;
      const idStr = String(track.id || 'track');
      for (let i = 0; i < idStr.length; i++) hash = (hash * 31 + idStr.charCodeAt(i)) & 0xffff;
      const baseFreq = 220 + (hash % 160);
      const chordRatios = [1, 1.25, 1.5, 1.875];

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.sin((Math.PI * (i % (sampleRate * 5))) / (sampleRate * 5));
        let sample = 0;
        chordRatios.forEach((ratio, idx) => {
          sample += Math.sin(2 * Math.PI * baseFreq * ratio * t) * (0.28 / (idx + 1));
          sample += Math.sin(2 * Math.PI * (baseFreq * ratio * 0.5) * t) * 0.12;
        });
        sample *= envelope * 0.45;
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      generatedAudioMap.set(track.id, url);
      return url;
    } catch (e) {
      return '';
    }
  }
  window.getOrGenerateSyntheticAudio = getOrGenerateSyntheticAudio;

  /* ═══════════════════════════════════════
     OFFLINE PLAYBACK ENGINE
     ═══════════════════════════════════════ */
  let activePlayRequestId = 0;

  async function playTrack(track, addToQ = true) {
    if (!track) return;

    if (typeof window.primeAudioEngine === 'function') {
      window.primeAudioEngine();
    }

    activePlayRequestId++;
    const currentReqId = activePlayRequestId;

    try { audio.pause(); } catch(e) {}

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

    let audioSource = track.audioUrl || track.src || track.url;
    if (!audioSource) {
      audioSource = getOrGenerateSyntheticAudio(track);
    }
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
      }
    } catch (err) {
      if (currentReqId !== activePlayRequestId) return;
      console.error('[Offline Audio Playback Error]', err);
      S.isLoading = false;
      S.isPlaying = false;
      updatePlayerBar();
      if (err.name === 'NotAllowedError') {
        if (typeof window.showPlaybackErrorBanner === 'function') {
          window.showPlaybackErrorBanner('Tap play to start audio playback.');
        }
      }
    }
  }

  async function addToRecent(track) {
    S.recent = (S.recent || []).filter(t => t.id !== track.id);
    S.recent.unshift({
      id: track.id,
      title: track.title,
      artist: track.artist,
      thumbnail: track.thumbnail,
      duration: track.duration,
      audioUrl: track.audioUrl || track.src || track.url
    });
    if (S.recent.length > 50) S.recent.length = 50;
    ipcRenderer.invoke('write-recent', S.recent);
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
    if (typeof ipcRenderer !== 'undefined' && ipcRenderer && ipcRenderer.invoke) {
      ipcRenderer.invoke('write-queue', { queue: S.queue, queueIndex: S.queueIndex });
    } else if (typeof LocalStore !== 'undefined' && LocalStore.set) {
      LocalStore.set('queue', { queue: S.queue, queueIndex: S.queueIndex });
    }
  }

  /* ═══════════════════════════════════════
     SEARCH & SONG CATALOG VIEW
     ═══════════════════════════════════════ */
  function renderCatalogSearch() {
    const viewSearch = document.getElementById('view-search');
    if (!viewSearch) return;

    const input = document.getElementById('catalog-search-input');
    const clearBtn = document.getElementById('catalog-search-clear');
    const chipsContainer = document.getElementById('catalog-filter-chips');
    const countBadge = document.getElementById('catalog-count-badge');
    const sortSelect = document.getElementById('catalog-sort-select');
    const layoutToggle = document.getElementById('catalog-layout-toggle');
    const container = document.getElementById('catalog-tracks-container');
    const fileInput = document.getElementById('catalog-file-input');

    if (!container) return;

    if (typeof loadCatalog === 'function') loadCatalog();

    function renderCatalogTracks() {
      // Gather all songs from catalog
      const allSongs = [...(S.catalog || [])];

      // Also gather tracks from Liked Songs and other playlists if not already in catalog
      const likedPl = (S.playlists || []).find(p => p.id === 'liked_songs' || p.isLiked);
      const likedTrackIds = new Set((likedPl ? likedPl.tracks : []).map(t => String(t.id)));
      const recentTrackIds = new Set((S.recent || []).map(t => String(t.id)));

      (S.playlists || []).forEach(pl => {
        (pl.tracks || []).forEach(pt => {
          if (!allSongs.some(t => String(t.id) === String(pt.id))) {
            allSongs.push(pt);
          }
        });
      });

      const query = String(input && input.value || '').trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = query ? 'flex' : 'none';

      const activeFilter = S.catalogFilter || 'all';

      // 1. Filter by category chip
      let filtered = allSongs.filter(t => {
        if (activeFilter === 'recent') return recentTrackIds.has(String(t.id));
        if (activeFilter === 'liked') return likedTrackIds.has(String(t.id));
        if (activeFilter === 'local') return !!t.isLocal;
        return true;
      });

      // 2. Filter by search query (title, artist, album, genre)
      if (query) {
        filtered = filtered.filter(t => {
          const title = (t.title || '').toLowerCase();
          const artist = (t.artist || '').toLowerCase();
          const album = (t.album || '').toLowerCase();
          const genre = (t.genre || '').toLowerCase();
          return title.includes(query) || artist.includes(query) || album.includes(query) || genre.includes(query);
        });
      }

      // 3. Sorting
      const sortMode = S.catalogSort || (sortSelect ? sortSelect.value : 'default');
      if (sortMode === 'title') {
        filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      } else if (sortMode === 'artist') {
        filtered.sort((a, b) => (a.artist || '').localeCompare(b.artist || ''));
      } else if (sortMode === 'duration') {
        filtered.sort((a, b) => (a.duration || 0) - (b.duration || 0));
      }

      // 4. Update count badge
      if (countBadge) {
        if (query) {
          countBadge.textContent = `${filtered.length} of ${allSongs.length} song${allSongs.length !== 1 ? 's' : ''} found`;
        } else {
          countBadge.textContent = `${filtered.length} song${filtered.length !== 1 ? 's' : ''} in catalog`;
        }
      }

      // 5. Update layout toggle icon state
      if (layoutToggle) {
        layoutToggle.classList.toggle('active', !!S.catalogGridMode);
      }

      // 6. Render list or grid
      if (filtered.length === 0) {
        if (query) {
          container.innerHTML = `
            <div class="empty-state" style="padding: 48px 20px;">
              <svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
              <h3>No songs found</h3>
              <p style="margin-bottom: 16px;">No songs in your catalog match "${esc(query)}".</p>
              <button class="modal-btn secondary" id="catalog-clear-search-btn" style="padding: 8px 18px; border-radius: var(--radius-pill); font-size: 13px;">Clear Search</button>
            </div>
          `;
          document.getElementById('catalog-clear-search-btn')?.addEventListener('click', () => {
            if (input) {
              input.value = '';
              renderCatalogTracks();
              input.focus();
            }
          });
        } else {
          container.innerHTML = `
            <div class="empty-state" style="padding: 48px 20px;">
              <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
              <h3>No songs in this filter</h3>
              <p style="margin-bottom: 16px;">Import your downloaded audio files, or switch back to "All Songs".</p>
              <label for="catalog-file-input" class="catalog-import-btn" style="display: inline-flex;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                <span>Import Music Files</span>
              </label>
            </div>
          `;
        }
        return;
      }

      if (S.catalogGridMode) {
        container.innerHTML = `
          <div class="card-grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px;">
            ${filtered.map(t => `
              <div class="track-card" data-id="${t.id}">
                <div class="card-thumb">
                  <img src="${t.thumbnail || ''}" alt="" onerror="this.style.display='none'" />
                  <button class="card-play-btn" data-id="${t.id}">${SVG.play}</button>
                  <div class="card-hover-actions">
                    <button class="card-act-btn card-queue-btn" data-id="${t.id}" title="Add to Queue">${SVG.queue}</button>
                    <button class="card-act-btn card-playlist-btn" data-id="${t.id}" title="Add to Playlist">${SVG.plus}</button>
                    ${t.isLocal ? `<button class="card-act-btn card-delete-local" data-id="${t.id}" title="Remove">${SVG.trash}</button>` : ''}
                  </div>
                </div>
                <div class="card-title" title="${esc(t.title)}">${esc(t.title)}</div>
                <div class="card-artist">${esc(t.artist || 'Offline Music')}</div>
              </div>
            `).join('')}
          </div>
        `;

        container.querySelectorAll('.card-play-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const track = filtered.find(t => String(t.id) === String(btn.dataset.id));
            if (track) playTrack({ ...track });
          });
        });

        container.querySelectorAll('.card-queue-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const track = filtered.find(t => String(t.id) === String(btn.dataset.id));
            if (track) addToQueue({ ...track });
          });
        });

        container.querySelectorAll('.card-playlist-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const track = filtered.find(t => String(t.id) === String(btn.dataset.id));
            if (track && typeof showAddToPlaylistModal === 'function') showAddToPlaylistModal(track);
          });
        });

        container.querySelectorAll('.card-delete-local').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const track = filtered.find(t => String(t.id) === String(btn.dataset.id));
            const title = track ? track.title : 'this song';
            confirmAction({
              title: 'Remove Song',
              message: `Are you sure you want to remove "${title}" from your catalog?`,
              actionText: 'Remove',
              onConfirm: () => {
                const saved = LocalStore.get('catalog', []);
                const updated = saved.filter(t => String(t.id) !== String(btn.dataset.id));
                LocalStore.set('catalog', updated);
                if (typeof loadCatalog === 'function') loadCatalog();
                renderCatalogTracks();
                showToast('Removed from catalog');
              }
            });
          });
        });

        container.querySelectorAll('.track-card').forEach(card => {
          card.addEventListener('click', (e) => {
            if (e.target.closest('.card-act-btn') || e.target.closest('.card-play-btn')) return;
            const track = filtered.find(t => String(t.id) === String(card.dataset.id));
            if (track) playTrack({ ...track });
          });
        });
      } else {
        container.innerHTML = '<div class="track-list">' + filtered.map((t, i) => trackRow(t, i + 1, 'catalog')).join('') + '</div>';
        bindTrackRowEvents(container, filtered);
      }
    }

    // Attach listeners once
    if (input && !input._bound) {
      input._bound = true;
      input.addEventListener('input', () => renderCatalogTracks());
    }

    if (clearBtn && !clearBtn._bound) {
      clearBtn._bound = true;
      clearBtn.addEventListener('click', () => {
        if (input) {
          input.value = '';
          renderCatalogTracks();
          input.focus();
        }
      });
    }

    if (chipsContainer && !chipsContainer._bound) {
      chipsContainer._bound = true;
      chipsContainer.querySelectorAll('.mood-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          chipsContainer.querySelectorAll('.mood-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          S.catalogFilter = chip.dataset.filter || 'all';
          renderCatalogTracks();
        });
      });
    }

    if (sortSelect && !sortSelect._bound) {
      sortSelect._bound = true;
      sortSelect.addEventListener('change', () => {
        S.catalogSort = sortSelect.value;
        renderCatalogTracks();
      });
    }

    if (layoutToggle && !layoutToggle._bound) {
      layoutToggle._bound = true;
      layoutToggle.addEventListener('click', () => {
        S.catalogGridMode = !S.catalogGridMode;
        LocalStore.set('catalog-grid-mode', S.catalogGridMode);
        renderCatalogTracks();
      });
    }

    // File Importer
    if (fileInput && !fileInput._bound) {
      fileInput._bound = true;
      fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newTracks = [];
        const gradients = [
          ['#FF512F', '#DD2476'],
          ['#4776E6', '#8E54E9'],
          ['#00b09b', '#96c93d'],
          ['#f857a6', '#ff5858'],
          ['#1FA2FF', '#12D8FA'],
          ['#7F00FF', '#E100FF'],
          ['#F953C6', '#B91D73'],
          ['#F12711', '#F5AF19']
        ];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          let name = file.name.replace(/\.[^/.]+$/, "");
          let artist = 'Local Artist';
          let title = name;

          if (name.includes(' - ')) {
            const parts = name.split(' - ');
            artist = parts[0].trim();
            title = parts.slice(1).join(' - ').trim();
          }

          const grad = gradients[Math.floor(Math.random() * gradients.length)];
          const trackId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
          const audioUrl = URL.createObjectURL(file);

          let duration = 0;
          try {
            const tempAudio = new Audio();
            tempAudio.src = audioUrl;
            await new Promise(resolve => {
              tempAudio.addEventListener('loadedmetadata', () => {
                duration = Math.round(tempAudio.duration) || 0;
                resolve();
              }, { once: true });
              setTimeout(resolve, 600);
            });
          } catch (_) {}

          newTracks.push({
            id: trackId,
            title,
            artist,
            album: 'Imported Music',
            duration: duration || 180,
            genre: 'Downloaded',
            thumbnail: (typeof createArtSvg === 'function')
              ? createArtSvg(grad[0], grad[1], title.slice(0, 8).toUpperCase(), artist)
              : '',
            audioUrl,
            isLocal: true,
            fileName: file.name
          });
        }

        const existing = LocalStore.get('catalog', []);
        const updated = [...newTracks, ...existing];
        LocalStore.set('catalog', updated);
        if (typeof loadCatalog === 'function') loadCatalog();
        renderCatalogTracks();
        showToast(`Imported ${newTracks.length} song${newTracks.length > 1 ? 's' : ''} into catalog`);
        fileInput.value = '';
      });
    }

    // Drag and drop audio files onto view-search
    if (!viewSearch._dropBound) {
      viewSearch._dropBound = true;
      viewSearch.addEventListener('dragover', (e) => {
        e.preventDefault();
        viewSearch.classList.add('drag-over');
      });
      viewSearch.addEventListener('dragleave', () => {
        viewSearch.classList.remove('drag-over');
      });
      viewSearch.addEventListener('drop', (e) => {
        e.preventDefault();
        viewSearch.classList.remove('drag-over');
        if (e.dataTransfer && e.dataTransfer.files && fileInput) {
          fileInput.files = e.dataTransfer.files;
          fileInput.dispatchEvent(new Event('change'));
        }
      });
    }

    // Initial render
    renderCatalogTracks();
  }

  window.renderCatalogSearch = renderCatalogSearch;
  window.addToQueue = addToQueue;
  window.renderQueue = renderQueue;
  window.saveQueue = saveQueue;
  window.playNext = playNext;
  window.playPrev = playPrev;
  window.playTrack = playTrack;
  window.renderHome = renderHome;
  window.trackRow = trackRow;
  window.bindTrackRowEvents = bindTrackRowEvents;
  window.confirmAction = confirmAction;

})();
