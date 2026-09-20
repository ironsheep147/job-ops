import type { ExtractorManifest } from "@shared/types/extractors";
import { runWeworkremotely } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "weworkremotely",
  displayName: "We Work Remotely",
  providesSources: ["weworkremotely"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { weworkremotely: { supportedCountryKeys: null } },
  run: runWeworkremotely,
};

export default manifest;
