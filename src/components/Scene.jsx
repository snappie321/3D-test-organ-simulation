import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useMemo } from 'react';
import PipeMesh from './PipeMesh.jsx';
import AirParticles from './AirParticles.jsx';
import Bellows from './Bellows.jsx';
import { computeResponse } from '../physics/pipePhysics.js';
import { useStore } from '../store.js';

export default function Scene() {
  const params = useStore((s) => s.params);
  const cutaway = useStore((s) => s.cutaway);
  const playing = useStore((s) => s.playing);
  const response = useMemo(() => computeResponse(params), [params]);
  const camDist = Math.max(0.9, params.length * 1.4);

  return (
    <div className="scene-host">
      <Canvas
        shadows
        camera={{ position: [camDist * 0.8, camDist * 0.4, camDist * 0.9], fov: 42 }}
      >
        <color attach="background" args={['#dfe7f3']} />
        <fog attach="fog" args={['#dfe7f3', 6, 14]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[2, 5, 3]} intensity={1.0} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#b8cfff" />
        <PipeMesh params={params} cutaway={cutaway} playing={playing} response={response} />
        {playing && <AirParticles params={params} response={response} playing={playing} />}
        <Bellows footY={-params.length / 2 - 0.13} />
        <Grid
          args={[10, 10]}
          position={[0, -params.length / 2 - 0.135, 0]}
          cellSize={0.1}
          cellThickness={0.6}
          sectionSize={0.5}
          sectionThickness={1.2}
          cellColor="#b9c6da"
          sectionColor="#8fa3c0"
          fadeDistance={12}
          infiniteGrid
        />
        <OrbitControls target={[0, 0, 0]} minDistance={0.25} maxDistance={6} enableDamping />
      </Canvas>
    </div>
  );
}
