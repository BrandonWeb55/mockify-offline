/**
 * Mockify Offline — Views & Playback Engine
 * Pure offline player views: Home, Queue, Playlist, and Local Playback.
 */
(function() {
  'use strict';

  /* ── Greeting ── */
  (function() {
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      const h = new Date().getHours();
      greetingEl.textContent = h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
    }
  })();

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

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
    const dragAttr = isPlaylist ? 'draggable="true"' : '';
    const dragHandle = isPlaylist ? `<div class="pl-drag-handle" title="Drag to reorder">${SVG.dragHandle}</div>` : '';
    const rowIndicator = playing
      ? `<div class="mini-eq ${S.isPlaying ? '' : 'paused'}"><span class="eq-bar bar-1"></span><span class="eq-bar bar-2"></span><span class="eq-bar bar-3"></span></div>`
      : (num !== undefined ? num : '');

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
    ipcRenderer.invoke('save-queue', { queue: S.queue, queueIndex: S.queueIndex });
  }

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
