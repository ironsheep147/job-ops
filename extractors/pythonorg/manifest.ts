import type { ExtractorManifest } from "@shared/types/extractors";
import { runPythonorg } from "./src/run-local";

export const manifest: ExtractorManifest = {
  id: "pythonorg",
  displayName: "Python.org Jobs",
  providesSources: ["pythonorg"],
  capabilities: { locationEvidence: true },
  locationCapabilities: { pythonorg: { supportedCountryKeys: null } },
  run: runPythonorg,
};

export default manifest;
