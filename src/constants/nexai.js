// Single authoritative content source for NexAI, one of Harsh's ongoing
// research projects. Per an explicit content/privacy decision, no
// implementation, architecture, or research detail is published anywhere
// in the portfolio while the project is still under development — every
// user-facing surface (desktop, Finder, Get Info, Quick Look, Spotlight,
// the window itself) shows only this same neutral placeholder copy.
export const NEXAI = {
  id: "nexai",
  name: "NexAI",
  body: "Product under development.",
  supportingLine: "More details will be shared when the project is ready.",
};

export function getNexAI() {
  return NEXAI;
}
