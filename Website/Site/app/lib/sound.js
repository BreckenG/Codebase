let ac, master, verb, noise;

function audio() {
  if (ac) return ac.resume();
  ac = new AudioContext();
  master = ac.createGain();
  master.gain.value = 0.9;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -18;
  master.connect(comp).connect(ac.destination);
  verb = ac.createConvolver();
  const n = ac.sampleRate * 2.4;
  const ir = ac.createBuffer(2, n, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2);
  }
  verb.buffer = ir;
  verb.connect(master);
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function send(node, wet) {
  node.connect(master);
  if (!wet) return;
  const g = ac.createGain();
  g.gain.value = wet;
  node.connect(g).connect(verb);
}

function env(g, t, peak, atk, dec) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + atk + dec);
}

function osc(type, f0, f1, t, dur, peak, atk, wet) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, peak, atk, dur);
  o.connect(g);
  send(g, wet);
  o.start(t);
  o.stop(t + atk + dur + 0.05);
}

function hiss(filt, f0, f1, q, t, dur, peak, atk, wet) {
  const s = ac.createBufferSource();
  const f = ac.createBiquadFilter();
  const g = ac.createGain();
  s.buffer = noise;
  s.loop = true;
  f.type = filt;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + atk + dur);
  env(g, t, peak, atk, dur);
  s.connect(f).connect(g);
  send(g, wet);
  s.start(t);
  s.stop(t + atk + dur + 0.05);
}

function swell(src, peak, t, dur, wet) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  src.connect(g);
  send(g, wet);
}

const jitter = (n, amt) => n * (1 + (Math.random() * 2 - 1) * amt);
const SCALE = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
let step = 0;

export const sfx = {
  thock(pitch = 1, vol = 0.1, wet = 0.12) {
    audio();
    const t = ac.currentTime;
    osc('sine', 210 * pitch, 120 * pitch, t, 0.07, vol, 0.002, wet);
    hiss('bandpass', 2400 * pitch, 900 * pitch, 1.3, t, 0.03, vol * 0.7, 0.001, wet);
  },
  tick(i) {
    audio();
    sfx.thock(1 + i * 0.02, 0.07, 0.1);
    osc('sine', 880 * Math.pow(2, i / 24), 0, ac.currentTime, 0.09, 0.025, 0.003, 0.25);
  },
  note(i) {
    audio();
    const f = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33][i % 7];
    sfx.thock(1.1, 0.06, 0.15);
    osc('sine', f, 0, ac.currentTime, 1.2, 0.04, 0.004, 0.5);
    osc('sine', f * 2.76, 0, ac.currentTime, 0.4, 0.006, 0.002, 0.5);
  },
  hover() {
    audio();
    step = (step + 1 + Math.floor(Math.random() * 3)) % SCALE.length;
    osc('sine', 980 * SCALE[step], 0, ac.currentTime, 0.05, jitter(0.008, 0.3), 0.004, 0.2);
  },
  press() {
    sfx.thock(jitter(1.08, 0.07), jitter(0.08, 0.2));
  },
  confirm() {
    audio();
    const t = ac.currentTime;
    const f = jitter(520, 0.03);
    sfx.thock(jitter(1, 0.05), 0.08);
    osc('sine', f, 0, t + 0.015, 0.16, 0.02, 0.004, 0.3);
    osc('sine', f * 1.5, 0, t + 0.07, 0.2, 0.016, 0.004, 0.35);
  },
  toggle(on) {
    sfx.thock(jitter(on ? 1.3 : 0.92, 0.04), 0.07);
  },
  whoosh(vol = 0.06) {
    audio();
    hiss('bandpass', 500, 2200, 0.9, ac.currentTime, 0.5, vol, 0.12, 0.3);
  },
  riser(dur) {
    audio();
    const t = ac.currentTime;
    const s = ac.createBufferSource();
    const f = ac.createBiquadFilter();
    s.buffer = noise;
    s.loop = true;
    f.type = 'bandpass';
    f.Q.value = 2.5;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(5200, t + dur);
    s.connect(f);
    swell(f, 0.16, t, dur, 0.35);
    s.start(t);
    s.stop(t + dur + 0.1);
    const o = ac.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(330, t + dur);
    swell(o, 0.05, t, dur, 0.3);
    o.start(t);
    o.stop(t + dur + 0.1);
  },
  hit() {
    audio();
    const t = ac.currentTime;
    osc('sine', 130, 36, t, 0.9, 0.7, 0.004, 0.2);
    hiss('lowpass', 2400, 160, 0.7, t, 0.45, 0.32, 0.003, 0.4);
    hiss('highpass', 7000, 0, 0.7, t + 0.02, 1.1, 0.05, 0.01, 0.8);
  },
  pop() {
    sfx.thock(1.5 + Math.random() * 0.9, 0.03, 0.2);
  },
  chime() {
    audio();
    const t = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1567.98].forEach((f, i) => {
      osc('sine', f, 0, t + i * 0.07, 1.8, 0.05, 0.004, 0.55);
      osc('sine', f * 2.76, 0, t + i * 0.07, 0.5, 0.008, 0.002, 0.55);
    });
  },
};
