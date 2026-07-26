// Single authoritative content source for AuditLM, one of Harsh's ongoing
// projects. Same neutral-placeholder policy as NexAI (see
// src/constants/nexai.js) — no detail is published while it's still under
// development.
export const AUDITLM = {
  id: "auditlm",
  name: "AuditLM",
  body: "Product under development.",
  supportingLine: "More details will be shared when the project is ready.",
};

export function getAuditLM() {
  return AUDITLM;
}
