import { useMemo } from 'react';
import * as THREE from 'three';

// Builds the pipe geometry: foot, mouth (cut-up + flue slit) and resonator body.
// Metal pipes render as cylinders, wooden pipes as squared boxes.
// Vertical axis is Y; y = 0 is the top of the languid (mouth bottom), body runs 0..L.

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

function MetalPipe({ L, W, E, cutaway, mats }) {
  const R = W / 2;
  const showBackHalf = cutaway;
  const bodyArgs = showBackHalf
    ? [R, R, L - E, 48, 1, true, Math.PI / 2, Math.PI]
    : [R, R, L - E, 48, 1, true, 0, Math.PI * 2];
  const mouthArgs = showBackHalf
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
    </group>
  );
}

function WoodPipe({ L, W, D, E, wt, cutaway, mats }) {
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

export default function PipeMesh({ params, cutaway }) {
  const { length: L, width: W, depth: D, cutup: E, flueGap: g, wallThickness: wt, material } = params;
  const mats = useMaterials(material);
  const isMetal = material === 'metal';

  return (
    <group position={[0, -L / 2, 0]}>
      <Foot W={W} mats={mats} />
      {isMetal ? (
        <MetalPipe L={L} W={W} E={E} cutaway={cutaway} mats={mats} />
      ) : (
        <WoodPipe L={L} W={W} D={D} E={E} wt={wt} cutaway={cutaway} mats={mats} />
      )}
      <Languid W={W} D={D} g={g} />
    </group>
  );
}
