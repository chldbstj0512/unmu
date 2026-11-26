export const PLAYER_R = 0.32;
export const EYE = 1.58;
export const GROUND_HALF = 32;
export const DOOR_HEIGHT = 2.05;

export type Aabb = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Platform = Aabb & { y: number };
export type LocalBox = { minX: number; maxX: number; minZ: number; maxZ: number; y: number };

export type Building = {
  id: string;
  name: string;
  x: number;
  z: number;
  rotation: number;
  width: number;
  depth: number;
  wallHeight: number;
  platform: number;
  doorWidth?: number;
  pavilion?: boolean;
};

export type ZoneKind = "desk" | "bell" | "breath" | "altar";

export type Zone = {
  id: string;
  kind: ZoneKind;
  verb: string;
  x: number;
  z: number;
  yaw: number;
  eyeY: number;
  radius: number;
  sit: boolean;
};

export type Spot = {
  key: string;
  id: string;
  name: string;
  x: number;
  z: number;
  yaw: number;
  pitch?: number;
};

export const BUILDINGS: Building[] = [
  {
    id: "main",
    name: "대웅전",
    x: 0,
    z: -15,
    rotation: 0,
    width: 12,
    depth: 8.2,
    wallHeight: 2.75,
    platform: 0.62,
    doorWidth: 2.7,
  },
  {
    id: "study",
    name: "선방",
    x: -14.6,
    z: 0.2,
    rotation: Math.PI / 2,
    width: 11.2,
    depth: 7.4,
    wallHeight: 2.5,
    platform: 0.46,
    doorWidth: 2.2,
  },
  {
    id: "tea",
    name: "다실",
    x: 12.2,
    z: 6.4,
    rotation: -Math.PI / 2,
    width: 6.4,
    depth: 5,
    wallHeight: 2.35,
    platform: 0.26,
    pavilion: true,
  },
];

export const COMPOUND = { minX: -23.5, maxX: 23.5, minZ: -23.5, maxZ: 21.2 };
export const PILLAR_X = 1.7;
export const GATE_Z = 21.05;
export const POND = { x: 13.2, z: 15.2, rx: 5.5, rz: 3.55 };
export const DECK: Platform = { minX: 11.3, maxX: 15.1, minZ: 10.25, maxZ: 12.35, y: 0.12 };
export const BELL = { x: 6.5, z: 8.2 };
export const PAGODA = { x: -4.7, z: 3.5 };
export const YARD = { x: 0, z: 16.2 };
export const SPAWN = { x: 0, z: 16.2, yaw: 0, pitch: -0.04 };
export const BOUNDS = { minX: -22.7, maxX: 22.7, minZ: -22.7, maxZ: 23.5 };

export const LANTERNS = [
  { x: 3.15, z: 3.55 },
  { x: -2.7, z: -3.15 },
  { x: -9.15, z: 2.7 },
  { x: 8.55, z: 12.85 },
] as const;

export const DESK_X = [-3.45, -1.15, 1.15, 3.45] as const;
export const DESK_Z = -2.35;
export const SEAT_Z = -1.38;
export const CUSHION_Z = -1.72;

export function building(id: string): Building {
  const found = BUILDINGS.find((item) => item.id === id);
  if (!found) throw new Error(`없는 건물: ${id}`);
  return found;
}

export function worldXZ(b: Building, lx: number, lz: number): [number, number] {
  const c = Math.cos(b.rotation);
  const s = Math.sin(b.rotation);
  return [b.x + lx * c + lz * s, b.z - lx * s + lz * c];
}

export function facingYaw(b: Building): number {
  const [x, z] = [0, -1];
  const c = Math.cos(b.rotation);
  const s = Math.sin(b.rotation);
  const dx = x * c + z * s;
  const dz = -x * s + z * c;
  return Math.atan2(-dx, -dz);
}

export function localWalls(b: Building): Aabb[] {
  const hw = b.width / 2;
  const hd = b.depth / 2;
  const t = 0.26;
  if (b.pavilion) {
    const ix = hw - 0.46;
    const iz = hd - 0.46;
    const s = 0.16;
    const posts: Aabb[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        posts.push({
          minX: sx * ix - s,
          maxX: sx * ix + s,
          minZ: sz * iz - s,
          maxZ: sz * iz + s,
        });
      }
    }
    return posts;
  }
  const walls: Aabb[] = [
    { minX: -hw, maxX: hw, minZ: -hd, maxZ: -hd + t },
    { minX: hw - t, maxX: hw, minZ: -hd + t, maxZ: hd - t },
    { minX: -hw, maxX: -hw + t, minZ: -hd + t, maxZ: hd - t },
  ];
  const door = (b.doorWidth ?? 0) / 2;
  if (door <= 0.2) walls.push({ minX: -hw, maxX: hw, minZ: hd - t, maxZ: hd });
  else {
    walls.push({ minX: -hw, maxX: -door, minZ: hd - t, maxZ: hd });
    walls.push({ minX: door, maxX: hw, minZ: hd - t, maxZ: hd });
  }
  return walls;
}

export function localSteps(b: Building): LocalBox[] {
  if (!b.doorWidth || b.pavilion) return [];
  const hd = b.depth / 2;
  const door = b.doorWidth / 2 + 0.28;
  const treads = [
    { z0: -0.04, z1: 0.46, y: b.platform },
    { z0: 0.4, z1: 0.9, y: b.platform * (2 / 3) },
    { z0: 0.84, z1: 1.36, y: b.platform / 3 },
  ];
  return treads.map((step) => ({
    minX: -door,
    maxX: door,
    minZ: hd + step.z0,
    maxZ: hd + step.z1,
    y: step.y,
  }));
}

function worldAabb(b: Building, minLx: number, maxLx: number, minLz: number, maxLz: number): Aabb {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const lx of [minLx, maxLx]) {
    for (const lz of [minLz, maxLz]) {
      const [x, z] = worldXZ(b, lx, lz);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return { minX, maxX, minZ, maxZ };
}

export function floorAabb(b: Building): Aabb {
  const hw = b.width / 2;
  const hd = b.depth / 2;
  return worldAabb(b, -hw, hw, -hd, hd);
}

function hWall(z: number, minX: number, maxX: number, t = 0.5): Aabb {
  return { minX, maxX, minZ: z - t / 2, maxZ: z + t / 2 };
}

function vWall(x: number, minZ: number, maxZ: number, t = 0.5): Aabb {
  return { minX: x - t / 2, maxX: x + t / 2, minZ, maxZ };
}

function compoundWalls(): Aabb[] {
  const t = 0.5;
  const c = COMPOUND;
  const gate = PILLAR_X + 0.3;
  return [
    vWall(c.minX, c.minZ - t / 2, c.maxZ + t / 2, t),
    vWall(c.maxX, c.minZ - t / 2, c.maxZ + t / 2, t),
    hWall(c.minZ, c.minX + t / 2, c.maxX - t / 2, t),
    hWall(c.maxZ, c.minX + t / 2, -gate, t),
    hWall(c.maxZ, gate, c.maxX - t / 2, t),
    { minX: -6, maxX: 6, minZ: 24.15, maxZ: 24.65 },
  ];
}

function pillars(): Aabb[] {
  return [-PILLAR_X, PILLAR_X].map((x) => ({
    minX: x - 0.3,
    maxX: x + 0.3,
    minZ: GATE_Z - 0.34,
    maxZ: GATE_Z + 0.34,
  }));
}

const study = building("study");
const mainHall = building("main");

function obstacles(): Aabb[] {
  const boxes: Aabb[] = [
    worldAabb(mainHall, -1.35, 1.35, -3.6, -2.45),
    {
      minX: PAGODA.x - 0.72,
      maxX: PAGODA.x + 0.72,
      minZ: PAGODA.z - 0.72,
      maxZ: PAGODA.z + 0.72,
    },
    {
      minX: BELL.x - 0.38,
      maxX: BELL.x + 0.38,
      minZ: BELL.z - 0.38,
      maxZ: BELL.z + 0.38,
    },
  ];
  for (const lx of DESK_X) {
    boxes.push(worldAabb(study, lx - 0.58, lx + 0.58, DESK_Z - 0.28, DESK_Z + 0.28));
  }
  for (const lantern of LANTERNS) {
    boxes.push({
      minX: lantern.x - 0.26,
      maxX: lantern.x + 0.26,
      minZ: lantern.z - 0.26,
      maxZ: lantern.z + 0.26,
    });
  }
  return boxes;
}

export const COMPOUND_WALLS: Aabb[] = compoundWalls();

export const WALLS: Aabb[] = [
  ...COMPOUND_WALLS,
  ...pillars(),
  ...BUILDINGS.flatMap((item) => localWalls(item).map((wall) => worldAabb(item, wall.minX, wall.maxX, wall.minZ, wall.maxZ))),
  ...obstacles(),
];

export const PLATFORMS: Platform[] = [
  ...BUILDINGS.flatMap((item) => {
    const floor = floorAabb(item);
    const steps = localSteps(item).map((step) => ({
      ...worldAabb(item, step.minX, step.maxX, step.minZ, step.maxZ),
      y: step.y,
    }));
    return [{ ...floor, y: item.platform }, ...steps];
  }),
  DECK,
];

function makeZones(): Zone[] {
  const yaw = facingYaw(study);
  const desks = DESK_X.map((lx, index) => {
    const [x, z] = worldXZ(study, lx, SEAT_Z);
    return {
      id: `desk-${index}`,
      kind: "desk" as const,
      verb: "방석에 앉는다",
      x,
      z,
      yaw,
      eyeY: study.platform + 1.02,
      radius: 1.4,
      sit: true,
    };
  });
  const [altarX, altarZ] = worldXZ(mainHall, 0, -1.45);
  return [
    ...desks,
    {
      id: "altar",
      kind: "altar",
      verb: "다짐을 둔다",
      x: altarX,
      z: altarZ,
      yaw: 0,
      eyeY: mainHall.platform + EYE,
      radius: 1.55,
      sit: false,
    },
    {
      id: "bell",
      kind: "bell",
      verb: "종을 친다",
      x: BELL.x,
      z: BELL.z + 0.95,
      yaw: 0,
      eyeY: EYE,
      radius: 1.55,
      sit: false,
    },
    {
      id: "breath",
      kind: "breath",
      verb: "숨을 고른다",
      x: building("tea").x,
      z: building("tea").z,
      yaw: Math.PI,
      eyeY: building("tea").platform + EYE,
      radius: 2.35,
      sit: false,
    },
  ];
}

export const ZONES: Zone[] = makeZones();

function makeSpots(): Spot[] {
  const tea = building("tea");
  const [studyX, studyZ] = worldXZ(study, 0, 1.35);
  const [hallX, hallZ] = worldXZ(mainHall, 0, 2.55);
  const [teaX, teaZ] = worldXZ(tea, 0, 1.15);
  return [
    { key: "1", id: "yard", name: "마당", x: 0, z: 4.4, yaw: 0, pitch: -0.04 },
    { key: "2", id: "study", name: "선방", x: studyX, z: studyZ, yaw: facingYaw(study), pitch: -0.22 },
    { key: "3", id: "main", name: "대웅전", x: hallX, z: hallZ, yaw: 0, pitch: -0.08 },
    { key: "4", id: "tea", name: "다실", x: teaX, z: teaZ, yaw: facingYaw(tea), pitch: -0.32 },
    { key: "5", id: "bell", name: "종루", x: BELL.x, z: BELL.z + 1.65, yaw: 0 },
    { key: "6", id: "pond", name: "연못", x: 13.15, z: 10.72, yaw: Math.PI },
    { key: "", id: "gate", name: "일주문", x: 0, z: 17.5, yaw: 0 },
  ];
}

export const SPOTS: Spot[] = makeSpots();

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function blocked(x: number, z: number, radius = PLAYER_R): boolean {
  for (const wall of WALLS) {
    const cx = clamp(x, wall.minX, wall.maxX);
    const cz = clamp(z, wall.minZ, wall.maxZ);
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < radius * radius) return true;
  }
  return false;
}

export function groundY(x: number, z: number): number {
  let y = 0;
  for (const platform of PLATFORMS) {
    if (x >= platform.minX && x <= platform.maxX && z >= platform.minZ && z <= platform.maxZ) {
      y = Math.max(y, platform.y);
    }
  }
  return y;
}

export function onDeck(x: number, z: number): boolean {
  return x >= DECK.minX && x <= DECK.maxX && z >= DECK.minZ && z <= DECK.maxZ;
}

export function pushOutOfPond(x: number, z: number): [number, number] {
  if (onDeck(x, z)) return [x, z];
  const dx = x - POND.x;
  const dz = z - POND.z;
  const nx = dx / POND.rx;
  const nz = dz / POND.rz;
  const e = nx * nx + nz * nz;
  if (e >= 1) return [x, z];
  if (e < 1e-6) return [POND.x + POND.rx, POND.z];
  const k = 1 / Math.sqrt(e);
  return [POND.x + dx * k, POND.z + dz * k];
}

export function isInsideStudy(x: number, z: number): boolean {
  const floor = floorAabb(study);
  return x >= floor.minX && x <= floor.maxX && z >= floor.minZ && z <= floor.maxZ;
}

export function nearestZone(x: number, z: number): Zone | null {
  let best: Zone | null = null;
  let bestD = Infinity;
  for (const zone of ZONES) {
    const d = Math.hypot(x - zone.x, z - zone.z);
    if (d <= zone.radius && d < bestD) {
      best = zone;
      bestD = d;
    }
  }
  return best;
}

function march(x: number, z: number, tx: number, tz: number): [number, number] {
  const dx = tx - x;
  const dz = tz - z;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.22));
  let lx = x;
  let lz = z;
  for (let i = 1; i <= n; i += 1) {
    const nx = x + (dx * i) / n;
    const nz = z + (dz * i) / n;
    if (blocked(nx, nz, 0.18)) break;
    lx = nx;
    lz = nz;
  }
  return [lx, lz];
}

export function ceilingY(x: number, z: number): number | null {
  for (const item of BUILDINGS) {
    const floor = floorAabb(item);
    if (x >= floor.minX && x <= floor.maxX && z >= floor.minZ && z <= floor.maxZ) return item.platform + item.wallHeight;
  }
  return null;
}

function lampAt(b: Building, lx: number, lz: number, y: number) {
  const [x, z] = worldXZ(b, lx, lz);
  return { x, y, z };
}

const LAMPS = [
  lampAt(study, 0, -0.4, study.platform + 1.7),
  lampAt(mainHall, 0, -1, mainHall.platform + 1.8),
  ...LANTERNS.map((item) => ({ x: item.x, y: 1.08, z: item.z })),
];

export function frameCamera(px: number, pz: number, gy: number, yaw: number, pitch: number, dist: number, side: number) {
  const lookY = gy + 1.02;
  if (![px, pz, gy, yaw, pitch, dist, side].every(Number.isFinite)) {
    return { x: px, y: gy + 2.1, z: pz + 0.8, lookY };
  }
  const back = Math.cos(pitch) * dist;
  const lift = -Math.sin(pitch) * dist;
  const gx = Math.sin(yaw);
  const gz = Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  let [x, z] = march(px, pz, px + gx * back + rx * side, pz + gz * back + rz * side);
  let y = Math.max(gy + 1.05 + lift, groundY(x, z) + 0.55);
  const underRoof = () => {
    const cap = ceilingY(x, z);
    if (cap != null) y = Math.min(y, cap - 0.28);
  };
  underRoof();
  for (const lamp of LAMPS) {
    const dx = x - lamp.x;
    const dy = y - lamp.y;
    const dz = z - lamp.z;
    const d = Math.hypot(dx, dy, dz);
    const keep = 1.25;
    if (d >= keep || d < 1e-4) continue;
    const scale = keep / d;
    const nx = lamp.x + dx * scale;
    const nz = lamp.z + dz * scale;
    if (blocked(nx, nz, 0.18)) continue;
    x = nx;
    z = nz;
    y = lamp.y + dy * scale;
    underRoof();
  }
  if (Math.hypot(x - px, y - lookY, z - pz) < 1.05) {
    y = Math.max(y, lookY + 1.15);
    underRoof();
  }
  if (Math.hypot(x - px, y - lookY, z - pz) < 0.9) {
    let best = -Infinity;
    let bx = x;
    let bz = z;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const nx = px + Math.cos(a) * 0.85;
      const nz = pz + Math.sin(a) * 0.85;
      if (blocked(nx, nz, 0.18)) continue;
      const score = Math.cos(a) * gx + Math.sin(a) * gz;
      if (score > best) {
        best = score;
        bx = nx;
        bz = nz;
      }
    }
    if (best > -Infinity) {
      x = bx;
      z = bz;
      y = Math.max(y, lookY + 0.4);
      underRoof();
    }
  }
  return { x, y, z, lookY };
}

export function placeAt(x: number, z: number): string {
  for (const item of BUILDINGS) {
    const floor = floorAabb(item);
    if (x >= floor.minX && x <= floor.maxX && z >= floor.minZ && z <= floor.maxZ) return item.name;
  }
  if (Math.hypot(x - BELL.x, z - BELL.z) < 2.5) return "종루";
  const px = (x - POND.x) / POND.rx;
  const pz = (z - POND.z) / POND.rz;
  if (px * px + pz * pz < 1.35 || onDeck(x, z)) return "연못";
  if (Math.hypot(x - PAGODA.x, z - PAGODA.z) < 2.3) return "석탑";
  if (z > 18.4) return "일주문";
  return "마당";
}
