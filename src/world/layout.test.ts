import assert from "node:assert/strict";
import test from "node:test";
import {
  BELL,
  BOUNDS,
  BUILDINGS,
  DECK,
  DESK_X,
  POND,
  SEAT_Z,
  SPAWN,
  SPOTS,
  ZONES,
  blocked,
  building,
  facingYaw,
  floorAabb,
  groundY,
  placeAt,
  pushOutOfPond,
  worldXZ,
} from "./layout.ts";

function walk(x1: number, z1: number, x2: number, z2: number, step = 0.3) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / step));
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const x = x1 + dx * t;
    const z = z1 + dz * t;
    assert.equal(blocked(x, z), false, `길이 막힘 ${x.toFixed(2)}, ${z.toFixed(2)}`);
  }
}

test("spawn, spots, and seats stay out of walls", () => {
  assert.equal(blocked(SPAWN.x, SPAWN.z), false);
  for (const spot of SPOTS) {
    assert.equal(blocked(spot.x, spot.z), false, spot.id);
  }
  const study = building("study");
  for (const lx of DESK_X) {
    const [x, z] = worldXZ(study, lx, SEAT_Z);
    assert.equal(blocked(x, z), false, `seat ${lx}`);
  }
});

test("paths connect the yard to each room", () => {
  const study = SPOTS.find((spot) => spot.id === "study");
  const hall = SPOTS.find((spot) => spot.id === "main");
  const tea = SPOTS.find((spot) => spot.id === "tea");
  const bell = SPOTS.find((spot) => spot.id === "bell");
  const pond = SPOTS.find((spot) => spot.id === "pond");
  assert.ok(study && hall && tea && bell && pond);
  walk(SPAWN.x, SPAWN.z, 0, -12.4);
  walk(0, 0.2, study.x, study.z);
  walk(0, 4, hall.x, hall.z);
  walk(0, 6.4, tea.x, tea.z);
  walk(0, 8.2, bell.x, bell.z);
  walk(0, 10.2, pond.x, pond.z);
  walk(0, 16, 0, 22.4);
});

test("floors and the deck have the right height", () => {
  const study = building("study");
  const [sx, sz] = worldXZ(study, 0, 0);
  assert.ok(Math.abs(groundY(sx, sz) - study.platform) < 1e-6);
  const hall = building("main");
  assert.ok(Math.abs(groundY(hall.x, hall.z) - hall.platform) < 1e-6);
  const tea = building("tea");
  assert.ok(Math.abs(groundY(tea.x, tea.z) - tea.platform) < 1e-6);
  assert.equal(groundY(SPAWN.x, SPAWN.z), 0);
  assert.equal(groundY(13.15, 10.72), DECK.y);
  assert.equal(groundY(0, 4), 0);
});

test("study door faces the yard and the seat looks at the desk", () => {
  const study = building("study");
  const [doorX, doorZ] = worldXZ(study, 0, study.depth / 2);
  assert.ok(doorX > study.x + 3);
  assert.ok(Math.abs(doorZ - study.z) < 0.05);
  const yaw = facingYaw(study);
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  assert.ok(fx < -0.9);
  assert.ok(Math.abs(fz) < 0.1);
  assert.equal(blocked(doorX + 0.4, doorZ), false);
  assert.equal(blocked(doorX - 0.8, doorZ), false);
});

test("pond pushes the body out except on the deck", () => {
  const [x, z] = pushOutOfPond(POND.x, POND.z + 0.4);
  const nx = (x - POND.x) / POND.rx;
  const nz = (z - POND.z) / POND.rz;
  assert.ok(nx * nx + nz * nz >= 0.999);
  assert.deepEqual(pushOutOfPond(13.15, 11.5), [13.15, 11.5]);
  assert.deepEqual(pushOutOfPond(0, 0), [0, 0]);
});

test("place names follow the buildings", () => {
  assert.equal(placeAt(0, 4), "마당");
  assert.equal(placeAt(building("study").x, building("study").z), "선방");
  assert.equal(placeAt(0, -15), "대웅전");
  assert.equal(placeAt(BELL.x, BELL.z + 1.2), "종루");
  assert.equal(placeAt(0, 19), "일주문");
});

test("the deck does not cut the tea room", () => {
  const tea = floorAabb(building("tea"));
  assert.ok(DECK.minZ > tea.maxZ);
  assert.ok(DECK.maxX < BOUNDS.maxX);
});

test("a desk zone exists for every cushion", () => {
  const desks = ZONES.filter((zone) => zone.kind === "desk");
  assert.equal(desks.length, DESK_X.length);
  assert.ok(BUILDINGS.length >= 3);
});
