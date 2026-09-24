import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import { useMemo } from 'react';
import PipeMesh from './PipeMesh.jsx';
import AirParticles from './AirParticles.jsx';
import Bellows from './Bellows.jsx';
import { computeResponse, rankResponses, RANK_OFFSETS } from '../physics/pipePhysics.js';
import { useStore } from '../store.js';

const RANK_X = (i) => (i === 0 ? 0 : (i % 2 === 1 ? 1 : -1) * (0.14 + 0.06 * Math.floor(i / 2)));

export default function Scene() {
  const params = useStore((s) => s.params);
  const cutaway = useStore((s) => s.cutaway);
  const playing = useStore((s) => s.playing);
  const responses = useMemo(() => rankResponses(params), [params]);
  const response = responses[0];
  const nRanks = responses.length;
  const camDist = Math.max(1.1, params.length * 1.5);

  return (
    <div className="scene-host">
      <Canvas
        shadows
        camera={{ position: [camDist * 0.8, camDist * 0.45, camDist * 1.0], fov: 42 }}
      >
        <color attach="background" args={['#dfe7f3']} />
        <fog attach="fog" args={['#dfe7f3', 6, 14]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[2, 5, 3]} intensity={1.0} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.3} color="#b8cfff" />
        {responses.map((resp, i) => (
          <group key={i} position={[RANK_X(i), 0, 0]}>
            <PipeMesh params={params} cutaway={cutaway} playing={playing} response={resp} />
            {playing && (
              <AirParticles params={params} response={resp} playing={playing} />
            )}
          </group>
        ))}
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
        <OrbitControls
          target={[0, 0, 0]}
          minDistance={0.25}
          maxDistance={8 + nRanks}
          enableDamping
        />
      </Canvas>
    </div>
  );
}
