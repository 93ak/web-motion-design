import { useRef, useState } from "react";
import AddLayerMenu from "./AddLayerMenu";

function ProjectName({ name, onRename }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className="project-name-input"
        autoFocus
        value={value}
        aria-label="Project name"
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            e.stopPropagation();
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      className="project-name"
      title="Click to rename the project"
      onClick={() => {
        setValue(name);
        setEditing(true);
      }}
    >
      {name}
    </button>
  );
}

export default function Toolbar({
  projectName,
  isDirty,
  canUndo,
  canRedo,
  isPlaying,
  onRename,
  onAddLayer,
  onUndo,
  onRedo,
  onTogglePlay,
  onOpenSettings,
  onNew,
  onOpen,
  onSave,
  onExport,
}) {
  const fileInputRef = useRef(null);

  return (
    <header className="toolbar" role="toolbar" aria-label="Main toolbar">
      <div className="toolbar-group">
        <strong className="brand">Motion Studio</strong>
        <ProjectName name={projectName} onRename={onRename} />
        {isDirty && (
          <span className="dirty-dot" title="Unsaved changes" aria-label="Unsaved changes">
            ●
          </span>
        )}
      </div>

      <div className="toolbar-group">
        <AddLayerMenu onAdd={onAddLayer} label="+ Add Shape" />
      </div>

      <div className="toolbar-group">
        <button disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">
          ↶ Undo
        </button>
        <button disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Shift+Z)">
          ↷ Redo
        </button>
      </div>

      <div className="toolbar-group">
        <button className="primary" onClick={onTogglePlay} title="Play / pause (Space)">
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>

      <div className="toolbar-spacer" />

      <div className="toolbar-group">
        <button onClick={onOpenSettings}>⚙ Project Settings</button>
        <button onClick={onNew}>New</button>
        <button onClick={() => fileInputRef.current?.click()}>Open</button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow re-opening the same file
            if (file) onOpen(file);
          }}
        />
        <button onClick={onSave} title="Save Project (Ctrl+S)">
          Save
        </button>
        <button onClick={onExport}>Export JSON</button>
      </div>
    </header>
  );
}