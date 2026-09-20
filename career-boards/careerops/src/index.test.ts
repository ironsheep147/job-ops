import { describe, expect, it, vi } from "vitest";
import {
  type CareerOpsProvider,
  fetchCareerOpsListings,
  toWatchlistJob,
} from "./index";

const json = (value: unknown): Response =>
  Response.json(value, { status: 200 });

const htmlCard = (path: string, title: string): string =>
  `<div data-job-id="job-1"><h2>${title}</h2><a href="${path}">View job</a><div>Location: <span>Remote</span></div></div>`;

const genericPayload = {
  jobs: [
    {
      id: "job-1",
      title: "Platform Engineer",
      url: "https://jobs.example.test/job-1",
      location: "Remote",
      description: "Build a platform.",
    },
  ],
};

function responseFor(url: string): Response {
  if (url.includes("api.ashbyhq.com")) {
    return json({
      jobs: [
        {
          id: "ashby-1",
          title: "Ashby Engineer",
          jobUrl: "https://jobs.ashbyhq.com/acme/ashby-1",
          applyUrl: "https://jobs.ashbyhq.com/acme/ashby-1/application",
          location: "Remote",
          descriptionPlain: "Build the platform.",
        },
      ],
    });
  }
  if (url.includes("api.lever.co")) {
    return json([
      {
        id: "lever-1",
        text: "Lever Engineer",
        hostedUrl: "https://jobs.lever.co/acme/lever-1",
        applyUrl: "https://jobs.lever.co/acme/lever-1/apply",
        categories: { location: "Remote" },
        descriptionPlain: "Build the platform.",
      },
    ]);
  }
  if (url.includes("smartrecruiters.com/v1/companies/acme/postings/lever")) {
    return json({ jobAd: { applyUrl: "https://jobs.example.test/apply" } });
  }
  if (url.includes("smartrecruiters.com/v1/companies/acme/postings")) {
    return json({
      content: [
        {
          id: "smart-1",
          name: "SmartRecruiters Engineer",
          ref: "https://jobs.smartrecruiters.com/acme/smart-1",
          location: { fullLocation: "Remote" },
        },
      ],
    });
  }
  if (url.includes("icims.com/jobs/search")) {
    return new Response(
      htmlCard("/jobs/1/job/icims-engineer", "iCIMS Engineer"),
      {
        status: 200,
      },
    );
  }
  if (url.includes("apply.workable.com/api")) {
    return json({
      jobs: [
        {
          shortcode: "workable-1",
          title: "Workable Engineer",
          shortlink: "https://apply.workable.com/acme/j/workable-1/",
          city: "Remote",
          description: "Build the platform.",
        },
      ],
    });
  }
  if (url.includes("teamtailor.com/jobs.rss")) {
    return new Response(
      `<rss><item><title>Teamtailor Engineer</title><link>https://acme.teamtailor.com/jobs/1</link><tt:city>Remote</tt:city></item></rss>`,
      { status: 200 },
    );
  }
  if (url.includes("jobs.jobvite.com")) {
    return new Response('window.companyEId = "acme-eid";', { status: 200 });
  }
  if (url.includes("app.jobvite.com")) {
    return new Response(
      `<jobs><job><id>jobvite-1</id><title>Jobvite Engineer</title><detail-url>https://jobs.example.test/jobvite-1</detail-url><location>Remote</location></job></jobs>`,
      { status: 200 },
    );
  }
  if (url.includes("SearchJobs") || url.includes("search-jobs")) {
    return new Response(htmlCard("/jobs/1", "HTML Engineer"), { status: 200 });
  }
  if (url.includes("tile-search-results")) {
    return new Response(htmlCard("/job/1", "SuccessFactors Engineer"), {
      status: 200,
    });
  }
  return json(genericPayload);
}

const cases: Array<[CareerOpsProvider, string]> = [
  ["ashby", "https://jobs.ashbyhq.com/acme"],
  ["lever", "https://jobs.lever.co/acme"],
  ["smartrecruiters", "https://jobs.smartrecruiters.com/acme"],
  ["icims", "https://careers-acme.icims.com/jobs/search"],
  ["workable", "https://apply.workable.com/acme"],
  ["teamtailor", "https://acme.teamtailor.com/jobs"],
  ["jobvite", "https://jobs.jobvite.com/acme"],
  ["eightfold", "https://acme.eightfold.ai/jobs"],
  ["oraclecloud", "https://acme.fa.us2.oraclecloud.com/careers"],
  ["phenom", "https://careers.acme.example/"],
  ["avature", "https://acme.avature.net/careers"],
  ["radancy", "https://careers.acme.example/"],
  ["successfactors", "https://careers.acme.example/"],
  ["jibeapply", "https://acme.jibeapply.example/"],
  ["pinpoint", "https://acme.pinpointhq.com/jobs"],
  ["recruitee", "https://acme.recruitee.com/jobs"],
  ["rippling", "https://acme.ats.rippling.com/jobs"],
  ["comeet", "https://api.comeet.co/company/acme"],
  ["collage", "https://api.collage.co/v1/positions/acme"],
  ["cornerstone", "https://acme.csod.com/ux/ats/careersite/1/home"],
];

describe("Career-Ops provider adapters", () => {
  it.each(cases)("maps a listing for %s", async (provider, careersUrl) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => responseFor(String(input))),
    );

    const listings = await fetchCareerOpsListings(provider, careersUrl, "Acme");

    expect(listings.length).toBeGreaterThan(0);
    expect(listings[0]).toMatchObject({
      employer: "Acme",
      title: expect.any(String),
      jobUrl: expect.stringMatching(/^https:\/\//),
      applicationLink: expect.stringMatching(/^https:\/\//),
    });
  });

  it("converts a listing to the job-ops watchlist contract", () => {
    const result = toWatchlistJob("ashby", {
      sourceJobId: "ashby-1",
      title: "Ashby Engineer",
      employer: "Acme",
      jobUrl: "https://jobs.ashbyhq.com/acme/ashby-1",
      applicationLink: "https://jobs.ashbyhq.com/acme/ashby-1",
      location: "Remote",
    });

    expect(result).toMatchObject({
      source: "ashby:ashby-1",
      sourceType: "ashby",
      jobRef: "ashby-1",
    });
  });
});
