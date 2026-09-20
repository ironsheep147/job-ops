import type { ExtractorManifest } from "@shared/types/extractors";
import { runRemoteok } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "remoteok",
  displayName: "Remote OK",
  providesSources: ["remoteok"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { remoteok: { supportedCountryKeys: null } },
  run: runRemoteok,
};

export default manifest;
