import { validateProject } from "../engine/projectValidation";

const AUTOSAVE_KEY = "motion-studio:autosave";

function slugify(name) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "untitled-project";
}

export function downloadProject(project) {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(project.name)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// Resolves to { ok: true, project } or { ok: false, error }. Never throws.
export async function readProjectFile(file) {
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  return validateProject(data);
}

export function saveAutosave(project) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(project));
  } catch {
    /* storage full or unavailable: autosave is best-effort */
  }
}

// Returns a validated project, or null if there's nothing usable stored.
export function loadAutosave() {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const result = validateProject(JSON.parse(raw));
    return result.ok ? result.project : null;
  } catch {
    return null;
  }
}