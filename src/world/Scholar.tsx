import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bridge } from "../experience/bridge.ts";
import { useStudy } from "../study/store.ts";

const GATE = { x: 2.9, z: 10.6, yaw: 0.1 };

function arcText(g: CanvasRenderingContext2D, text: string, radius: number) {
  const chars = [...text];
  if (chars.length === 0) return;
  const widths = chars.map((ch) => g.measureText(ch).width);
  const gap = 4;
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (chars.length - 1);
  let angle = -Math.PI / 2 - total / (2 * radius);
  chars.forEach((ch, index) => {
    const width = widths[index] ?? 0;
    angle += width / 2 / radius;
    g.save();
    g.translate(256 + Math.cos(angle) * radius, 256 + Math.sin(angle) * radius);
    g.rotate(angle + Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
    angle += width / 2 / radius + gap / radius;
  });
}

function badgeTexture(school: string, department: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const g = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 1;
  texture.premultiplyAlpha = false;
  if (!g) return texture;
  g.clearRect(0, 0, 512, 512);
  g.fillStyle = "#f7f4ee";
  g.beginPath();
  g.arc(256, 256, 248, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#243e78";
  g.beginPath();
  g.arc(256, 256, 228, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fbfaf6";
  g.beginPath();
  g.arc(256, 256, 168, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#f4efe4";
  g.font = '600 42px "Nanum Myeongjo", serif';
  g.textAlign = "center";
  g.textBaseline = "middle";
  arcText(g, school || "구름결", 198);
  g.fillStyle = "#1e3568";
  g.font = '700 64px "Nanum Myeongjo", serif';
  const dept = department || "수험";
  const lines = dept.length > 5 ? [dept.slice(0, Math.ceil(dept.length / 2)), dept.slice(Math.ceil(dept.length / 2))] : [dept];
  lines.forEach((line, index) => {
    g.fillText(line, 256, 250 + (index - (lines.length - 1) / 2) * 68);
  });
  g.strokeStyle = "#243e78";
  g.lineWidth = 8;
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(214, 318);
  g.quadraticCurveTo(256, 292, 298, 318);
  g.lineTo(298, 352);
  g.quadraticCurveTo(256, 328, 214, 352);
  g.closePath();
  g.stroke();
  texture.needsUpdate = true;
  return texture;
}

export function Scholar() {
  const root = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const feet = useRef<THREE.Group>(null);
  const school = useStudy((state) => state.school);
  const department = useStudy((state) => state.department);
  const entered = useStudy((state) => state.entered);
  const [fontTick, setFontTick] = useState(0);
  const texture = useMemo(() => badgeTexture(school, department), [school, department, fontTick]);
  useEffect(() => {
    let stop = false;
    void document.fonts?.ready.then(() => {
      if (!stop) setFontTick(1);
    });
    return () => {
      stop = true;
    };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    const node = root.current;
    const pose = rig.current;
    const torso = body.current;
    const toes = feet.current;
    if (!node || !pose || !torso || !toes) return;
    const player = bridge.player;
    const here = entered;
    node.position.set(here ? player.x : GATE.x, here ? player.ground : 0, here ? player.z : GATE.z);
    node.rotation.y = here ? player.yaw : GATE.yaw;
    const seated = here && player.seated;
    const idle = seated ? 0 : Math.sin(here ? player.bob : clock.elapsedTime * 1.4);
    pose.position.y = seated ? 0.16 : Math.abs(idle) * 0.045;
    torso.scale.y = seated ? 0.74 : 0.92;
    torso.rotation.z = seated ? 0 : idle * 0.05;
    toes.visible = !seated;
  });

  return (
    <group ref={root}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0.05]}>
        <circleGeometry args={[0.46, 24]} />
        <meshBasicMaterial color="#1a120c" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <group ref={rig}>
        <mesh ref={body} position={[0, 0.5, 0]} castShadow scale={[1, 0.92, 1]}>
          <sphereGeometry args={[0.46, 28, 22]} />
          <meshStandardMaterial color="#f7f4ee" roughness={0.62} />
        </mesh>
        <group ref={feet}>
          {[-0.16, 0.16].map((x) => (
            <mesh key={x} position={[x, 0.09, 0.02]} castShadow>
              <sphereGeometry args={[0.09, 16, 12]} />
              <meshStandardMaterial color="#f7f4ee" roughness={0.62} />
            </mesh>
          ))}
        </group>
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.62, -0.48]}>
            <sphereGeometry args={[0.042, 12, 10]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
          </mesh>
        ))}
        <group position={[0, 0.98, 0.02]} rotation={[0.62, 0, 0]}>
          <mesh>
            <circleGeometry args={[0.4, 40]} />
            <meshStandardMaterial color="#f7f4ee" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, 0.012]}>
            <circleGeometry args={[0.36, 40]} />
            <meshStandardMaterial map={texture} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
