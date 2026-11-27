import { Component, memo, useEffect, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Scene } from "./experience/Scene.tsx";
import { visualFor } from "./experience/atmosphere.ts";
import { ensureAccount } from "./account/client.ts";
import { engineTick, useStudy } from "./study/store.ts";
import { ambience } from "./audio/ambience.ts";
import { BreathOverlay, HelpDialog, RecordDialog, VowDialog } from "./ui/Dialogs.tsx";
import { GateScreen } from "./ui/GateScreen.tsx";
import { Hud } from "./ui/Hud.tsx";
import { ExamSheet } from "./ui/ExamSheet.tsx";
import { StudySheet } from "./ui/StudySheet.tsx";

function detectWebGL() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const WEBGL = detectWebGL();

function Fallback() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#1c1612] px-6 text-center text-[#f3ead7]">
      <p className="max-w-sm text-lg leading-8">이 브라우저에서는 공간을 열지 못했다. 공부는 책상 기록으로 이어갈 수 있다.</p>
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return <Fallback />;
    return this.props.children;
  }
}

const WorldCanvas = memo(function WorldCanvas() {
  if (!WEBGL) return <Fallback />;
  return (
    <Boundary>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ fov: 60, near: 0.1, far: 220, position: [0.2, 2.55, 18.6] }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <Scene />
      </Canvas>
    </Boundary>
  );
});

function Engine() {
  useEffect(() => {
    const tick = () => engineTick();
    const id = window.setInterval(tick, 250);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    const unlock = () => ambience.unlock();
    window.addEventListener("pointerdown", unlock);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pointerdown", unlock);
    };
  }, []);
  return null;
}

function Backdrop() {
  const time = useStudy((state) => state.timeOfDay);
  const rain = useStudy((state) => state.rain);
  useEffect(() => {
    document.body.style.background = visualFor(time, rain).fog;
  }, [time, rain]);
  return null;
}

export default function App() {
  const entered = useStudy((state) => state.entered);
  const fade = useStudy((state) => state.fade);
  useEffect(() => {
    void ensureAccount();
  }, []);
  return (
    <div className="fixed inset-0 overflow-hidden">
      <Engine />
      <Backdrop />
      <WorldCanvas />
      <div className="vignette" />
      {entered ? <Hud /> : <GateScreen />}
      <StudySheet />
      <ExamSheet />
      <RecordDialog />
      <VowDialog />
      <HelpDialog />
      <BreathOverlay />
      <div className={fade ? "fade on" : "fade"} />
    </div>
  );
}
