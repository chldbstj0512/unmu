import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Visual } from "../experience/atmosphere.ts";
import { GROUND_HALF, POND } from "./layout.ts";
import { textures } from "./textures.ts";

const PINES: Array<[number, number, number]> = [
  [-19.4, 0, -16.5],
  [-19.2, 0, 13.2],
  [19.5, 0, -16],
  [19.3, 0, 15.2],
  [-7.6, 0, 17.4],
  [8.2, 0, 17.2],
  [-16.8, 0, -20.2],
  [16.2, 0, -19.6],
];

const FAR_PINES: Array<[number, number, number, number]> = [
  [-30, 0, -6, 1.7],
  [31, 0, 4, 1.9],
  [-27, 0, 20, 1.45],
  [28, 0, -20, 1.6],
  [2, 0, -36, 2.2],
  [-16, 0, -33, 1.7],
  [22, 0, 32, 1.6],
];

const MAPLES: Array<[number, number, number]> = [
  [-6.4, 0, 13.6],
  [6.1, 0, 13.1],
  [-9.4, 0, -8.6],
  [10.4, 0, -6.2],
];

export function Pine({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.75, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.16, 1.5, 6]} />
        <meshStandardMaterial color="#5a3b28" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.85, 0]} castShadow>
        <coneGeometry args={[0.95, 1.55, 7]} />
        <meshStandardMaterial color="#2c4634" roughness={1} />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[0.7, 1.2, 7]} />
        <meshStandardMaterial color="#34563d" roughness={1} />
      </mesh>
      <mesh position={[0, 3.25, 0]} castShadow>
        <coneGeometry args={[0.4, 0.9, 7]} />
        <meshStandardMaterial color="#3e5e46" roughness={1} />
      </mesh>
    </group>
  );
}

export function Maple({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.15, 1.1, 6]} />
        <meshStandardMaterial color="#6a4330" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.5, 0]} castShadow>
        <icosahedronGeometry args={[0.82, 0]} />
        <meshStandardMaterial color="#a33d2a" flatShading />
      </mesh>
      <mesh position={[0.38, 1.85, 0.12]} castShadow>
        <icosahedronGeometry args={[0.52, 0]} />
        <meshStandardMaterial color="#c25d2c" flatShading />
      </mesh>
    </group>
  );
}

function Mountains() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(170, 170, 72, 72);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    if (!pos) return geo;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const radius = Math.hypot(x, z);
      const ridge = Math.max(0, radius - 36);
      const noise = Math.sin(x * 0.08) * Math.cos(z * 0.07) + Math.sin(x * 0.21 + z * 0.13) * 0.45;
      let y = ridge * 0.38 + Math.max(0, noise) * 2.8 * Math.min(1, ridge / 12);
      const south = Math.max(0, z - 18);
      y *= 1 - Math.min(1, south / 28) * Math.exp(-(x * x) / 380) * 0.8;
      if (radius < 34) y = -2.4;
      else if (radius < 42) y = -2.4 * (1 - (radius - 34) / 8) + y * ((radius - 34) / 8);
      pos.setY(i, y);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color="#66756b" roughness={1} />
    </mesh>
  );
}

function Ground({ wet }: { wet: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
      <planeGeometry args={[GROUND_HALF * 2, GROUND_HALF * 2]} />
      <meshStandardMaterial map={textures().ground} color={wet ? "#7d868c" : "#ffffff"} roughness={1} />
    </mesh>
  );
}

function Pond() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        uniforms: { uTime: { value: 0 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            vec2 uv = vUv * 7.0;
            float wave = sin(uv.x * 2.2 + uTime * 1.1) * sin(uv.y * 1.8 - uTime * 0.8);
            vec3 deep = vec3(0.04, 0.16, 0.18);
            vec3 lite = vec3(0.22, 0.46, 0.44);
            vec3 color = mix(deep, lite, 0.42 + 0.22 * wave);
            float spark = smoothstep(0.965, 1.0, sin(uv.x * 11.0 + uTime) * sin(uv.y * 8.0 - uTime));
            color += spark * 0.16;
            gl_FragColor = vec4(color, 0.94);
          }
        `,
      }),
    [],
  );
  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });
  useEffect(() => () => material.dispose(), [material]);
  const pads = useMemo(
    () => [
      [-1.6, 0.4],
      [1.2, -0.6],
      [0.4, 1.1],
      [-0.3, -1.2],
    ],
    [],
  );
  return (
    <group position={[POND.x, 0, POND.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]} scale={[POND.rx, POND.rz, 1]}>
        <circleGeometry args={[1, 56]} />
        <primitive object={material} attach="material" />
      </mesh>
      {pads.map(([x, z], index) => (
        <mesh key={index} rotation={[-Math.PI / 2, 0, index]} position={[x * 1.7, 0.07, z * 1.3]}>
          <circleGeometry args={[0.42, 8]} />
          <meshStandardMaterial color={index % 2 ? "#2f6a3e" : "#3e7a48"} roughness={0.8} />
        </mesh>
      ))}
      <Koi radiusX={POND.rx * 0.48} radiusZ={POND.rz * 0.42} phase={0.4} speed={0.35} color="#e07a3a" />
      <Koi radiusX={POND.rx * 0.32} radiusZ={POND.rz * 0.28} phase={2.1} speed={0.5} color="#f2d2a2" />
      <Koi radiusX={POND.rx * 0.58} radiusZ={POND.rz * 0.22} phase={4.2} speed={0.28} color="#d85a3a" />
    </group>
  );
}

function Koi({
  radiusX,
  radiusZ,
  phase,
  speed,
  color,
}: {
  radiusX: number;
  radiusZ: number;
  phase: number;
  speed: number;
  color: string;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const fish = ref.current;
    if (!fish) return;
    const t = clock.elapsedTime * speed + phase;
    fish.position.set(Math.cos(t) * radiusX, 0.08, Math.sin(t) * radiusZ);
    fish.rotation.y = -t + Math.PI / 2;
  });
  return (
    <group ref={ref}>
      <mesh scale={[0.32, 0.1, 0.14]} castShadow>
        <sphereGeometry args={[1, 12, 8]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
      <mesh position={[-0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.14, 5]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

function Mist({ amount }: { amount: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const g = canvas.getContext("2d");
    const next = new THREE.CanvasTexture(canvas);
    if (!g) return next;
    const gradient = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,255,255,0.7)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gradient;
    g.fillRect(0, 0, 128, 128);
    next.colorSpace = THREE.SRGBColorSpace;
    return next;
  }, []);
  const group = useRef<THREE.Group>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: Math.sin(i * 1.7) * 15,
        z: Math.cos(i * 1.25) * 13 + 1,
        s: 4.5 + (i % 4) * 1.2,
        p: i * 0.8,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const puff = group.current;
    if (!puff) return;
    puff.children.forEach((child, index) => {
      const seed = seeds[index];
      if (!seed) return;
      child.position.x = seed.x + Math.sin(clock.elapsedTime * 0.08 + seed.p) * 1.5;
      child.position.z = seed.z + Math.cos(clock.elapsedTime * 0.06 + seed.p) * 1.2;
    });
  });
  return (
    <group ref={group}>
      {seeds.map((seed, index) => (
        <sprite key={index} position={[seed.x, 0.7, seed.z]} scale={[seed.s, seed.s * 0.62, 1]}>
          <spriteMaterial map={texture} transparent opacity={0.16 * amount} depthWrite={false} color="#f4e6d4" />
        </sprite>
      ))}
    </group>
  );
}

function Fireflies({ on }: { on: boolean }) {
  const group = useRef<THREE.Group>(null);
  const seeds = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        x: Math.sin(i * 1.7) * 11,
        z: Math.cos(i * 1.3) * 9,
        y: 0.7 + (i % 5) * 0.38,
        p: i * 0.9,
      })),
    [],
  );
  useFrame(({ clock }) => {
    const cloud = group.current;
    if (!cloud) return;
    const t = clock.elapsedTime;
    cloud.children.forEach((child, index) => {
      const seed = seeds[index];
      if (!seed) return;
      child.position.set(seed.x + Math.sin(t * 0.5 + seed.p) * 0.6, seed.y + Math.sin(t * 1.3 + seed.p) * 0.45, seed.z + Math.cos(t * 0.35 + seed.p) * 0.6);
    });
  });
  if (!on) return null;
  return (
    <group ref={group}>
      {seeds.map((seed, index) => (
        <mesh key={index} position={[seed.x, seed.y, seed.z]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color="#ffe2a4" emissive="#ffd27a" emissiveIntensity={1.4} />
        </mesh>
      ))}
    </group>
  );
}

export function Nature({ visual, wet }: { visual: Visual; wet: boolean }) {
  return (
    <>
      <Mountains />
      <Ground wet={wet} />
      <Pond />
      {PINES.map((position, index) => (
        <Pine key={index} position={position} scale={0.85 + (index % 3) * 0.12} />
      ))}
      {FAR_PINES.map(([x, y, z, scale], index) => (
        <Pine key={index} position={[x, y, z]} scale={scale} />
      ))}
      {MAPLES.map((position, index) => (
        <Maple key={index} position={position} />
      ))}
      <Bamboo position={[18.4, 0, 4.8]} />
      <Rock position={[7.5, 0, 12.5]} scale={0.7} />
      <Rock position={[17.4, 0, 12.8]} scale={0.55} />
      <Rock position={[16.6, 0, 18.4]} scale={0.8} />
      <Rock position={[-8.8, 0, 8.6]} scale={0.4} />
      <Mist amount={visual.mist} />
      <Fireflies on={visual.star > 0.45} />
    </>
  );
}

function Bamboo({ position }: { position: [number, number, number] }) {
  const stalks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        x: Math.sin(i * 2.1) * 0.75,
        z: Math.cos(i * 1.7) * 0.65,
        h: 2.3 + (i % 5) * 0.32,
        lean: ((i % 3) - 1) * 0.05,
      })),
    [],
  );
  return (
    <group position={position}>
      {stalks.map((stalk, index) => (
        <mesh key={index} position={[stalk.x, stalk.h / 2, stalk.z]} rotation={[stalk.lean, 0, stalk.lean]} castShadow>
          <cylinderGeometry args={[0.03, 0.045, stalk.h, 5]} />
          <meshStandardMaterial color={index % 2 ? "#7c9a52" : "#698646"} />
        </mesh>
      ))}
    </group>
  );
}

function Rock({ position, scale }: { position: [number, number, number]; scale: number }) {
  return (
    <mesh position={[position[0], scale * 0.28, position[2]]} scale={[scale, scale * 0.7, scale]} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.7, 0]} />
      <meshStandardMaterial color="#7e7a72" flatShading roughness={1} />
    </mesh>
  );
}
