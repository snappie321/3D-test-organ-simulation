import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useMemo } from 'react';
import PipeMesh from './PipeMesh.jsx';
import AirParticles from './AirParticles.jsx';
import { computeResponse } from '../physics/pipePhysics.js';
import { useStore } from '../store.js';

export default function Scene() {
  const params = useStore((s) => s.params);
  const cutaway = useStore((s) => s.cutaway);
  const playing = useStore((s) => s.playing);
  const response = useMemo(() => computeResponse(params), [params]);
  const camDist = Math.max(0.9, params.length * 1.4);

  return (
    <Canvas
      shadows
      camera={{ position: [camDist * 0.8, camDist * 0.4, camDist * 0.9], fov: 42 }}
    >
      <color attach="background" args={['#10141c']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 5, 3]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} color="#88aaff" />
      <PipeMesh params={params} cutaway={cutaway} />
      {playing && <AirParticles params={params} response={response} playing={playing} />}
      <Grid
        args={[10, 10]}
        position={[0, -params.length / 2 - 0.13, 0]}
        cellSize={0.1}
        cellThickness={0.6}
        sectionSize={0.5}
        sectionThickness={1.2}
        cellColor="#2a3242"
        sectionColor="#3d4a63"
        fadeDistance={12}
        infiniteGrid
      />
      <OrbitControls
        target={[0, 0, 0]}
        minDistance={0.25}
        maxDistance={6}
        enableDamping
      />
    </Canvas>
  );
}
