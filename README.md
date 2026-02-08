# Push to Talk

A minimalist speech-to-text application powered by [Whisper](https://openai.com/research/whisper) running entirely in your browser using [Transformers.js](https://github.com/xenova/transformers.js).

## Design goals

This project is a re-implementation of the original [whisper-web](https://github.com/xenova/whisper-web), focusing on a single, frictionless use case: **Push to Talk**.

-   **Zero clicks**: No source selection or upload buttons. Just hold the Spacebar.
-   **Microphone-only**: Optimized for instant voice-to-text.
-   **No framework UI**: Plain HTML/CSS/JS, bundled with Vite.
-   **Privacy-first**: All audio processing happens locally in your browser. Nothing is ever sent to a server (as is also the case with whisper-web).

## Usage

1. **Hold Spacebar** to begin recording.
2. **Release Spacebar** to stop and transcribe.
3. The result is automatically copied to your clipboard.

## Demo

Live demo [here](https://majid4466.github.io/push-to-talk/)

## Getting started

### Prerequisites

- Node.js (18+ recommended)

### Run locally

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (usually `http://localhost:5173`).

### Build

```bash
npm run build
npm run preview
```

## Notes

- **First run downloads a model**: selecting Tiny/Base downloads the model files in the background. This happens in the browser and is cached by the browser.
- **Privacy**: audio stays on-device; there is no server component in this repo.
- **Clipboard**: auto-copy uses the Clipboard API and may require permission depending on your browser settings.
- **Browser support**: Chrome/Edge/Firefox are recommended. Safari (especially on some Apple Silicon Macs) may fail to run the model; if you hit errors, try Chrome/Firefox/Edge.

## Credits

This project is based on the original [whisper-web](https://github.com/xenova/whisper-web) by [Xenova](https://github.com/xenova).

## License

MIT
