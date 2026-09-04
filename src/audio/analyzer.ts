// Real-time audio analysis: pitch (autocorrelation), loudness (RMS),
// spectral centroid (timbral brightness) and onset detection. This is the
// "AI ear" that stands in for the trained listening model described in the
// concept doc -- it listens to whatever is playing and emits a stream of
// NoteEvents for the paint engine to react to.

export interface NoteEvent {
  time: number;
  frequency: number; // Hz, 0 if unvoiced/no pitch detected
  amplitude: number; // 0..1 RMS
  brightness: number; // 0..1 normalized spectral centroid
  isOnset: boolean; // true on a detected attack (new "note")
}

export type AnalyzerListener = (event: NoteEvent) => void;

export class SoundAnalyzer {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private source: AudioBufferSourceNode | MediaStreamAudioSourceNode | null = null;
  private rafId: number | null = null;
  private listeners: AnalyzerListener[] = [];
  private timeDomain: Float32Array<ArrayBuffer>;
  private freqDomain: Uint8Array<ArrayBuffer>;
  private rmsHistory: number[] = [];
  private lastOnsetAt = 0;
  private armed = true;

  constructor() {
    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.75;
    this.timeDomain = new Float32Array(this.analyser.fftSize);
    this.freqDomain = new Uint8Array(this.analyser.frequencyBinCount);
  }

  get audioContext() {
    return this.ctx;
  }

  onNote(listener: AnalyzerListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  async playFile(file: File): Promise<{ duration: number }> {
    this.stop();
    // Resume before the async file-read/decode gap, not after -- on mobile
    // Safari the AudioContext can drop back to "suspended" while the native
    // file picker has focus, and resume() needs to run as close to the
    // triggering user gesture as possible or it silently no-ops, leaving the
    // source playing into a suspended context (no analyser data, no errors).
    await this.ctx.resume();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    // Decoding can take a while for a large file; re-resume in case the
    // context suspended again during that gap.
    if (this.ctx.state !== "running") await this.ctx.resume();

    const src = this.ctx.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    src.start();
    this.source = src;
    this.startLoop();

    return { duration: audioBuffer.duration };
  }

  async startMic(): Promise<void> {
    this.stop();
    await this.ctx.resume();
    // Plain `audio: true` rather than overriding the processing constraints:
    // disabling autoGainControl was tried as a mitigation for iOS pausing
    // other apps' audio on mic activation, but it doesn't reliably help with
    // that (websites have no API for the "mix with others" AVAudioSession
    // category native apps can request) while it does reliably leave the
    // iPhone mic too quiet to pick up ambient/speaker audio, reading as
    // silence below the analyzer's noise gate and leaving the canvas blank
    // even with permission granted and audio playing nearby.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const src = this.ctx.createMediaStreamSource(stream);
    src.connect(this.analyser);
    // Intentionally not connected to destination -- avoid feedback.
    this.source = src;
    this.startLoop();
  }

  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.source) {
      try {
        if (this.source instanceof AudioBufferSourceNode) {
          this.source.stop();
        }
        this.source.disconnect();
      } catch {
        // already stopped/disconnected
      }
      this.source = null;
    }
    try {
      this.analyser.disconnect();
    } catch {
      // no-op
    }
    this.rmsHistory = [];
    this.armed = true;
  }

  private startLoop() {
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.analyze();
    };
    tick();
  }

  private analyze() {
    this.analyser.getFloatTimeDomainData(this.timeDomain);
    this.analyser.getByteFrequencyData(this.freqDomain);

    const rms = computeRms(this.timeDomain);
    const frequency = autocorrelate(this.timeDomain, this.ctx.sampleRate);
    const brightness = computeSpectralCentroid(this.freqDomain, this.ctx.sampleRate, this.analyser.fftSize);

    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > 30) this.rmsHistory.shift();
    const avgRms = this.rmsHistory.reduce((a, b) => a + b, 0) / this.rmsHistory.length;

    // Edge-triggered with hysteresis (a Schmitt trigger): fire only on the
    // rising crossing above 1.35x the rolling average, then stay "disarmed"
    // until the level drops back under 1.1x before it can fire again. A
    // level-triggered version of this (fire whenever rms > avg*1.35 and the
    // cooldown has elapsed) kept re-firing every ~120ms for the better part
    // of a second after any attack, because the rolling average takes time
    // to catch up to a new sustained level -- a single held note would
    // otherwise read as a rapid onset train.
    const now = this.ctx.currentTime;
    const risingEdge = rms > avgRms * 1.35 && this.armed;
    if (rms < avgRms * 1.1) this.armed = true;
    const isOnset = rms > 0.02 && risingEdge && now - this.lastOnsetAt > 0.12;

    if (isOnset) {
      this.lastOnsetAt = now;
      this.armed = false;
    }

    // Only emit meaningful events -- skip near-silence to let strokes settle.
    if (rms < 0.006 && !isOnset) return;

    const event: NoteEvent = {
      time: now,
      frequency,
      amplitude: Math.min(1, rms * 4),
      brightness,
      isOnset,
    };
    for (const listener of this.listeners) listener(event);
  }
}

function computeRms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

/** Normalized spectral centroid in [0,1] -- higher = brighter timbre. */
function computeSpectralCentroid(freq: Uint8Array, sampleRate: number, fftSize: number): number {
  let weightedSum = 0;
  let magSum = 0;
  for (let i = 0; i < freq.length; i++) {
    const mag = freq[i];
    weightedSum += i * mag;
    magSum += mag;
  }
  if (magSum === 0) return 0;
  const centroidBin = weightedSum / magSum;
  const centroidHz = (centroidBin * sampleRate) / fftSize;
  return Math.min(1, centroidHz / 6000);
}

/**
 * Autocorrelation-based pitch detection (time domain). Returns 0 when no
 * clear periodicity is found (silence, noise, percussive-only material).
 */
function autocorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return 0;

  let r1 = 0;
  let r2 = SIZE - 1;
  const threshold = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < threshold) {
      r1 = i;
      break;
    }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < threshold) {
      r2 = SIZE - i;
      break;
    }
  }
  const trimmed = buf.slice(r1, r2);
  const n = trimmed.length;
  if (n < 8) return 0;

  const c = new Array(n).fill(0);
  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += trimmed[i] * trimmed[i + lag];
    c[lag] = sum;
  }

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;

  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < n; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return 0;

  let period = maxPos;
  const x1 = c[period - 1] ?? c[period];
  const x2 = c[period];
  const x3 = c[period + 1] ?? c[period];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  if (a) period = period - b / (2 * a);

  const frequency = sampleRate / period;
  if (frequency < 60 || frequency > 2000) return 0;
  return frequency;
}
