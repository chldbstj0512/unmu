import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { input } from "./input.ts";
import { bridge } from "./bridge.ts";
import { getState, interact, setHelp, setSheet, stand, travelTo, useStudy } from "../study/store.ts";
import {
  BOUNDS,
  BUILDINGS,
  EYE,
  HALL,
  PLAYER_R,
  SPAWN,
  SPOTS,
  ZONES,
  blocked,
  floorAabb,
  frameCamera,
  groundY,
  nearestZone,
  placeAt,
  pushOutOfPond,
} from "../world/layout.ts";

const STEP = 0.42;
const LOOK = 0.0048;

function inRoom(x: number, z: number) {
  if (x >= HALL.minX && x <= HALL.maxX && z >= HALL.minZ && z <= HALL.maxZ) return true;
  return BUILDINGS.some((item) => {
    if (item.pavilion) return false;
    const floor = floorAabb(item);
    return x >= floor.minX && x <= floor.maxX && z >= floor.minZ && z <= floor.maxZ;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  const pos = useRef({ x: SPAWN.x, y: EYE, z: SPAWN.z });
  const yaw = useRef(SPAWN.yaw);
  const bodyYaw = useRef(SPAWN.yaw);
  const pitch = useRef(SPAWN.pitch);
  const camSmooth = useRef<{ x: number; y: number; z: number } | null>(null);
  const bob = useRef(0);
  const reduced = useRef(false);
  const seatAim = useRef<string | null>(null);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const canLook = () => {
      const current = getState();
      return current.entered && !current.sheetOpen && !current.breathOpen && !current.vowOpen && !current.recordOpen && !current.helpOpen && !current.examOpen && !current.fade;
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (window.matchMedia("(pointer: coarse)").matches) return;
      if (!canLook()) return;
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      void canvas.requestPointerLock();
    };
    const onMove = (event: PointerEvent) => {
      if (document.pointerLockElement === canvas) {
        input.lookX += event.movementX;
        input.lookY += event.movementY;
        return;
      }
      if (!dragging) return;
      input.lookX += event.clientX - lastX;
      input.lookY += event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
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
          const current = getState();
          if (current.examOpen) return;
          const zone = nearestZone(pos.current.x, pos.current.z);
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
        if (event.code.startsWith("Digit")) {
          const spot = SPOTS.find((item) => item.key === event.code.slice(5));
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
      camera.position.set(2.2 + Math.sin(t * 0.07) * 0.15, 1.2, 8.15);
      camera.lookAt(2.9, 0.62, 10.6);
      return;
    }

    const travel = bridge.travel;
    let snapped = false;
    if (travel) {
      pos.current.x = travel.x;
      pos.current.z = travel.z;
      yaw.current = travel.yaw;
      bodyYaw.current = travel.yaw;
      pitch.current = clamp(travel.pitch ?? -0.32, -0.7, 0.25);
      camSmooth.current = null;
      bridge.travel = null;
      snapped = true;
    }

    const seated = ZONES.find((zone) => zone.id === seatedRef.current && zone.sit);
    if (seated) {
      if (seatAim.current !== seated.id) {
        seatAim.current = seated.id;
        yaw.current = seated.yaw;
        bodyYaw.current = seated.yaw;
        pitch.current = -0.28;
      }
      const k = 1 - Math.pow(0.0015, delta);
      pos.current.x += (seated.x - pos.current.x) * k;
      pos.current.z += (seated.z - pos.current.z) * k;
      yaw.current -= input.lookX * LOOK;
      pitch.current = clamp(pitch.current + input.lookY * LOOK, -0.7, 0.35);
      input.lookX = 0;
      input.lookY = 0;
    } else if (!snapped && !getState().examOpen) {
      seatAim.current = null;
      yaw.current -= input.lookX * LOOK;
      pitch.current = clamp(pitch.current + input.lookY * LOOK, -0.85, 0.45);
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

      if (Math.hypot(mx, mz) > 0.0004) {
        const desired = Math.atan2(-mx, -mz);
        const turn = Math.atan2(Math.sin(desired - bodyYaw.current), Math.cos(desired - bodyYaw.current));
        bodyYaw.current += turn * (1 - Math.exp(-delta / 0.09));
        if (!reduced.current) bob.current += delta * 8;
      }
    }

    if (!Number.isFinite(yaw.current) || !Number.isFinite(pitch.current)) {
      yaw.current = SPAWN.yaw;
      pitch.current = SPAWN.pitch;
    }
    const gy = groundY(pos.current.x, pos.current.z);
    const indoors = inRoom(pos.current.x, pos.current.z);
    const shoulder = !seated;
    const dist = seated ? 2.85 : indoors ? 0.85 : 0.55;
    const side = seated ? 1.15 : indoors ? 1.7 : 2.7;
    const pose = frameCamera(
      pos.current.x,
      pos.current.z,
      gy,
      yaw.current,
      pitch.current,
      dist,
      side,
      false,
      shoulder ? 0.62 : 1.02,
      shoulder ? (indoors ? 0.55 : 0.8) : 0,
    );
    if (snapped || !camSmooth.current) camSmooth.current = { x: pose.x, y: pose.y, z: pose.z };
    else {
      const follow = 1 - Math.exp(-delta / 0.16);
      camSmooth.current.x += (pose.x - camSmooth.current.x) * follow;
      camSmooth.current.y += (pose.y - camSmooth.current.y) * follow;
      camSmooth.current.z += (pose.z - camSmooth.current.z) * follow;
    }
    camera.up.set(0, 1, 0);
    camera.position.set(camSmooth.current.x, camSmooth.current.y, camSmooth.current.z);
    camera.lookAt(pos.current.x, pose.lookY, pos.current.z);
    bridge.player.x = pos.current.x;
    bridge.player.y = gy + 1.05;
    bridge.player.z = pos.current.z;
    bridge.player.yaw = bodyYaw.current;
    bridge.player.ground = gy;
    bridge.player.seated = Boolean(seated);
    bridge.player.bob = bob.current;
    bridge.publish({
      nearby: seated ? null : nearestZone(pos.current.x, pos.current.z),
      place: placeAt(pos.current.x, pos.current.z),
    });
  });

  return null;
}
