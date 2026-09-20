import type { ExtractorRuntimeContext } from "@shared/types/extractors";
import {
  commonOptions,
  fetchFeed,
  locationEvidence,
  plain,
} from "../../feed-utils/src/index";

export async function runBuiltin(context: ExtractorRuntimeContext) {
  const options = commonOptions(context);
  if (options.cancelled()) return { success: true, jobs: [] };
  const jobs = [];
  const seen = new Set<string>();
  try {
    for (const term of options.terms.length
      ? options.terms
      : ["software engineer"]) {
      if (options.cancelled()) break;
      options.progress(`Built In: ${term}`);
      const html = await fetchFeed(
        `https://builtin.com/jobs?search=${encodeURIComponent(term)}&page=1`,
        "text",
      );
      for (const match of html.matchAll(
        /\{"@type":"ListItem"[^}]*?"name":"((?:[^"\\]|\\.)*)"[^}]*?"url":"((?:[^"\\]|\\.)*)"(?:[^}]*?"description":"((?:[^"\\]|\\.)*)")?\}/g,
      )) {
        const title = JSON.parse(`"${match[1]}"`);
        const jobUrl = JSON.parse(`"${match[2]}"`);
        if (!title || !jobUrl || seen.has(jobUrl)) continue;
        const window = html.slice(
          Math.max(0, (match.index ?? 0) - 2500),
          (match.index ?? 0) + 1500,
        );
        const location = /remote/i.test(window) ? "Remote" : "United States";
        const employer =
          plain(
            window.match(
              /href=["']\/company\/[^"']+["'][^>]*>([\s\S]*?)<\//i,
            )?.[1],
          ) || "Built In employer";
        seen.add(jobUrl);
        jobs.push({
          source: "builtin",
          sourceJobId: jobUrl,
          title,
          employer,
          jobUrl,
          applicationLink: jobUrl,
          location,
          jobDescription: plain(match[3] ? JSON.parse(`"${match[3]}"`) : ""),
          locationEvidence: locationEvidence(
            location,
            "builtin",
            location === "Remote",
          ),
        });
        if (jobs.length >= options.limit) return { success: true, jobs };
      }
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
