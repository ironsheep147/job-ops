import { describe, expect, it } from "vitest";
import manifest from "../manifest";

describe("CareerOps US extractor manifest", () => {
  it("provides the board-wide US sources", () => {
    expect(manifest.providesSources).toEqual(expect.arrayContaining([
      "builtin", "themuse", "hackernews", "remoteok", "remotive",
      "weworkremotely", "jobicy", "himalayas", "nodesk", "fourdayweek",
      "cryptocurrencyjobs", "pythonorg", "a16zspeedrun", "agenticjobs",
      "generalistworld",
    ]));
  });
});
