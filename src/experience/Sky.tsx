import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Visual } from "./atmosphere.ts";

export function Sky({ visual }: { visual: Visual }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(visual.skyTop) },
          uHorizon: { value: new THREE.Color(visual.skyHorizon) },
          uSun: { value: new THREE.Color(visual.sunDisc) },
          uDir: { value: new THREE.Vector3(...visual.sun).normalize() },
        },
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vec4 world = modelMatrix * vec4(position, 1.0);
            vDir = world.xyz;
            gl_Position = projectionMatrix * viewMatrix * world;
          }
        `,
        fragmentShader: `
          uniform vec3 uTop;
          uniform vec3 uHorizon;
          uniform vec3 uSun;
          uniform vec3 uDir;
          varying vec3 vDir;
          void main() {
            vec3 dir = normalize(vDir);
            float h = dir.y;
            vec3 color = mix(uHorizon, uTop, smoothstep(-0.05, 0.62, h));
            float sun = pow(max(dot(dir, normalize(uDir)), 0.0), 360.0);
            color += uSun * sun * 1.6;
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      }),
    // The material is kept and uniforms are written when the visual changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => {
    const uniforms = material.uniforms;
    uniforms.uTop?.value.set(visual.skyTop);
    uniforms.uHorizon?.value.set(visual.skyHorizon);
    uniforms.uSun?.value.set(visual.sunDisc);
    uniforms.uDir?.value.set(...visual.sun).normalize();
  }, [material, visual]);
  useEffect(() => () => material.dispose(), [material]);

  const stars = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(360 * 3);
    for (let i = 0; i < 360; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const y = 0.25 + Math.random() * 0.75;
      const ring = Math.sqrt(1 - y * y);
      arr[i * 3] = Math.cos(theta) * ring * 140;
      arr[i * 3 + 1] = y * 140;
      arr[i * 3 + 2] = Math.sin(theta) * ring * 140;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return geo;
  }, []);

  return (
    <>
      <mesh frustumCulled={false}>
        <sphereGeometry args={[160, 32, 20]} />
        <primitive object={material} attach="material" />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial color="#f7f1e4" size={1.15} sizeAttenuation transparent opacity={visual.star} depthWrite={false} fog={false} />
      </points>
    </>
  );
}
