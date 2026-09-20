# 🎵 Mockify Offline

> **Standalone Offline Progressive Web App (PWA)**  
> High-performance offline music player preserving Mockify's complete Spotify-inspired visual aesthetic across mobile devices and desktop browsers.

---

## 🌟 Features

- **100% Offline Capability**: Uses standard Web APIs and an offline Service Worker shell. Works in Airplane Mode without internet or Wi-Fi.
- **Identical Mockify Aesthetic**:
  - Spotify-style bottom navigation and floating mini-player pill on mobile.
  - Dark glassmorphic desktop sidebar, top greeting, volume controls, and track rows.
  - Interactive Starry Space background canvas with dynamic particle animation.
  - Full-screen Now Playing modal with spinning vinyl album art toggle and dynamic theming.
  - Custom typography and theme accent color pickers.
- **Zero Cloud Streaming Dependency**: Pure client-side offline audio engine, zero buffering, 100% private.

---

## 🚀 How to Deploy to GitHub Pages

1. **Create a New GitHub Repository**:
   - Go to [github.com/new](https://github.com/new).
   - Name it `mockify-offline` (Public or Private).
   - Leave "Initialize with README" unchecked.

2. **Push this folder to GitHub**:
   - In **GitHub Desktop**: Click **Add** → **Add Existing Repository** → Select `mockify-offline` → Click **Publish Repository**.
   - *Or via Git CLI*:
     ```bash
     cd mockify-offline
     git init
     git add .
     git commit -m "Initial commit: Mockify Offline PWA"
     git branch -M main
     git remote add origin https://github.com/<your-username>/mockify-offline.git
     git push -u origin main
     ```

3. **Enable GitHub Pages**:
   - In your GitHub repository, go to **Settings** → **Pages** (on the left sidebar).
   - Under **Build and deployment** → **Source**: Select **Deploy from a branch**.
   - Under **Branch**: Select `main` and folder `/ (root)`.
   - Click **Save**.

4. **Access & Install Your App**:
   - In 1–2 minutes, GitHub will show your live URL:  
     `https://<your-username>.github.io/mockify-offline/`
   - Open this URL on your phone or computer.
   - **iOS Safari**: Tap the **Share** icon → **Add to Home Screen**.
   - **Android Chrome / Desktop**: Tap the install button in the address bar.
   - Once opened, Mockify Offline is cached on your device and operates completely offline!
