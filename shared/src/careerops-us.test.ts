import { describe, expect, it } from "vitest";
import { matchLocationIntent } from "./location-domain";
import { EXTRACTOR_SOURCE_IDS } from "./extractors";

describe("CareerOps US source registration", () => {
  it("registers the three board-wide sources", () => {
    expect(EXTRACTOR_SOURCE_IDS).toEqual(expect.arrayContaining(["builtin", "themuse", "hackernews"]));
  });

  it("keeps restricted remote roles out of balanced US matching", () => {
    const intent = {
      selectedCountry: "united states",
      workplaceTypes: ["remote" as const],
      geoScope: "selected_plus_remote_worldwide" as const,
      matchStrictness: "exact_only" as const,
    };
    expect(matchLocationIntent(intent, {
      location: "Remote - Canada",
      isRemote: true,
      remoteScope: "restricted",
    }).matched).toBe(false);
    expect(matchLocationIntent(intent, {
      location: "Remote",
      isRemote: true,
      remoteScope: "unspecified",
    }).matched).toBe(true);
  });
});
