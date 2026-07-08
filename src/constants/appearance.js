// Restrained, predefined appearance choices — Control Center only ever lets
// visitors pick from these, never type arbitrary CSS/color values in.
export const ACCENT_COLORS = [
  { id: "blue", label: "Blue", value: "#2f6fed" },
  { id: "purple", label: "Purple", value: "#8b5cf6" },
  { id: "pink", label: "Pink", value: "#ec4899" },
  { id: "red", label: "Red", value: "#ef4444" },
  { id: "orange", label: "Orange", value: "#f97316" },
  { id: "yellow", label: "Yellow", value: "#eab308" },
  { id: "green", label: "Green", value: "#22c55e" },
  { id: "graphite", label: "Graphite", value: "#64748b" },
];

export const ACCENT_IDS = ACCENT_COLORS.map((accent) => accent.id);

export const APPEARANCE_MODES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "auto", label: "Automatic" },
];

export const APPEARANCE_MODE_IDS = APPEARANCE_MODES.map((mode) => mode.id);

export function getAccentColor(id) {
  return ACCENT_COLORS.find((accent) => accent.id === id) ?? ACCENT_COLORS[0];
}
