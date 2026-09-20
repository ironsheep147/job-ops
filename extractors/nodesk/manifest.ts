import type { ExtractorManifest } from "@shared/types/extractors";
import { runNodesk } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "nodesk",
  displayName: "NoDesk",
  providesSources: ["nodesk"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { nodesk: { supportedCountryKeys: null } },
  run: runNodesk,
};

export default manifest;
