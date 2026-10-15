import { useState } from "react";
import AddLayerMenu from "./AddLayerMenu";
import { LAYER_TYPES } from "../state/projectFactory";

export default function LayersPanel({
  layers,
  selectedLayerId,
  onSelect,
  onRename,
  onToggleVisible,
  onMove,
  onDelete,
  onAdd,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");

  // The array is ordered back -> front. The panel shows front-most layers on top.
  const topFirst = [...layers].reverse();

  const startRename = (layer) => {
    setEditingId(layer.id);
    setDraftName(layer.name);
  };

  const commitRename = () => {
    if (editingId) onRename(editingId, draftName);
    setEditingId(null);
  };

  return (
    <aside className="layers panel" aria-label="Layers">
      <h2>Layers</h2>

      {layers.length === 0 && <p className="empty">No layers yet. Add one below.</p>}

      <ul className="layer-list" role="listbox" aria-label="Layer list">
        {topFirst.map((layer, visualIndex) => {
          const selected = layer.id === selectedLayerId;
          const isFront = visualIndex === 0;
          const isBack = visualIndex === topFirst.length - 1;

          return (
            <li
              key={layer.id}
              role="option"
              aria-selected={selected}
              tabIndex={0}
              className={`layer-row ${selected ? "selected" : ""} ${layer.visible ? "" : "is-hidden"}`}
              onClick={() => onSelect(layer.id)}
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && e.key === "Enter") onSelect(layer.id);
              }}
            >
              <span className="layer-icon" title={LAYER_TYPES[layer.type].label}>
                {LAYER_TYPES[layer.type].icon}
              </span>

              {editingId === layer.id ? (
                <input
                  className="rename-input"
                  autoFocus
                  value={draftName}
                  aria-label="Layer name"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") {
                      e.stopPropagation();
                      setEditingId(null);
                    }
                  }}
                />
              ) : (
                <span
                  className="layer-name"
                  title="Double-click to rename"
                  onDoubleClick={() => startRename(layer)}
                >
                  {layer.name}
                </span>
              )}

              <span className="layer-actions">
                <button
                  className="icon-btn"
                  aria-label={`Move ${layer.name} forward`}
                  title="Move up (toward front)"
                  disabled={isFront}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(layer.id, 1);
                  }}
                >
                  ↑
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Move ${layer.name} backward`}
                  title="Move down (toward back)"
                  disabled={isBack}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(layer.id, -1);
                  }}
                >
                  ↓
                </button>
                <button
                  className="icon-btn"
                  aria-label={layer.visible ? `Hide ${layer.name}` : `Show ${layer.name}`}
                  aria-pressed={layer.visible}
                  title={layer.visible ? "Hide layer" : "Show layer"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisible(layer.id);
                  }}
                >
                  {layer.visible ? "👁" : "⊘"}
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="panel-footer">
        <AddLayerMenu onAdd={onAdd} label="+ Add layer" direction="up" />
        <button className="danger" disabled={!selectedLayerId} onClick={onDelete}>
          Delete layer
        </button>
      </div>
    </aside>
  );
}