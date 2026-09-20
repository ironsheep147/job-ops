import type { ExtractorManifest } from "@shared/types/extractors";
import { runHackernews } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "hackernews",
  displayName: "Hacker News Who Is Hiring",
  providesSources: ["hackernews"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { hackernews: { supportedCountryKeys: null } },
  run: runHackernews,
};

export default manifest;
