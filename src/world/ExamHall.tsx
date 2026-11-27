import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { HALL, examSeats } from "./layout.ts";
import { Label } from "./Props.tsx";

function useDesks(seats: Array<{ x: number; z: number }>, w: number, h: number, d: number, y: number, color: string, shiftX = 0) {
  const mesh = useMemo(() => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
    const next = new THREE.InstancedMesh(geometry, material, seats.length);
    const dummy = new THREE.Object3D();
    seats.forEach((seat, index) => {
      dummy.position.set(seat.x + shiftX, y, seat.z);
      dummy.updateMatrix();
      next.setMatrixAt(index, dummy.matrix);
    });
    next.instanceMatrix.needsUpdate = true;
    return next;
  }, [seats, w, h, d, y, color, shiftX]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      const material = mesh.material;
      if (!Array.isArray(material)) material.dispose();
    },
    [mesh],
  );
  return mesh;
}

export function ExamHall() {
  const seats = useMemo(() => examSeats(), []);
  const tops = useDesks(seats, 0.68, 0.05, 0.4, 0.64, "#f4efe4");
  const legs = useDesks(seats, 0.62, 0.58, 0.36, 0.32, "#6b5344");
  const chairs = useDesks(seats, 0.36, 0.06, 0.28, 0.4, "#7a3030", 0.42);
  const cx = (HALL.minX + HALL.maxX) / 2;
  const cz = (HALL.minZ + HALL.maxZ) / 2;
  const width = HALL.maxX - HALL.minX;
  const depth = HALL.maxZ - HALL.minZ;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.03, cz]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshLambertMaterial color="#e4dccb" />
      </mesh>
      <mesh position={[cx, 3.28, cz]}>
        <boxGeometry args={[width + 0.4, 0.12, depth + 0.4]} />
        <meshStandardMaterial color="#3e474e" roughness={0.8} />
      </mesh>
      {[
        [cx, HALL.minZ, width, 0.5],
        [cx, HALL.maxZ, width, 0.5],
      ].map(([x, z, w, d]) => (
        <mesh key={`${x}-${z}`} position={[x ?? 0, 1.45, z ?? 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 2.7, d]} />
          <meshStandardMaterial color="#f3ecdf" roughness={0.94} />
        </mesh>
      ))}
      <mesh position={[HALL.maxX, 1.45, cz]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 2.7, depth]} />
        <meshStandardMaterial color="#f3ecdf" roughness={0.94} />
      </mesh>
      {[HALL.doorMinZ, HALL.doorMaxZ].map((z) => (
        <mesh key={z} position={[14.6, 1.35, z]} castShadow>
          <boxGeometry args={[0.28, 2.7, 0.28]} />
          <meshStandardMaterial color="#5c3a24" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[14.6, 2.72, (HALL.doorMinZ + HALL.doorMaxZ) / 2]} castShadow>
        <boxGeometry args={[0.28, 0.16, HALL.doorMaxZ - HALL.doorMinZ]} />
        <meshStandardMaterial color="#5c3a24" roughness={0.8} />
      </mesh>
      <Label text="시험장 · 100석" position={[19.4, 2.35, 42.3]} />
      <primitive object={legs} />
      <primitive object={tops} />
      <primitive object={chairs} />
      <pointLight position={[16.4, 2.3, 42]} color="#fff1dc" intensity={3.2} distance={8} decay={2} />
      {[36.8, 41.8, 47.2].map((z) => (
        <pointLight key={z} position={[26, 2.55, z]} color="#fff1dc" intensity={4} distance={14} decay={2} />
      ))}
    </group>
  );
}
