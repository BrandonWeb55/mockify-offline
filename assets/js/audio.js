  /* ── Universal Gesture Unlock & Audio Priming ── */
  let audioUnlocked = false;
  function primeAudioEngine() {
    if (audioUnlocked) return;
    try {
      if (!audio.src) {
        // Feed an ultra-short base64 silent WAV so iOS Safari & Mobile Chrome activate the media pipeline
        const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        audio.src = silentWav;
        const p = audio.play();
        if (p !== undefined) {
          p.then(() => {
            audio.pause();
            audio.currentTime = 0;
            audioUnlocked = true;
          }).catch(() => {});
        } else {
          audio.pause();
          audio.currentTime = 0;
          audioUnlocked = true;
        }
      } else {
        audioUnlocked = true;
      }
    } catch (e) {}
  }
  window.primeAudioEngine = primeAudioEngine;

  ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(ev => {
    document.addEventListener(ev, primeAudioEngine, { once: true, passive: true });
  });

  /* ── Audio events ── */
  audio.addEventListener('play', () => { S.isPlaying = true; updatePlayBtn(); updateTrackRowHighlights(); });
  audio.addEventListener('pause', () => { S.isPlaying = false; updatePlayBtn(); updateTrackRowHighlights(); });
  audio.addEventListener('ended', () => { S.isPlaying = false; updatePlayBtn(); playNext(); });
  audio.addEventListener('loadedmetadata', () => {
    document.getElementById('time-dur').textContent = fmt(audio.duration);
    document.getElementById('progress-slider').max = audio.duration || 100;
  });

  let seeking = false;
  let saveStateTimeout = null;
  function saveLastState(force = false) {
    if (!S.currentTrack) return;
    const data = {
      track: S.currentTrack,
      currentTime: audio.currentTime || 0,
      queueIndex: S.queueIndex
    };
    try {
      localStorage.setItem('mockify-last-state', JSON.stringify(data));
    } catch(e) {}
  }

  window.addEventListener('beforeunload', () => { saveLastState(true); });

  let timeupdateRaf = null;
  audio.addEventListener('timeupdate', () => {
    if (seeking) return;
    if (timeupdateRaf) return;
    timeupdateRaf = requestAnimationFrame(() => {
      timeupdateRaf = null;
      const slider = document.getElementById('progress-slider');
      slider.value = audio.currentTime;
      document.getElementById('time-cur').textContent = fmt(audio.currentTime);
      const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      updateSliderFill(slider, pct);

      // Sync Miniplayer slider & timers
      const mpSlider = document.getElementById('mp-progress-slider');
      if (mpSlider) {
        mpSlider.value = audio.currentTime;
        document.getElementById('mp-time-cur').textContent = fmt(audio.currentTime);
        document.getElementById('mp-time-dur').textContent = fmt(audio.duration || 0);
        const mpPct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        updateSliderFill(mpSlider, mpPct);
      }

      // Sync Mobile / Full-Screen Overlay progress slider & timestamps
      const mnpSlider = document.getElementById('mnp-progress-slider');
      if (mnpSlider && !window.mnpSeeking) {
        const dur = audio.duration || (S.currentTrack ? S.currentTrack.duration : 0) || 0;
        const cur = audio.currentTime || 0;
        mnpSlider.value = cur;
        mnpSlider.max = dur || 100;
        const curEl = document.getElementById('mnp-time-cur');
        const remEl = document.getElementById('mnp-time-rem');
        if (curEl) curEl.textContent = fmt(cur);
        if (remEl) {
          const rem = Math.max(0, dur - cur);
          remEl.textContent = '-' + fmt(rem);
        }
        const mnpPct = dur ? (cur / dur) * 100 : 0;
        updateSliderFill(mnpSlider, mnpPct);
      }

      // Sync Mobile Floating Card Bottom Progress Line
      const mbpFill = document.getElementById('mbp-fill');
      if (mbpFill) {
        const mbpPct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        mbpFill.style.width = mbpPct + '%';
      }

      updateLyricsSync(audio.currentTime);
      saveLastState();
    });
  });

  const progressSlider = document.getElementById('progress-slider');
  progressSlider.addEventListener('mousedown', () => { seeking = true; });
  progressSlider.addEventListener('input', () => {
    document.getElementById('time-cur').textContent = fmt(progressSlider.value);
    const pct = audio.duration ? (progressSlider.value / audio.duration) * 100 : 0;
    updateSliderFill(progressSlider, pct);
  });
  progressSlider.addEventListener('change', () => { audio.currentTime = Number(progressSlider.value); seeking = false; });

  audio.addEventListener('error', (e) => {
    const err = audio.error;
    const codeMap = {
      1: 'MEDIA_ERR_ABORTED (aborted)',
      2: 'MEDIA_ERR_NETWORK (network error)',
      3: 'MEDIA_ERR_DECODE (corrupt or unsupported format)',
      4: 'MEDIA_ERR_SRC_NOT_SUPPORTED (file not found or unsupported format)'
    };
    console.error('[Audio Error]', {
      code: err?.code,
      meaning: codeMap[err?.code] || 'UNKNOWN',
      message: err?.message,
      currentSrc: audio.currentSrc || audio.src
    });
    const wasActive = S.isPlaying || S.isLoading;
    S.isLoading = false;
    S.isPlaying = false;
    updatePlayerBar();
  });

  function formatSubs(num, text) {
    if (text) return text;
    return 'Offline Library';
  }

  /* ── Standalone Miniplayer IPC Synchronization ── */
  function broadcastStateToMiniplayer() {
    ipcRenderer.send('sync-state-update', {
      track: S.currentTrack,
      isPlaying: S.isPlaying,
      currentTime: audio.currentTime || 0,
      duration: audio.duration || 0,
      volume: S.volume,
      muted: S.muted,
      shuffle: S.shuffle,
      repeat: S.repeat,
      accent: S.settings.accent || '#DC143C',
      textColor: S.settings.textColor || '#ffffff',
      textSecColor: S.settings.textSecColor || '#a7a7a7',
      appFont: S.settings.appFont || "'Outfit', sans-serif"
    });
  }

  function updateMiniplayerUI() {
    broadcastStateToMiniplayer();
  }

  /* ═══════════════════════════════════════
     STANDALONE MINIPLAYER CONTROLLER (IPC)
     ═══════════════════════════════════════ */
  const btnMiniplayer = document.getElementById('btn-miniplayer');
  if (btnMiniplayer) {
    btnMiniplayer.addEventListener('click', () => {
      ipcRenderer.send('open-miniplayer-window');
    });
  }

  ipcRenderer.on('request-sync-state', () => {
    broadcastStateToMiniplayer();
  });

  ipcRenderer.on('execute-action', (_event, action) => {
    if (!action) return;
    switch (action.type) {
      case 'request-state':
        broadcastStateToMiniplayer();
        break;
      case 'toggle-play':
        if (S.currentTrack) {
          S.isPlaying ? audio.pause() : audio.play().catch(() => {});
        }
        break;
      case 'play-prev':
        playPrev();
        break;
      case 'play-next':
        playNext();
        break;
      case 'toggle-shuffle':
        S.shuffle = !S.shuffle;
        document.getElementById('btn-shuffle').classList.toggle('active', S.shuffle);
        broadcastStateToMiniplayer();
        break;
      case 'toggle-repeat':
        const modes = ['none', 'all', 'one'];
        S.repeat = modes[(modes.indexOf(S.repeat) + 1) % 3];
        updateRepeatBtn();
        broadcastStateToMiniplayer();
        break;
      case 'toggle-mute':
        S.muted = !S.muted;
        updateVolume();
        break;
      case 'set-volume':
        S.volume = action.value;
        S.muted = false;
        volSlider.value = S.volume;
        updateVolume();
        saveSettings();
        break;
      case 'seek':
        audio.currentTime = action.value;
        break;
      case 'add-to-playlist':
        if (S.currentTrack) showAddToPlaylistModal(S.currentTrack);
        break;
      case 'focus-main-window':
        ipcRenderer.send('window-maximize');
        break;
    }
  });

  /* ── Dynamic Device Detection ── */
  function getActiveDeviceName() {
    const ua = navigator.userAgent || '';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) {
      if (/Mobile/i.test(ua)) return 'Android Device';
      return 'Android Tablet';
    }
    if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Linux/i.test(ua)) return 'Linux Device';
    return 'This Device';
  }

  /* ── Dynamic Theming: Color Quantization & Dominant Color Extraction for Overlay ── */
  function updateNowPlayingTheme(thumbnailUrl) {
    const pb = document.querySelector('.player-bar');
    const overlay = document.getElementById('mobile-np-overlay');
    const setSolidTheme = (r, g, b, darkR, darkG, darkB) => {
      if (overlay) {
        overlay.style.setProperty('--mnp-theme-r', r);
        overlay.style.setProperty('--mnp-theme-g', g);
        overlay.style.setProperty('--mnp-theme-b', b);
        overlay.style.setProperty('--mnp-theme-dark-r', darkR);
        overlay.style.setProperty('--mnp-theme-dark-g', darkG);
        overlay.style.setProperty('--mnp-theme-dark-b', darkB);
      }
    };

    if (!thumbnailUrl) {
      if (pb) pb.style.removeProperty('--dynamic-bg');
      setSolidTheme(38, 40, 50, 16, 17, 22);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;

        // Color quantization with balanced area dominance + saturation weighting
        const step = 36;
        const buckets = new Map();
        let totalValid = 0;
        let totalR = 0, totalG = 0, totalB = 0;

        for (let i = 0; i < data.length; i += 4) {
          const red = data[i], green = data[i + 1], blue = data[i + 2], alpha = data[i + 3];
          if (alpha < 128) continue;
          const br = (red * 299 + green * 587 + blue * 114) / 1000;
          // Filter out specular white glare and pure black shadows
          if (br < 18 || br > 248) continue;

          totalValid++;
          totalR += red; totalG += green; totalB += blue;

          const qR = Math.floor(red / step) * step;
          const qG = Math.floor(green / step) * step;
          const qB = Math.floor(blue / step) * step;
          const key = (qR << 16) | (qG << 8) | qB;

          let bkt = buckets.get(key);
          if (!bkt) {
            bkt = { count: 0, sumR: 0, sumG: 0, sumB: 0 };
            buckets.set(key, bkt);
          }
          bkt.count++;
          bkt.sumR += red;
          bkt.sumG += green;
          bkt.sumB += blue;
        }

        let themeR = 38, themeG = 40, themeB = 50;
        if (totalValid > 0 && buckets.size > 0) {
          let maxScore = -1;
          for (const bkt of buckets.values()) {
            const avgR = Math.round(bkt.sumR / bkt.count);
            const avgG = Math.round(bkt.sumG / bkt.count);
            const avgB = Math.round(bkt.sumB / bkt.count);

            const max = Math.max(avgR, avgG, avgB);
            const min = Math.min(avgR, avgG, avgB);
            const sat = max === 0 ? 0 : (max - min) / max;
            const br = (avgR * 299 + avgG * 587 + avgB * 114) / 1000;

            const population = bkt.count / totalValid;
            const lumaScore = (br >= 35 && br <= 215) ? 1.2 : 0.8;
            const score = population * Math.pow(sat + 0.25, 0.85) * lumaScore;

            if (score > maxScore) {
              maxScore = score;
              themeR = avgR;
              themeG = avgG;
              themeB = avgB;
            }
          }
        } else if (totalValid > 0) {
          themeR = Math.round(totalR / totalValid);
          themeG = Math.round(totalG / totalValid);
          themeB = Math.round(totalB / totalValid);
        }

        // Contrast and vibrancy normalization:
        // Ensure background is not overly bright so white controls/titles remain crisp
        const luma = (themeR * 299 + themeG * 587 + themeB * 114) / 1000;
        if (luma > 175) {
          const factor = 175 / luma;
          themeR = Math.round(themeR * factor);
          themeG = Math.round(themeG * factor);
          themeB = Math.round(themeB * factor);
        } else if (luma < 36) {
          const factor = 36 / Math.max(luma, 1);
          themeR = Math.min(255, Math.round(themeR * factor));
          themeG = Math.min(255, Math.round(themeG * factor));
          themeB = Math.min(255, Math.round(themeB * factor));
        }

        const darkR = Math.max(12, Math.round(themeR * 0.40));
        const darkG = Math.max(12, Math.round(themeG * 0.40));
        const darkB = Math.max(14, Math.round(themeB * 0.40));
        setSolidTheme(themeR, themeG, themeB, darkR, darkG, darkB);

        if (pb) {
          const pbDarkR = Math.max(16, Math.round(themeR * 0.28));
          const pbDarkG = Math.max(16, Math.round(themeG * 0.28));
          const pbDarkB = Math.max(18, Math.round(themeB * 0.28));
          pb.style.setProperty('--dynamic-bg', `rgb(${pbDarkR}, ${pbDarkG}, ${pbDarkB})`);
        }
      } catch (e) {
        if (pb) pb.style.removeProperty('--dynamic-bg');
        setSolidTheme(38, 40, 50, 16, 17, 22);
      }
    };
    img.onerror = function() {
      if (pb) pb.style.removeProperty('--dynamic-bg');
      setSolidTheme(38, 40, 50, 16, 17, 22);
    };
    img.src = thumbnailUrl;
  }

  /* ── Liked Songs State & Sync ── */
  function isCurrentTrackLiked() {
    if (!S.currentTrack || !S.playlists) return false;
    const liked = S.playlists.find(p => p.id === 'liked_songs' || p.isLiked);
    if (!liked || !liked.tracks) return false;
    return liked.tracks.some(t => t.id === S.currentTrack.id);
  }

  function updateLikeButtonUI() {
    const btn = document.getElementById('mnp-like-btn');
    if (!btn) return;
    const liked = isCurrentTrackLiked();
    const outline = btn.querySelector('.heart-outline');
    const filled = btn.querySelector('.heart-filled');
    if (outline && filled) {
      outline.style.display = liked ? 'none' : 'block';
      filled.style.display = liked ? 'block' : 'none';
    }
    btn.classList.toggle('is-liked', liked);
  }

  function toggleLikeCurrentTrack() {
    if (!S.currentTrack) return;
    const ensureLiked = (typeof window.ensureLikedSongsPlaylist === 'function') 
      ? window.ensureLikedSongsPlaylist 
      : () => {
          let liked = (S.playlists || []).find(p => p.id === 'liked_songs' || p.isLiked);
          if (!liked) {
            liked = { id: 'liked_songs', name: 'Liked Songs', isLiked: true, tracks: [] };
            if (!S.playlists) S.playlists = [];
            S.playlists.unshift(liked);
          }
          return liked;
        };
    
    const likedPl = ensureLiked();
    const existingIdx = likedPl.tracks.findIndex(t => t.id === S.currentTrack.id);
    if (existingIdx >= 0) {
      likedPl.tracks.splice(existingIdx, 1);
      showToast('Removed from Liked Songs');
    } else {
      likedPl.tracks.unshift({
        id: S.currentTrack.id,
        title: S.currentTrack.title || 'Unknown Title',
        artist: S.currentTrack.artist || 'Unknown Artist',
        duration: S.currentTrack.duration || 0,
        thumbnail: S.currentTrack.thumbnail || ''
      });
      showToast('Added to Liked Songs');
    }
    if (typeof window.savePlaylists === 'function') {
      window.savePlaylists();
    } else {
      ipcRenderer.invoke('write-playlists', S.playlists);
    }
    updateLikeButtonUI();
    updateTrackRowHighlights();
  }
  window.toggleLikeCurrentTrack = toggleLikeCurrentTrack;
  window.updateLikeButtonUI = updateLikeButtonUI;

  /* ── Overlay Open / Close Controllers ── */
  function openNowPlayingOverlay() {
    const overlay = document.getElementById('mobile-np-overlay');
    if (!overlay) return;
    overlay.classList.add('open');
    document.body.classList.add('mnp-open');
    updatePlayerBar();
  }
  window.openNowPlayingOverlay = openNowPlayingOverlay;

  function closeNowPlayingOverlay() {
    const overlay = document.getElementById('mobile-np-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('mnp-open');
    const drawer = document.getElementById('mnp-queue-drawer');
    if (drawer) drawer.classList.remove('open');
    const sheet = document.getElementById('mnp-options-sheet');
    if (sheet) sheet.classList.remove('open');
  }
  window.closeNowPlayingOverlay = closeNowPlayingOverlay;

  /* ── Player bar UI update (Pure Data-Driven, No Hardcoded Track Data) ── */
  function updatePlayerBar() {
    const t = S.currentTrack;
    
    // Left Track Details (Title, Dot, Artist)
    const pb = document.getElementById('player-bar');
    if (pb) pb.classList.toggle('has-track', !!t);
    document.body.classList.toggle('has-active-track', !!t);
    document.getElementById('pb-title').textContent = t ? (t.title || '') : '';
    document.getElementById('pb-artist').textContent = t ? (t.artist || '') : '';
    const dot = document.getElementById('pb-title-dot');
    if (dot) dot.style.display = (t && t.title && t.artist) ? 'inline' : 'none';

    // Active Playback Device Line (Green glyph + device name)
    const devLine = document.getElementById('pb-device-line');
    const devName = document.getElementById('pb-device-name');
    if (devLine && devName) {
      if (t) {
        devName.textContent = getActiveDeviceName();
        devLine.style.display = 'flex';
      } else {
        devLine.style.display = 'none';
      }
    }
    
    // Desktop Right Panel Meta
    document.getElementById('rp-title').textContent = t ? (t.title || '') : '';
    document.getElementById('rp-artist').textContent = t ? (t.artist || '') : '';

    const rpProfile = document.getElementById('rp-artist-profile');
    if (t && t.artist) {
      rpProfile.style.display = 'flex';
      document.getElementById('rp-sub-name').textContent = t.artist;
      const pfpEl = document.getElementById('rp-pfp');
      if (t.channelPfp) {
        pfpEl.innerHTML = `<img src="${t.channelPfp}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="" />`;
      } else {
        pfpEl.textContent = (t.artist || '?').charAt(0).toUpperCase();
      }
      document.getElementById('rp-sub-count').textContent = formatSubs(t.subCount, t.subCountText);
    } else {
      rpProfile.style.display = 'none';
    }

    // Thumbnail Artwork
    const img = document.getElementById('pb-thumb-img');
    const rpImg = document.getElementById('rp-thumb-img');
    if (t && t.thumbnail) { 
      img.src = t.thumbnail; img.style.display = 'block'; 
      rpImg.src = t.thumbnail; rpImg.style.display = 'block';
    } else { 
      img.src = ''; img.style.display = 'none'; 
      rpImg.src = ''; rpImg.style.display = 'none';
    }

    // Dynamic Theming for Floating Mini-Player & Full-Screen Overlay
    updateNowPlayingTheme(t ? t.thumbnail : null);

    updatePlayBtn();
    updateRepeatBtn();
    updateShuffleBtn();
    updateTrackRowHighlights();
    updateMiniplayerUI();
    updateMediaSession(t);

    // Sync Mobile / Full-Screen Now Playing Overlay
    const mnpTitle = document.getElementById('mnp-title');
    const mnpArtist = document.getElementById('mnp-artist');
    const mnpImg = document.getElementById('mnp-art-img');
    const mnpContext = document.getElementById('mnp-context-title');
    if (mnpTitle) mnpTitle.textContent = t ? (t.title || 'Unknown Title') : 'Select a track';
    if (mnpArtist) mnpArtist.textContent = t ? (t.artist || 'Unknown Artist') : 'Mockify';
    if (mnpImg) {
      if (t && t.thumbnail) {
        mnpImg.src = t.thumbnail;
        mnpImg.style.display = 'block';
      } else {
        mnpImg.src = '';
        mnpImg.style.display = 'none';
      }
    }
    if (mnpContext) {
      let ctx = 'NOW PLAYING';
      if (S.view === 'playlist' && S.currentPlaylist) {
        ctx = S.currentPlaylist.name || 'PLAYLIST';
      } else if (t && t.album) {
        ctx = t.album;
      }
      mnpContext.textContent = ctx;
    }

    const mnpDevName = document.getElementById('mnp-device-name');
    if (mnpDevName) {
      mnpDevName.textContent = getActiveDeviceName();
    }

    updateLikeButtonUI();

    // Immediately sync overlay slider and timestamps
    const mnpSlider = document.getElementById('mnp-progress-slider');
    if (mnpSlider && !window.mnpSeeking) {
      const dur = audio.duration || (t ? t.duration : 0) || 0;
      const cur = audio.currentTime || 0;
      mnpSlider.value = cur;
      mnpSlider.max = dur || 100;
      const curEl = document.getElementById('mnp-time-cur');
      const remEl = document.getElementById('mnp-time-rem');
      if (curEl) curEl.textContent = fmt(cur);
      if (remEl) {
        const rem = Math.max(0, dur - cur);
        remEl.textContent = '-' + fmt(rem);
      }
      const mnpPct = dur ? (cur / dur) * 100 : 0;
      updateSliderFill(mnpSlider, mnpPct);
    }

    const qDrawer = document.getElementById('mnp-queue-drawer');
    if (qDrawer && qDrawer.classList.contains('open')) {
      renderMnpQueue();
    }
  }

  function updateMediaSession(t) {
    if (!('mediaSession' in navigator) || !t) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title || 'Mockify',
        artist: t.artist || 'Unknown Artist',
        album: 'Mockify',
        artwork: [
          { src: t.thumbnail || 'icon.png', sizes: '512x512', type: 'image/jpeg' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (audio.src) audio.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audio.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrev();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && isFinite(details.seekTime)) {
          audio.currentTime = details.seekTime;
        }
      });
    } catch (e) {}
  }

  function updateTrackRowHighlights() {
    const currentId = S.currentTrack ? String(S.currentTrack.id) : null;
    const eqHtml = `<div class="mini-eq ${S.isPlaying ? '' : 'paused'}"><span class="eq-bar bar-1"></span><span class="eq-bar bar-2"></span><span class="eq-bar bar-3"></span></div>`;
    
    document.querySelectorAll('.track-row').forEach(row => {
      const isPlaying = currentId && String(row.dataset.id) === currentId;
      row.classList.toggle('playing', isPlaying);
      const title = row.querySelector('.row-title');
      if (title) {
        title.style.color = isPlaying ? 'var(--accent)' : '';
      }
      const numEl = row.querySelector('.row-num');
      if (numEl) {
        if (isPlaying) {
          numEl.innerHTML = eqHtml;
        } else {
          if (numEl.dataset.num !== undefined && numEl.dataset.num !== '') {
            numEl.textContent = numEl.dataset.num;
          }
        }
      }
    });
  }

  function updatePlayBtn() {
    document.getElementById('ico-play').style.display = S.isPlaying ? 'none' : '';
    document.getElementById('ico-pause').style.display = S.isPlaying ? '' : 'none';
    
    const rpThumb = document.getElementById('rp-thumb-img');
    const rpContainer = rpThumb ? rpThumb.closest('.rp-thumb-container') : null;
    if (S.settings.coverSpin && rpThumb && rpThumb.src) {
      rpThumb.classList.add('cover-spin');
      rpThumb.style.animationPlayState = S.isPlaying ? 'running' : 'paused';
      if (rpContainer) rpContainer.classList.add('is-spinning');
    } else if (rpThumb) {
      rpThumb.classList.remove('cover-spin');
      rpThumb.style.animationPlayState = '';
      if (rpContainer) rpContainer.classList.remove('is-spinning');
    }

    const mnpThumb = document.getElementById('mnp-art-img');
    const mnpContainer = mnpThumb ? mnpThumb.closest('.mnp-art-container') : null;
    if (S.settings.coverSpin && mnpThumb && mnpThumb.src && mnpThumb.style.display !== 'none') {
      mnpThumb.classList.add('cover-spin');
      mnpThumb.style.animationPlayState = S.isPlaying ? 'running' : 'paused';
      if (mnpContainer) mnpContainer.classList.add('is-spinning');
    } else if (mnpThumb) {
      mnpThumb.classList.remove('cover-spin');
      mnpThumb.style.animationPlayState = '';
      if (mnpContainer) mnpContainer.classList.remove('is-spinning');
    }
    updateMiniplayerUI();

    // Sync Mobile overlay play/pause icons
    const mnpPlay = document.getElementById('mnp-ico-play');
    const mnpPause = document.getElementById('mnp-ico-pause');
    if (mnpPlay) mnpPlay.style.display = S.isPlaying ? 'none' : '';
    if (mnpPause) mnpPause.style.display = S.isPlaying ? '' : 'none';

    // Sync Mobile floating miniplayer toggle
    const mobPlay = document.getElementById('mob-ico-play');
    const mobPause = document.getElementById('mob-ico-pause');
    if (mobPlay) mobPlay.style.display = S.isPlaying ? 'none' : '';
    if (mobPause) mobPause.style.display = S.isPlaying ? '' : 'none';
  }
  window.updatePlayBtn = updatePlayBtn;

  /* ── Player controls ── */
  document.getElementById('btn-play').addEventListener('click', () => {
    if (!audio.src) {
      if (S.currentTrack) {
        playTrack(S.currentTrack, false);
      } else if (S.queue && S.queue.length > 0 && S.queue[0]) {
        playTrack(S.queue[0], false);
      } else if (S.recent && S.recent.length > 0 && S.recent[0]) {
        playTrack(S.recent[0], false);
      }
      return;
    }
    S.isPlaying ? audio.pause() : audio.play();
  });
  document.getElementById('btn-next').addEventListener('click', playNext);
  document.getElementById('btn-prev').addEventListener('click', playPrev);

  const SVG_REPEAT = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>';
  const SVG_REPEAT_ONE = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/><path d="M12.8 15.5h-1.6v-4.6l-1.1.75V10.3l1.45-1h1.25v6.2z"/></svg>';

  function updateShuffleBtn() {
    const btn = document.getElementById('btn-shuffle');
    const mnpShuffle = document.getElementById('mnp-shuffle');
    const mnpShuffleDot = document.getElementById('mnp-shuffle-dot');

    if (btn) {
      btn.classList.toggle('active', !!S.shuffle);
      btn.title = S.shuffle ? 'Shuffle on' : 'Shuffle off';
    }
    if (mnpShuffle) {
      mnpShuffle.classList.toggle('active', !!S.shuffle);
      mnpShuffle.title = S.shuffle ? 'Shuffle on' : 'Shuffle off';
      if (mnpShuffleDot) {
        mnpShuffleDot.style.display = S.shuffle ? 'block' : 'none';
      }
    }
  }

  function toggleShuffle() {
    S.shuffle = !S.shuffle;
    updateShuffleBtn();
    showToast(S.shuffle ? 'Shuffle on' : 'Shuffle off');
  }

  function updateRepeatBtn() {
    const btn = document.getElementById('btn-repeat');
    const mnpRepeat = document.getElementById('mnp-repeat');
    const mnpRepeatIcon = document.getElementById('mnp-repeat-icon');
    const mnpRepeatDot = document.getElementById('mnp-repeat-dot');

    audio.loop = (S.repeat === 'one');

    // Desktop player bar button
    if (btn) {
      btn.classList.toggle('active', S.repeat !== 'none');
      btn.title = S.repeat === 'none' ? 'Repeat' : S.repeat === 'all' ? 'Repeat all' : 'Repeat one';
      btn.innerHTML = S.repeat === 'one' ? SVG_REPEAT_ONE : SVG_REPEAT;
    }

    // Now Playing overlay button
    if (mnpRepeat) {
      mnpRepeat.classList.toggle('active', S.repeat !== 'none');
      mnpRepeat.title = S.repeat === 'none' ? 'Repeat' : S.repeat === 'all' ? 'Repeat all' : 'Repeat one';
      if (mnpRepeatIcon) {
        mnpRepeatIcon.innerHTML = S.repeat === 'one' ? SVG_REPEAT_ONE : SVG_REPEAT;
      }
      if (mnpRepeatDot) {
        mnpRepeatDot.style.display = S.repeat !== 'none' ? 'block' : 'none';
      }
    }
  }

  function cycleRepeat() {
    const modes = ['none', 'all', 'one'];
    S.repeat = modes[(modes.indexOf(S.repeat) + 1) % 3];
    updateRepeatBtn();
    showToast(S.repeat === 'none' ? 'Repeat off' : S.repeat === 'all' ? 'Repeat all' : 'Repeat one');
  }

  document.getElementById('btn-shuffle').addEventListener('click', toggleShuffle);
  document.getElementById('btn-repeat').addEventListener('click', cycleRepeat);

  /* ── Volume ── */
  const volSlider = document.getElementById('volume-slider');
  function updateVolume() {
    audio.muted = Boolean(S.muted);
    audio.volume = S.muted ? 0 : S.volume / 100;
    const pct = S.muted ? 0 : S.volume;
    updateSliderFill(volSlider, pct);
    const btn = document.getElementById('btn-vol');
    if (btn) {
      document.getElementById('ico-vol').innerHTML = S.muted || S.volume === 0
        ? '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>'
        : '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.14v7.72A4.49 4.49 0 0016.5 12z"/>';
    }
    updateMiniplayerUI();
  }

  /* ── Volume ── */

  volSlider.addEventListener('input', () => {
    S.volume = Number(volSlider.value);
    S.muted = false;
    updateVolume();
    debounceSaveSettings();
  });

  document.getElementById('btn-vol').addEventListener('click', () => {
    S.muted = !S.muted;
    updateVolume();
    debounceSaveSettings();
  });

  // Initialize volume state and fill
  updateVolume();

  /* ── Mobile Floating Player & Full-Screen Overlay ── */
  (function initMobilePlayer() {
    const pb = document.querySelector('.player-bar');
    const mnpOverlay = document.getElementById('mobile-np-overlay');
    const mnpClose = document.getElementById('mnp-close-btn');

    if (!pb || !mnpOverlay) return;

    // Wire mobile playback toggle button
    const mobToggle = document.getElementById('mobile-play-toggle');
    if (mobToggle) {
      mobToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!audio.src) {
          if (S.currentTrack) {
            playTrack(S.currentTrack, false);
          } else if (S.queue && S.queue.length > 0 && S.queue[0]) {
            playTrack(S.queue[0], false);
          } else if (S.recent && S.recent.length > 0 && S.recent[0]) {
            playTrack(S.recent[0], false);
          }
          return;
        }
        S.isPlaying ? audio.pause() : audio.play();
      });
    }

    // Wire mobile connection status glyph
    const mobConnect = document.getElementById('mobile-connect-btn');
    if (mobConnect) {
      mobConnect.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast('Connected to ' + getActiveDeviceName());
      });
    }

    // Tapping track details in player bar opens the full-screen now playing overlay
    const pbLeft = document.querySelector('.pb-left');
    if (pbLeft) {
      pbLeft.addEventListener('click', (e) => {
        if (e.target.closest('#btn-pb-add-playlist')) return;
        openNowPlayingOverlay();
      });
      pbLeft.style.cursor = 'pointer';
    }

    // Tapping floating player bar on mobile opens overlay
    pb.addEventListener('click', (e) => {
      if (e.target.closest('#btn-play, #btn-next, #btn-prev, #btn-shuffle, #btn-repeat, #progress-slider, #volume-slider, #btn-vol, #btn-lyrics, #btn-now-playing, #mobile-play-toggle, #mobile-connect-btn, #btn-pb-add-playlist')) return;
      openNowPlayingOverlay();
    });

    // Close button
    if (mnpClose) {
      mnpClose.addEventListener('click', () => {
        closeNowPlayingOverlay();
      });
    }

    // Close on Escape or click outside desktop modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mnpOverlay.classList.contains('open')) {
        closeNowPlayingOverlay();
      }
    });

    document.addEventListener('click', (e) => {
      if (document.body.classList.contains('mnp-open') && window.innerWidth > 768) {
        if (!mnpOverlay.contains(e.target) && !e.target.closest('.player-bar')) {
          closeNowPlayingOverlay();
        }
      }
    });

    // Heart Like Button
    const mnpLike = document.getElementById('mnp-like-btn');
    if (mnpLike) {
      mnpLike.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLikeCurrentTrack();
      });
    }

    const mnpPlay = document.getElementById('mnp-play');
    const mnpNext = document.getElementById('mnp-next');
    const mnpPrev = document.getElementById('mnp-prev');
    const mnpShuffle = document.getElementById('mnp-shuffle');
    const mnpRepeat = document.getElementById('mnp-repeat');
    const mnpSlider = document.getElementById('mnp-progress-slider');

    if (mnpPlay) {
      mnpPlay.addEventListener('click', () => {
        const btn = document.getElementById('btn-play');
        if (btn) btn.click();
      });
    }
    if (mnpNext) {
      mnpNext.addEventListener('click', () => playNext());
    }
    if (mnpPrev) {
      mnpPrev.addEventListener('click', () => playPrev());
    }
    if (mnpShuffle) {
      mnpShuffle.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleShuffle();
      });
    }
    if (mnpRepeat) {
      mnpRepeat.addEventListener('click', (e) => {
        e.stopPropagation();
        cycleRepeat();
      });
    }

    // Seeking on slider with touch & hover polish
    window.mnpSeeking = false;
    if (mnpSlider) {
      const trackWrap = mnpSlider.closest('.mnp-slider-track-wrap');
      const startSeek = () => {
        window.mnpSeeking = true;
        if (trackWrap) trackWrap.classList.add('seeking');
      };
      mnpSlider.addEventListener('touchstart', startSeek, { passive: true });
      mnpSlider.addEventListener('mousedown', startSeek);
      mnpSlider.addEventListener('input', () => {
        const dur = audio.duration || (S.currentTrack ? S.currentTrack.duration : 0) || 0;
        const val = Number(mnpSlider.value);
        const curEl = document.getElementById('mnp-time-cur');
        const remEl = document.getElementById('mnp-time-rem');
        if (curEl) curEl.textContent = fmt(val);
        if (remEl) remEl.textContent = '-' + fmt(Math.max(0, dur - val));
        const pct = dur ? (val / dur) * 100 : 0;
        updateSliderFill(mnpSlider, pct);
      });
      const endSeek = () => {
        if (window.mnpSeeking) {
          audio.currentTime = Number(mnpSlider.value);
          window.mnpSeeking = false;
          if (trackWrap) trackWrap.classList.remove('seeking');
        }
      };
      mnpSlider.addEventListener('touchend', endSeek);
      mnpSlider.addEventListener('mouseup', endSeek);
      mnpSlider.addEventListener('touchcancel', endSeek);
    }

    // Overlay Device Indicator click
    const mnpDev = document.getElementById('mnp-device-indicator');
    if (mnpDev) {
      mnpDev.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast('Listening on ' + getActiveDeviceName());
      });
    }

    /* Safe no-op stubs */
    function renderMnpQueue() {}
    function openMnpQueue() {}
    function closeMnpQueue() {}
    window.renderMnpQueue = renderMnpQueue;
    window.openMnpQueue = openMnpQueue;
    window.closeMnpQueue = closeMnpQueue;

    /* ── Now Playing Options Sheet (3-Dots Menu) ── */
    function openMnpOptions() {
      const sheet = document.getElementById('mnp-options-sheet');
      if (!sheet) return;
      const t = S.currentTrack;
      const thumb = document.getElementById('mnp-opt-thumb');
      const title = document.getElementById('mnp-opt-title');
      const artist = document.getElementById('mnp-opt-artist');
      if (thumb) thumb.src = t ? (t.thumbnail || '') : '';
      if (title) title.textContent = t ? (t.title || 'Unknown Title') : 'No Track Playing';
      if (artist) artist.textContent = t ? (t.artist || 'Unknown Artist') : 'Offline Music';
      sheet.classList.add('open');
    }

    function closeMnpOptions() {
      const sheet = document.getElementById('mnp-options-sheet');
      if (sheet) sheet.classList.remove('open');
    }
    window.openMnpOptions = openMnpOptions;
    window.closeMnpOptions = closeMnpOptions;

    const mnpMoreBtn = document.getElementById('mnp-more-btn');
    if (mnpMoreBtn) {
      mnpMoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMnpOptions();
      });
    }

    const optAddPl = document.getElementById('mnp-opt-add-playlist');
    if (optAddPl) {
      optAddPl.addEventListener('click', () => {
        closeMnpOptions();
        if (S.currentTrack && typeof window.showAddToPlaylistModal === 'function') {
          window.showAddToPlaylistModal(S.currentTrack);
        }
      });
    }



    /* ── Now Playing Lyrics Drawer ── */
    function openMnpLyrics() {
      const drawer = document.getElementById('mnp-lyrics-drawer');
      if (!drawer) return;
      const sub = document.getElementById('mnp-lyrics-subheading');
      if (sub && S.currentTrack) {
        sub.textContent = `${S.currentTrack.title} • ${S.currentTrack.artist || ''}`;
      }
      drawer.classList.add('open');
      if (S.currentTrack && typeof window.fetchAndRenderLyrics === 'function') {
        window.fetchAndRenderLyrics(S.currentTrack);
      }
    }

    function closeMnpLyrics() {
      const drawer = document.getElementById('mnp-lyrics-drawer');
      if (drawer) drawer.classList.remove('open');
    }
    window.openMnpLyrics = openMnpLyrics;
    window.closeMnpLyrics = closeMnpLyrics;

    const mnpLyricsBtn = document.getElementById('mnp-lyrics-btn');
    if (mnpLyricsBtn) {
      mnpLyricsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openMnpLyrics();
      });
    }

    const mnpLyricsClose = document.getElementById('mnp-lyrics-close-btn');
    if (mnpLyricsClose) {
      mnpLyricsClose.addEventListener('click', (e) => {
        e.stopPropagation();
        closeMnpLyrics();
      });
    }

    const lyricsBackBtn = document.getElementById('lyrics-back-btn');
    if (lyricsBackBtn) {
      lyricsBackBtn.addEventListener('click', () => {
        if (typeof window.showView === 'function') {
          window.showView('home');
        }
      });
    }

    const optLyrics = document.getElementById('mnp-opt-lyrics');
    if (optLyrics) {
      optLyrics.addEventListener('click', () => {
        closeMnpOptions();
        openMnpLyrics();
      });
    }



    const optCancel = document.getElementById('mnp-opt-cancel-btn');
    if (optCancel) optCancel.addEventListener('click', closeMnpOptions);
    const optBackdrop = document.getElementById('mnp-options-backdrop');
    if (optBackdrop) optBackdrop.addEventListener('click', closeMnpOptions);
  })();
