import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Visualises the air: a flue sheet jet from the slit to the cut-up lip,
// part of the jet escaping through the mouth, and a standing-wave shimmer
// inside the resonator while the pipe speaks.

const N_JET = 240;
const N_INTERIOR = 260;
const N_ESCAPE = 110;
const N_FOOT = 90;

function makeSeeds(n) {
  return Array.from({ length: n }, (_, i) => ({
    phase: Math.random(),
    speed: 0.6 + Math.random() * 0.8,
    lane: Math.random() * 2 - 1,
    branch: Math.random() < 0.45,
    seed: Math.random() * Math.PI * 2,
  }));
}

export default function AirParticles({ params, response, playing }) {
  const { width: W, depth: D, cutup: E, length: L, flueGap: g } = params;

  const total = N_JET + N_INTERIOR + N_ESCAPE + N_FOOT;
  const seeds = useMemo(
    () => ({
      jet: makeSeeds(N_JET),
      interior: makeSeeds(N_INTERIOR),
      escape: makeSeeds(N_ESCAPE),
      foot: makeSeeds(N_FOOT),
    }),
    []
  );

  const { positions, geometry, material } = useMemo(() => {
    const positions = new Float32Array(total * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: '#bfe3ff',
      size: 0.006,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { positions, geometry, material };
  }, [total]);

  const groupRef = useRef(null);

  useFrame((state, delta) => {
    if (!playing) {
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    if (groupRef.current) groupRef.current.visible = true;

    const t = state.clock.elapsedTime;
    const fs = response.fs;
    const wave = 1.1 + Math.min(2.2, fs / 260); // slowed visual rate of the standing wave
    const sway = 0.004 + Math.min(0.01, g * 3);
    let idx = 0;
    const pos = positions;

    const put = (x, y, z) => {
      pos[idx++] = x;
      pos[idx++] = y;
      pos[idx++] = z;
    };

    // Foot stream: rising from the foot inlet toward the flue slit.
    for (const s of seeds.foot) {
      const p = (s.phase + t * (0.25 * s.speed)) % 1;
      const y = -0.12 + p * 0.12;
      const r = (1 - p) * 0.012 + 0.002;
      put(s.lane * r, y, s.seed % 0.004);
    }

    // Flue jet: sheet from the slit up to the cut-up lip, wavering at the acoustic rate.
    for (const s of seeds.jet) {
      const p = (s.phase + t * (0.55 * s.speed * (0.5 + response.v / 60))) % 1;
      const y = 0.004 + p * E;
      const x = s.lane * W * 0.42;
      const zOff = Math.sin(p * Math.PI * 2.2 + t * wave * 2 + s.seed) * sway * (0.3 + p);
      put(x, y, D / 2 - 0.004 + zOff);
    }

    // Interior: standing-wave shimmer of the resonating air column.
    const amp = 0.1 + 0.5 * Math.min(1, response.drive);
    for (const s of seeds.interior) {
      const u = s.phase;
      const y = u * L;
      const nodeAmp = Math.sin(Math.PI * u);
      const yOff = nodeAmp * amp * 0.03 * Math.sin(t * wave * 2 + s.seed);
      const x = s.lane * W * 0.32 + yOff;
      const z = (s.seed % 1 - 0.5) * D * 0.6;
      put(x, y, z);
    }

    // Escape: the fraction of jet air that spills out of the mouth.
    for (const s of seeds.escape) {
      const p = (s.phase + t * 0.35 * s.speed) % 1;
      const y = E + p * 0.09;
      const z = D / 2 + 0.01 + p * 0.05 + Math.sin(t * wave + s.seed) * 0.008;
      const x = s.lane * W * 0.4 * (1 + p * 0.8);
      put(x, y, z);
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group ref={groupRef} position={[0, -L / 2, 0]} visible={false}>
      <points geometry={geometry} material={material} />
    </group>
  );
}
