import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { input } from "./input.ts";
import { bridge } from "./bridge.ts";
import { getState, interact, setHelp, setSheet, stand, travelTo, useStudy } from "../study/store.ts";
import {
  BOUNDS,
  EYE,
  PLAYER_R,
  SPOTS,
  ZONES,
  blocked,
  groundY,
  nearestZone,
  placeAt,
  pushOutOfPond,
} from "../world/layout.ts";

const STEP = 0.42;
const LOOK = 0.00215;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function dampAngle(current: number, target: number, delta: number) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.pow(0.0015, delta));
}

function typingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function Player() {
  const camera = useThree((state) => state.camera as PerspectiveCamera);
  const gl = useThree((state) => state.gl);
  const entered = useStudy((state) => state.entered);
  const seatedId = useStudy((state) => state.seatedId);
  const enteredRef = useRef(entered);
  const seatedRef = useRef(seatedId);
  enteredRef.current = entered;
  seatedRef.current = seatedId;
  const pos = useRef({ x: 0, y: EYE, z: 16.2 });
  const yaw = useRef(0);
  const pitch = useRef(-0.04);
  const bob = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (!window.matchMedia("(pointer: fine)").matches) return;
      const current = getState();
      if (!current.entered || current.seatedId || current.sheetOpen || current.breathOpen || current.vowOpen || current.recordOpen || current.helpOpen || current.fade) return;
      void canvas.requestPointerLock();
    };
    canvas.addEventListener("pointerdown", onDown);
    return () => canvas.removeEventListener("pointerdown", onDown);
  }, [gl]);

  useEffect(() => {
    const setKey = (code: string, pressed: boolean) => {
      if (code === "KeyW" || code === "ArrowUp") input.forward = pressed;
      if (code === "KeyS" || code === "ArrowDown") input.back = pressed;
      if (code === "KeyA" || code === "ArrowLeft") input.left = pressed;
      if (code === "KeyD" || code === "ArrowRight") input.right = pressed;
      if (code === "ShiftLeft" || code === "ShiftRight") input.slow = pressed;
    };
    const release = () => {
      input.forward = false;
      input.back = false;
      input.left = false;
      input.right = false;
      input.slow = false;
      input.joyX = 0;
      input.joyY = 0;
    };
    const onKey = (event: KeyboardEvent) => {
      if (typingTarget(event.target)) return;
      if (event.type === "keydown") {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
        if (event.repeat && (event.code === "KeyE" || event.code.startsWith("Digit"))) return;
        setKey(event.code, true);
        if (event.code === "KeyE") {
          const zone = nearestZone(pos.current.x, pos.current.z);
          const current = getState();
          if (zone && !current.seatedId) interact(zone);
        }
        if (event.code === "Escape") {
          const current = getState();
          if (current.breathOpen) return;
          if (current.vowOpen || current.recordOpen || current.helpOpen) return;
          if (current.seatedId) stand();
          else if (current.sheetOpen) setSheet(false);
        }
        if (event.code === "Slash" || event.code === "F1") {
          event.preventDefault();
          setHelp(true);
        }
        const digit = { Digit1: "1", Digit2: "2", Digit3: "3", Digit4: "4", Digit5: "5", Digit6: "6" }[event.code];
        if (digit) {
          const spot = SPOTS.find((item) => item.key === digit);
          if (spot) travelTo(spot);
        }
      } else {
        setKey(event.code, false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    window.addEventListener("blur", release);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("blur", release);
      release();
    };
  }, []);

  useFrame((state, dt) => {
    const delta = Math.min(0.05, dt);
    if (!enteredRef.current) {
      const t = state.clock.elapsedTime;
      camera.position.set(Math.sin(t * 0.07) * 0.7, 2.55, 18.6);
      camera.lookAt(0, 1.8, -8);
      return;
    }

    const travel = bridge.travel;
    let snapped = false;
    if (travel) {
      pos.current.x = travel.x;
      pos.current.z = travel.z;
      yaw.current = travel.yaw;
      pitch.current = -0.06;
      pos.current.y = groundY(pos.current.x, pos.current.z) + EYE;
      pitch.current = travel.pitch ?? -0.06;
      bridge.travel = null;
      snapped = true;
    }

    const seated = ZONES.find((zone) => zone.id === seatedRef.current && zone.sit);
    if (seated) {
      input.lookX = 0;
      input.lookY = 0;
      const k = 1 - Math.pow(0.0015, delta);
      pos.current.x += (seated.x - pos.current.x) * k;
      pos.current.z += (seated.z - pos.current.z) * k;
      pos.current.y += (seated.eyeY - pos.current.y) * k;
      yaw.current = dampAngle(yaw.current, seated.yaw, delta);
      pitch.current += (-0.52 - pitch.current) * k;
    } else if (!snapped) {
      yaw.current -= input.lookX * LOOK;
      pitch.current = clamp(pitch.current + input.lookY * LOOK, -1.15, 1.15);
      input.lookX = 0;
      input.lookY = 0;

      let ix = input.joyX + (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let iz = input.joyY + (input.forward ? 1 : 0) - (input.back ? 1 : 0);
      const len = Math.hypot(ix, iz);
      if (len > 1) {
        ix /= len;
        iz /= len;
      }
      const speed = (input.slow ? 1.2 : 2.45) * delta * Math.min(len, 1);
      const fx = -Math.sin(yaw.current);
      const fz = -Math.cos(yaw.current);
      const rx = Math.cos(yaw.current);
      const rz = -Math.sin(yaw.current);
      const mx = (fx * iz + rx * ix) * speed;
      const mz = (fz * iz + rz * ix) * speed;
      const prevX = pos.current.x;
      const prevZ = pos.current.z;
      if (mx !== 0) {
        const nx = pos.current.x + mx;
        if (!blocked(nx, pos.current.z, PLAYER_R) && groundY(nx, pos.current.z) - groundY(pos.current.x, pos.current.z) <= STEP) {
          pos.current.x = nx;
        }
      }
      if (mz !== 0) {
        const nz = pos.current.z + mz;
        if (!blocked(pos.current.x, nz, PLAYER_R) && groundY(pos.current.x, nz) - groundY(pos.current.x, pos.current.z) <= STEP) {
          pos.current.z = nz;
        }
      }
      const [px, pz] = pushOutOfPond(pos.current.x, pos.current.z);
      if (!blocked(px, pz, PLAYER_R)) {
        pos.current.x = px;
        pos.current.z = pz;
      } else {
        pos.current.x = prevX;
        pos.current.z = prevZ;
      }
      const bx = clamp(pos.current.x, BOUNDS.minX, BOUNDS.maxX);
      const bz = clamp(pos.current.z, BOUNDS.minZ, BOUNDS.maxZ);
      if (!blocked(bx, pos.current.z, PLAYER_R)) pos.current.x = bx;
      if (!blocked(pos.current.x, bz, PLAYER_R)) pos.current.z = bz;

      const moving = Math.hypot(mx, mz) > 0.0004;
      if (moving && !reduced.current) bob.current += delta * 8;
      const bobY = moving && !reduced.current ? Math.sin(bob.current) * 0.018 : 0;
      const targetY = groundY(pos.current.x, pos.current.z) + EYE + bobY;
      pos.current.y += (targetY - pos.current.y) * (1 - Math.pow(0.001, delta));
    }

    camera.position.set(pos.current.x, pos.current.y, pos.current.z);
    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw.current;
    camera.rotation.x = pitch.current;
    camera.rotation.z = 0;
    bridge.player.x = pos.current.x;
    bridge.player.y = pos.current.y;
    bridge.player.z = pos.current.z;
    bridge.player.yaw = yaw.current;
    bridge.publish({
      nearby: seated ? null : nearestZone(pos.current.x, pos.current.z),
      place: placeAt(pos.current.x, pos.current.z),
    });
  });

  return null;
}
