import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore, WorldMeta, WORLDS, REDUCED_MOTION } from "../store";
import { GlowSprite } from "./Universe";
import { ImgSprite } from "./ImgSprite";
import { sfx } from "../sfx";

function MechanicsVisual() {
  const pend = useRef<THREE.Group>(null);
  const b1 = useRef<THREE.Mesh>(null);
  const b2 = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    if (pend.current) pend.current.rotation.z = Math.sin(t * 1.8) * 0.7;
    if (b1.current) {
      b1.current.position.y = -0.55 + Math.sin(t * 1.2) * 0.12;
      b1.current.rotation.set(t * 0.4, t * 0.6, 0.3);
    }
    if (b2.current) {
      b2.current.position.y = -0.85 + Math.sin(t * 1.5 + 2) * 0.14;
      b2.current.rotation.set(t * 0.5, 0.2, t * 0.4);
    }
  });
  return (
    <group>
      <group position={[0, 1.1, 0]}>
        <group ref={pend}>
          <mesh position={[0, -0.55, 0]}><cylinderGeometry args={[0.025, 0.025, 1.1, 8]} /><meshStandardMaterial color="#c8d6f0" roughness={0.4} /></mesh>
          <mesh position={[0, -1.14, 0]}><sphereGeometry args={[0.2, 20, 20]} /><meshStandardMaterial color="#ffb454" emissive="#a35e10" emissiveIntensity={0.9} roughness={0.3} /></mesh>
        </group>
      </group>
      <mesh position={[0, 1.16, 0]}><boxGeometry args={[1.1, 0.09, 0.09]} /><meshStandardMaterial color="#8fa3c8" roughness={0.5} /></mesh>
      <mesh ref={b1} position={[-0.85, -0.55, 0.2]}><boxGeometry args={[0.26, 0.26, 0.26]} /><meshStandardMaterial color="#53e8ff" emissive="#14556b" emissiveIntensity={0.7} /></mesh>
      <mesh ref={b2} position={[0.9, -0.85, -0.15]}><boxGeometry args={[0.2, 0.2, 0.2]} /><meshStandardMaterial color="#39f0c3" emissive="#0d5c49" emissiveIntensity={0.7} /></mesh>
    </group>
  );
}

function ElectricityVisual() {
  const e1 = useRef<THREE.Mesh>(null);
  const e2 = useRef<THREE.Mesh>(null);
  const e3 = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    const r = 1.05;
    if (e1.current) e1.current.position.set(Math.cos(t * 1.6) * r, Math.sin(t * 1.6) * r * 0.5, Math.sin(t * 1.6) * 0.4);
    if (e2.current) e2.current.position.set(Math.cos(t * 1.6 + 2.1) * r, Math.sin(t * 1.6 + 2.1) * r * 0.5, Math.sin(t * 1.6 + 2.1) * 0.4);
    if (e3.current) e3.current.position.set(Math.cos(t * 1.6 + 4.2) * r, Math.sin(t * 1.6 + 4.2) * r * 0.5, Math.sin(t * 1.6 + 4.2) * 0.4);
  });
  return (
    <group>
      <mesh position={[-0.55, 0.15, 0]}><sphereGeometry args={[0.3, 20, 20]} /><meshStandardMaterial color="#ffb454" emissive="#c06a12" emissiveIntensity={1.1} /></mesh>
      <mesh position={[0.55, -0.15, 0]}><sphereGeometry args={[0.3, 20, 20]} /><meshStandardMaterial color="#53e8ff" emissive="#106a85" emissiveIntensity={1.1} /></mesh>
      <mesh ref={e1}><sphereGeometry args={[0.07, 10, 10]} /><meshBasicMaterial color="#9beaff" /></mesh>
      <mesh ref={e2}><sphereGeometry args={[0.07, 10, 10]} /><meshBasicMaterial color="#9beaff" /></mesh>
      <mesh ref={e3}><sphereGeometry args={[0.07, 10, 10]} /><meshBasicMaterial color="#9beaff" /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.05, 0.008, 6, 48]} /><meshBasicMaterial color="#53e8ff" transparent opacity={0.25} /></mesh>
    </group>
  );
}

function WavesVisual() {
  const ref = useRef<THREE.Points>(null);
  const N = 90;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  useFrame((s) => {
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = 1.0 + Math.sin(a * 3 - t * 2.4) * 0.16;
      attr.setXYZ(i, Math.cos(a) * r, Math.sin(a * 2 - t * 2.4) * 0.22, Math.sin(a) * r * 0.6);
    }
    attr.needsUpdate = true;
    if (ref.current) ref.current.rotation.y = t * 0.1;
  });
  return (
    <group>
      <points ref={ref} geometry={geo}>
        <pointsMaterial color="#39f0c3" size={0.075} transparent opacity={0.95} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.0, 0.01, 6, 48]} /><meshBasicMaterial color="#39f0c3" transparent opacity={0.2} /></mesh>
    </group>
  );
}

function OpticsVisual() {
  const prism = useRef<THREE.Mesh>(null);
  const beams = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    if (prism.current) prism.current.rotation.y = Math.sin(t * 0.5) * 0.25;
    if (beams.current) beams.current.rotation.z = Math.sin(t * 0.8) * 0.06;
  });
  return (
    <group>
      <mesh ref={prism} position={[0.35, 0, 0]}>
        <coneGeometry args={[0.75, 1.2, 3]} />
        <meshStandardMaterial color="#ffe08a" transparent opacity={0.32} roughness={0.05} metalness={0.2} emissive="#7a5c14" emissiveIntensity={0.35} />
      </mesh>
      <group ref={beams}>
        <mesh position={[-1.15, 0.1, 0]} rotation={[0, 0, Math.PI / 2 - 0.1]}><cylinderGeometry args={[0.022, 0.022, 1.5, 8]} /><meshBasicMaterial color="#ffe08a" transparent opacity={0.7} /></mesh>
        <mesh position={[1.35, -0.42, 0]} rotation={[0, 0, Math.PI / 2 + 0.65]}><cylinderGeometry args={[0.022, 0.022, 1.3, 8]} /><meshBasicMaterial color="#ff9a5c" transparent opacity={0.6} /></mesh>
        <mesh position={[1.35, 0.28, 0]} rotation={[0, 0, Math.PI / 2 - 0.5]}><cylinderGeometry args={[0.022, 0.022, 1.3, 8]} /><meshBasicMaterial color="#7adfff" transparent opacity={0.6} /></mesh>
        <mesh position={[1.35, 0.02, 0]} rotation={[0, 0, Math.PI / 2 - 0.08]}><cylinderGeometry args={[0.022, 0.022, 1.3, 8]} /><meshBasicMaterial color="#a8ff9a" transparent opacity={0.6} /></mesh>
      </group>
    </group>
  );
}

function SpaceVisual() {
  const moon = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    if (moon.current) moon.current.position.set(Math.cos(t * 0.9) * 1.55, Math.sin(t * 0.9) * 0.5, Math.sin(t * 0.9) * 1.55);
  });
  return (
    <group>
      <mesh><sphereGeometry args={[0.55, 28, 28]} /><meshStandardMaterial color="#2f6fbe" roughness={0.5} emissive="#0c2c55" emissiveIntensity={0.8} /></mesh>
      <mesh rotation={[1.25, 0, 0]}><torusGeometry args={[1.55, 0.012, 6, 64]} /><meshBasicMaterial color="#7ab8ff" transparent opacity={0.45} /></mesh>
      <mesh ref={moon}><sphereGeometry args={[0.16, 14, 14]} /><meshStandardMaterial color="#b9c6de" roughness={0.9} /></mesh>
    </group>
  );
}

function QuantumVisual() {
  const cloud = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 150;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = Math.pow(Math.random(), 0.5) * 1.05;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((s) => {
    if (!cloud.current) return;
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    cloud.current.rotation.y = t * 0.4;
    const sc = 1 + Math.sin(t * 1.7) * 0.08;
    cloud.current.scale.set(sc, sc, sc);
  });
  return (
    <group>
      <points ref={cloud} geometry={geo}>
        <pointsMaterial color="#cf8bff" size={0.06} transparent opacity={0.8} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh rotation={[1.1, 0, 0]}><torusGeometry args={[1.25, 0.01, 6, 56]} /><meshBasicMaterial color="#cf8bff" transparent opacity={0.35} /></mesh>
      <mesh rotation={[-0.9, 0.4, 0]}><torusGeometry args={[1.45, 0.008, 6, 56]} /><meshBasicMaterial color="#8fd0ff" transparent opacity={0.22} /></mesh>
    </group>
  );
}

function GravityVisual() {
  const apple = useRef<THREE.Group>(null);
  const orb = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    if (apple.current) {
      const cyc = (t * 0.55) % 1;
      const eased = cyc * cyc;
      apple.current.position.y = 1.5 - eased * 2.15;
      apple.current.position.x = -0.55;
    }
    if (orb.current) orb.current.position.set(Math.cos(t * 1.1) * 1.5, 0.1 + Math.sin(t * 1.1) * 0.45, Math.sin(t * 1.55) * 1.5);
  });
  return (
    <group>
      <mesh position={[-0.55, -0.85, 0]}><sphereGeometry args={[0.5, 28, 28]} /><meshStandardMaterial color="#c96a3c" roughness={0.65} emissive="#5a2410" emissiveIntensity={0.55} /></mesh>
      <group ref={apple}>
        <mesh><sphereGeometry args={[0.09, 12, 12]} /><meshStandardMaterial color="#ff5c5c" emissive="#7a1414" emissiveIntensity={0.8} /></mesh>
        <ImgSprite name="ball" size={0.5} />
      </group>
      <mesh ref={orb}><sphereGeometry args={[0.13, 12, 12]} /><meshStandardMaterial color="#b9c6de" roughness={0.85} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.5, 0.01, 6, 56]} /><meshBasicMaterial color="#ff8a5c" transparent opacity={0.3} /></mesh>
    </group>
  );
}

function ThermoVisual() {
  const piston = useRef<THREE.Mesh>(null);
  const dots = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 26;
    const pos = new Float32Array(n * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { g, n };
  }, []);
  useFrame((s) => {
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    if (piston.current) piston.current.position.y = 0.75 + Math.sin(t * 1.3) * 0.18;
    const attr = geo.g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < geo.n; i++) {
      const ph = i * 2.39996;
      const sp = REDUCED_MOTION ? 0 : 1;
      attr.setXYZ(
        i,
        Math.sin(t * 3.1 * sp + ph) * 0.55,
        Math.sin(t * 3.7 * sp + ph * 1.7) * 0.55 + 0.05,
        Math.sin(t * 2.9 * sp + ph * 2.3) * 0.4
      );
    }
    attr.needsUpdate = true;
    if (dots.current) dots.current.position.set(0, 0, 0);
  });
  return (
    <group>
      <mesh position={[0, 0, 0]}><boxGeometry args={[1.5, 1.9, 1.05]} /><meshStandardMaterial color="#1a2440" transparent opacity={0.22} roughness={0.1} /></mesh>
      <mesh ref={piston} position={[0, 0.75, 0]}><boxGeometry args={[1.4, 0.14, 0.95]} /><meshStandardMaterial color="#8fa3c8" roughness={0.35} metalness={0.5} /></mesh>
      <points ref={dots} geometry={geo.g}>
        <pointsMaterial color="#ff7b6b" size={0.1} transparent opacity={0.95} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function FluidsVisual() {
  const cube = useRef<THREE.Mesh>(null);
  const bub = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 14;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return { g, n };
  }, []);
  useFrame((s) => {
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    if (cube.current) {
      cube.current.position.y = 0.02 + Math.sin(t * 1.6) * 0.08;
      cube.current.rotation.z = Math.sin(t * 1.1) * 0.08;
    }
    const attr = geo.g.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < geo.n; i++) {
      const ph = i * 1.7;
      const y = ((t * 0.35 + ph) % 1.2) - 0.9;
      attr.setXYZ(i, Math.sin(ph * 3) * 0.55 + Math.sin(t + ph) * 0.05, y, attr.getZ(i));
    }
    attr.needsUpdate = true;
  });
  return (
    <group>
      <mesh position={[0, -0.35, 0]}><boxGeometry args={[1.7, 1.1, 1.05]} /><meshStandardMaterial color="#10435e" transparent opacity={0.35} roughness={0.1} /></mesh>
      <mesh ref={cube}><boxGeometry args={[0.62, 0.62, 0.62]} /><meshStandardMaterial color="#4dd0ff" emissive="#0c4a66" emissiveIntensity={0.7} roughness={0.25} /></mesh>
      <points ref={bub} geometry={geo.g}>
        <pointsMaterial color="#9beaff" size={0.06} transparent opacity={0.85} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function ModernVisual() {
  const nuc = useRef<THREE.Mesh>(null);
  const frags = useRef<THREE.Group>(null);
  useFrame((s) => {
    const t = REDUCED_MOTION ? 0 : s.clock.elapsedTime;
    const cyc = (t * 0.5) % 1;
    if (nuc.current) {
      const sc = 1 + (cyc > 0.8 ? (cyc - 0.8) * 1.6 : 0) * 0.5;
      nuc.current.scale.set(sc, sc, sc);
      nuc.current.rotation.set(t * 0.4, t * 0.55, 0);
    }
    if (frags.current) {
      frags.current.visible = cyc > 0.05 && cyc < 0.8;
      const k = Math.max(0, cyc - 0.05);
      frags.current.children.forEach((c, i) => {
        const dir = i / frags.current!.children.length;
        const a = dir * Math.PI * 2 + 0.6;
        c.position.set(Math.cos(a) * k * 1.7, Math.sin(a * 1.4) * k * 1.1, Math.sin(a) * k * 1.4);
      });
    }
  });
  return (
    <group>
      <mesh ref={nuc}><icosahedronGeometry args={[0.42, 1]} /><meshStandardMaterial color="#ff5ca8" emissive="#8a1050" emissiveIntensity={1} roughness={0.3} flatShading /></mesh>
      <group ref={frags}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i}><sphereGeometry args={[0.09, 10, 10]} /><meshBasicMaterial color={i % 2 ? "#ffd08a" : "#9beaff"} /></mesh>
        ))}
      </group>
      <mesh rotation={[1.2, 0, 0]}><torusGeometry args={[1.15, 0.008, 6, 56]} /><meshBasicMaterial color="#ff5ca8" transparent opacity={0.3} /></mesh>
      <mesh rotation={[-1.0, 0.5, 0]}><torusGeometry args={[1.4, 0.008, 6, 56]} /><meshBasicMaterial color="#ffd08a" transparent opacity={0.2} /></mesh>
    </group>
  );
}

const VISUALS: Record<string, () => JSX.Element> = {
  mechanics: MechanicsVisual,
  electricity: ElectricityVisual,
  waves: WavesVisual,
  optics: OpticsVisual,
  space: SpaceVisual,
  quantum: QuantumVisual,
  gravity: GravityVisual,
  thermo: ThermoVisual,
  fluids: FluidsVisual,
  modern: ModernVisual,
};

function WorldNode({ meta, faded }: { meta: WorldMeta; faded: boolean }) {
  const setHover = useStore((s) => s.setHover);
  const enterWorld = useStore((s) => s.enterWorld);
  const phase = useStore((s) => s.phase);
  const hover = useStore((s) => s.hover === meta.id);
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const clock = useRef(Math.random() * 10);
  const Visual = VISUALS[meta.id];

  useFrame((_, dt) => {
    clock.current += dt;
    if (group.current) {
      if (!REDUCED_MOTION) group.current.position.y = meta.pos[1] + Math.sin(clock.current * 0.7) * 0.22;
      const target = hover && phase === "universe" ? 1.12 : 1;
      group.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
    }
    if (ring.current && !REDUCED_MOTION) {
      ring.current.rotation.x = clock.current * 0.35;
      ring.current.rotation.y = clock.current * 0.22;
    }
  });

  const rgba = (hex: string, a: number) => {
    const h = hex.replace("#", "");
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
  };

  return (
    <group ref={group} position={meta.pos}>
      <GlowSprite color={rgba(meta.color, 0.55)} scale={6.5} opacity={faded ? 0.12 : hover ? 0.5 : 0.3} />
      <mesh
        ref={ring}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (phase !== "universe") return;
          setHover(meta.id);
          sfx.hover();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => { setHover(null); document.body.style.cursor = "auto"; }}
        onClick={(e) => {
          e.stopPropagation();
          if (phase !== "universe") return;
          document.body.style.cursor = "auto";
          sfx.enter();
          enterWorld(meta.id);
        }}
      >
        <torusGeometry args={[2.15, 0.035, 10, 72]} />
        <meshBasicMaterial color={meta.color} transparent opacity={hover ? 0.95 : 0.4} />
      </mesh>
      {/* generous invisible hit area */}
      <mesh
        visible={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (phase !== "universe") return;
          setHover(meta.id);
          sfx.hover();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => { setHover(null); document.body.style.cursor = "auto"; }}
        onClick={(e) => {
          e.stopPropagation();
          if (phase !== "universe") return;
          document.body.style.cursor = "auto";
          sfx.enter();
          enterWorld(meta.id);
        }}
      >
        <sphereGeometry args={[2.4, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Visual />
    </group>
  );
}

export function WorldNodes({ faded }: { faded: boolean }) {
  return (
    <group>
      {WORLDS.map((m) => (
        <WorldNode key={m.id} meta={m} faded={faded} />
      ))}
    </group>
  );
}
