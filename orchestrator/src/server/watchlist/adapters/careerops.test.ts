import { describe, expect, it } from "vitest";
import { careerOpsWatchlistAdapters } from "./careerops";

describe("CareerOps Watchlist adapters", () => {
  it("registers the seven US ATS source types", () => {
    expect(careerOpsWatchlistAdapters.map((adapter) => adapter.sourceType)).toEqual([
      "ashby",
      "lever",
      "smartrecruiters",
      "icims",
      "workable",
      "teamtailor",
      "jobvite",
      "eightfold",
      "oraclecloud",
      "phenom",
      "avature",
      "radancy",
      "successfactors",
      "jibeapply",
      "pinpoint",
      "recruitee",
      "rippling",
      "comeet",
      "collage",
      "cornerstone",
    ]);
  });

  it("supports canonical custom selections", async () => {
    const ashby = careerOpsWatchlistAdapters[0];
    await expect(ashby.normalizeCustomSelection({
      label: "Acme",
      careersUrl: "https://jobs.ashbyhq.com/acme/",
    })).resolves.toEqual({
      label: "Acme",
      careersUrl: "https://jobs.ashbyhq.com/acme",
    });
  });
});
