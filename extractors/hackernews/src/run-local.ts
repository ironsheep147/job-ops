import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import {
  commonOptions,
  fetchFeed,
  locationEvidence,
  matchesTerms,
  plain,
} from "../../feed-utils/src/index";

export async function runHackernews(context: ExtractorRuntimeContext) {
  const options = commonOptions(context);
  try {
    options.progress("Hacker News: locating current hiring thread");
    const search = await fetchFeed(
      "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=5",
      "json",
    );
    const thread = search?.hits?.find((hit: any) =>
      /ask hn[: ]+who is hiring/i.test(hit?.title ?? ""),
    );
    if (!thread?.objectID)
      throw new Error("current hiring thread was not found");
    const item = await fetchFeed(
      `https://hn.algolia.com/api/v1/items/${thread.objectID}`,
      "json",
    );
    const jobs = [];
    for (const comment of Array.isArray(item?.children) ? item.children : []) {
      if (options.cancelled()) break;
      if (
        comment?.dead ||
        comment?.deleted ||
        typeof comment?.text !== "string"
      )
        continue;
      const description = plain(comment.text);
      const parts = (description.split("\n").find(Boolean) ?? "")
        .split("|")
        .map((value: string) => value.trim());
      const jobUrl = `https://news.ycombinator.com/item?id=${comment.id}`;
      const job = {
        source: "hackernews" as const,
        sourceJobId: String(comment.id),
        title: parts[1] || parts[0],
        employer: parts[0] || "HN Hiring",
        jobUrl,
        applicationLink:
          description.match(/https?:\/\/[^\s<>()]+/)?.[0] ?? jobUrl,
        location: parts[2] ?? "",
        jobDescription: description,
        datePosted: comment.created_at,
        locationEvidence: locationEvidence(parts[2] ?? "", "hackernews"),
      };
      if (job.title && matchesTerms(job, options.terms)) jobs.push(job);
      if (jobs.length >= options.limit) break;
    }
    return { success: true, jobs };
  } catch (error) {
    return {
      success: false,
      jobs: [],
      error: error instanceof Error ? error.message : "upstream failure",
    };
  }
}
