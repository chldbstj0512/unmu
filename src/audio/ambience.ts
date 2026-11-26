type Graph = {
  ctx: AudioContext;
  master: GainNode;
  wind: GainNode;
  windFilter: BiquadFilterNode;
  rain: GainNode;
  pond: GainNode;
};

let graph: Graph | null = null;
let failed = false;

function noiseBuffer(ctx: AudioContext, color: "wind" | "rain") {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = color === "wind" ? (last + 0.02 * white) / 1.02 : white;
    data[i] = last * (color === "wind" ? 3.4 : 1);
  }
  return buffer;
}

function ensure() {
  if (graph || failed) return graph;
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const wind = ctx.createGain();
    wind.gain.value = 0;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "lowpass";
    windFilter.frequency.value = 480;
    const windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer(ctx, "wind");
    windSource.loop = true;
    windSource.connect(windFilter);
    windFilter.connect(wind);
    wind.connect(master);
    windSource.start();

    const rain = ctx.createGain();
    rain.gain.value = 0;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = "highpass";
    rainFilter.frequency.value = 900;
    const rainSource = ctx.createBufferSource();
    rainSource.buffer = noiseBuffer(ctx, "rain");
    rainSource.loop = true;
    rainSource.connect(rainFilter);
    rainFilter.connect(rain);
    rain.connect(master);
    rainSource.start();

    const pond = ctx.createGain();
    pond.gain.value = 0;
    const pondFilter = ctx.createBiquadFilter();
    pondFilter.type = "bandpass";
    pondFilter.frequency.value = 740;
    pondFilter.Q.value = 0.6;
    const pondSource = ctx.createBufferSource();
    pondSource.buffer = noiseBuffer(ctx, "rain");
    pondSource.loop = true;
    pondSource.connect(pondFilter);
    pondFilter.connect(pond);
    pond.connect(master);
    pondSource.start();

    graph = { ctx, master, wind, windFilter, rain, pond };
    return graph;
  } catch {
    failed = true;
    return null;
  }
}

function glide(param: AudioParam, target: number) {
  param.value += (target - param.value) * 0.06;
}

export const ambience = {
  unlock() {
    const current = ensure();
    if (current && current.ctx.state === "suspended") void current.ctx.resume();
  },
  update(opts: { sound: boolean; rain: boolean; duck: boolean; pond: number; indoors: boolean }) {
    const current = graph ?? ensure();
    if (!current) return;
    const quiet = opts.duck ? 0.38 : opts.indoors ? 0.62 : 1;
    glide(current.master.gain, opts.sound ? 0.85 : 0);
    glide(current.wind.gain, opts.sound ? 0.07 * quiet : 0);
    glide(current.rain.gain, opts.sound && opts.rain ? 0.1 * quiet : 0);
    glide(current.pond.gain, opts.sound ? opts.pond * 0.08 * quiet : 0);
    current.windFilter.frequency.value = 420 + Math.sin(performance.now() / 2300) * 70;
  },
  bell() {
    tone([92, 184, 278, 370], [0.16, 0.09, 0.05, 0.03], 6.2);
  },
  chime() {
    tone([392, 523, 784], [0.06, 0.04, 0.02], 2.4);
  },
  moktak() {
    const current = ensure();
    if (!current) return;
    knock(current, current.ctx.currentTime, 210);
    knock(current, current.ctx.currentTime + 0.18, 180);
  },
};

function tone(freqs: number[], levels: number[], decay: number) {
  const current = ensure();
  if (!current) return;
  const now = current.ctx.currentTime;
  freqs.forEach((freq, index) => {
    const osc = current.ctx.createOscillator();
    const gain = current.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(levels[index] ?? 0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    osc.connect(gain);
    gain.connect(current.master);
    osc.start(now);
    osc.stop(now + decay + 0.05);
  });
}

function knock(current: Graph, when: number, freq: number) {
  const osc = current.ctx.createOscillator();
  const gain = current.ctx.createGain();
  const filter = current.ctx.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, when);
  osc.frequency.exponentialRampToValueAtTime(80, when + 0.09);
  filter.type = "bandpass";
  filter.frequency.value = 280;
  filter.Q.value = 1.4;
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(0.18, when + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.11);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(current.master);
  osc.start(when);
  osc.stop(when + 0.14);
}
