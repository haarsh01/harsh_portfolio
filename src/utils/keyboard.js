const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

// Shared guard so Quick Look, the app switcher, and Mission Control all
// agree on what counts as "the user is typing" before hijacking a shortcut.
export function isEditableTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  return EDITABLE_TAGS.has(target.tagName);
}
