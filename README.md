# PulseVibe 💓

Browser-based heart rate estimator that reads your pulse from webcam video using rPPG.

🔗 Live demo: https://pulse-vibe-rho.vercel.app/

## Features

* Estimates heart rate (BPM) from webcam video using rPPG signal processing and FFT.
* Tracks the face and forehead/cheek regions with MediaPipe, and rates every reading with a Trust Score and signal-quality label.
* Visualises the live pulse waveform and frequency spectrum, and saves sessions locally with optional sync to a REST API.
* Works fully in the browser. The backend is only needed for optional session sync.

## Tech Stack

* **Frontend:** React ^19.2.8, TypeScript ^6.0.3, Vite ^8.2.2, React Router ^7.18.3, Tailwind CSS ^4.3.3, Zustand ^5.0.15, Framer Motion
* **3D:** Three.js ^0.185.1, React Three Fiber ^9.7.0
* **Camera / ML / Signal Processing:** @mediapipe/tasks-vision ^1.0.1 (FaceDetector, FaceLandmarker), browser getUserMedia, fft.js ^4.0.4, custom GREEN / CHROM / POS rPPG in a Web Worker
* **Backend:** Node.js, Express ^4.19.2, TypeScript, Zod ^3.23.8, Helmet, express-rate-limit, pino, mysql2 ^3.11.0
* **Database:** IndexedDB via idb ^8.0.3 (primary local session store), MySQL (optional synced session summaries)
* **Tooling:** ESLint, Prettier, Vitest, Playwright (configured)

## How It Works

1. MediaPipe finds the face and 478 landmarks in the browser. Forehead and cheek regions are built from the landmarks, and their average RGB is sampled every frame.
2. A Web Worker turns the samples into a pulse signal (CHROM by default), detrends and windows it, and runs an FFT.
3. **BPM:** the strongest frequency between 0.7 and 4.0 Hz x 60, rejected outside 42-240 and smoothed (0.2 new + 0.8 previous).
4. **Trust Score:** 0.5 x signal quality (SNR-based, reduced by motion) + 0.3 x face-lock stability + 0.2 x measurement duration.
5. **Backend:** an Express API that validates and stores finished session summaries (never video or signals).
6. **Database:** IndexedDB is the main store in the browser, and MySQL holds the optionally synced summaries.

## Deployment

* **Frontend:** Vercel
* **Backend:** Render

## Run Locally

```
git clone https://github.com/Devbharati8828/PulseVibe.git
cd PulseVibe/frontend
npm install
npm run dev
```

Optional backend (set the `DB_*` env vars first):

```
cd PulseVibe/backend
npm install
npm run dev
```

## Disclaimer

PulseVibe is an experimental prototype, not a medical device. Not for diagnosis, treatment or emergency decisions.

## Author

Devneal Bharati | [LinkedIn](https://www.linkedin.com/in/devneal-bharati)
