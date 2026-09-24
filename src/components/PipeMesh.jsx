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

function Cap({ L, W, D, isMetal, chimney }) {
  // Stopped cap; a Rohrflöte adds a small open tube (chimney) through the cap.
  const capMat = { color: '#9c8266', roughness: 0.6, metalness: 0.1 };
  if (isMetal) {
    const R = W / 2;
    return (
      <group>
        <mesh position={[0, L + 0.006, 0]}>
          <cylinderGeometry args={[R * 1.08, R * 1.08, 0.012, 32]} />
          <meshStandardMaterial {...capMat} />
        </mesh>
        {chimney > 0.002 && (
          <mesh position={[0, L + 0.006 + chimney / 2, 0]}>
            <cylinderGeometry args={[R * 0.3, R * 0.3, chimney, 24, 1, true]} />
            <meshStandardMaterial color="#b39666" roughness={0.5} metalness={0.3} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    );
  }
  return (
    <group>
      <mesh position={[0, L + 0.006, 0]}>
        <boxGeometry args={[W * 1.08, 0.012, D * 1.08]} />
        <meshStandardMaterial {...capMat} />
      </mesh>
      {chimney > 0.002 && (
        <mesh position={[0, L + 0.006 + chimney / 2, 0]}>
          <cylinderGeometry args={[Math.min(W, D) * 0.22, Math.min(W, D) * 0.22, chimney, 20, 1, true]} />
          <meshStandardMaterial color="#b39666" roughness={0.5} metalness={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function MetalPipe({ L, W, E, cutaway, mats, stopped, chimney }) {
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
      {stopped && <Cap L={L} W={W} D={W} isMetal chimney={chimney} />}
    </group>
  );
}

function WoodPipe({ L, W, D, E, wt, cutaway, mats, stopped, chimney }) {
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
      {stopped && <Cap L={L} W={W} D={D} isMetal={false} chimney={chimney} />}
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

function ReedBlock({ W, D, playing, fs, shallot }) {
  const tongueRef = useRef();
  useFrame((state) => {
    if (!tongueRef.current) return;
    const t = state.clock.elapsedTime;
    if (playing) {
      tongueRef.current.rotation.x = 0.18 + Math.sin(t * Math.PI * 2 * Math.min(fs, 90) * 0.11) * 0.06;
    } else {
      tongueRef.current.rotation.x = 0.18;
    }
  });
  const bootH = Math.max(0.06, D * 1.1);
  const shallotColor = shallot === 'closed' ? '#c9a45e' : '#e0b96a';
  return (
    <group>
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[W * 0.94, 0.02, D * 0.92]} />
        <meshStandardMaterial color="#b39666" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, bootH / 2 - 0.02, 0]}>
        <cylinderGeometry args={[W * 0.62, W * 0.62, bootH, 24, 1, true]} />
        <meshStandardMaterial color={shallotColor} metalness={0.8} roughness={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={tongueRef} position={[0, 0.004, D * 0.1]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[W * 0.5, 0.0015, 0.014]} />
        <meshStandardMaterial color="#e8c86a" metalness={0.9} roughness={0.25} emissive="#3a2f10" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

export default function PipeMesh({ params, cutaway, playing, response }) {
  const { length: L, width: W, depth: D, cutup: E, flueGap: g, wallThickness: wt, material, type, stopped, chimney, shallot } = params;
  const mats = useMaterials(material);
  const isReed = type === 'reed';

  return (
    <group position={[0, -L / 2, 0]}>
      <Foot W={W} mats={mats} />
      {isReed ? (
        <group>
          <MetalPipe L={L} W={W} E={0.01} cutaway={cutaway} mats={mats} stopped={stopped} chimney={chimney} />
          <ReedBlock W={W} D={D} playing={playing} fs={response ? response.fs : 260} shallot={shallot} />
        </group>
      ) : material === 'metal' ? (
        <MetalPipe L={L} W={W} E={E} cutaway={cutaway} mats={mats} stopped={stopped} chimney={chimney} />
      ) : (
        <WoodPipe L={L} W={W} D={D} E={E} wt={wt} cutaway={cutaway} mats={mats} stopped={stopped} chimney={chimney} />
      )}
      {!isReed && <Languid W={W} D={D} g={g} />}
    </group>
  );
}
