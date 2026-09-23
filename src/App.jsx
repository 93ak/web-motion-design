import { useState } from "react";
import Canvas from "./components/Canvas";
import LayersPanel from "./components/LayersPanel";
import PropertiesPanel from "./components/PropertiesPanel";
import { initialLayers } from "./data/initialLayers";
import { nextId } from "./utils/id";

import "./App.css";

function App() {
  const [layers, setLayers] = useState(initialLayers);
  const [selectedLayerId, setSelectedLayerId] = useState(initialLayers[0]?.id ?? null);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId) ?? null;

  const updateLayerProperty = (id, key, value) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, [key]: value } : layer
      )
    );
  };

  const addLayer = () => {
    const circleCount = layers.filter((l) => l.type === "circle").length + 1;
    const id = nextId();
    const newLayer = {
      id,
      name: `Circle ${circleCount}`,
      type: "circle",
      x: 100 + Math.random() * 450,
      y: 80 + Math.random() * 220,
      scale: 1,
      rotation: 0,
      opacity: 1,
      color: "hotpink",
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(id);
  };

  const deleteLayer = (id) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    setSelectedLayerId((prev) => (prev === id ? null : prev));
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Motion Studio</h1>
        <button>▶ Preview</button>
      </header>

      <main className="workspace">
        <LayersPanel
          layers={layers}
          selectedLayerId={selectedLayerId}
          onSelectLayer={setSelectedLayerId}
          onAddLayer={addLayer}
          onDeleteLayer={deleteLayer}
        />

        <section className="canvas-area">
          <Canvas layers={layers} />
        </section>

        <PropertiesPanel layer={selectedLayer} onChangeProperty={updateLayerProperty} />
      </main>

      <footer className="timeline">Timeline</footer>
    </div>
  );
}

export default App;