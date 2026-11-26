import * as THREE from "three";

export function createHipRoof(width: number, depth: number, rise: number): THREE.BufferGeometry {
  const overhang = Math.min(width, depth) * 0.2;
  const hw = width / 2;
  const hd = depth / 2;
  const span = Math.min(hw, hd);
  const ridgeX = Math.max(0, hw - hd);
  const ridgeZ = Math.max(0, hd - hw);
  const segsX = 24;
  const segsZ = 18;
  const gx = segsX + 1;
  const positions: number[] = [];
  const uvs: number[] = [];

  const yAt = (x: number, z: number) => {
    const ax = Math.max(0, Math.abs(x) - ridgeX) / span;
    const az = Math.max(0, Math.abs(z) - ridgeZ) / span;
    const t = Math.max(ax, az);
    let y = rise * (1 - Math.min(t, 1));
    const curl = Math.max(0, t - 0.7);
    y += curl * curl * rise * 0.9;
    const corner = Math.max(0, Math.min(ax, 1.7) - 0.5) * Math.max(0, Math.min(az, 1.7) - 0.5);
    y += corner * rise * 0.28;
    return y;
  };

  for (let iz = 0; iz <= segsZ; iz += 1) {
    const z = (iz / segsZ) * 2 - 1;
    const zz = z * (hd + overhang);
    for (let ix = 0; ix <= segsX; ix += 1) {
      const x = (ix / segsX) * 2 - 1;
      const xx = x * (hw + overhang);
      positions.push(xx, yAt(xx, zz), zz);
      uvs.push(xx * 0.45, zz * 0.45);
    }
  }

  const indices: number[] = [];
  for (let iz = 0; iz < segsZ; iz += 1) {
    for (let ix = 0; ix < segsX; ix += 1) {
      const a = iz * gx + ix;
      const b = a + 1;
      const c = a + gx;
      const d = c + 1;
      indices.push(a, d, b, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
