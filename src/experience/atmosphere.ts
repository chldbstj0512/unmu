import type { TimeId } from "../study/logic.ts";

export type Visual = {
  id: TimeId;
  label: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  ambient: number;
  ambientColor: string;
  hemiSky: string;
  hemiGround: string;
  hemi: number;
  sun: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  skyTop: string;
  skyHorizon: string;
  sunDisc: string;
  star: number;
  windowGlow: number;
  lantern: number;
  interior: number;
  mist: number;
};

const PRESETS: Record<TimeId, Visual> = {
  dawn: {
    id: "dawn",
    label: "새벽",
    fog: "#e7cbb8",
    fogNear: 16,
    fogFar: 64,
    ambient: 0.42,
    ambientColor: "#f0d0bc",
    hemiSky: "#f2c3a6",
    hemiGround: "#6d5b49",
    hemi: 0.48,
    sun: [26, 9, 12],
    sunColor: "#ffc49a",
    sunIntensity: 2.35,
    skyTop: "#8eafd2",
    skyHorizon: "#e7cbb8",
    sunDisc: "#ffd2b4",
    star: 0.05,
    windowGlow: 0.55,
    lantern: 1.5,
    interior: 0.65,
    mist: 0.85,
  },
  day: {
    id: "day",
    label: "낮",
    fog: "#d7e3d6",
    fogNear: 26,
    fogFar: 82,
    ambient: 0.62,
    ambientColor: "#fff4e4",
    hemiSky: "#c5def4",
    hemiGround: "#7c8b6c",
    hemi: 0.62,
    sun: [16, 32, 8],
    sunColor: "#fff3d8",
    sunIntensity: 3.15,
    skyTop: "#8ebbe2",
    skyHorizon: "#d7e3d6",
    sunDisc: "#fff6e2",
    star: 0,
    windowGlow: 0.12,
    lantern: 0.28,
    interior: 0.22,
    mist: 0.22,
  },
  dusk: {
    id: "dusk",
    label: "해질녘",
    fog: "#e39a6a",
    fogNear: 12,
    fogFar: 52,
    ambient: 0.28,
    ambientColor: "#e8b89a",
    hemiSky: "#f0a07c",
    hemiGround: "#3c322b",
    hemi: 0.34,
    sun: [-24, 8, 16],
    sunColor: "#ff935c",
    sunIntensity: 1.85,
    skyTop: "#3c4d6e",
    skyHorizon: "#e39a6a",
    sunDisc: "#ffb07a",
    star: 0.28,
    windowGlow: 1.25,
    lantern: 2.2,
    interior: 1.05,
    mist: 0.7,
  },
  night: {
    id: "night",
    label: "밤",
    fog: "#1a2744",
    fogNear: 8,
    fogFar: 40,
    ambient: 0.07,
    ambientColor: "#9aadc6",
    hemiSky: "#24324e",
    hemiGround: "#14110e",
    hemi: 0.16,
    sun: [10, 24, -14],
    sunColor: "#c5d2ea",
    sunIntensity: 0.42,
    skyTop: "#070b14",
    skyHorizon: "#1a2744",
    sunDisc: "#e9eefb",
    star: 1,
    windowGlow: 1.9,
    lantern: 2.8,
    interior: 1.35,
    mist: 0.35,
  },
};

function mixHex(a: string, b: string, t: number) {
  const pa = Number.parseInt(a.slice(1), 16);
  const pb = Number.parseInt(b.slice(1), 16);
  const mix = (shift: number) => {
    const ca = (pa >> shift) & 255;
    const cb = (pb >> shift) & 255;
    return Math.round(ca + (cb - ca) * t);
  };
  const r = mix(16);
  const g = mix(8);
  const bl = mix(0);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
}

export function visualFor(id: TimeId, rain: boolean): Visual {
  const base = PRESETS[id];
  if (!rain) return base;
  return {
    ...base,
    fog: mixHex(base.fog, "#8d98a1", 0.42),
    skyHorizon: mixHex(base.skyHorizon, "#8d98a1", 0.42),
    fogNear: base.fogNear * 0.55,
    fogFar: base.fogFar * 0.7,
    sunIntensity: base.sunIntensity * 0.42,
    ambient: base.ambient * 0.78,
    lantern: base.lantern * 1.12,
    windowGlow: base.windowGlow * 1.08,
    mist: Math.min(1, base.mist + 0.25),
  };
}

export const TIME_ORDER: TimeId[] = ["dawn", "day", "dusk", "night"];
