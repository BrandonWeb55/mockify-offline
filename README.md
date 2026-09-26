# 🎵 Mockify Offline

> **Pure Client-Side Progressive Web App (PWA) Music Player**  
> A Spotify-inspired, 100% offline personal audio player engineered to run directly in any modern browser, install natively on iOS & Android home screens, and operate in Airplane Mode with zero backend server dependencies.

---

## 📌 Project Overview

Mockify Offline was transitioned from the original Mockify desktop application into a completely self-contained, standalone web application. It retains the dark glassmorphic Spotify aesthetic—complete with dynamic particle backgrounds, floating mini-player pills, spinning vinyl disc toggles, and responsive navigation—while operating entirely on device hardware without calling remote cloud APIs or external streaming services.

- **Hosting**: Deployed on **GitHub Pages** (100% Free for Public repositories).
- **Installation**: Progressive Web App (PWA) installable on iOS Safari and Android Chrome.
- **Offline Reliability**: Powered by a cache-first Service Worker (`sw.js`) that caches all application scripts, styles, canvases, and typography for instant offline startup.

---

## 🌟 Key Features & Visual Architecture

### 1. Faithful Spotify-Inspired Mobile Experience
- **Anchored Mobile Bottom Nav**: Instant switching between **Home**, **Queue**, and **Your Library**.
- **Floating Mini-Player Pill**: Anchored above the bottom nav with dual-tone bottom playback progress line, device status indicator, and responsive touch controls.
- **Full-Screen Now Playing Overlay**: Tap the mini-player to launch the full-screen modal featuring:
  - Album artwork with a toggleable **spinning vinyl record disc animation**.
  - Negative remaining & elapsed progress bar scrubbers.
  - Interactive Like (Heart) toggle.
  - Slide-out drawers for **Queue** and **Lyrics**.
  - 3-dots action sheet for playlist and track management.

### 2. Desktop Interface
- **Collapsible Sidebar**: Library organizer with custom playlist management, recently added sorting, and quick navigation.
- **Top Greeting & Header**: Time-aware greeting (`Good Morning`, `Good Afternoon`, `Good Evening`) with instant settings access.
- **Right-Side Now Playing Panel**: Includes high-resolution artwork, artist details, and a live audio spectrum visualizer.

### 3. Interactive Starry Sky & Comet Canvas (`#space-bg`)
- Native hardware-accelerated 2D canvas running in a continuous requestAnimationFrame loop.
- Features optical diffraction spikes, Gaussian coronas, and realistic stellar color temperatures (Sirius diamond, Rigel electric blue, Sol pale gold, Arcturus warm peach).
- Pointer-repulsion physics and musical bass pulse reactivity synced to audio playback.
- Guaranteed high star density across all screen sizes (minimum 80–176 stars rendered on mobile viewports).

### 4. Custom Theme & Typography Engine
- **Font Stack**: Defaulted to **`Inter` (Sleek UI)** with full support for `Outfit`, `Roboto`, `Poppins`, `Montserrat`, and `Fira Code`. All font weights (`300` through `900`) are preloaded and cached.
- **Hardware Text Antialiasing**: Enabled via `-webkit-font-smoothing: antialiased` for razor-sharp typography on mobile OLED displays.
- **Radial Color Wheel Picker**: Custom accent color tuning, primary/secondary text coloring, star color, comet color, and nebula glow tinting.

---

## 📁 Repository Structure

```text
mockify-offline/
├── index.html              # Main application shell & view markup
├── manifest.json           # PWA web app manifest (standalone display mode)
├── sw.js                   # Cache-first offline service worker
├── icon.png                # High-res PWA application icon (512x512)
├── icon.ico                # Desktop favicon
├── README.md               # Project documentation & roadmap
└── assets/
    ├── css/
    │   ├── index.css       # Core desktop layout, glassmorphic styling & themes
    │   └── mobile.css      # Spotify mobile UI, safe-area insets & responsive rules
    └── js/
        ├── core.js         # State container (S), LocalStore, view router (showView)
        ├── ui.js           # Starry canvas engine, audio visualizer & settings manager
        ├── views.js        # Home view, queue renderer, track rows & playback triggers
        └── audio.js        # HTML5 audio element controller & player bar sync
```

---

## 🛠️ Current Project State (What Was Done)

1. **Zero Streaming Dependency**: All YouTube API calls, `yt-dlp` scripts, `search-youtube` IPCs, and remote backend streaming logic have been completely deleted.
2. **Offline Song Catalog & Live Search**: Transformed the Search section into a full offline Music Catalog for all downloaded, imported, and hardcoded songs. Includes real-time instant search filtering across titles, artists, and albums, category chips (All, Recently Played, Liked, Downloaded), sorting, grid/list view toggle, and a one-click local audio importer with drag-and-drop support.
3. **Mobile Star Canvas Fixed**: Resolved density formula issue that previously evaluated to 0 stars on mobile screens; added orientation-change resizing.
4. **Mobile Typography Refined**: Defaulted to crisp `Inter`, preconnected all font weights, softened heading weights to `700`, and enabled font antialiasing.
5. **Offline Service Worker (`sw.js`)**: Updated to cache app assets and opaque font binaries for true Airplane Mode functionality.

---

## 🗺️ Roadmap / Next Steps for the Next Session

When continuing in a new session, here are the exact features planned to complete the offline player:

1. **IndexedDB Local Audio Store**:
   - `localStorage` is capped at ~5MB and cannot store audio files.
   - Implement an IndexedDB object store (e.g. `mockify-tracks`) to store complete audio file Blobs permanently on device storage.
2. **Local Audio File Importer**:
   - Add an **"Import Music" / "Add Files"** button in Library and Home views.
   - Open the device's native file picker (`<input type="file" accept="audio/*" multiple>`) to import `.mp3`, `.m4a`, `.wav`, `.flac`, and `.ogg` files.
   - Add desktop drag-and-drop file import over the application window.
3. **Client-Side ID3 Metadata & Artwork Extractor**:
   - Parse track Title, Artist, Album, and Duration directly from file ID3 tags.
   - Extract embedded cover artwork as an image blob URL so album art appears on cards and the spinning vinyl record disc.
4. **Mobile MediaSession API Integration**:
   - Connect `navigator.mediaSession` to allow iOS Lock Screen / Dynamic Island and Android notification controls (Play, Pause, Next, Previous, Seek) with live cover artwork while the phone is locked.

---

## 🚀 Deployment & Installation Guide

### GitHub Pages (100% Free Deployment)
1. Push this repository to GitHub as a **Public** repository (GitHub Pages is completely free for public repos).
2. Go to repository **Settings** → **Pages**.
3. Under **Branch**, choose `main` and root `/`, then click **Save**.
4. Your site will be live at:  
   `https://<your-username>.github.io/<repo-name>/`

### Installing on Mobile
- **iOS (iPhone Safari)**: Open the URL in Safari → Tap the **Share** button → Tap **Add to Home Screen**.
- **Android (Chrome)**: Open the URL in Chrome → Tap the three dots menu → Tap **Install app** (or **Add to Home screen**).
- Open the app once to let the Service Worker cache all assets. After that, it works completely offline with no network connection required.
