import { useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { createHipRoof } from "./geometry.ts";
import { DOOR_HEIGHT, localSteps, localWalls, type Building } from "./layout.ts";
import { textures } from "./textures.ts";

function Roof({ width, depth, rise }: { width: number; depth: number; rise: number }) {
  const geometry = useMemo(() => createHipRoof(width, depth, rise), [width, depth, rise]);
  const material = useMemo(() => {
    const next = new THREE.MeshStandardMaterial({
      map: textures().tile,
      color: "#ffffff",
      roughness: 0.78,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    next.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         if (!gl_FrontFacing) diffuseColor.rgb = vec3(0.62, 0.43, 0.28);`,
      );
    };
    return next;
  }, []);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const alongX = width >= depth;
  const half = Math.abs(width - depth) / 2;
  return (
    <group>
      <mesh geometry={geometry} material={material} castShadow receiveShadow />
      <mesh position={[0, rise + 0.05, 0]} castShadow>
        <boxGeometry args={alongX ? [Math.max(0.55, width - depth), 0.1, 0.16] : [0.16, 0.1, Math.max(0.55, depth - width)]} />
        <meshStandardMaterial color="#2c3338" roughness={0.7} />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh
          key={dir}
          position={alongX ? [dir * Math.max(half, 0.15), rise + 0.16, 0] : [0, rise + 0.16, dir * Math.max(half, 0.15)]}
          rotation={alongX ? [0, 0, -dir * 0.7] : [dir * 0.7, 0, 0]}
          castShadow
        >
          <coneGeometry args={[0.07, 0.28, 5]} />
          <meshStandardMaterial color="#2c3338" />
        </mesh>
      ))}
    </group>
  );
}

function columnsFor(spec: Building) {
  if (spec.pavilion) {
    const ix = spec.width / 2 - 0.46;
    const iz = spec.depth / 2 - 0.46;
    return [-1, 1].flatMap((sx) => [-1, 1].map((sz) => [sx * ix, sz * iz] as const));
  }
  const points: Array<[number, number]> = [];
  const across = Math.max(2, Math.round(spec.width / 2.5));
  for (let i = 0; i <= across; i += 1) {
    const x = -spec.width / 2 + 0.16 + ((spec.width - 0.32) * i) / across;
    const inDoor = spec.doorWidth != null && Math.abs(x) < spec.doorWidth / 2 + 0.05;
    if (!inDoor) points.push([x, spec.depth / 2 - 0.14]);
    points.push([x, -spec.depth / 2 + 0.14]);
  }
  points.push([spec.width / 2 - 0.14, 0], [-spec.width / 2 + 0.14, 0]);
  return points;
}

export function Hanok({ spec, children }: { spec: Building; children?: ReactNode }) {
  const rise = Math.min(spec.width, spec.depth) * 0.16 + 0.45;
  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rotation, 0]}>
      <mesh position={[0, Math.max(spec.platform - 0.08, 0.08) / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[spec.width + 0.85, Math.max(spec.platform - 0.08, 0.16), spec.depth + 0.85]} />
        <meshStandardMaterial color="#8e887d" roughness={0.96} />
      </mesh>
      <mesh position={[0, spec.platform - 0.04, 0]} receiveShadow>
        <boxGeometry args={[spec.width, 0.08, spec.depth]} />
        <meshStandardMaterial color="#8b5a34" roughness={0.78} />
      </mesh>
      {localSteps(spec).map((step, index) => (
        <mesh
          key={index}
          position={[(step.minX + step.maxX) / 2, step.y / 2, (step.minZ + step.maxZ) / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[step.maxX - step.minX, Math.max(step.y, 0.08), step.maxZ - step.minZ]} />
          <meshStandardMaterial color={index === 0 ? "#8b5a34" : "#8e887d"} roughness={0.94} />
        </mesh>
      ))}
      {localWalls(spec).map((wall, index) => {
        const width = wall.maxX - wall.minX;
        const depth = wall.maxZ - wall.minZ;
        const cx = (wall.minX + wall.maxX) / 2;
        const cz = (wall.minZ + wall.maxZ) / 2;
        if (spec.pavilion) {
          return (
            <mesh key={index} position={[cx, spec.platform + spec.wallHeight / 2, cz]} castShadow>
              <cylinderGeometry args={[0.11, 0.14, spec.wallHeight, 8]} />
              <meshStandardMaterial color="#6a422c" roughness={0.86} />
            </mesh>
          );
        }
        return (
          <mesh key={index} position={[cx, spec.platform + spec.wallHeight / 2, cz]} castShadow receiveShadow>
            <boxGeometry args={[width, spec.wallHeight, depth]} />
            <meshStandardMaterial color="#e7dcc8" roughness={0.95} />
          </mesh>
        );
      })}
      {spec.doorWidth && !spec.pavilion ? (
        <mesh
          position={[0, spec.platform + DOOR_HEIGHT + (spec.wallHeight - DOOR_HEIGHT) / 2, spec.depth / 2 - 0.13]}
          castShadow
        >
          <boxGeometry args={[spec.doorWidth, Math.max(0.2, spec.wallHeight - DOOR_HEIGHT), 0.26]} />
          <meshStandardMaterial color="#e7dcc8" roughness={0.95} />
        </mesh>
      ) : null}
      {columnsFor(spec).map(([x, z], index) => (
        <mesh key={index} position={[x, spec.platform + spec.wallHeight / 2, z]} castShadow>
          <cylinderGeometry args={[0.09, 0.11, spec.wallHeight, 8]} />
          <meshStandardMaterial color="#5c3a24" roughness={0.84} />
        </mesh>
      ))}
      <group position={[0, spec.platform + spec.wallHeight, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[spec.width - 0.2, 0.1, spec.depth - 0.2]} />
          <meshStandardMaterial color="#6b4630" roughness={0.8} />
        </mesh>
        <mesh position={[0, -0.05, 0]} castShadow>
          <boxGeometry args={[spec.width + 0.18, 0.1, spec.depth + 0.18]} />
          <meshStandardMaterial color="#6e2f2a" roughness={0.72} />
        </mesh>
        <Roof width={spec.width + 0.35} depth={spec.depth + 0.35} rise={rise} />
      </group>
      {children}
    </group>
  );
}
