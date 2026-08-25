import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useStore } from "../store";
import { projectile, pendulumStep, collide1D, clamp } from "../physics";
import { ImgSprite } from "./ImgSprite";

const UPV = new THREE.Vector3(0, 1, 0);
function orient(g: THREE.Object3D, dir: [number, number, number], len: number) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]);
  if (d.lengthSq() < 1e-8) d.set(0, 1, 0);
  d.normalize();
  g.quaternion.setFromUnitVectors(UPV, d);
  g.scale.set(1, Math.max(0.01, len), 1);
}

export function ArrowMesh({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.4, 0]}><cylinderGeometry args={[0.032, 0.032, 0.8, 8]} /><meshBasicMaterial color={color} /></mesh>
      <mesh position={[0, 0.9, 0]}><coneGeometry args={[0.09, 0.24, 10]} /><meshBasicMaterial color={color} /></mesh>
    </group>
  );
}

function LabGround() {
  return (
    <group>
      <gridHelper args={[36, 36, "#1b2a49", "#0e1830"]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]}>
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial color="#060b17" roughness={1} />
      </mesh>
    </group>
  );
}

/* ---------------- Projectile ---------------- */
function ProjectileScene() {
  const v0 = useStore((s) => Number(s.sim.pj_v0 ?? 22));
  const ang = useStore((s) => Number(s.sim.pj_ang ?? 55));
  const g = useStore((s) => Number(s.sim.pj_g ?? 9.81));
  const h0 = useStore((s) => Number(s.sim.pj_h0 ?? 1.5));
  const drag = useStore((s) => Boolean(s.sim.pj_drag));
  const run = useStore((s) => Number(s.sim.pj_run ?? 0));

  const out = useMemo(() => projectile(v0, ang, g, h0, drag), [v0, ang, g, h0, drag]);
  const s = Math.min(1.4, 15 / Math.max(out.range, 4), 6.8 / Math.max(out.maxH, 2));
  const linePts = useMemo(
    () => out.pts.map((p) => [p.x * s, p.y * s + 0.04, 0] as [number, number, number]),
    [out, s]
  );

  const ball = useRef<THREE.Group>(null);
  const vel = useRef<THREE.Group>(null);
  const grav = useRef<THREE.Group>(null);
  const tRef = useRef(0);

  useEffect(() => { tRef.current = 0; }, [run, v0, ang, g, h0, drag]);

  useFrame((_, dt) => {
    if (useStore.getState().paused) return;
    tRef.current += dt * 1.5;
    if (tRef.current > out.tof + 1.3) tRef.current = 0;
    const t = Math.min(tRef.current, out.tof);
    const pts = out.pts;
    let i = 1;
    while (i < pts.length - 1 && pts[i].t < t) i++;
    const p = pts[i];
    if (ball.current) ball.current.position.set(p.x * s, p.y * s + 0.16, 0);
    if (vel.current && ball.current) {
      const sp = Math.hypot(p.vx, p.vy) || 1;
      vel.current.position.copy(ball.current.position);
      orient(vel.current, [p.vx / sp, p.vy / sp, 0], 0.45 + 1.0 * (sp / Math.max(v0, 1)));
    }
    if (grav.current && ball.current) {
      grav.current.position.copy(ball.current.position);
      orient(grav.current, [0, -1, 0], 0.55 + 0.05 * g);
    }
  });

  return (
    <group>
      <LabGround />
      <Line points={linePts} color="#ffb454" lineWidth={2} transparent opacity={0.85} />
      {/* launcher */}
      <group position={[0, h0 * s, 0]} rotation={[0, 0, -(ang * Math.PI) / 180]}>
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.09, 0.12, 0.9, 10]} /><meshStandardMaterial color="#53e8ff" emissive="#0d5c75" emissiveIntensity={0.8} /></mesh>
      </group>
      <mesh position={[0, h0 * s * 0.5, 0]}><boxGeometry args={[0.1, Math.max(0.1, h0 * s), 0.1]} /><meshStandardMaterial color="#3a4a70" /></mesh>
      {/* projectile */}
      <group ref={ball} position={[0, h0 * s + 0.16, 0]}>
        <mesh><sphereGeometry args={[0.13, 18, 18]} /><meshStandardMaterial color="#ffd08a" emissive="#b56a14" emissiveIntensity={1.4} /></mesh>
        <ImgSprite name="ball" size={0.72} />
        <pointLight color="#ffb454" intensity={0.5} distance={3} />
      </group>
      <group ref={vel}><ArrowMesh color="#39f0c3" /></group>
      <group ref={grav}><ArrowMesh color="#ff7a9c" /></group>
    </group>
  );
}

/* ---------------- Pendulum ---------------- */
function PendulumScene() {
  const L = useStore((s) => Number(s.sim.pn_L ?? 2.5));
  const m = useStore((s) => Number(s.sim.pn_m ?? 1.5));
  const g = useStore((s) => Number(s.sim.pn_g ?? 9.81));
  const th0 = useStore((s) => Number(s.sim.pn_th ?? 45));
  const run = useStore((s) => Number(s.sim.pn_run ?? 0));

  const Lv = clamp(L * 0.5, 0.9, 4.6);
  const bobR = clamp(0.14 + m * 0.045, 0.14, 0.42);
  const st = useRef({ th: (th0 * Math.PI) / 180, om: 0 });
  const arm = useRef<THREE.Group>(null);

  useEffect(() => {
    st.current = { th: (th0 * Math.PI) / 180, om: 0 };
  }, [L, g, th0, run]);

  useFrame((_, dt) => {
    if (useStore.getState().paused) return;
    const sub = 4;
    for (let i = 0; i < sub; i++) {
      const r = pendulumStep(st.current.th, st.current.om, L, g, dt / sub);
      st.current.th = r.th;
      st.current.om = r.om;
    }
    if (arm.current) arm.current.rotation.z = st.current.th;
  });

  return (
    <group>
      <LabGround />
      <mesh position={[0, 5.75, 0]}><boxGeometry args={[3.4, 0.14, 0.14]} /><meshStandardMaterial color="#3a4a70" roughness={0.6} /></mesh>
      <group position={[0, 5.68, 0]} ref={arm}>
        <mesh position={[0, -Lv / 2, 0]}><cylinderGeometry args={[0.028, 0.028, Lv, 8]} /><meshStandardMaterial color="#c8d6f0" roughness={0.35} metalness={0.4} /></mesh>
        <mesh position={[0, -Lv, 0]}>
          <sphereGeometry args={[bobR * 0.8, 24, 24]} />
          <meshStandardMaterial color="#ffb454" emissive="#8a4d0d" emissiveIntensity={1.1} roughness={0.25} />
          <ImgSprite name="steel" size={bobR * 3} />
        </mesh>
      </group>
      <mesh position={[0, 5.68, 0]}><sphereGeometry args={[0.09, 12, 12]} /><meshStandardMaterial color="#53e8ff" emissive="#0d5c75" emissiveIntensity={1} /></mesh>
    </group>
  );
}

/* ---------------- Collision ---------------- */
function CollisionScene() {
  const mA = useStore((s) => Number(s.sim.cl_mA ?? 2));
  const mB = useStore((s) => Number(s.sim.cl_mB ?? 3));
  const vA0 = useStore((s) => Number(s.sim.cl_vA ?? 4));
  const vB0 = useStore((s) => Number(s.sim.cl_vB ?? -2));
  const elastic = useStore((s) => Boolean(s.sim.cl_el));
  const run = useStore((s) => Number(s.sim.cl_run ?? 0));

  const rA = clamp(0.22 + 0.2 * Math.cbrt(mA), 0.3, 0.75);
  const rB = clamp(0.22 + 0.2 * Math.cbrt(mB), 0.3, 0.75);

  const st = useRef({ xA: -5, xB: 5, vA: vA0, vB: vB0, done: false, hold: 0, flash: 0 });
  const ballA = useRef<THREE.Group>(null);
  const ballB = useRef<THREE.Group>(null);
  const arrowA = useRef<THREE.Group>(null);
  const arrowB = useRef<THREE.Group>(null);
  const flash = useRef<THREE.Mesh>(null);

  useEffect(() => {
    st.current = { xA: -5, xB: 5, vA: vA0, vB: vB0, done: false, hold: 0, flash: 0 };
  }, [mA, mB, vA0, vB0, elastic, run]);

  useFrame((_, dt) => {
    if (useStore.getState().paused) return;
    const s = st.current;
    if (s.done) {
      s.hold += dt;
      if (s.hold > 2.4) { s.xA = -5; s.xB = 5; s.vA = vA0; s.vB = vB0; s.done = false; s.hold = 0; }
    } else {
      s.xA += s.vA * dt * 1.4;
      s.xB += s.vB * dt * 1.4;
      if (s.xB - s.xA <= rA + rB && s.vA > s.vB) {
        const out = collide1D(mA, mB, s.vA, s.vB, elastic);
        s.vA = out.v1p;
        s.vB = out.v2p;
        s.done = true;
        s.flash = 1;
      }
      if (s.xA < -8.5 || s.xB > 8.5) { s.xA = -5; s.xB = 5; s.vA = vA0; s.vB = vB0; }
    }
    s.flash = Math.max(0, s.flash - dt * 1.6);
    const yA = 0.3 + rA; const yB = 0.3 + rB;
    if (ballA.current) ballA.current.position.set(s.xA, yA, 0);
    if (ballB.current) ballB.current.position.set(s.xB, yB, 0);
    const setArr = (ref: React.RefObject<THREE.Group>, v: number, mm: number, y: number, x: number) => {
      if (!ref.current) return;
      ref.current.position.set(x, y, 0);
      if (Math.abs(v) < 0.04) { ref.current.scale.set(0.001, 0.001, 0.001); return; }
      orient(ref.current, [Math.sign(v), 0, 0], clamp(Math.abs(mm * v) * 0.16, 0.3, 2.4));
    };
    setArr(arrowA, s.vA, mA, yA + rA + 0.55, s.xA);
    setArr(arrowB, s.vB, mB, yB + rB + 0.55, s.xB);
    if (flash.current) {
      const f = s.flash;
      flash.current.scale.set(Math.max(0.001, f * 1.5), Math.max(0.001, f * 1.5), Math.max(0.001, f * 1.5));
      (flash.current.material as THREE.MeshBasicMaterial).opacity = f * 0.9;
      flash.current.position.set((s.xA + s.xB) / 2, (yA + yB) / 2, 0);
    }
  });

  return (
    <group>
      <LabGround />
      <mesh position={[0, 0.28, 0]}><boxGeometry args={[15, 0.05, 0.5]} /><meshStandardMaterial color="#141f3a" roughness={0.8} /></mesh>
      <group ref={ballA} position={[-5, 0.3 + rA, 0]}>
        <mesh><sphereGeometry args={[rA * 0.8, 26, 26]} /><meshStandardMaterial color="#ffb454" emissive="#8a4d0d" emissiveIntensity={0.9} roughness={0.3} /></mesh>
        <ImgSprite name="ball" size={rA * 3.1} />
      </group>
      <group ref={ballB} position={[5, 0.3 + rB, 0]}>
        <mesh><sphereGeometry args={[rB * 0.8, 26, 26]} /><meshStandardMaterial color="#53e8ff" emissive="#0d5c75" emissiveIntensity={0.9} roughness={0.3} /></mesh>
        <ImgSprite name="steel" size={rB * 3.1} />
      </group>
      <group ref={arrowA}><ArrowMesh color="#ffb454" /></group>
      <group ref={arrowB}><ArrowMesh color="#53e8ff" /></group>
      <mesh ref={flash}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function Mechanics3D() {
  const exp = useStore((s) => s.exp);
  return (
    <group>
      {exp === "projectile" && <ProjectileScene />}
      {exp === "pendulum" && <PendulumScene />}
      {exp === "collision" && <CollisionScene />}
    </group>
  );
}
