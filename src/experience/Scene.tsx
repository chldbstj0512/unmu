import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { ambience } from "../audio/ambience.ts";
import { useStudy } from "../study/store.ts";
import { Temple } from "../world/Temple.tsx";
import { POND, isInsideStudy } from "../world/layout.ts";
import { visualFor } from "./atmosphere.ts";
import { bridge } from "./bridge.ts";
import { Player } from "./Player.tsx";
import { Rain } from "./Rain.tsx";
import { Sky } from "./Sky.tsx";

function Ear() {
  const sound = useStudy((state) => state.sound);
  const rain = useStudy((state) => state.rain);
  const running = useStudy((state) => state.running);
  const mode = useStudy((state) => state.mode);
  const flags = useRef({ sound, rain, running, mode });
  flags.current = { sound, rain, running, mode };
  useFrame(() => {
    const { x, z } = bridge.player;
    const near = Math.max(0, 1 - Math.hypot((x - POND.x) / 16, (z - POND.z) / 16));
    const current = flags.current;
    ambience.update({
      sound: current.sound,
      rain: current.rain,
      duck: current.running && current.mode === "focus",
      pond: near,
      indoors: isInsideStudy(x, z),
    });
  });
  return null;
}

function Lights({ visual }: { visual: ReturnType<typeof visualFor> }) {
  return (
    <>
      <ambientLight intensity={visual.ambient} color={visual.ambientColor} />
      <hemisphereLight color={visual.hemiSky} groundColor={visual.hemiGround} intensity={visual.hemi} />
      <directionalLight
        position={visual.sun}
        intensity={visual.sunIntensity}
        color={visual.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-bias={-0.0003}
        shadow-normalBias={0.045}
      />
    </>
  );
}

export function Scene() {
  const timeOfDay = useStudy((state) => state.timeOfDay);
  const rain = useStudy((state) => state.rain);
  const visual = visualFor(timeOfDay, rain);
  return (
    <>
      <color attach="background" args={[visual.fog]} />
      <fog attach="fog" args={[visual.fog, visual.fogNear, visual.fogFar]} />
      <Sky visual={visual} />
      <Lights visual={visual} />
      <Temple visual={visual} wet={rain} />
      <Rain on={rain} />
      <Player />
      <Ear />
      <Suspense fallback={null}>
        <EffectComposer multisampling={4}>
          <Bloom intensity={0.38} luminanceThreshold={1} mipmapBlur />
          <Vignette offset={0.24} darkness={0.62} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      </Suspense>
    </>
  );
}
