import Scene from './components/Scene.jsx';
import ControlPanel from './components/ControlPanel.jsx';

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>Organ Pipe Simulator</h1>
        <span className="tagline">
          Labial pipe · physics-based air model · single pipe for now
        </span>
      </header>
      <div className="main">
        <Scene />
        <ControlPanel />
      </div>
    </div>
  );
}
