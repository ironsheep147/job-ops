import type { ExtractorManifest } from "@shared/types/extractors";
import { runBuiltin } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "builtin",
  displayName: "Built In",
  providesSources: ["builtin"],
  capabilities: { locationEvidence: true },
  locationCapabilities: {
    builtin: { supportedCountryKeys: ["united states"] },
  },
  run: runBuiltin,
};

export default manifest;
