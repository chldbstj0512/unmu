import * as THREE from "three";
import { GROUND_HALF, POND } from "./layout.ts";

let tile: THREE.CanvasTexture | null = null;
let ground: THREE.CanvasTexture | null = null;

// Some drivers turn gl.generateMipmap of an sRGB canvas into colored static.
// That static only shows up once the ground is far enough to use those levels,
// so it reads as a thin sheet with a hard edge. Build the levels on the CPU.
function sealOpaque(canvas: HTMLCanvasElement) {
  const g = canvas.getContext("2d");
  if (!g) return;
  const image = g.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  g.putImageData(image, 0, 0);
}

function mipChain(source: HTMLCanvasElement) {
  const levels: HTMLCanvasElement[] = [source];
  let width = source.width;
  let height = source.height;
  let current = source;
  while (width > 1 || height > 1) {
    width = Math.max(1, width >> 1);
    height = Math.max(1, height >> 1);
    const next = document.createElement("canvas");
    next.width = width;
    next.height = height;
    const g = next.getContext("2d");
    if (!g) break;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(current, 0, 0, width, height);
    levels.push(next);
    current = next;
  }
  return levels;
}

function finish(canvas: HTMLCanvasElement, repeat: boolean) {
  sealOpaque(canvas);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mipmaps = mipChain(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 1;
  texture.premultiplyAlpha = false;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  }
  texture.needsUpdate = true;
  return texture;
}

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
  return finish(canvas, true);
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

  g.fillStyle = "#6d7864";
  g.fillRect(0, 0, size, size);
  const wash = (x: number, z: number, rx: number, rz: number, color: string) => {
    const gradient = g.createRadialGradient(toX(x), toY(z), 4, toX(x), toY(z), Math.max(rx, rz));
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "#6d7864");
    g.fillStyle = gradient;
    g.beginPath();
    g.ellipse(toX(x), toY(z), rx, rz, 0, 0, Math.PI * 2);
    g.fill();
  };
  wash(0, 2, 280, 240, "#8b8674");
  wash(-8, -6, 140, 120, "#8a846f");
  wash(10, 8, 160, 110, "#918b78");
  wash(-14, 10, 120, 90, "#6a7564");

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

  return finish(canvas, false);
}

export function textures() {
  if (!tile) tile = tileTexture();
  if (!ground) ground = groundTexture();
  return { tile, ground };
}
