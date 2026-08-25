import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { useStore, WORLDS, REDUCED_MOTION, V3 } from "../store";
import { WorldNodes } from "./WorldNodes";
import { Mechanics3D } from "./Mechanics3D";
import { Space3D } from "./Space3D";

const texCache = new Map<string, THREE.CanvasTexture>();
export function glowTexture(rgba: string): THREE.CanvasTexture {
  const hit = texCache.get(rgba);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, rgba);
  grad.addColorStop(0.4, rgba.replace(/[\d.]+\)$/, "0.28)"));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  texCache.set(rgba, t);
  return t;
}

export function GlowSprite(props: { color: string; scale: number; opacity?: number; position?: V3 }) {
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: glowTexture(props.color), transparent: true, opacity: props.opacity ?? 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
    [props.color, props.opacity]
  );
  return <sprite position={props.position || [0, 0, 0]} scale={props.scale} material={mat} />;
}

function CameraRig() {
  const cam = useStore((s) => s.cam);
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  const flight = useRef<{ t: number; dur: number; p0: THREE.Vector3; l0: THREE.Vector3; p1: THREE.Vector3; l1: THREE.Vector3 } | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      camera.position.set(...cam.pos);
      controls.current?.target.set(...cam.look);
      controls.current?.update();
      first.current = false;
      return;
    }
    flight.current = {
      t: 0,
      dur: REDUCED_MOTION ? 0.05 : 2.1,
      p0: camera.position.clone(),
      l0: controls.current ? controls.current.target.clone() : new THREE.Vector3(),
      p1: new THREE.Vector3(...cam.pos),
      l1: new THREE.Vector3(...cam.look),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.id]);

  useFrame((_, dt) => {
    const f = flight.current;
    if (!f) return;
    f.t += dt / f.dur;
    const x = Math.min(1, f.t);
    const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    camera.position.lerpVectors(f.p0, f.p1, e);
    if (controls.current) {
      controls.current.target.lerpVectors(f.l0, f.l1, e);
      controls.current.update();
    }
    if (f.t >= 1) flight.current = null;
  });

  const phase = useStore((s) => s.phase);
  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={55}
      maxPolarAngle={Math.PI * 0.66}
      autoRotate={phase !== "world" && !REDUCED_MOTION}
      autoRotateSpeed={phase === "landing" ? 0.25 : 0.4}
    />
  );
}

function DriftParticles() {
  const quality = useStore((s) => s.quality);
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = quality === "low" ? 160 : 420;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 14 + Math.random() * 34;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 22;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [quality]);
  useFrame((state) => {
    if (ref.current && !REDUCED_MOTION) ref.current.rotation.y = state.clock.elapsedTime * 0.012;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#6fd8ff" size={0.09} transparent opacity={0.5} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function DistantPlanets() {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ref.current && !REDUCED_MOTION) ref.current.rotation.y = state.clock.elapsedTime * 0.01;
  });
  return (
    <group ref={ref}>
      <group position={[-30, 7, -38]}>
        <mesh><sphereGeometry args={[4.2, 32, 32]} /><meshStandardMaterial color="#1e3f6e" roughness={0.8} metalness={0.1} emissive="#0a1c38" emissiveIntensity={0.6} /></mesh>
        <mesh rotation={[0.5, 0, 0.25]}><torusGeometry args={[6.4, 0.28, 8, 64]} /><meshStandardMaterial color="#3d6aa8" transparent opacity={0.4} roughness={0.6} /></mesh>
        <GlowSprite color="rgba(70,130,220,0.5)" scale={16} opacity={0.35} />
      </group>
      <group position={[36, -4, -46]}>
        <mesh><sphereGeometry args={[2.6, 28, 28]} /><meshStandardMaterial color="#7a4526" roughness={0.9} emissive="#2a1508" emissiveIntensity={0.7} /></mesh>
        <GlowSprite color="rgba(220,130,70,0.45)" scale={10} opacity={0.3} />
      </group>
      <group position={[20, 12, -52]}>
        <mesh><sphereGeometry args={[1.5, 24, 24]} /><meshStandardMaterial color="#39f0c3" roughness={0.4} emissive="#0d4d3c" emissiveIntensity={0.9} /></mesh>
      </group>
    </group>
  );
}

function Nebulae() {
  const quality = useStore((s) => s.quality);
  if (quality === "low") return null;
  return (
    <>
      <GlowSprite color="rgba(38,96,170,0.55)" scale={85} opacity={0.16} position={[-28, 12, -60]} />
      <GlowSprite color="rgba(24,150,130,0.5)" scale={70} opacity={0.13} position={[34, -8, -55]} />
      <GlowSprite color="rgba(160,100,45,0.45)" scale={55} opacity={0.11} position={[4, 20, -70]} />
      <GlowSprite color="rgba(90,60,160,0.4)" scale={60} opacity={0.1} position={[-14, -16, -65]} />
    </>
  );
}

function WorldAmbience() {
  const world = useStore((s) => s.world);
  const meta = WORLDS.find((w) => w.id === world)!;
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const n = 220;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = 5 + Math.random() * 12;
      const a = Math.random() * Math.PI * 2;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 2] = Math.sin(a) * r - 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame((state) => {
    if (ref.current && !REDUCED_MOTION) ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });
  return (
    <group>
      <GlowSprite color={hexToRgba(meta.color, 0.5)} scale={34} opacity={0.14} position={[0, 0, -10]} />
      <points ref={ref} geometry={geo}>
        <pointsMaterial color={meta.color} size={0.07} transparent opacity={0.55} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

function hexToRgba(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function SceneContents() {
  const phase = useStore((s) => s.phase);
  const world = useStore((s) => s.world);
  return (
    <>
      {(phase === "universe" || phase === "landing" || phase === "world") && <WorldNodes faded={phase === "world"} />}
      {phase === "world" && world === "mechanics" && <Mechanics3D />}
      {phase === "world" && world === "space" && <Space3D />}
      {phase === "world" && world !== "mechanics" && world !== "space" && <WorldAmbience />}
    </>
  );
}

export default function PhysicsCanvas() {
  const quality = useStore((s) => s.quality);
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        dpr={quality === "low" ? [1, 1.5] : [1, 2]}
        camera={{ fov: 55, near: 0.1, far: 500, position: [0, 2.5, 44] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor("#04060d")}
      >
        <fogExp2 attach="fog" args={["#04060d", 0.011]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[12, 18, 10]} intensity={1.15} color="#cfe4ff" />
        <pointLight position={[0, 4, 0]} intensity={0.7} color="#53e8ff" distance={40} />
        <Stars radius={150} depth={70} count={quality === "low" ? 2200 : 4600} factor={4} saturation={0} fade speed={REDUCED_MOTION ? 0 : 0.7} />
        <Nebulae />
        <DriftParticles />
        <DistantPlanets />
        <CameraRig />
        <SceneContents />
      </Canvas>
    </div>
  );
}
