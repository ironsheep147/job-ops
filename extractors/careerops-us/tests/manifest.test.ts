import { describe, expect, it } from "vitest";
import manifest from "../manifest";

describe("CareerOps US extractor manifest", () => {
  it("provides the board-wide US sources", () => {
    expect(manifest.providesSources).toEqual(["builtin", "themuse", "hackernews"]);
  });
});
