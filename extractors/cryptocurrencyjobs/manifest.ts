import type { ExtractorManifest } from "@shared/types/extractors";
import { runCryptocurrencyjobs } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "cryptocurrencyjobs",
  displayName: "Cryptocurrency Jobs",
  providesSources: ["cryptocurrencyjobs"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { cryptocurrencyjobs: { supportedCountryKeys: null } },
  run: runCryptocurrencyjobs,
};

export default manifest;
