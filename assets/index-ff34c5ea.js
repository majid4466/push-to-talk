(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const d of s.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&n(d)}).observe(document,{childList:!0,subtree:!0});function o(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=o(r);fetch(r.href,s)}})();const T={SAMPLING_RATE:16e3,DEFAULT_MODEL:"Xenova/whisper-tiny"};function x(t){return String(t).padStart(2,"0")}function $(t){const e=t/3600|0;t-=e*(60*60);const o=t/60|0;t-=o*60;const n=t|0;return`${e?x(e)+":":""}${x(o)}:${x(n)}`}const l=document.querySelector("#root");if(!l)throw new Error("Missing #root element");const k=(t,e)=>{const o=localStorage.getItem(`ptt_${t}`);if(o===null)return e;try{return JSON.parse(o)}catch{return o}},B=(t,e)=>{localStorage.setItem(`ptt_${t}`,JSON.stringify(e))},a={model:k("model",T.DEFAULT_MODEL),recording:!1,durationSeconds:0,audioData:void 0,transcript:void 0,isBusy:!1,decodeProgress:void 0,progressItems:[],isCopied:!1};let v=null,u=null,b=[],m=null,y=null,i={audioContext:null,analyser:null,source:null,rafId:0};function E(t,e,o){return Math.min(o,Math.max(e,t))}function f(t){return String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}function A(){const t="Xenova/whisper-tiny",e="Xenova/whisper-base",o=a.model===t?"41 MB · Faster · Less accurate":"77 MB · Slower · More accurate",n=a.recording?`Recording... (${$(a.durationSeconds)}) - Release to stop`:"Hold Space or Mic to start",r=a.decodeProgress!==void 0?`<div class="progress-bar">
                    <div class="progress-track">
                        <div class="progress-fill" style="width: ${Math.round(E(a.decodeProgress,0,1)*100)}%"></div>
                    </div>
               </div>`:"",s=a.progressItems.length>0?`<div class="model-loader-overlay">
                    <div class="model-loader-content">
                        <label>Downloading AI Model...</label>
                        ${a.progressItems.map(g=>{const p=E(g.progress??0,0,100);return`<div class="progress-item">
                                    <div class="progress-item-header">
                                        <span class="progress-item-text" title="${f(g.file)}">${f(g.file)}</span>
                                        <span class="progress-item-percentage">${p.toFixed(1)}%</span>
                                    </div>
                                    <div class="progress-item-track">
                                        <div class="progress-item-fill" style="width: ${p}%"></div>
                                    </div>
                                </div>`}).join("")}
                    </div>
               </div>`:"",d=a.transcript?`<div class="transcript-box">
                <div class="bubble ${a.isCopied?"is-copied":""} ${a.isBusy?"is-busy":""}" data-action="copy">
                    ${f(a.transcript.text||"")}
                    ${a.isBusy?'<span class="pulse">...</span>':""}
                </div>
                ${a.isCopied?'<div class="copy-badge">Copied!</div>':""}
           </div>`:a.isBusy?`<div class="loading-state">
                <div class="spinner"></div>
                <p>Transcribing audio...</p>
             </div>`:"",h=a.audioData?`<audio id="ptt-audio" style="display:none">
                <source src="${f(a.audioData.url)}" type="${f(a.audioData.mimeType)}" />
           </audio>`:"";l.innerHTML=`
        <div class="app-container">
            <div class="model-selection">
                <div class="model-toggle">
                    <button data-model="${t}" class="${a.model===t?"active":""}">Tiny</button>
                    <button data-model="${e}" class="${a.model===e?"active":""}">Base</button>
                </div>
                <p class="model-description">${f(o)}</p>
            </div>

            <main class="content">
                <div class="recorder-container">
                    <div class="mic-button ${a.recording?"recording":""}" data-action="mic">
                        <img src="./microphone.svg" alt="Microphone" />
                    </div>
                    ${a.recording?'<div class="visualizer-wrapper"><canvas id="ptt-visualizer" width="300" height="60" class="visualizer-canvas"></canvas></div>':""}
                    <p class="instruction">${f(n)}</p>
                </div>

                ${r}
                ${s}

                <div class="transcript-container" id="ptt-transcript">
                    ${h}
                    ${d}
                </div>
            </main>
        </div>
    `,a.recording?j():X()}function c(t){Object.assign(a,t),A()}function P(){const t=["audio/mp4","audio/ogg","audio/wav","audio/aac","audio/webm"];for(let e=0;e<t.length;e++)if(MediaRecorder.isTypeSupported(t[e]))return t[e]}function O(){c({transcript:void 0,audioData:void 0,isCopied:!1})}async function H(t){c({decodeProgress:0});const e=URL.createObjectURL(t),o=new FileReader;o.onprogress=n=>{const r=n.total?n.loaded/n.total:0;c({decodeProgress:r})},o.onloadend=async()=>{try{const n=o.result,s=await new window.AudioContext({sampleRate:T.SAMPLING_RATE}).decodeAudioData(n);c({decodeProgress:void 0});const d={buffer:s,url:e,mimeType:t.type};c({audioData:d}),z(s)}catch(n){console.error("Error decoding audio:",n),c({decodeProgress:void 0}),alert("Error processing audio. Please try again.")}},o.readAsArrayBuffer(t)}function F(){return y||(y=new Worker(new URL(""+new URL("worker-62e27d3c.js",import.meta.url).href,self.location),{type:"module"}),y.addEventListener("message",q),y)}function q(t){var o;const e=t.data;switch(e.status){case"progress":{const n=[...a.progressItems];n.some(s=>s.file===e.file)||n.push(e);const r=n.map(s=>s.file===e.file?{...s,progress:e.progress}:s);c({progressItems:r});break}case"initiate":{const n=[...a.progressItems];n.some(r=>r.file===e.file)||n.push(e),c({progressItems:n});break}case"done":{c({progressItems:a.progressItems.filter(n=>n.file!==e.file)});break}case"update":{let n;Array.isArray(e.data)?n={isBusy:!0,text:(e.data[0]||"").trim(),chunks:((o=e.data[1])==null?void 0:o.chunks)||[]}:e.data&&typeof e.data=="object"&&(n={isBusy:!0,text:(e.data.text||"").trim(),chunks:e.data.chunks||[]}),n&&c({transcript:n});break}case"complete":{let n;if(e.data&&e.data.text!==void 0)n={isBusy:!1,text:(e.data.text||"").trim(),chunks:e.data.chunks||[]};else if(Array.isArray(e.data)&&e.data.length>0){const r=e.data[0];n={isBusy:!1,text:(typeof r=="string"?r:(r==null?void 0:r.text)||"").trim(),chunks:(r==null?void 0:r.chunks)||[]}}c({transcript:n,isBusy:!1}),n!=null&&n.text&&I(n.text);break}case"error":{c({isBusy:!1}),alert(`${e.data.message} This is most likely because you are using Safari on an M1/M2 Mac. Please try again from Chrome, Firefox, or Edge.`);break}}}function z(t){if(!t)return;c({transcript:void 0,isBusy:!0,isCopied:!1});let e;if(t.numberOfChannels===2){const o=Math.sqrt(2),n=t.getChannelData(0),r=t.getChannelData(1);e=new Float32Array(n.length);for(let s=0;s<t.length;++s)e[s]=o*(n[s]+r[s])/2}else e=t.getChannelData(0);F().postMessage({audio:e,model:a.model,multilingual:!1,quantized:!0,subtask:"transcribe",language:null})}async function L(){b=[],O();try{v||(v=await navigator.mediaDevices.getUserMedia({audio:!0}));const t=P();u=new MediaRecorder(v,{mimeType:t}),u.addEventListener("dataavailable",async e=>{if(e.data.size>0&&b.push(e.data),u&&u.state==="inactive"){let o=new Blob(b,{type:t});b=[],H(o)}}),u.start(),c({recording:!0,durationSeconds:0}),m&&window.clearInterval(m),m=window.setInterval(()=>{a.durationSeconds++;const e=document.querySelector(".instruction");e&&a.recording&&(e.textContent=`Recording... (${$(a.durationSeconds)}) - Release to stop`)},1e3)}catch(t){console.error("Error accessing microphone:",t),alert("Could not access microphone. Please ensure you have granted permission."),c({recording:!1})}}function w(){u&&u.state==="recording"&&(u.stop(),c({recording:!1,durationSeconds:0})),m&&(window.clearInterval(m),m=null)}function U(t){t.code==="Space"&&!a.recording&&!t.repeat&&!(document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLSelectElement||document.activeElement instanceof HTMLTextAreaElement)&&(t.preventDefault(),L())}function N(t){t.code==="Space"&&a.recording&&(t.preventDefault(),w())}function _(t){const e=document.querySelector("#ptt-audio");e&&(e.currentTime=t,e.play())}function I(t){t&&navigator.clipboard.writeText(t).then(()=>{c({isCopied:!0}),window.setTimeout(()=>c({isCopied:!1}),2e3)}).catch(()=>{})}function j(){const t=document.querySelector("#ptt-visualizer");if(!t||!v||i.audioContext)return;i.audioContext=new AudioContext,i.source=i.audioContext.createMediaStreamSource(v),i.analyser=i.audioContext.createAnalyser(),i.analyser.fftSize=2048,i.source.connect(i.analyser);const e=t.getContext("2d");if(!e)return;const o=i.analyser.frequencyBinCount,n=new Uint8Array(o),r=()=>{i.rafId=requestAnimationFrame(r),i.analyser.getByteFrequencyData(n),e.clearRect(0,0,t.width,t.height);const s=3,d=2,h=Math.floor(t.width/(s+d)),g="#3b82f6";for(let p=0;p<h;p++){const R=Math.floor(p/h*o*.5),D=n[R]/255,M=Math.max(D*t.height,4),C=p*(s+d),S=(t.height-M)/2;e.fillStyle=g,e.beginPath(),e.roundRect?e.roundRect(C,S,s,M,s/2):e.rect(C,S,s,M),e.fill()}};r()}function X(){i.rafId&&cancelAnimationFrame(i.rafId),i.rafId=0,i.audioContext&&i.audioContext.close(),i.audioContext=null,i.analyser=null,i.source=null}function G(t){const e=t.target;if(!(e instanceof HTMLElement))return;const o=e.closest("button[data-model]");if(o){const r=o.getAttribute("data-model");r&&r!==a.model&&(B("model",r),c({model:r}));return}if(e.closest("[data-action='copy']")&&a.transcript){_(0),I(a.transcript.text);return}}function W(){l.addEventListener("mousedown",t=>{const e=t.target;e instanceof HTMLElement&&e.closest("[data-action='mic']")&&L()}),l.addEventListener("mouseup",t=>{const e=t.target;e instanceof HTMLElement&&e.closest("[data-action='mic']")&&w()}),l.addEventListener("mouseleave",()=>{a.recording&&w()}),l.addEventListener("touchstart",t=>{const e=t.target;e instanceof HTMLElement&&e.closest("[data-action='mic']")&&(t.preventDefault(),L())},{passive:!1}),l.addEventListener("touchend",t=>{const e=t.target;e instanceof HTMLElement&&e.closest("[data-action='mic']")&&(t.preventDefault(),w())},{passive:!1})}function K(){window.addEventListener("keydown",U),window.addEventListener("keyup",N),l.addEventListener("click",G),W()}A();K();
