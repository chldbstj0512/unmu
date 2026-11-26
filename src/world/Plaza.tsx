import { useMemo } from "react";
import { useStudy } from "../study/store.ts";
import { cairnStones } from "./cairn.ts";
import { CAIRN, PLAZA, PLAZA_WALLS, TREE } from "./layout.ts";
import { Pine } from "./Nature.tsx";
import { Label } from "./Props.tsx";

function GreatTree() {
  return (
    <group position={[TREE.x, 0, TREE.z]}>
      <mesh position={[0, 2.15, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.78, 4.3, 8]} />
        <meshStandardMaterial color="#5c3b28" roughness={0.92} />
      </mesh>
      <mesh position={[0.55, 0.28, 0.35]} rotation={[0.4, 0.2, 1.1]} scale={[0.34, 0.9, 0.28]} castShadow>
        <sphereGeometry args={[0.55, 8, 6]} />
        <meshStandardMaterial color="#4e3424" roughness={1} />
      </mesh>
      <mesh position={[-0.5, 0.24, -0.2]} rotation={[0.2, -0.4, -1.15]} scale={[0.3, 0.85, 0.26]} castShadow>
        <sphereGeometry args={[0.55, 8, 6]} />
        <meshStandardMaterial color="#4e3424" roughness={1} />
      </mesh>
      <mesh position={[0.1, 0.22, -0.6]} rotation={[-0.5, 0.2, 0.2]} scale={[0.28, 0.7, 0.24]} castShadow>
        <sphereGeometry args={[0.5, 8, 6]} />
        <meshStandardMaterial color="#4a3022" roughness={1} />
      </mesh>
      <mesh position={[0, 6.15, 0]} castShadow>
        <icosahedronGeometry args={[3.15, 1]} />
        <meshStandardMaterial color="#2c5340" flatShading />
      </mesh>
      <mesh position={[1.7, 5.35, 0.5]} castShadow>
        <icosahedronGeometry args={[2.05, 1]} />
        <meshStandardMaterial color="#3d6b4c" flatShading />
      </mesh>
      <mesh position={[-1.85, 5.5, -0.35]} castShadow>
        <icosahedronGeometry args={[2.15, 1]} />
        <meshStandardMaterial color="#356246" flatShading />
      </mesh>
      <mesh position={[0.25, 7.7, -0.2]} castShadow>
        <icosahedronGeometry args={[2.25, 1]} />
        <meshStandardMaterial color="#4e7c56" flatShading />
      </mesh>
      <mesh position={[-0.4, 5.15, 1.55]} castShadow>
        <icosahedronGeometry args={[1.7, 1]} />
        <meshStandardMaterial color="#2f5a42" flatShading />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.7, 0.1, 0.48]} />
        <meshStandardMaterial color="#6b442c" roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.62, -0.18]} castShadow>
        <boxGeometry args={[1.7, 0.42, 0.1]} />
        <meshStandardMaterial color="#5c3a26" roughness={0.86} />
      </mesh>
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 0.16, 0]} castShadow>
          <boxGeometry args={[0.1, 0.32, 0.4]} />
          <meshStandardMaterial color="#4a3224" />
        </mesh>
      ))}
    </group>
  );
}

function Cairn() {
  const count = useStudy((state) => state.stones.length);
  const stones = useMemo(() => cairnStones(count), [count]);
  return (
    <group position={[CAIRN.x, 0, CAIRN.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <circleGeometry args={[1.15, 28]} />
        <meshLambertMaterial color="#cfc3b2" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.034, 0]}>
        <ringGeometry args={[0.92, 1.12, 28]} />
        <meshLambertMaterial color="#6e675e" />
      </mesh>
      {stones.map((stone, index) => (
        <mesh key={index} position={[stone.ox, stone.y, stone.oz]} rotation={[0, stone.rot, 0]} castShadow receiveShadow>
          <boxGeometry args={[stone.sx, stone.sy, stone.sz]} />
          <meshStandardMaterial color={stone.color} roughness={0.95} flatShading />
        </mesh>
      ))}
      <Label text={count > 0 ? `돌 ${count}개` : "하루 하나"} position={[0, Math.max(0.85, (stones.at(-1)?.y ?? 0.2) + 0.55), 0]} />
    </group>
  );
}

export function Plaza({ wet, lantern }: { wet: boolean; lantern: number }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PLAZA.x, 0.02, PLAZA.z]} receiveShadow>
        <circleGeometry args={[PLAZA.r, 48]} />
        <meshLambertMaterial color={wet ? "#6e7370" : "#7d7468"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 26.8]} receiveShadow>
        <planeGeometry args={[3.3, 10.6]} />
        <meshLambertMaterial color={wet ? "#5c615e" : "#6a6458"} />
      </mesh>
      {PLAZA_WALLS.map((wall, index) => {
        const cx = (wall.minX + wall.maxX) / 2;
        const cz = (wall.minZ + wall.maxZ) / 2;
        const sx = wall.maxX - wall.minX;
        const sz = wall.maxZ - wall.minZ;
        return (
          <mesh key={index} position={[cx, 0.28, cz]} castShadow receiveShadow>
            <boxGeometry args={[sx, 0.56, sz]} />
            <meshStandardMaterial color="#8a8478" roughness={1} />
          </mesh>
        );
      })}
      <GreatTree />
      <Cairn />
      <pointLight position={[CAIRN.x, 2.2, CAIRN.z - 0.6]} color="#ffc48a" intensity={2.4 + lantern * 4.2} distance={8.5} decay={2} />
      <Bench position={[-5.6, 0, 41]} rotation={Math.PI / 2} />
      <Bench position={[5.6, 0, 41]} rotation={-Math.PI / 2} />
      <Bench position={[0, 0, 44.85]} rotation={0} />
      <Pine position={[-11.2, 0, 34.5]} scale={1.15} />
      <Pine position={[11.2, 0, 34.5]} scale={1.05} />
      <Pine position={[-12.4, 0, 46]} scale={1.25} />
      <Pine position={[12.2, 0, 47.2]} scale={1.2} />
      <Label text="광장" position={[0, 1.7, 31.6]} />
    </group>
  );
}
