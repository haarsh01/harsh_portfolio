// Registry of available desktop widget TYPES (metadata only — the actual
// content each widget shows is resolved from real portfolio data at render
// time in components/DesktopWidgets.jsx, never invented here).
import { User, Compass, Cpu, FolderGit2, Image as ImageIcon, Music, History, Mail } from "lucide-react";

export const WIDGET_SIZES = ["small", "medium", "large"];

export const WIDGET_DIMENSIONS = {
  small: { width: 168, height: 168 },
  medium: { width: 232, height: 208 },
  large: { width: 288, height: 264 },
};

export const WIDGET_TYPES = [
  { type: "about", label: "About Harsh", icon: User, defaultSize: "medium" },
  { type: "focus", label: "Current Focus", icon: Compass, defaultSize: "small" },
  { type: "skills", label: "Skills", icon: Cpu, defaultSize: "medium" },
  { type: "project", label: "Featured Project", icon: FolderGit2, defaultSize: "large" },
  { type: "photo", label: "Photo", icon: ImageIcon, defaultSize: "medium" },
  { type: "spotify", label: "Spotify Playlist", icon: Music, defaultSize: "medium" },
  { type: "journey", label: "Journey", icon: History, defaultSize: "medium" },
  { type: "contact", label: "Contact", icon: Mail, defaultSize: "small" },
];

export const WIDGET_TYPE_IDS = WIDGET_TYPES.map((w) => w.type);

export function getWidgetTypeMeta(type) {
  return WIDGET_TYPES.find((w) => w.type === type) ?? null;
}
