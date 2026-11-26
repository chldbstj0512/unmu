import type { Zone } from "../world/layout.ts";

export type Travel = { x: number; z: number; yaw: number; pitch?: number };

type Snap = { nearby: Zone | null; place: string };

let snap: Snap = { nearby: null, place: "마당" };
const listeners = new Set<() => void>();

export const bridge = {
  player: { x: 0, y: 1.58, z: 16.2, yaw: 0, ground: 0, seated: false, bob: 0 },
  travel: null as Travel | null,
  ringUntil: 0,
  publish(next: Snap) {
    const sameNear = (next.nearby?.id ?? null) === (snap.nearby?.id ?? null);
    if (sameNear && next.place === snap.place) return;
    snap = next;
    listeners.forEach((listener) => listener());
  },
};

export function subscribeWorld(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWorldSnap() {
  return snap;
}
