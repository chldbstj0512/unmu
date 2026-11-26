import assert from "node:assert/strict";
import test from "node:test";
import { createHipRoof } from "./geometry.ts";

test("hip roof rises at the ridge and curls at the eaves", () => {
  const rise = 1.2;
  const geo = createHipRoof(12, 8, rise);
  const pos = geo.getAttribute("position");
  const normal = geo.getAttribute("normal");
  assert.ok(pos.count > 50);

  let maxY = -Infinity;
  let center = 0;
  let centerI = 0;
  let centerD = Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    assert.equal(Number.isFinite(y), true);
    maxY = Math.max(maxY, y);
    const d = pos.getX(i) ** 2 + pos.getZ(i) ** 2;
    if (d < centerD) {
      centerD = d;
      center = y;
      centerI = i;
    }
  }
  assert.ok(center > rise * 0.9, `center ${center}`);
  assert.ok(maxY < rise * 1.45, `max ${maxY}`);
  assert.ok(normal.getY(centerI) > 0.5, `normal ${normal.getY(centerI)}`);
});
