import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { bridge } from "../experience/bridge.ts";
import { useStudy } from "../study/store.ts";

const GATE = { x: 2.9, z: 10.6, yaw: 0.1 };

const HEAD_Y = 0.5;
const HEAD_RX = 0.46;
const HEAD_RY = 0.46 * 1.012;
const HEAD_RZ = 0.46;

type FaceLay = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
};

function layOnFace(x: number, y: number, halfDepth: number, protrusion: number): FaceLay {
  const yy = y - HEAD_Y;
  const gx = x / (HEAD_RX * HEAD_RX);
  const gy = yy / (HEAD_RY * HEAD_RY);
  const radial = 1 - (x * x) / (HEAD_RX * HEAD_RX) - (yy * yy) / (HEAD_RY * HEAD_RY);
  const z = -HEAD_RZ * Math.sqrt(Math.max(radial, 0));
  const normal = new THREE.Vector3(gx, gy, z / (HEAD_RZ * HEAD_RZ)).normalize();
  const hinge = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 0, 1), normal);
  if (hinge.lengthSq() < 1e-8) hinge.set(1, 0, 0);
  else hinge.normalize();
  const tangent = new THREE.Vector3().crossVectors(normal, hinge).normalize();
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(hinge, tangent, normal));
  const center = new THREE.Vector3(x, y, z).addScaledVector(normal, protrusion - halfDepth);
  return {
    position: [center.x, center.y, center.z],
    quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
  };
}

const EYE_R = 0.045;
const EYE_DEPTH = 0.22;
const EYES = [-0.12, 0.12].map((x) => layOnFace(x, 0.62, EYE_R * EYE_DEPTH, 0.006));
const NOSE_R = 0.03;
const NOSE_DEPTH = 0.42;
const NOSE = layOnFace(0, 0.52, NOSE_R * NOSE_DEPTH, 0.008);
const MOUTH_TUBE = 0.011;
const MOUTH_DEPTH = 0.32;
const MOUTH = layOnFace(0, 0.4, MOUTH_TUBE * MOUTH_DEPTH, 0.0045);

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
  arcText(g, school || "운무암", 198);
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
    torso.scale.y = seated ? 0.814 : 1.012;
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
        <mesh ref={body} position={[0, 0.5, 0]} castShadow scale={[1, 1.012, 1]}>
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
        {EYES.map((eye, index) => (
          <mesh key={index} position={eye.position} quaternion={eye.quaternion} scale={[1, 1, EYE_DEPTH]} renderOrder={2}>
            <sphereGeometry args={[EYE_R, 20, 14]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.62} />
          </mesh>
        ))}
        <mesh position={NOSE.position} quaternion={NOSE.quaternion} scale={[1, 1, NOSE_DEPTH]} renderOrder={2}>
          <sphereGeometry args={[NOSE_R, 16, 12]} />
          <meshStandardMaterial color="#f0e2d4" roughness={0.72} />
        </mesh>
        <mesh position={MOUTH.position} quaternion={MOUTH.quaternion} scale={[1, 1, MOUTH_DEPTH]} renderOrder={2}>
          <torusGeometry args={[0.05, MOUTH_TUBE, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
        <group position={[0, 1.04, -0.3]} rotation={[0.42, Math.PI, 0]}>
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
