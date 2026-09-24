import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const MOUTH_HALF_ANGLE = 0.75;

function useMaterials(material) {
  return useMemo(() => {
    if (material === 'metal') {
      return {
        shell: new THREE.MeshStandardMaterial({
          color: '#d3ba7e',
          metalness: 0.85,
          roughness: 0.32,
          side: THREE.DoubleSide,
        }),
        foot: new THREE.MeshStandardMaterial({
          color: '#c4a96b',
          metalness: 0.8,
          roughness: 0.45,
        }),
      };
    }
    return {
      shell: new THREE.MeshStandardMaterial({
        color: '#8f6a45',
        metalness: 0.05,
        roughness: 0.75,
        side: THREE.DoubleSide,
      }),
      foot: new THREE.MeshStandardMaterial({
        color: '#7d5b3a',
        metalness: 0.05,
        roughness: 0.8,
      }),
    };
  }, [material]);
}

function MetalPipe({ L, W, E, cutaway, mats, stopped }) {
  const R = W / 2;
  const bodyArgs = cutaway
    ? [R, R, L - E, 48, 1, true, Math.PI / 2, Math.PI]
    : [R, R, L - E, 48, 1, true, 0, Math.PI * 2];
  const mouthArgs = cutaway
    ? [R, R, E, 48, 1, true, Math.PI / 2, Math.PI]
    : [R, R, E, 48, 1, true, MOUTH_HALF_ANGLE, Math.PI * 2 - 2 * MOUTH_HALF_ANGLE];
  return (
    <group>
      <mesh position={[0, E + (L - E) / 2, 0]}>
        <cylinderGeometry args={bodyArgs} />
        <primitive object={mats.shell} attach="material" />
      </mesh>
      <mesh position={[0, E / 2, 0]}>
        <cylinderGeometry args={mouthArgs} />
        <primitive object={mats.shell} attach="material" />
      </mesh>
      {stopped && (
        <mesh position={[0, L + 0.006, 0]}>
          <cylinderGeometry args={[R * 1.08, R * 1.08, 0.012, 32]} />
          <meshStandardMaterial color="#9c8266" roughness={0.6} metalness={0.1} />
        </mesh>
      )}
    </group>
  );
}

function WoodPipe({ L, W, D, E, wt, cutaway, mats, stopped }) {
  const mat = mats.shell;
  return (
    <group>
      <mesh position={[0, L / 2, -D / 2 + wt / 2]}>
        <boxGeometry args={[W, L, wt]} />
        <primitive object={mat} attach="material" />
      </mesh>
      <mesh position={[-W / 2 + wt / 2, L / 2, 0]}>
        <boxGeometry args={[wt, L, D]} />
        <primitive object={mat} attach="material" />
      </mesh>
      {!cutaway && (
        <>
          <mesh position={[W / 2 - wt / 2, L / 2, 0]}>
            <boxGeometry args={[wt, L, D]} />
            <primitive object={mat} attach="material" />
          </mesh>
          <mesh position={[0, E + (L - E) / 2, D / 2 - wt / 2]}>
            <boxGeometry args={[W, L - E, wt]} />
            <primitive object={mat} attach="material" />
          </mesh>
        </>
      )}
      {stopped && (
        <mesh position={[0, L + 0.006, 0]}>
          <boxGeometry args={[W * 1.08, 0.012, D * 1.08]} />
          <meshStandardMaterial color="#9c8266" roughness={0.6} metalness={0.1} />
        </mesh>
      )}
    </group>
  );
}

function Foot({ W, mats }) {
  const topR = W * 0.42;
  const botR = Math.max(W * 0.1, 0.008);
  const H = 0.12;
  return (
    <mesh position={[0, -H / 2, 0]}>
      <cylinderGeometry args={[topR, botR, H, 32]} />
      <primitive object={mats.foot} attach="material" />
    </mesh>
  );
}

function Languid({ W, D, g }) {
  const blockH = 0.02;
  return (
    <group>
      <mesh position={[0, -blockH / 2 - 0.01, -D * 0.02]} rotation={[0.34, 0, 0]}>
        <boxGeometry args={[W * 0.94, blockH, D * 0.92]} />
        <meshStandardMaterial color="#b39666" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.002, D / 2 - g / 2 - 0.002]}>
        <boxGeometry args={[W * 0.9, g, 0.008]} />
        <meshStandardMaterial color="#e8f4ff" emissive="#9fd0ff" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

// Reed (tongwerk) assembly: brass boot over the block, vibrating tongue + shallot.
function ReedBlock({ W, D, g, playing, rate, fs }) {
  const tongueRef = useRef();
  useFrame((state) => {
    if (tongueRef.current) {
      const t = state.clock.elapsedTime;
      const f = Math.min(fs, 90);
      const amp = playing ? 0.006 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2 * f * 0.11)) : 0;
      tongueRef.current.rotation.x = playing ? Math.sin(t * Math.PI * 2 * f * 0.11) * 0.06 : 0;
      tongueRef.current.position.y = 0.004 + amp * 0.5;
    }
  });
  const bootH = Math.max(0.06, D * 1.1);
  return (
    <group>
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[W * 0.94, 0.02, D * 0.92]} />
        <meshStandardMaterial color="#b39666" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, bootH / 2 - 0.02, 0]}>
        <cylinderGeometry args={[W * 0.62, W * 0.62, bootH, 24, 1, true]} />
        <meshStandardMaterial color="#c9a45e" metalness={0.8} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={tongueRef} position={[0, 0.004, D * 0.1]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[W * 0.5, 0.0015, 0.014]} />
        <meshStandardMaterial color="#e8c86a" metalness={0.9} roughness={0.25} emissive="#3a2f10" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export default function PipeMesh({ params, cutaway, playing, response }) {
  const { length: L, width: W, depth: D, cutup: E, flueGap: g, wallThickness: wt, material, type, stopped } = params;
  const mats = useMaterials(material);
  const isReed = type === 'reed';

  return (
    <group position={[0, -L / 2, 0]}>
      <Foot W={W} mats={mats} />
      {isReed ? (
        <group>
          <MetalPipe L={L} W={W} E={0.01} cutaway={cutaway} mats={mats} stopped={stopped} />
          <ReedBlock W={W} D={D} g={g} playing={playing} rate={params.tremulantRate} fs={response ? response.fs : 260} />
        </group>
      ) : material === 'metal' ? (
        <MetalPipe L={L} W={W} E={E} cutaway={cutaway} mats={mats} stopped={stopped} />
      ) : (
        <WoodPipe L={L} W={W} D={D} E={E} wt={wt} cutaway={cutaway} mats={mats} stopped={stopped} />
      )}
      {!isReed && <Languid W={W} D={D} g={g} />}
    </group>
  );
}
