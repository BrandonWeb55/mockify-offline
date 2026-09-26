/**
 * Mockify Offline — Core Application State & Storage Adapter
 * Pure client-side state and localStorage persistence.
 */
(function() {
  'use strict';

  const audio = document.getElementById('audio');
  window.audio = audio;

  /* ── Safe Local Storage Adapter ── */
  const LocalStore = {
    get: (key, fallback) => {
      try {
        const item = localStorage.getItem('mockify_' + key) || localStorage.getItem('mockify-' + key);
        return item ? JSON.parse(item) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem('mockify_' + key, JSON.stringify(value));
        localStorage.setItem('mockify-' + key, JSON.stringify(value));
      } catch (e) {}
    },
    remove: (key) => {
      try {
        localStorage.removeItem('mockify_' + key);
        localStorage.removeItem('mockify-' + key);
      } catch (e) {}
    }
  };
  window.LocalStore = LocalStore;

  /* ── IPC Shim for Zero-Error Web Compatibility ── */
  const ipcRenderer = {
    invoke: async (channel, ...args) => {
      switch (channel) {
        case 'read-playlists': {
          const pls = LocalStore.get('playlists', []);
          if (Array.isArray(pls)) {
            pls.forEach(p => {
              if (Array.isArray(p.tracks)) {
                p.tracks = p.tracks.filter(t => t && !String(t.id).startsWith('catalog-song-') && !t.isHardcoded);
              }
            });
          }
          return pls;
        }
        case 'write-playlists':
          LocalStore.set('playlists', args[0]);
          return { success: true };
        case 'read-settings':
          return S.settings;
        case 'write-settings':
          S.settings = Object.assign({}, S.settings, args[0]);
          LocalStore.set('settings', S.settings);
          return { success: true };
        case 'read-recent': {
          const rec = LocalStore.get('recent', []);
          return Array.isArray(rec) ? rec.filter(t => t && !String(t.id).startsWith('catalog-song-') && !t.isHardcoded) : [];
        }
        case 'write-recent':
          LocalStore.set('recent', args[0]);
          return { success: true };
        case 'read-queue': {
          const qData = LocalStore.get('queue', { queue: [], queueIndex: -1 });
          if (qData && Array.isArray(qData.queue)) {
            qData.queue = qData.queue.filter(t => t && !String(t.id).startsWith('catalog-song-') && !t.isHardcoded);
          }
          return qData;
        }
        case 'write-queue':
        case 'save-queue':
          LocalStore.set('queue', args[0]);
          return { success: true };
        case 'read-last-state': {
          const ls = LocalStore.get('last-state', null) || (function() {
            try { return JSON.parse(localStorage.getItem('mockify-last-state')); } catch (_) { return null; }
          })();
          if (ls && ls.track && (String(ls.track.id).startsWith('catalog-song-') || ls.track.isHardcoded || (ls.track.audioUrl && ls.track.audioUrl.startsWith('blob:')))) {
            LocalStore.remove('last-state');
            try { localStorage.removeItem('mockify-last-state'); } catch (_) {}
            return null;
          }
          return ls;
        }
        case 'write-last-state':
          LocalStore.set('last-state', args[0]);
          return { success: true };
        case 'fetch-lyrics':
          return { plain: '', synced: null };
        default:
          return null;
      }
    },
    send: () => {},
    on: () => {},
    removeListener: () => {}
  };
  window.ipcRenderer = ipcRenderer;

  /* ── SVG icon helpers ── */
  const SVG = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>',
    queue: '<svg viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h12v2H3v-2zm16-2v4h2v-4h4v-2h-4V8h-2v4h-4v2h4z"/></svg>',
    remove: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
    playlist: '<svg viewBox="0 0 24 24"><path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/></svg>',
    volHigh: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.14v7.72A4.49 4.49 0 0016.5 12zM14 3.23v2.06a6.51 6.51 0 010 13.42v2.06A8.5 8.5 0 0014 3.23z"/></svg>',
    search: '<svg viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    dragHandle: '<svg viewBox="0 0 24 24"><path d="M20 9H4v2h16V9zM4 15h16v-2H4v2z"/></svg>',
    volLow: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.14v7.72A4.49 4.49 0 0016.5 12z"/></svg>',
    volMute: '<svg viewBox="0 0 24 24"><path d="M16.5 12A4.5 4.5 0 0014 8.14v2.7l2.45 2.45c.03-.1.05-.2.05-.29zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.87 8.87 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4l-1.88 1.88L12 7.76V4z"/></svg>',
    repeat: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
    repeatOne: '<svg viewBox="0 0 24 24"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><text x="12" y="14.5" font-size="8.5" font-weight="bold" text-anchor="middle" fill="currentColor">1</text></svg>',
  };
  window.SVG = SVG;

  const defaultSettings = {
    accent: '#DC143C',
    textColor: '#ffffff',
    textSecColor: '#a7a7a7',
    volume: 80,
    muted: false,
    spaceBg: true,
    spaceBrightness: 60,
    spaceSize: 10,
    spaceDensity: 300,
    spaceComets: 5,
    spaceStarColor: '#ffffff',
    spaceCometColor: '#00f3ff',
    spaceBgColor: '#0e1830',
    coverSpin: true,
    confirmDelete: true,
    compactMode: false,
    appFont: "'Inter', sans-serif"
  };

  // Synchronously restore saved settings so all modules have user customizations immediately
  const savedSettings = LocalStore.get('settings', {});
  const initialSettings = Object.assign({}, defaultSettings, savedSettings);

  // Apply base CSS custom properties right away
  try {
    const root = document.documentElement;
    root.style.setProperty('--accent', initialSettings.accent);
    root.style.setProperty('--accent-hover', initialSettings.accent);
    root.style.setProperty('--text-primary', initialSettings.textColor);
    root.style.setProperty('--text-secondary', initialSettings.textSecColor);
    root.style.setProperty('--app-font', initialSettings.appFont);
  } catch (_) {}

  /* ═══════════════════════════════════════════════════════════════════
     HARDCODED OFFLINE SONG CATALOG
     Easily add or edit songs you have downloaded or bundled into the app.
     Add items to this array with your own audio files, titles, and artwork!
     Format:
       id: Unique identifier
       title: Song title
       artist: Artist name
       album: Album name
       duration: Length in seconds
       genre: Category/genre tag
       thumbnail: Image path, URL, or data URI
       audioUrl: Path to audio file (e.g. 'assets/music/song.mp3') or empty for synth
     ═══════════════════════════════════════════════════════════════════ */
  function createArtSvg(color1, color2, iconText, subtitle) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
      <defs>
        <linearGradient id="g_${iconText}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color1}" />
          <stop offset="100%" stop-color="${color2}" />
        </linearGradient>
      </defs>
      <rect width="300" height="300" rx="16" fill="url(#g_${iconText})" />
      <circle cx="150" cy="150" r="82" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="4" />
      <circle cx="150" cy="150" r="44" fill="rgba(0,0,0,0.35)" />
      <circle cx="150" cy="150" r="16" fill="${color1}" />
      <text x="150" y="240" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="1">${iconText}</text>
      <text x="150" y="265" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="rgba(255,255,255,0.7)" text-anchor="middle">${subtitle}</text>
    </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  window.createArtSvg = createArtSvg;

  const HARDCODED_SONGS = [];
  window.HARDCODED_SONGS = HARDCODED_SONGS;

  /* ── Catalog Loader ── */
  function loadCatalog() {
    const saved = LocalStore.get('catalog', []);
    // Prune out any legacy mock hardcoded song IDs from local storage
    const cleaned = saved.filter(t => !String(t.id).startsWith('catalog-song-'));
    if (cleaned.length !== saved.length) {
      LocalStore.set('catalog', cleaned);
    }
    const combined = [...HARDCODED_SONGS, ...cleaned];
    if (typeof S !== 'undefined' && S) {
      S.catalog = combined;
    }
    return combined;
  }
  window.loadCatalog = loadCatalog;

  /* ── Global State ── */
  const S = {
    view: 'home',
    queue: [],
    queueIndex: -1,
    isPlaying: false,
    isLoading: false,
    shuffle: false,
    repeat: 'none',
    volume: initialSettings.volume !== undefined ? initialSettings.volume : 80,
    muted: initialSettings.muted !== undefined ? initialSettings.muted : false,
    currentTrack: null,
    searchResults: [],
    catalog: [],
    catalogFilter: 'all',
    catalogSort: 'default',
    catalogGridMode: LocalStore.get('catalog-grid-mode', false),
    playlists: [],
    viewingPlaylist: null,
    recent: [],
    showToasts: false,
    settings: initialSettings,
  };
  window.S = S;
  S.catalog = loadCatalog();

  /* ── Utilities ── */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  window.esc = esc;

  function fmt(s) {
    if (!s || !isFinite(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }
  window.fmt = fmt;

  function updateSliderFill(slider, pct) {
    if (slider) slider.style.setProperty('--fill', pct + '%');
  }
  window.updateSliderFill = updateSliderFill;

  function showToast(msg, type = 'success') {
    // Non-intrusive toast logger
    console.log(`[Toast ${type}]`, msg);
  }
  window.showToast = showToast;

  /* ── View Switcher ── */
  function showView(name) {
    if (!name) return;
    S.view = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById('view-' + name);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.remove('active');
      if (n.hasAttribute('aria-selected')) n.setAttribute('aria-selected', 'false');
    });

    document.querySelectorAll(`.nav-item[data-view="${name}"]`).forEach(n => {
      n.classList.add('active');
      if (n.hasAttribute('aria-selected')) n.setAttribute('aria-selected', 'true');
    });

    document.querySelectorAll('.playlist-list-item').forEach(p => p.classList.remove('active'));
    
    const btnLyrics = document.getElementById('btn-lyrics');
    if (btnLyrics) {
      if (name === 'lyrics') btnLyrics.classList.add('active');
      else btnLyrics.classList.remove('active');
    }

    if (name === 'home' && typeof window.renderHome === 'function') window.renderHome();
    if (name === 'search' && typeof window.renderCatalogSearch === 'function') window.renderCatalogSearch();
    if (name === 'queue' && typeof window.renderQueue === 'function') window.renderQueue();
    if (name === 'library' && typeof window.renderPlaylists === 'function') window.renderPlaylists();
    if (name === 'lyrics' && S.currentTrack && typeof window.fetchAndRenderLyrics === 'function') {
      window.fetchAndRenderLyrics(S.currentTrack);
    }
  }
  window.showView = showView;

  // Global event delegation for all .nav-item elements (desktop sidebar, mobile bar, header, buttons)
  document.addEventListener('click', (e) => {
    const navBtn = e.target.closest('.nav-item');
    if (navBtn && navBtn.dataset && navBtn.dataset.view) {
      e.preventDefault();
      showView(navBtn.dataset.view);
    }
  });

  // Direct element binding for existing nav items
  document.querySelectorAll('.nav-item').forEach(n => {
    n.addEventListener('click', (e) => {
      if (n.dataset && n.dataset.view) {
        e.preventDefault();
        showView(n.dataset.view);
      }
    });
  });

})();
