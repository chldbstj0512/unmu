import { useEffect, useMemo, useRef } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bridge } from "../experience/bridge.ts";
import { createHipRoof } from "./geometry.ts";
import {
  BELL,
  CUSHION_Z,
  DESK_X,
  DESK_Z,
  LANTERNS,
  PAGODA,
  type Building,
} from "./layout.ts";

const world = new THREE.Vector3();

export function Label({ text, position }: { text: string; position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  const plate = useRef<HTMLDivElement>(null);
  useFrame(({ camera }) => {
    const anchor = group.current;
    const el = plate.current;
    if (!anchor || !el) return;
    const distance = camera.position.distanceTo(anchor.getWorldPosition(world));
    const opacity = distance < 7 ? 1 : distance > 18 ? 0 : 1 - (distance - 7) / 11;
    el.style.opacity = String(opacity);
  });
  return (
    <group ref={group} position={position}>
      <Html center zIndexRange={[12, 0]} pointerEvents="none" distanceFactor={16}>
        <div ref={plate} className="plaque">
          {text}
        </div>
      </Html>
    </group>
  );
}

export function Window({
  width = 1.15,
  height = 1.35,
  glow,
}: {
  width?: number;
  height?: number;
  glow: number;
}) {
  const cols = 3;
  const rows = 4;
  const bars = [];
  for (let i = 0; i <= cols; i += 1) {
    bars.push(
      <mesh key={`v${i}`} position={[-width / 2 + (width * i) / cols, 0, 0.02]}>
        <boxGeometry args={[0.035, height, 0.04]} />
        <meshStandardMaterial color="#3b2618" />
      </mesh>,
    );
  }
  for (let i = 0; i <= rows; i += 1) {
    bars.push(
      <mesh key={`h${i}`} position={[0, -height / 2 + (height * i) / rows, 0.02]}>
        <boxGeometry args={[width, 0.035, 0.04]} />
        <meshStandardMaterial color="#3b2618" />
      </mesh>,
    );
  }
  return (
    <group>
      <mesh>
        <boxGeometry args={[width, height, 0.03]} />
        <meshStandardMaterial color="#f0d7a4" emissive="#ffb15a" emissiveIntensity={glow} roughness={0.9} />
      </mesh>
      {bars}
    </group>
  );
}

export function StoneLantern({ position, intensity }: { position: [number, number, number]; intensity: number }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.16, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.3, 0.32, 8]} />
        <meshStandardMaterial color="#8a8478" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.16, 0.62, 0.16]} />
        <meshStandardMaterial color="#918b80" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow>
        <boxGeometry args={[0.46, 0.38, 0.46]} />
        <meshStandardMaterial color="#9a9488" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.08, 0]}>
        <boxGeometry args={[0.22, 0.16, 0.22]} />
        <meshStandardMaterial color="#ffb15a" emissive="#ff8a2a" emissiveIntensity={1.4 + intensity} />
      </mesh>
      <mesh position={[0, 1.34, 0]}>
        <boxGeometry args={[0.58, 0.08, 0.58]} />
        <meshStandardMaterial color="#6d675e" />
      </mesh>
      <mesh position={[0, 1.52, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.28, 0.32, 4]} />
        <meshStandardMaterial color="#5e5952" />
      </mesh>
      <pointLight position={[0, 1.08, 0]} color="#ff9a44" intensity={intensity * 10} distance={6.5} decay={2} />
    </group>
  );
}

export function Pagoda() {
  const tiers = [
    { y: 0.4, s: 1.55, h: 0.55 },
    { y: 1.15, s: 1.15, h: 0.48 },
    { y: 1.78, s: 0.78, h: 0.4 },
  ];
  return (
    <group position={[PAGODA.x, 0, PAGODA.z]}>
      {tiers.map((tier, index) => (
        <group key={index}>
          <mesh position={[0, tier.y, 0]} castShadow receiveShadow>
            <boxGeometry args={[tier.s * 0.48, tier.h * 0.7, tier.s * 0.48]} />
            <meshStandardMaterial color="#a39e94" roughness={0.95} />
          </mesh>
          <mesh position={[0, tier.y + tier.h * 0.42, 0]} castShadow>
            <boxGeometry args={[tier.s, 0.1, tier.s]} />
            <meshStandardMaterial color="#6f695f" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[0.07, 0.36, 6]} />
        <meshStandardMaterial color="#8d877c" />
      </mesh>
    </group>
  );
}

export function BellTower() {
  const bell = useRef<THREE.Group>(null);
  useFrame(() => {
    const node = bell.current;
    if (!node) return;
    const left = (bridge.ringUntil - performance.now()) / 1000;
    node.rotation.z = left > 0 ? Math.sin(performance.now() / 170) * 0.2 * Math.min(1, left) : 0;
  });
  return (
    <group position={[BELL.x, 0, BELL.z]}>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 1.35, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 2.7, 8]} />
          <meshStandardMaterial color="#6a422c" />
        </mesh>
      ))}
      <mesh position={[0, 2.62, 0]} castShadow>
        <boxGeometry args={[1.9, 0.12, 0.16]} />
        <meshStandardMaterial color="#5c3a24" />
      </mesh>
      <group ref={bell} position={[0, 2.45, 0]}>
        <mesh position={[0, -0.38, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.36, 0.48, 12]} />
          <meshStandardMaterial color="#8d6a3b" metalness={0.62} roughness={0.32} />
        </mesh>
        <mesh position={[0, -0.66, 0]}>
          <sphereGeometry args={[0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#a07b45" metalness={0.55} roughness={0.35} />
        </mesh>
      </group>
      <Label text="종루" position={[0, 3.15, 0]} />
    </group>
  );
}

export function StudyRoom({ spec, glow, light }: { spec: Building; glow: number; light: number }) {
  return (
    <>
      {DESK_X.map((x, index) => (
        <group key={index} position={[x, 0, DESK_Z]}>
          <mesh position={[0, spec.platform + 0.16, 0]} castShadow>
            <boxGeometry args={[1.12, 0.32, 0.5]} />
            <meshStandardMaterial color="#6b442c" roughness={0.8} />
          </mesh>
          <mesh position={[0.28, spec.platform + 0.36, 0.02]}>
            <boxGeometry args={[0.28, 0.04, 0.2]} />
            <meshStandardMaterial color="#f4ead8" />
          </mesh>
          <mesh position={[-0.22, spec.platform + 0.35, -0.04]}>
            <boxGeometry args={[0.16, 0.05, 0.22]} />
            <meshStandardMaterial color={index % 2 ? "#7a3030" : "#2f4a3c"} />
          </mesh>
          <mesh position={[-0.42, spec.platform + 0.46, -0.08]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color="#ffc27a" emissive="#ff9a3c" emissiveIntensity={0.8 + glow} />
          </mesh>
          <mesh position={[0, spec.platform + 0.04, CUSHION_Z - DESK_Z]}>
            <cylinderGeometry args={[0.32, 0.34, 0.07, 16]} />
            <meshStandardMaterial color="#7a3030" roughness={0.9} />
          </mesh>
        </group>
      ))}
      <PlacedWindow position={[-spec.width / 2 + 0.04, spec.platform + 1.32, -1.6]} rotation={[0, Math.PI / 2, 0]} glow={glow} />
      <PlacedWindow position={[-spec.width / 2 + 0.04, spec.platform + 1.32, 1.45]} rotation={[0, Math.PI / 2, 0]} glow={glow} />
      <pointLight position={[0, spec.platform + 1.7, -0.4]} color="#ffc08a" intensity={light * 24} distance={9} decay={2} />
      <Label text="선방" position={[0, spec.platform + spec.wallHeight + 0.95, spec.depth / 2 + 0.3]} />
    </>
  );
}

function PlacedWindow({
  position,
  rotation,
  glow,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  glow: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <Window width={1.2} height={1.4} glow={glow} />
    </group>
  );
}

export function MainHall({ spec, glow, light }: { spec: Building; glow: number; light: number }) {
  return (
    <>
      <mesh position={[0, spec.platform + 0.42, -2.95]} castShadow>
        <boxGeometry args={[2.5, 0.72, 0.85]} />
        <meshStandardMaterial color="#5c3a24" roughness={0.8} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, spec.platform + 0.92, -2.85]}>
          <sphereGeometry args={[0.06, 10, 8]} />
          <meshStandardMaterial color="#ffd2a2" emissive="#ff9a3c" emissiveIntensity={1.5 + glow} />
        </mesh>
      ))}
      <mesh position={[0, spec.platform + 1.35, -spec.depth / 2 + 0.48]}>
        <boxGeometry args={[1.9, 2.2, 0.06]} />
        <meshStandardMaterial color="#3d291c" roughness={0.86} />
      </mesh>
      <mesh position={[0, spec.platform + 1.45, -spec.depth / 2 + 0.54]}>
        <ringGeometry args={[0.38, 0.62, 40]} />
        <meshStandardMaterial color="#e6c27a" emissive="#c4923e" emissiveIntensity={0.45 + glow * 0.2} side={THREE.DoubleSide} />
      </mesh>
      <Incense position={[0, spec.platform + 0.82, -2.7]} />
      <PlacedWindow position={[-3.15, spec.platform + 1.4, spec.depth / 2 - 0.05]} glow={glow} />
      <PlacedWindow position={[3.15, spec.platform + 1.4, spec.depth / 2 - 0.05]} glow={glow} />
      <PlacedWindow position={[spec.width / 2 - 0.05, spec.platform + 1.4, 0]} rotation={[0, Math.PI / 2, 0]} glow={glow} />
      <PlacedWindow position={[-spec.width / 2 + 0.05, spec.platform + 1.4, 0]} rotation={[0, -Math.PI / 2, 0]} glow={glow} />
      <pointLight position={[0, spec.platform + 1.8, -1]} color="#ffb07a" intensity={light * 20} distance={11} decay={2} />
      <Label text="대웅전" position={[0, spec.platform + spec.wallHeight + 1.05, spec.depth / 2 + 0.35]} />
    </>
  );
}

function Incense({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const smoke = group.current;
    if (!smoke) return;
    smoke.children.forEach((child, index) => {
      const t = (clock.elapsedTime * 0.25 + index * 0.34) % 1;
      child.position.y = t * 1.3;
      child.scale.setScalar(0.15 + t * 0.45);
      const mat = (child as THREE.Mesh).material;
      if (mat && !Array.isArray(mat)) mat.opacity = (1 - t) * 0.28;
    });
  });
  return (
    <group ref={group} position={position}>
      {Array.from({ length: 5 }, (_, index) => (
        <mesh key={index}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#efe6d8" transparent opacity={0.2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

export function TeaRoom({ spec }: { spec: Building }) {
  return (
    <>
      <mesh position={[0.2, spec.platform + 0.16, -1.5]} castShadow>
        <boxGeometry args={[1.4, 0.32, 0.45]} />
        <meshStandardMaterial color="#6b442c" />
      </mesh>
      <mesh position={[0.2, spec.platform + 0.36, -1.5]}>
        <cylinderGeometry args={[0.1, 0.08, 0.08, 12]} />
        <meshStandardMaterial color="#d7c4a2" />
      </mesh>
      <Cat platform={spec.platform} />
      <Label text="다실" position={[0, spec.platform + spec.wallHeight + 1.05, 0]} />
    </>
  );
}

function Cat({ platform }: { platform: number }) {
  const tail = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (tail.current) tail.current.rotation.z = Math.sin(clock.elapsedTime * 2.1) * 0.5;
  });
  return (
    <group position={[0.95, platform, -0.85]}>
      <mesh position={[0, 0.16, 0]} scale={[0.36, 0.16, 0.24]} castShadow>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#c47a3a" roughness={0.8} />
      </mesh>
      <mesh position={[0.24, 0.26, 0]} castShadow>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#c47a3a" />
      </mesh>
      <mesh position={[0.2, 0.36, 0.06]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.035, 0.08, 4]} />
        <meshStandardMaterial color="#a8642e" />
      </mesh>
      <mesh position={[0.2, 0.36, -0.06]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.035, 0.08, 4]} />
        <meshStandardMaterial color="#a8642e" />
      </mesh>
      <mesh position={[0.32, 0.28, 0.04]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshStandardMaterial color="#241c14" />
      </mesh>
      <mesh ref={tail} position={[-0.28, 0.2, 0]} rotation={[0, 0, 0.8]}>
        <cylinderGeometry args={[0.02, 0.035, 0.32, 6]} />
        <meshStandardMaterial color="#b56a30" />
      </mesh>
    </group>
  );
}

export function Lanterns({ intensity }: { intensity: number }) {
  return (
    <>
      {LANTERNS.map((lantern) => (
        <StoneLantern key={`${lantern.x}-${lantern.z}`} position={[lantern.x, 0, lantern.z]} intensity={intensity} />
      ))}
    </>
  );
}

export function Gate() {
  const roof = useMemo(() => createHipRoof(6.2, 2.2, 0.72), []);
  useEffect(() => () => roof.dispose(), [roof]);
  return (
    <group position={[0, 0, 21.05]}>
      {[-1.7, 1.7].map((x) => (
        <mesh key={x} position={[x, 1.7, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.28, 3.4, 8]} />
          <meshStandardMaterial color="#6a422c" roughness={0.84} />
        </mesh>
      ))}
      <mesh position={[0, 3.15, 0]}>
        <boxGeometry args={[5.4, 0.12, 1.7]} />
        <meshStandardMaterial color="#6e2f2a" />
      </mesh>
      <mesh position={[0, 3.28, 0]} geometry={roof} castShadow>
        <meshStandardMaterial color="#3e474e" roughness={0.8} />
      </mesh>
      <Label text="구름결" position={[0, 2.55, 0.45]} />
    </group>
  );
}
