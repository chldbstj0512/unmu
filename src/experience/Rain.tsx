import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COUNT = 700;

export function Rain({ on }: { on: boolean }) {
  const lines = useRef<THREE.LineSegments>(null);
  const drops = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: (Math.random() - 0.5) * 18,
        y: Math.random() * 8,
        z: (Math.random() - 0.5) * 18,
        v: 7 + Math.random() * 4,
      })),
    [],
  );
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(COUNT * 2 * 3), 3));
    return geo;
  }, []);

  useFrame(({ camera }, delta) => {
    const mesh = lines.current;
    const attr = geometry.getAttribute("position");
    if (!mesh || !attr || !on) return;
    mesh.position.x = camera.position.x;
    mesh.position.z = camera.position.z;
    for (let i = 0; i < drops.length; i += 1) {
      const drop = drops[i];
      if (!drop) continue;
      drop.y -= drop.v * delta;
      if (drop.y < 0) {
        drop.y = 7 + Math.random() * 2;
        drop.x = (Math.random() - 0.5) * 18;
        drop.z = (Math.random() - 0.5) * 18;
      }
      attr.setXYZ(i * 2, drop.x, drop.y, drop.z);
      attr.setXYZ(i * 2 + 1, drop.x, drop.y - 0.45, drop.z);
    }
    attr.needsUpdate = true;
  });

  return (
    <lineSegments ref={lines} geometry={geometry} visible={on}>
      <lineBasicMaterial color="#d5dde4" transparent opacity={0.35} />
    </lineSegments>
  );
}
