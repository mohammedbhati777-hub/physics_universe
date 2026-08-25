import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useStore, WorldMeta, WORLDS, REDUCED_MOTION } from "../store";
import { GlowSprite } from "./Universe";
import { sfx } from "../sfx";

function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
}

function MechanicsVisual() {
  const arm = useRef<THREE.Group>(null);
  const c1 = useRef<THREE.Mesh>(null);
  const c2 = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = REDUCED_MOTION ? 0 : state.clock.elapsedTime;
    if (arm.current) arm.current.rotation.z = Math.sin(t * 1.8) * 0.7;
    if (c1.current) { c1.current.position.y = -0.55 + Math.sin(t * 1.2) * 0.12; c1.current.rotation.y = t * 0.6; }
    if (c2.current) { c2.current.position.y = -0.85 + Math.sin(t * 1.5 + 2) * 0.14; c2.current.rotation.x = t * 0.5; }
  });
  return (
    <group>
      <group position={[0, 1.1, 0]} ref={arm}>
        <mesh position={[0, -0.55, 0]}><cylinderGeometry args={[0.025, 0.025, 1.1, 8]} /><meshStandardMaterial color="#c8d6f0" roughness={0.4} /></mesh>
        <mesh position={[0, -1.14, 0]}><sphereGeometry args={[0.2, 20, 20]} /><meshStandardMaterial color="#ffb454" emissive="#a35e10" emissiveIntensity={0.9} roughness={0.3} /></mesh>
      </group>
      <mesh position={[0, 1.16, 0]}><boxGeometry args={[1.1, 0.09, 0.09]} /><meshStandardMaterial color="#8fa3c8" roughness={0.5} /></mesh>
      <mesh ref={c1} position={[-0.85, -0.55, 0.2]}><boxGeometry args={[0.26, 0.26, 0.26]} /><meshStandardMaterial color="#53e8ff" emissive="#14556b" emissiveIntensity={0.7} /></mesh>
      <mesh ref={c2} position={[0.9, -0.85, -0.15]}><boxGeometry args={[0.2, 0.2, 0.2]} /><meshStandardMaterial color="#39f0c3" emissive="#0d5c49" emissiveIntensity={0.7} /></mesh>
    </group>
  );
}

function ElectricityVisual() {
  const orbs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((state) => {
    const t = REDUCED_MOTION ? 0 : state.clock.elapsedTime;
    const r = 1.05;
    orbs.current.forEach((m, i) => {
      if (!m) return;
      const a = t * 1.6 + (i * Math.PI * 2) / 3;
      m.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.5, Math.sin(a) * 0.4);
    });
  });
  return (
    <group>
      <mesh position={[-0.55, 0.15, 0]}><sphereGeometry args={[0.3, 20, 20]} /><meshStandardMaterial color="#ffb454" emissive="#c06a12" emissiveIntensity={1.1} /></mesh>
      <mesh position={[0.55, -0.15, 0]}><sphereGeometry args={[0.3, 20, 20]} /><meshStandardMaterial color="#53e8ff" emissive="#106a85" emissiveIntensity={1.1} /></mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { orbs.current[i] = el; }}>
          <sphereGeometry args={[0.07, 10, 10]} /><meshBasicMaterial color="#9beaff" />
        </mesh>
      ))}
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.05, 0.008, 6, 48]} /><meshBasicMaterial color="#53e8ff" transparent opacity={0.25} /></mesh>
    </group>
  );
}

function WavesVisual() {
  const N = 90;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    return g;
  }, []);
  useFrame((state) => {
    const t = REDUCED_MOTION ? 0 : state.clock.elapsedTime;
    const attr = geo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = 1.0 + Math.sin(a * 3 - t * 2.4) * 0.16;
      attr.setXYZ(i, Math.cos(a) * r, Math.sin(a * 2 - t * 2.4) * 0.22, Math.sin(a) * r * 0.6);
    }
    attr.needsUpdate = true;
  });
  return (
    <group>
      <points geometry={geo}>
        <pointsMaterial color="#39f0c3" size={0.075} transparent opacity={0.95} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.0, 0.01, 6, 48]} /><meshBasicMaterial color="#39f0c3" transparent opacity={0.2} /></mesh>
    </group>
  );
}

function OpticsVisual() {
  const b1 = useRef<THREE.Mesh>(null);
  const b2 = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (b1.current) (b1.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 3) * 0.25;
    if (b2.current) (b2.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.cos(t * 3 + 1) * 0.25;
  });
  return (
    <group>
      <mesh position={[0.3, 0, 0]}>
        <coneGeometry args={[0.75, 1.2, 3]} />
        <meshStandardMaterial color="#ffe08a" transparent opacity={0.32} roughness={0.05} metalness={0.2} emissive="#7a5c14" emissiveIntensity={0.35} />
      </mesh>
      <mesh ref={b1} position={[-1.15, 0.14, 0]} rotation={[0, 0, Math.PI / 2 - 0.12]}><cylinderGeometry args={[0.022, 0.022, 1.5, 8]} /><meshBasicMaterial color="#ffe08a" transparent opacity={0.7} /></mesh>
      <mesh position={[1.3, -0.45, 0]} rotation={[0, 0, Math.PI / 2 + 0.65]}><cylinderGeometry args={[0.022, 0.022, 1.25, 8]} /><meshBasicMaterial color="#ff9a5c" transparent opacity={0.6} /></mesh>
      <mesh ref={b2} position={[1.3, 0.3, 0]} rotation={[0, 0, Math.PI / 2 - 0.5]}><cylinderGeometry args={[0.022, 0.022, 1.25, 8]} /><meshBasicMaterial color="#7adfff" transparent opacity={0.6} /></mesh>
      <mesh position={[1.3, 0, 0]} rotation={[0, 0, Math.PI / 2 - 0.08]}><cylinderGeometry args={[0.022, 0.022, 1.25, 8]} /><meshBasicMaterial color="#a8ff9a" transparent opacity={0.6} /></mesh>
    </group>
  );
}

function SpaceVisual() {
  const moon = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = REDUCED_MOTION ? 0 : state.clock.elapsedTime;
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
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (cloud.current) {
      cloud.current.rotation.y = REDUCED_MOTION ? 0 : t * 0.4;
      const s = 1 + Math.sin(t * 1.7) * 0.08;
      cloud.current.scale.set(s, s, s);
    }
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

const VISUALS: Record<string, () => JSX.Element> = {
  mechanics: MechanicsVisual,
  electricity: ElectricityVisual,
  waves: WavesVisual,
  optics: OpticsVisual,
  space: SpaceVisual,
  quantum: QuantumVisual,
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
      ring.current.rotation.x += dt * 0.35;
      ring.current.rotation.y += dt * 0.22;
    }
  });

  const handlers = {
    onPointerOver: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (phase !== "universe") return;
      setHover(meta.id);
      sfx.hover();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => { setHover(null); document.body.style.cursor = "auto"; },
    onClick: (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      if (phase !== "universe") return;
      document.body.style.cursor = "auto";
      sfx.enter();
      enterWorld(meta.id);
    },
  };

  return (
    <group ref={group} position={meta.pos}>
      <GlowSprite color={hexToRgba(meta.color, 0.55)} scale={6.5} opacity={faded ? 0.1 : hover && phase === "universe" ? 0.5 : 0.28} />
      <mesh ref={ring} {...handlers}>
        <torusGeometry args={[2.15, 0.035, 10, 72]} />
        <meshBasicMaterial color={meta.color} transparent opacity={hover && phase === "universe" ? 0.95 : faded ? 0.12 : 0.4} />
      </mesh>
      <mesh visible={false} {...handlers}>
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
