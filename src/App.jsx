import { useState } from "react";
import Canvas from "./components/Canvas";
import LayersPanel from "./components/LayersPanel";
import PropertiesPanel from "./components/PropertiesPanel";
import { initialLayers } from "./data/initialLayers";

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