import * as THREE from "three";
import { GROUND_HALF, POND } from "./layout.ts";

let tile: THREE.CanvasTexture | null = null;
let ground: THREE.CanvasTexture | null = null;

function tileTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext("2d");
  if (!g) return new THREE.CanvasTexture(canvas);
  g.fillStyle = "#3a434a";
  g.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 8; row += 1) {
    const y = row * 32;
    const offset = row % 2 ? 16 : 0;
    for (let col = -1; col < 5; col += 1) {
      const x = col * 32 + offset;
      g.fillStyle = row % 3 === 0 ? "#4a555c" : "#414b52";
      g.beginPath();
      g.roundRect(x + 2, y + 2, 28, 24, 8);
      g.fill();
      g.fillStyle = "#2a3136";
      g.fillRect(x + 2, y + 26, 28, 5);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function groundTexture() {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  if (!g) return new THREE.CanvasTexture(canvas);
  const half = GROUND_HALF;
  const toX = (x: number) => ((x + half) / (half * 2)) * size;
  const toY = (z: number) => ((z + half) / (half * 2)) * size;

  g.fillStyle = "#66725f";
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 28000; i += 1) {
    g.fillStyle = i % 2 ? "#5c6756" : "#748270";
    g.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  g.fillStyle = "#8b8674";
  g.fillRect(toX(-22.6), toY(-22.6), toX(22.6) - toX(-22.6), toY(20.6) - toY(-22.6));
  for (let i = 0; i < 18000; i += 1) {
    const x = -22 + Math.random() * 44;
    const z = -22 + Math.random() * 42;
    g.fillStyle = Math.random() > 0.5 ? "#7d7868" : "#98927e";
    g.fillRect(toX(x), toY(z), 2, 2);
  }

  g.fillStyle = "#6a6558";
  g.fillRect(toX(-1.55), toY(-12.2), toX(1.55) - toX(-1.55), toY(19.2) - toY(-12.2));
  g.fillRect(toX(-12.2), toY(-1.15), toX(2.2) - toX(-12.2), toY(1.55) - toY(-1.15));
  g.fillRect(toX(-1.2), toY(5.15), toX(10.4) - toX(-1.2), toY(7.55) - toY(5.15));

  g.fillStyle = "#615c50";
  for (let t = 0; t <= 1; t += 0.04) {
    const x = 1 + (12.4 - 1) * t;
    const z = 7.2 + (11.2 - 7.2) * t;
    g.beginPath();
    g.ellipse(toX(x), toY(z), 16, 11, 0, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = "#7d7870";
  for (let z = -8; z <= 16; z += 3.1) {
    g.beginPath();
    g.ellipse(toX(0), toY(z), 11, 16, 0, 0, Math.PI * 2);
    g.fill();
  }

  g.fillStyle = "#163033";
  g.beginPath();
  g.ellipse(toX(POND.x), toY(POND.z), (POND.rx / (half * 2)) * size, (POND.rz / (half * 2)) * size, 0, 0, Math.PI * 2);
  g.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function textures() {
  if (!tile) tile = tileTexture();
  if (!ground) ground = groundTexture();
  return { tile, ground };
}
