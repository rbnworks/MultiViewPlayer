<div align="center">

# MultiViewPlayer

Compare and control up to four local video files side‑by‑side directly in your browser. No uploads. All processing stays on your machine.

</div>

## ✨ Features

- Load up to 4 videos via drag & drop or file picker (client‑side only)
- Gapless horizontal layout (1–4 videos) with responsive scaling
- Individual per‑video controls (hover overlay):
	- Play / Pause
	- Seek ±10s
	- Scrub bar (duration aware)
	- Volume slider & Mute / Unmute
	- Current time / total duration display
	- Remove video
- Global bottom overlay controls (auto‑hide after 5s inactivity):
	- Play / Pause All
	- Seek All ±10s
	- Sync All to first video’s current time
- Object URL lifecycle management (revoked on removal/unmount)
- Basic validation (format & max size) and max video count enforcement
- Dockerized production build (Nginx serving Vite output)

## 🧩 Tech Stack

| Layer | Tech |
|-------|------|
| UI Framework | React (Vite) |
| Styling | Hand‑rolled CSS, overlays |
| Video API | Native HTML5 `<video>` |
| Container | Docker / docker‑compose |

## 🚀 Getting Started (Local Dev)

Prerequisites: Node 18+ (or 20+ recommended) & npm.

```powershell
git clone https://github.com/rbnworks/MultiViewPlayer.git
cd MultiViewPlayer
npm install
npm run dev
```

Then open the printed local URL (typically http://localhost:5173).

## 🐳 Docker (Production Build)

Build and run with docker‑compose:

```powershell
docker-compose build
docker-compose up -d
```

Visit http://localhost:3000

To stop:

```powershell
docker-compose down
```

## 🔧 Usage

1. Drag & drop up to four video files anywhere on the drop zone (or click it to open a file dialog).
2. Hover a video to reveal its controls.
3. Use bottom global controls (they appear on mouse / key activity; auto‑hide after 5s idle).
4. Remove a video with the ✕ button (its object URL is revoked immediately).

Supported formats (browser dependent): mp4, webm, ogg, mov (quicktime). Large files are limited (1GB cap configurable).

## 🗂 Code Structure

```
src/
	App.jsx        Core logic & layout
	App.css        Layout, overlay & control styling
index.html       Entry document
Dockerfile       Multi‑stage (build -> nginx serve)
docker-compose.yml  Convenience runner (port 3000)
```

## ♻️ Object URL Hygiene
Every selected file becomes an object URL via `URL.createObjectURL`. These are revoked:
- When a video is removed
- When component unmounts / dependency changes

## 🛡 Validation
- MIME whitelist: `video/mp4`, `video/webm`, `video/ogg`, `video/quicktime`
- Size cap: 1GB (change `MAX_SIZE_MB` in `App.jsx`)
- Hard limit: 4 simultaneous videos

## 🧪 Possible Enhancements (Roadmap)
- Waveform / frame timeline preview
- Keyboard shortcuts (space, arrow keys per focused video)
- A/B sync drift indicators
- Adjustable sync tolerance auto-correction
- Dark / Light theme toggle
- Snapshot / frame export

## 🐞 Troubleshooting
| Issue | Tip |
|-------|-----|
| Video won’t play | Check browser codec support (try converting to H.264 / AAC). |
| Controls not visible | Move mouse or press a key to reveal global bar; hover video bottom for per‑video controls. |
| Large file stalls | Ensure file < 1GB (adjust cap if needed). |
| Sync seems off | Click "Sync All" while first video is playing; drift may accrue with variable frame rates. |

## 📄 License
MIT (add LICENSE file if publishing publicly).

## 🤝 Contributing
PRs welcome. Please open an issue to discuss larger changes first.

---
Built for local, private multi‑camera / multi‑angle analysis without uploading your content.
