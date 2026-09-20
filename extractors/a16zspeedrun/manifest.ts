import type { ExtractorManifest } from "@shared/types/extractors";
import { runA16zspeedrun } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "a16zspeedrun",
  displayName: "a16z Speedrun Talent Network",
  providesSources: ["a16zspeedrun"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { a16zspeedrun: { supportedCountryKeys: null } },
  run: runA16zspeedrun,
};

export default manifest;
