import type { Visual } from "../experience/atmosphere.ts";
import { Hanok } from "./Hanok.tsx";
import { Nature } from "./Nature.tsx";
import { Plaza } from "./Plaza.tsx";
import { BellTower, Gate, Lanterns, MainHall, Pagoda, StudyRoom, TeaRoom } from "./Props.tsx";
import { COMPOUND_WALLS, DECK, building } from "./layout.ts";

function Compound() {
  return (
    <>
      {COMPOUND_WALLS.slice(0, 5).map((wall, index) => {
        const cx = (wall.minX + wall.maxX) / 2;
        const cz = (wall.minZ + wall.maxZ) / 2;
        const sx = wall.maxX - wall.minX;
        const sz = wall.maxZ - wall.minZ;
        return (
          <group key={index} position={[cx, 0, cz]}>
            <mesh position={[0, 0.16, 0]} receiveShadow>
              <boxGeometry args={[sx + 0.08, 0.32, sz + 0.08]} />
              <meshStandardMaterial color="#8a8478" roughness={1} />
            </mesh>
            <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
              <boxGeometry args={[sx, 0.84, sz]} />
              <meshStandardMaterial color="#e7dcc8" roughness={0.95} />
            </mesh>
            <mesh position={[0, 1.22, 0]} castShadow>
              <boxGeometry args={[sx + 0.16, 0.14, sz + 0.16]} />
              <meshStandardMaterial color="#3c444a" roughness={0.75} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

export function Temple({ visual, wet }: { visual: Visual; wet: boolean }) {
  const study = building("study");
  const main = building("main");
  const tea = building("tea");
  return (
    <>
      <Nature visual={visual} wet={wet} />
      <Plaza wet={wet} lantern={visual.lantern} />
      <Compound />
      <Gate />
      <Pagoda />
      <BellTower />
      <Lanterns intensity={visual.lantern} />
      <Hanok spec={main}>
        <MainHall spec={main} glow={visual.windowGlow} light={visual.interior} />
      </Hanok>
      <Hanok spec={study}>
        <StudyRoom spec={study} glow={visual.windowGlow} light={visual.interior} />
      </Hanok>
      <Hanok spec={tea}>
        <TeaRoom spec={tea} />
      </Hanok>
      <mesh position={[(DECK.minX + DECK.maxX) / 2, 0.06, (DECK.minZ + DECK.maxZ) / 2]} receiveShadow castShadow>
        <boxGeometry args={[DECK.maxX - DECK.minX, 0.12, DECK.maxZ - DECK.minZ]} />
        <meshStandardMaterial color="#7a5436" roughness={0.82} />
      </mesh>
    </>
  );
}
