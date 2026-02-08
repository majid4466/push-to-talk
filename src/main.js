import "./css/index.css";
import "./css/app.css";

import Constants from "./utils/Constants";
import { formatAudioTimestamp } from "./utils/AudioUtils";

const root = document.querySelector("#root");
if (!root) throw new Error("Missing #root element");

const getStored = (key, defaultValue) => {
  const val = localStorage.getItem(`ptt_${key}`);
  if (val === null) return defaultValue;
  try {
    return JSON.parse(val);
  } catch {
    return val;
  }
};

const setStored = (key, val) => {
  localStorage.setItem(`ptt_${key}`, JSON.stringify(val));
};

const state = {
  model: getStored("model", Constants.DEFAULT_MODEL),
  recording: false,
  durationSeconds: 0,
  audioData: undefined,
  transcript: undefined, // { text, chunks, isBusy }
  isBusy: false,
  decodeProgress: undefined, // 0..1
  progressItems: [], // worker downloads
  isCopied: false,
};

let stream = null;
let mediaRecorder = null;
let chunks = [];
let recordStartMs = 0;
let durationTimer = null;

let worker = null;

let visualizer = {
  audioContext: null,
  analyser: null,
  source: null,
  rafId: 0,
};

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function render() {
  const modelTiny = "Xenova/whisper-tiny";
  const modelBase = "Xenova/whisper-base";
  const modelDescription =
    state.model === modelTiny
      ? "41 MB · Faster · Less accurate"
      : "77 MB · Slower · More accurate";

  const instruction = state.recording
    ? `Recording... (${formatAudioTimestamp(
        state.durationSeconds,
      )}) - Release to stop`
    : "Hold Space or Mic to start";

  const decodeProgressBar =
    state.decodeProgress !== undefined
      ? `<div class="progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${Math.round(
                          clamp(state.decodeProgress, 0, 1) * 100,
                        )}%"></div>
                    </div>
               </div>`
      : "";

  const modelLoaderOverlay =
    state.progressItems.length > 0
      ? `<div class="model-loader-overlay">
                    <div class="model-loader-content">
                        <label>Downloading AI Model...</label>
                        ${state.progressItems
                          .map((item) => {
                            const pct = clamp(item.progress ?? 0, 0, 100);
                            return `<div class="progress-item">
                                    <div class="progress-item-header">
                                        <span class="progress-item-text" title="${escapeHtml(
                                          item.file,
                                        )}">${escapeHtml(item.file)}</span>
                                        <span class="progress-item-percentage">${pct.toFixed(
                                          1,
                                        )}%</span>
                                    </div>
                                    <div class="progress-item-track">
                                        <div class="progress-item-fill" style="width: ${pct}%"></div>
                                    </div>
                                </div>`;
                          })
                          .join("")}
                    </div>
               </div>`
      : "";

  const transcriptBox = state.transcript
    ? `<div class="transcript-box">
                <div class="bubble ${state.isCopied ? "is-copied" : ""} ${
                  state.isBusy ? "is-busy" : ""
                }" data-action="copy">
                    ${escapeHtml(state.transcript.text || "")}
                    ${state.isBusy ? `<span class="pulse">...</span>` : ""}
                </div>
                ${state.isCopied ? `<div class="copy-badge">Copied!</div>` : ""}
           </div>`
    : state.isBusy
      ? `<div class="loading-state">
                <div class="spinner"></div>
                <p>Transcribing audio...</p>
             </div>`
      : "";

  const audioEl = state.audioData
    ? `<audio id="ptt-audio" style="display:none">
                <source src="${escapeHtml(
                  state.audioData.url,
                )}" type="${escapeHtml(state.audioData.mimeType)}" />
           </audio>`
    : "";

  root.innerHTML = `
        <div class="app-container">
            <div class="model-selection">
                <div class="model-toggle">
                    <button data-model="${modelTiny}" class="${
                      state.model === modelTiny ? "active" : ""
                    }">Tiny</button>
                    <button data-model="${modelBase}" class="${
                      state.model === modelBase ? "active" : ""
                    }">Base</button>
                </div>
                <p class="model-description">${escapeHtml(modelDescription)}</p>
            </div>

            <main class="content">
                <div class="recorder-container">
                    <div class="mic-button ${
                      state.recording ? "recording" : ""
                    }" data-action="mic">
                        <img src="/microphone.svg" alt="Microphone" />
                    </div>
                    ${
                      state.recording
                        ? `<div class="visualizer-wrapper"><canvas id="ptt-visualizer" width="300" height="60" class="visualizer-canvas"></canvas></div>`
                        : ""
                    }
                    <p class="instruction">${escapeHtml(instruction)}</p>
                </div>

                ${decodeProgressBar}
                ${modelLoaderOverlay}

                <div class="transcript-container" id="ptt-transcript">
                    ${audioEl}
                    ${transcriptBox}
                </div>
            </main>
        </div>
    `;

  if (state.recording) {
    startVisualizerIfNeeded();
  } else {
    stopVisualizer();
  }
}

function setState(patch) {
  Object.assign(state, patch);
  render();
}

function getMimeType() {
  const types = [
    "audio/mp4",
    "audio/ogg",
    "audio/wav",
    "audio/aac",
    "audio/webm",
  ];
  for (let i = 0; i < types.length; i++) {
    if (MediaRecorder.isTypeSupported(types[i])) return types[i];
  }
  return undefined;
}

function onRecordingStart() {
  setState({ transcript: undefined, audioData: undefined, isCopied: false });
}

async function onRecordingComplete(blob) {
  setState({ decodeProgress: 0 });

  const blobUrl = URL.createObjectURL(blob);
  const fileReader = new FileReader();

  fileReader.onprogress = (event) => {
    const p = event.total ? event.loaded / event.total : 0;
    setState({ decodeProgress: p });
  };

  fileReader.onloadend = async () => {
    try {
      const arrayBuffer = fileReader.result;
      const audioCTX = new window.AudioContext({
        sampleRate: Constants.SAMPLING_RATE,
      });
      const decoded = await audioCTX.decodeAudioData(arrayBuffer);
      setState({ decodeProgress: undefined });

      const newAudioData = {
        buffer: decoded,
        url: blobUrl,
        mimeType: blob.type,
      };
      setState({ audioData: newAudioData });

      startTranscription(decoded);
    } catch (err) {
      console.error("Error decoding audio:", err);
      setState({ decodeProgress: undefined });
      alert("Error processing audio. Please try again.");
    }
  };

  fileReader.readAsArrayBuffer(blob);
}

function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./worker.js", import.meta.url), {
    type: "module",
  });
  worker.addEventListener("message", onWorkerMessage);
  return worker;
}

function onWorkerMessage(event) {
  const message = event.data;
  switch (message.status) {
    case "progress": {
      const next = [...state.progressItems];
      if (!next.some((i) => i.file === message.file)) next.push(message);
      const updated = next.map((item) =>
        item.file === message.file
          ? { ...item, progress: message.progress }
          : item,
      );
      setState({ progressItems: updated });
      break;
    }
    case "initiate": {
      const next = [...state.progressItems];
      if (!next.some((i) => i.file === message.file)) next.push(message);
      setState({ progressItems: next });
      break;
    }
    case "done": {
      setState({
        progressItems: state.progressItems.filter(
          (item) => item.file !== message.file,
        ),
      });
      break;
    }
    case "update": {
      let nextTranscript;
      if (Array.isArray(message.data)) {
        nextTranscript = {
          isBusy: true,
          text: (message.data[0] || "").trim(),
          chunks: message.data[1]?.chunks || [],
        };
      } else if (message.data && typeof message.data === "object") {
        nextTranscript = {
          isBusy: true,
          text: (message.data.text || "").trim(),
          chunks: message.data.chunks || [],
        };
      }
      if (nextTranscript) {
        setState({ transcript: nextTranscript });
      }
      break;
    }
    case "complete": {
      let nextTranscript;
      if (message.data && message.data.text !== undefined) {
        nextTranscript = {
          isBusy: false,
          text: (message.data.text || "").trim(),
          chunks: message.data.chunks || [],
        };
      } else if (Array.isArray(message.data) && message.data.length > 0) {
        const first = message.data[0];
        nextTranscript = {
          isBusy: false,
          text: (typeof first === "string" ? first : first?.text || "").trim(),
          chunks: first?.chunks || [],
        };
      }
      setState({ transcript: nextTranscript, isBusy: false });
      if (nextTranscript?.text) autoCopy(nextTranscript.text);
      break;
    }
    case "error": {
      setState({ isBusy: false });
      alert(
        `${message.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.`,
      );
      break;
    }
    default:
      break;
  }
}

function startTranscription(decodedAudioBuffer) {
  if (!decodedAudioBuffer) return;
  setState({ transcript: undefined, isBusy: true, isCopied: false });

  let audio;
  if (decodedAudioBuffer.numberOfChannels === 2) {
    const SCALING_FACTOR = Math.sqrt(2);
    const left = decodedAudioBuffer.getChannelData(0);
    const right = decodedAudioBuffer.getChannelData(1);
    audio = new Float32Array(left.length);
    for (let i = 0; i < decodedAudioBuffer.length; ++i) {
      audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2;
    }
  } else {
    audio = decodedAudioBuffer.getChannelData(0);
  }

  ensureWorker().postMessage({
    audio,
    model: state.model,
    multilingual: false,
    quantized: true,
    subtask: "transcribe",
    language: null,
  });
}

async function startRecording() {
  chunks = [];
  onRecordingStart();
  recordStartMs = Date.now();

  try {
    if (!stream) {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    const mimeType = getMimeType();
    mediaRecorder = new MediaRecorder(stream, { mimeType });

    mediaRecorder.addEventListener("dataavailable", async (event) => {
      if (event.data.size > 0) chunks.push(event.data);
      if (mediaRecorder && mediaRecorder.state === "inactive") {
        let blob = new Blob(chunks, { type: mimeType });
        chunks = [];
        onRecordingComplete(blob);
      }
    });

    mediaRecorder.start();
    setState({ recording: true, durationSeconds: 0 });

    if (durationTimer) window.clearInterval(durationTimer);
    durationTimer = window.setInterval(() => {
      state.durationSeconds++;
      const el = document.querySelector(".instruction");
      if (el && state.recording) {
        el.textContent = `Recording... (${formatAudioTimestamp(
          state.durationSeconds,
        )}) - Release to stop`;
      }
    }, 1000);
  } catch (error) {
    console.error("Error accessing microphone:", error);
    alert(
      "Could not access microphone. Please ensure you have granted permission.",
    );
    setState({ recording: false });
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    setState({ recording: false, durationSeconds: 0 });
  }
  if (durationTimer) {
    window.clearInterval(durationTimer);
    durationTimer = null;
  }
}

function handleKeyDown(event) {
  if (
    event.code === "Space" &&
    !state.recording &&
    !event.repeat &&
    !(
      document.activeElement instanceof HTMLInputElement ||
      document.activeElement instanceof HTMLSelectElement ||
      document.activeElement instanceof HTMLTextAreaElement
    )
  ) {
    event.preventDefault();
    startRecording();
  }
}

function handleKeyUp(event) {
  if (event.code === "Space" && state.recording) {
    event.preventDefault();
    stopRecording();
  }
}

function playAudio(startTimeSeconds) {
  const audio = document.querySelector("#ptt-audio");
  if (!audio) return;
  audio.currentTime = startTimeSeconds;
  audio.play();
}

function autoCopy(text) {
  if (!text) return;
  navigator.clipboard
    .writeText(text)
    .then(() => {
      setState({ isCopied: true });
      window.setTimeout(() => setState({ isCopied: false }), 2000);
    })
    .catch(() => {
      // ignore
    });
}

function startVisualizerIfNeeded() {
  const canvas = document.querySelector("#ptt-visualizer");
  if (!canvas || !stream) return;

  if (visualizer.audioContext) return;

  visualizer.audioContext = new AudioContext();
  visualizer.source = visualizer.audioContext.createMediaStreamSource(stream);
  visualizer.analyser = visualizer.audioContext.createAnalyser();
  visualizer.analyser.fftSize = 2048;
  visualizer.source.connect(visualizer.analyser);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bufferLength = visualizer.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  const draw = () => {
    visualizer.rafId = requestAnimationFrame(draw);
    visualizer.analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = 3;
    const gap = 2;
    const barCount = Math.floor(canvas.width / (barWidth + gap));
    const color = "#3b82f6";

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * bufferLength * 0.5);
      const value = dataArray[dataIndex];
      const percent = value / 255;
      const height = Math.max(percent * canvas.height, 4);
      const x = i * (barWidth + gap);
      const y = (canvas.height - height) / 2;

      ctx.fillStyle = color;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, barWidth, height, barWidth / 2);
      else ctx.rect(x, y, barWidth, height);
      ctx.fill();
    }
  };

  draw();
}

function stopVisualizer() {
  if (visualizer.rafId) cancelAnimationFrame(visualizer.rafId);
  visualizer.rafId = 0;
  if (visualizer.audioContext) visualizer.audioContext.close();
  visualizer.audioContext = null;
  visualizer.analyser = null;
  visualizer.source = null;
}

function onRootClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const modelBtn = target.closest("button[data-model]");
  if (modelBtn) {
    const nextModel = modelBtn.getAttribute("data-model");
    if (nextModel && nextModel !== state.model) {
      setStored("model", nextModel);
      setState({ model: nextModel });
    }
    return;
  }

  const bubble = target.closest("[data-action='copy']");
  if (bubble && state.transcript) {
    playAudio(0);
    autoCopy(state.transcript.text);
    return;
  }
}

function attachMicHoldHandlers() {
  root.addEventListener("mousedown", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.closest("[data-action='mic']")) startRecording();
  });
  root.addEventListener("mouseup", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (t.closest("[data-action='mic']")) stopRecording();
  });
  root.addEventListener("mouseleave", () => {
    if (state.recording) stopRecording();
  });

  root.addEventListener(
    "touchstart",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.closest("[data-action='mic']")) {
        e.preventDefault();
        startRecording();
      }
    },
    { passive: false },
  );
  root.addEventListener(
    "touchend",
    (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (t.closest("[data-action='mic']")) {
        e.preventDefault();
        stopRecording();
      }
    },
    { passive: false },
  );
}

function installGlobalListeners() {
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  root.addEventListener("click", onRootClick);
  attachMicHoldHandlers();
}

render();
installGlobalListeners();
