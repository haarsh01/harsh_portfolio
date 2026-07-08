// Single authoritative content source for NexAI, the flagship research
// project referenced in the About biography (src/constants/about.js) and
// presented at the NSERC Industry Advisory Board Meeting 2026
// (src/constants/talks.js, id "nserc-industry-advisory-board-2026").
//
// Every sentence below either quotes those two already-verified sources
// directly or uses the evidence/decision vocabulary Harsh has already used
// to describe the framework publicly. Nothing here introduces a metric, a
// benchmark score, a client, a collaborator beyond what the talk already
// names, or an implementation detail the talk itself declined to share —
// see `confidentialityNote`.
//
// No entry in src/constants/publications.js is actually about image
// authenticity — `relatedPublicationIds` is deliberately left empty rather
// than manufacture a connection that doesn't exist yet.
import { ABOUT_CONTENT } from "./about.js";

export const NEXAI = {
  id: "nexai",
  name: "NexAI",
  windowTitle: "NexAI — Image Authenticity Research",
  eyebrow: "Research project",
  shortDescription:
    "An evidence-driven framework for investigating whether an image is human-captured, AI-generated, or manipulated.",
  researchQuestion:
    "Can an image be trusted — and what evidence would make that judgment understandable to the person relying on it?",
  // The first paragraph is the talk's own framing of the problem; the
  // second is About's own sentence, quoted rather than paraphrased.
  whyItMatters: [
    "A single model prediction doesn't explain itself, and on its own it isn't enough to support a decision people actually need to trust.",
    ABOUT_CONTENT.intro[1],
  ],
  evidenceCategories: [
    { id: "visual-patterns", label: "Visual patterns", description: "Low-level and structural signals present in the image itself." },
    { id: "forensic-traces", label: "Forensic traces", description: "Artifacts a capture device, an editing tool, or a generative model tends to leave behind." },
    { id: "metadata", label: "Metadata", description: "What the file itself claims about its own origin and history." },
    { id: "provenance", label: "Provenance", description: "Where an image came from and how it has moved before reaching this decision." },
    { id: "transformation-behaviour", label: "Transformation behaviour", description: "How an image responds to controlled transformations — a signal genuine and generated images don't always share." },
    { id: "calibrated-uncertainty", label: "Calibrated uncertainty", description: "How confident the framework actually is, and honest about it when it isn't." },
  ],
  decisionStates: [
    { id: "human-captured", label: "Human-captured" },
    { id: "ai-generated", label: "AI-generated" },
    { id: "manipulated", label: "Manipulated" },
    { id: "unknown", label: "Unknown or uncertain" },
  ],
  researchAreas: ["Trustworthy AI", "Cybersecurity", "Machine learning", "Image forensics", "Human-centered decision systems"],
  status:
    "Ongoing research, developed in collaboration with Nextria Inc. through Dalhousie University's NSERC CREATE Cybersecurity Program.",
  confidentialityNote:
    "This overview describes the problem NexAI addresses and how it reasons about evidence — consistent with how the project has been presented publicly. Implementation-specific and model-architecture details are intentionally not published here.",
  relatedTalkIds: ["nserc-industry-advisory-board-2026"],
  relatedPublicationIds: [],
};

export function getNexAI() {
  return NEXAI;
}
