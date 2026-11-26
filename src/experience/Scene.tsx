import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ambience } from "../audio/ambience.ts";
import { useStudy } from "../study/store.ts";
import { Scholar } from "../world/Scholar.tsx";
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

function Picture() {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    gl.shadowMap.enabled = false;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
  }, [gl]);
  return null;
}

function Lights({ visual }: { visual: ReturnType<typeof visualFor> }) {
  return (
    <>
      <ambientLight intensity={visual.ambient} color={visual.ambientColor} />
      <hemisphereLight color={visual.hemiSky} groundColor={visual.hemiGround} intensity={visual.hemi} />
      <directionalLight position={visual.sun} intensity={visual.sunIntensity} color={visual.sunColor} />
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
      <Picture />
      <Sky visual={visual} />
      <Lights visual={visual} />
      <Temple visual={visual} wet={rain} />
      <Scholar />
      <Rain on={rain} />
      <Player />
      <Ear />
    </>
  );
}
