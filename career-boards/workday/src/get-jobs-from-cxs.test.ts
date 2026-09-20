import { describe, expect, it } from "vitest";
import { getJobsFromCxs } from "./get-jobs-from-cxs";

describe("getJobsFromCxs", () => {
  it("posts to the CXS endpoint and normalizes postings for job-ops", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const result = await getJobsFromCxs({
      cxsJobsUrl:
        "https://acme.wd1.myworkdayjobs.com/wday/cxs/acme/Careers/jobs",
      careersUrl: "https://acme.wd1.myworkdayjobs.com/en-US/Careers",
      company: "Acme",
      limit: 1,
      fetchImpl: async (input, init) => {
        calls.push({ url: String(input), init });
        return Response.json({
          total: 1,
          jobPostings: [
            {
              title: "Platform Engineer",
              externalPath: "/job/Platform-Engineer_R-123",
              locationsText: "Remote",
              postedOn: "2026-09-20",
              bulletFields: ["R-123"],
            },
          ],
        });
      },
    });

    expect(result).toMatchObject({ total: 1, fetched: 1 });
    expect(result.jobs[0]).toMatchObject({
      source: "workday",
      externalId: "R-123",
      title: "Platform Engineer",
      company: "Acme",
      locationText: "Remote",
      jobUrl:
        "https://acme.wd1.myworkdayjobs.com/en-US/Careers/job/Platform-Engineer_R-123",
    });
    expect(calls[0]?.url).toBe(
      "https://acme.wd1.myworkdayjobs.com/wday/cxs/acme/Careers/jobs",
    );
    expect(calls[0]?.init?.method).toBe("POST");
    expect(calls[0]?.init?.body).toContain('"searchText":""');
  });
});
