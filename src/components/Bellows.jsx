import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store.js';

// Wedge bellows with two hinged boards feeding the pipe foot through a windline.
// The top board breathes at the tremulant rate/depth while wind is on.

export default function Bellows({ footY }) {
  const playing = useStore((s) => s.playing);
  const params = useStore((s) => s.params);
  const { tremulantRate: rate, tremulantDepth: depth } = params;

  const topRef = useRef(null);
  const bagRef = useRef(null);
  const tRef = useRef(0);

  useFrame((_, delta) => {
    tRef.current += delta;
    const t = tRef.current;
    const breath = playing ? 1 : 0;
    const trem = playing && depth > 0.01 && rate > 0.01 ? depth * Math.sin(t * Math.PI * 2 * rate) : 0;
    const open = 0.25 * breath + 0.12 * trem + 0.02;
    if (topRef.current) topRef.current.rotation.x = -open;
    if (bagRef.current) bagRef.current.scale.y = Math.max(0.35, 1 - open * 0.5);
  });

  const leather = { color: '#8a6a4a', roughness: 0.85 };
  const woodMat = { color: '#6b5236', roughness: 0.75 };

  return (
    <group position={[0.42, footY - 0.13, 0]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.34, 0.015, 0.22]} />
        <meshStandardMaterial {...woodMat} />
      </mesh>
      <mesh ref={bagRef} position={[0, 0.05, 0]}>
        <boxGeometry args={[0.32, 0.09, 0.20]} />
        <meshStandardMaterial {...leather} />
      </mesh>
      <group ref={topRef} position={[0, 0.1, -0.11]}>
        <mesh position={[0, 0, 0.11]}>
          <boxGeometry args={[0.34, 0.015, 0.22]} />
          <meshStandardMaterial {...woodMat} />
        </mesh>
      </group>
      <mesh position={[-0.26, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 0.26, 16]} />
        <meshStandardMaterial color="#9c8266" roughness={0.7} />
      </mesh>
      {rate > 0.01 && depth > 0.01 && (
        <mesh position={[0, 0.24, 0]}>
          <sphereGeometry args={[0.02, 16, 16]} />
          <meshStandardMaterial color="#d88f3a" emissive="#d88f3a" emissiveIntensity={0.6} />
        </mesh>
      )}
    </group>
  );
}
