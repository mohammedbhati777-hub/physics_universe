import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useStore, V3 } from "../store";
import { gravityForce, M_EARTH, R_EARTH, orbitPath, circularOrbit, escapePath, clamp } from "../physics";
import { ArrowMesh } from "./Mechanics3D";
import { GlowSprite } from "./Universe";

function EarthMesh({ r = 2, position = [0, 0, 0] as V3 }: { r?: number; position?: V3 }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[r, 44, 44]} />
        <meshStandardMaterial color="#2f6fbe" roughness={0.55} emissive="#0a2748" emissiveIntensity={0.75} />
      </mesh>
      <GlowSprite color="rgba(90,170,255,0.55)" scale={r * 2.7} opacity={0.3} />
    </group>
  );
}

/* ---------------- Gravity ---------------- */
function GravityScene() {
  const mFac = useStore((s) => Number(s.sim.gr_m ?? 2));
  const dFac = useStore((s) => Number(s.sim.gr_d ?? 10));
  const mB = mFac * 1e23;
  const d = dFac * 1e6;
  const F = gravityForce(M_EARTH, mB, d);
  const F0 = gravityForce(M_EARTH, 2e23, 10e6);
  const dv = dFac * 0.55;
  const Lf = clamp(2.2 * (F / F0), 0.35, 3.4);
  const rB = clamp(0.32 * Math.cbrt(mFac), 0.22, 1.1);
  const UPV = new THREE.Vector3(0, 1, 0);
  const qR = new THREE.Quaternion().setFromUnitVectors(UPV, new THREE.Vector3(1, 0, 0));
  const qL = new THREE.Quaternion().setFromUnitVectors(UPV, new THREE.Vector3(-1, 0, 0));
  return (
    <group>
      <EarthMesh r={1.15} position={[-dv / 2, 1.7, 0]} />
      <group position={[dv / 2, 1.7, 0]}>
        <mesh><sphereGeometry args={[rB, 32, 32]} /><meshStandardMaterial color="#b9c6de" roughness={0.9} emissive="#2a3550" emissiveIntensity={0.5} /></mesh>
      </group>
      <group position={[-dv / 2 + 1.35, 1.7, 0]} quaternion={qR} scale={[1, Lf, 1]}><ArrowMesh color="#ffb454" /></group>
      <group position={[dv / 2 - rB - 0.2, 1.7, 0]} quaternion={qL} scale={[1, Lf, 1]}><ArrowMesh color="#53e8ff" /></group>
      <Line points={[[-dv / 2, 0.05, 0], [dv / 2, 0.05, 0]]} color="#3a4a70" lineWidth={1} transparent opacity={0.5} dashed dashSize={0.25} gapSize={0.18} />
    </group>
  );
}

/* ---------------- Satellite ---------------- */
function SatelliteScene() {
  const alt = useStore((s) => Number(s.sim.st_alt ?? 400));
  const vk = useStore((s) => Number(s.sim.st_v ?? 7.67));
  const run = useStore((s) => Number(s.sim.st_run ?? 0));

  const path = useMemo(() => orbitPath(alt, vk), [alt, vk]);
  const co = useMemo(() => circularOrbit(alt), [alt]);
  const CY: V3 = [0, 1.9, 0];
  const pts = useMemo(
    () => path.pts.map(([x, y]) => [(x / R_EARTH) * 2 + CY[0], (y / R_EARTH) * 2 + CY[1], 0] as [number, number, number]),
    [path]
  );
  const color = path.outcome === "orbit" ? "#39f0c3" : path.outcome === "crash" ? "#ff7a9c" : "#ffb454";
  const dur = path.outcome === "orbit" ? clamp(co.T / 400, 7, 20) : 8;

  const sat = useRef<THREE.Group>(null);
  const vel = useRef<THREE.Group>(null);
  const tRef = useRef(0);
  const holdRef = useRef(0);

  useEffect(() => { tRef.current = 0; holdRef.current = 0; }, [run, alt, vk]);

  useFrame((_, dt) => {
    if (useStore.getState().paused) return;
    if (path.outcome === "orbit") {
      tRef.current = (tRef.current + dt) % dur;
    } else {
      if (tRef.current < dur) tRef.current += dt;
      else { holdRef.current += dt; if (holdRef.current > 1.6) { tRef.current = 0; holdRef.current = 0; } }
    }
    const prog = clamp(tRef.current / dur, 0, 1);
    const idx = Math.min(pts.length - 1, Math.floor(prog * (pts.length - 1)));
    const p = pts[idx];
    const q = pts[Math.min(pts.length - 1, idx + 3)];
    if (sat.current) sat.current.position.set(p[0], p[1], 0);
    if (vel.current) {
      const dx = q[0] - p[0]; const dy = q[1] - p[1];
      const n = Math.hypot(dx, dy) || 1;
      vel.current.position.set(p[0], p[1], 0);
      const dq = new THREE.Vector3(dx / n, dy / n, 0);
      vel.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dq);
      vel.current.scale.set(1, 0.85, 1);
    }
  });

  return (
    <group>
      <EarthMesh r={2} position={CY} />
      <Line points={pts} color={color} lineWidth={1.6} transparent opacity={0.8} />
      <group ref={sat} position={pts[0]}>
        <mesh><boxGeometry args={[0.14, 0.14, 0.2]} /><meshStandardMaterial color="#dfe9fb" roughness={0.3} metalness={0.6} /></mesh>
        <mesh position={[0.32, 0, 0]}><boxGeometry args={[0.42, 0.02, 0.2]} /><meshStandardMaterial color="#2f6fbe" emissive="#0a2748" emissiveIntensity={0.8} /></mesh>
        <mesh position={[-0.32, 0, 0]}><boxGeometry args={[0.42, 0.02, 0.2]} /><meshStandardMaterial color="#2f6fbe" emissive="#0a2748" emissiveIntensity={0.8} /></mesh>
        <GlowSprite color="rgba(120,220,255,0.6)" scale={1.1} opacity={0.4} />
      </group>
      <group ref={vel}><ArrowMesh color="#39f0c3" /></group>
    </group>
  );
}

/* ---------------- Escape velocity ---------------- */
function EscapeScene() {
  const v = useStore((s) => Number(s.sim.es_v ?? 11.2));
  const run = useStore((s) => Number(s.sim.es_run ?? 0));
  const ep = useMemo(() => escapePath(v), [v]);
  const yOf = (r: number) => -0.7 + 2 * Math.pow(Math.max(1, r / R_EARTH), 0.55);
  const pts = useMemo(() => ep.pts.map(([, r]) => [0, yOf(r), 0] as [number, number, number]), [ep]);
  const color = ep.outcome === "escape" ? "#39f0c3" : ep.outcome === "margin" ? "#ffb454" : "#ff7a9c";

  const rocket = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Sprite>(null);
  const tRef = useRef(0);
  const holdRef = useRef(0);
  useEffect(() => { tRef.current = 0; holdRef.current = 0; }, [run, v]);

  useFrame((state, dt) => {
    if (useStore.getState().paused) return;
    const dur = 8;
    if (tRef.current < dur) tRef.current += dt;
    else { holdRef.current += dt; if (holdRef.current > 1.8) { tRef.current = 0; holdRef.current = 0; } }
    const prog = clamp(tRef.current / dur, 0, 1);
    const idx = Math.min(pts.length - 1, Math.floor(prog * (pts.length - 1)));
    const p = pts[idx];
    const rising = idx < pts.length - 1 && pts[idx + 1][1] > p[1];
    if (rocket.current) {
      rocket.current.position.set(p[0], p[1] + 0.3, 0);
      rocket.current.rotation.z = rising ? 0 : Math.PI;
    }
    if (flame.current) {
      const fl = rising ? 0.9 + Math.sin(state.clock.elapsedTime * 24) * 0.25 : 0.001;
      flame.current.scale.set(0.3, fl, 1);
      flame.current.position.set(p[0], p[1] + (rising ? 0.02 : 0.62), 0);
    }
  });

  return (
    <group>
      <EarthMesh r={2} position={[0, -0.7, 0]} />
      <Line points={pts} color={color} lineWidth={1.6} transparent opacity={0.75} />
      <group ref={rocket} position={[0, 1.6, 0]}>
        <mesh position={[0, 0.16, 0]}><coneGeometry args={[0.1, 0.3, 12]} /><meshStandardMaterial color="#ff8a5c" emissive="#7a2c10" emissiveIntensity={0.6} /></mesh>
        <mesh position={[0, -0.08, 0]}><cylinderGeometry args={[0.1, 0.1, 0.26, 12]} /><meshStandardMaterial color="#dfe9fb" roughness={0.35} metalness={0.5} /></mesh>
      </group>
      <sprite ref={flame} position={[0, 1.3, 0]} scale={[0.3, 0.9, 1]}>
        <spriteMaterial color="#ffb454" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
    </group>
  );
}

/* ---------------- Black hole (simplified educational visualization) ---------------- */
function BlackHoleScene() {
  const M = useStore((s) => Number(s.sim.bh_m ?? 10));
  const quality = useStore((s) => s.quality);
  const rsVis = clamp(0.35 + M * 0.05, 0.45, 2.1);
  const rin = rsVis * 1.9;
  const rout = rsVis * 4.4;
  const N = quality === "low" ? 300 : 680;

  const disk = useMemo(() => {
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const rad = new Float32Array(N);
    const ang = new Float32Array(N);
    const cIn = new THREE.Color("#fff2c0");
    const cOut = new THREE.Color("#ff6a2a");
    const cTmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const r = rin + Math.pow(Math.random(), 0.8) * (rout - rin);
      rad[i] = r;
      ang[i] = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(ang[i]) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.08 * (r / rout);
      pos[i * 3 + 2] = Math.sin(ang[i]) * r;
      const t = Math.pow((r - rin) / (rout - rin), 0.6);
      cTmp.copy(cIn).lerp(cOut, t);
      col[i * 3] = cTmp.r; col[i * 3 + 1] = cTmp.g; col[i * 3 + 2] = cTmp.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return { g, rad, ang };
  }, [N, rin, rout]);

  const fall = useMemo(() => {
    const n = 42;
    const pos = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { g, n };
  }, []);

  const diskRef = useRef<THREE.Points>(null);
  const fallRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (useStore.getState().paused) return;
    const t = state.clock.elapsedTime;
    const attr = disk.g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const r = disk.rad[i];
      const w = 3.4 * Math.pow(rin / r, 1.5); // Keplerian ω ∝ r^-3/2
      const a = disk.ang[i] + t * w;
      attr.setXYZ(i, Math.cos(a) * r, attr.getY(i), Math.sin(a) * r);
    }
    attr.needsUpdate = true;
    const fattr = fall.g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < fall.n; i++) {
      const p = i / fall.n;
      const cyc = (t * 0.05 + p) % 1;
      const r = rout - cyc * (rout - rsVis * 1.25);
      const a = p * Math.PI * 2 + t * 1.1 + 2.4 * (1 - (r - rsVis) / (rout - rsVis));
      fattr.setXYZ(i, Math.cos(a) * r, (p - 0.5) * 0.5 * (r / rout), Math.sin(a) * r);
    }
    fattr.needsUpdate = true;
  });

  return (
    <group position={[0, 1.8, 0]}>
      <mesh><sphereGeometry args={[rsVis, 36, 36]} /><meshStandardMaterial color="#010208" roughness={1} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[rsVis * 1.52, 0.03, 10, 72]} />
        <meshBasicMaterial color="#ffd27a" transparent opacity={0.9} />
      </mesh>
      <GlowSprite color="rgba(255,170,90,0.55)" scale={rsVis * 7} opacity={0.42} />
      <group rotation={[1.08, 0, 0.14]}>
        <points ref={diskRef} geometry={disk.g}>
          <pointsMaterial size={0.055} vertexColors transparent opacity={0.92} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
        <points ref={fallRef} geometry={fall.g}>
          <pointsMaterial size={0.05} color="#ffc07a" transparent opacity={0.8} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      </group>
    </group>
  );
}

export function Space3D() {
  const exp = useStore((s) => s.exp);
  return (
    <group>
      {exp === "gravity" && <GravityScene />}
      {exp === "satellite" && <SatelliteScene />}
      {exp === "escape" && <EscapeScene />}
      {exp === "blackhole" && <BlackHoleScene />}
    </group>
  );
}
