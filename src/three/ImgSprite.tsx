import { useEffect, useState } from "react";
import * as THREE from "three";
import { SPRITES } from "../sprites";

const texCache: Record<string, THREE.Texture> = {};

export function useSpriteTexture(name: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(texCache[name] ?? null);
  useEffect(() => {
    if (texCache[name]) { setTex(texCache[name]); return; }
    const url = SPRITES[name];
    if (!url) return;
    let alive = true;
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        texCache[name] = t;
        if (alive) setTex(t);
      },
      undefined,
      () => { /* asset unavailable — the 3D fallback mesh stays visible */ }
    );
    return () => { alive = false; };
  }, [name]);
  return tex;
}

/** Camera-facing object sprite for Three.js scenes. Renders nothing until the
    texture loads; pair it with a mesh core so the object is never invisible. */
export function ImgSprite(props: {
  name: string;
  size?: number;
  position?: [number, number, number];
  opacity?: number;
}) {
  const tex = useSpriteTexture(props.name);
  if (!tex) return null;
  const s = props.size ?? 1;
  return (
    <sprite position={props.position ?? [0, 0, 0]} scale={[s, s, 1]} renderOrder={5}>
      <spriteMaterial map={tex} transparent depthWrite={false} opacity={props.opacity ?? 1} />
    </sprite>
  );
}
