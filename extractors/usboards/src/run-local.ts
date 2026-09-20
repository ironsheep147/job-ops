import type {
  ExtractorRunResult,
  ExtractorRuntimeContext,
} from "@shared/types/extractors";
import type { CreateJobInput } from "@shared/types/jobs";
import {
  commonOptions,
  locationEvidence,
  matchesTerms,
  plain,
} from "../../feed-utils/src/index";

const AMAZON_ORIGIN = "https://www.amazon.jobs";
const IBM_API = "https://www-api.ibm.com/search/api/v2";
const HIGHER_ED_JOBS_RSS =
  "https://www.higheredjobs.com/rss/categoryFeed.cfm?catID=68";

type JsonRecord = Record<string, unknown>;

async function request(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      ...init,
      // These public feeds/API endpoints occasionally redirect to their
      // canonical host or path. Follow that normal HTTP behavior.
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`${response.status} from ${new URL(url).hostname}`);
    }
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function date(value: unknown): string | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

function makeJob(
  source: "amazon" | "ibm" | "higheredjobs",
  values: {
    id?: unknown;
    title: unknown;
    employer: unknown;
    url: unknown;
    location: unknown;
    description?: unknown;
    postedAt?: unknown;
  },
): CreateJobInput | null {
  const title = text(values.title);
  const jobUrl = text(values.url);
  if (!title || !/^https:\/\//i.test(jobUrl)) return null;
  const location = text(values.location) || "United States";
  const remote = /remote|work from home|anywhere/i.test(location);
  return {
    source,
    sourceJobId: text(values.id) || jobUrl,
    title,
    employer: text(values.employer) || source,
    jobUrl,
    applicationLink: jobUrl,
    location,
    jobDescription: plain(values.description) || undefined,
    datePosted: date(values.postedAt),
    locationEvidence: locationEvidence(location, source, remote),
    isRemote: remote,
  };
}

function amazonUrl(path: unknown): string {
  const value = text(path);
  if (/^https:\/\//i.test(value)) return value;
  return `${AMAZON_ORIGIN}/${value.replace(/^\/+/, "")}`;
}

async function fetchAmazon(
  options: ReturnType<typeof commonOptions>,
): Promise<CreateJobInput[]> {
  const jobs: CreateJobInput[] = [];
  const seen = new Set<string>();
  const query = options.terms.join(" ");
  for (let page = 0; page < 20 && jobs.length < options.limit; page += 1) {
    if (options.cancelled()) break;
    const params = new URLSearchParams({
      base_query: query,
      loc_query: "United States",
      sort: "recent",
      result_limit: "100",
      offset: String(page * 100),
    });
    params.append("normalized_country_code[]", "USA");
    const response = await request(`${AMAZON_ORIGIN}/en/search.json?${params}`);
    const payload = (await response.json()) as JsonRecord;
    const rows = Array.isArray(payload.jobs) ? payload.jobs : [];
    if (rows.length === 0) break;
    let fresh = 0;
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") continue;
      const row = raw as JsonRecord;
      const jobUrl = amazonUrl(row.job_path);
      if (seen.has(jobUrl)) continue;
      seen.add(jobUrl);
      fresh += 1;
      const job = makeJob("amazon", {
        id: row.id ?? row.job_id,
        title: row.title,
        employer: row.company_name ?? "Amazon / AWS",
        url: jobUrl,
        location: row.normalized_location ?? row.location,
        description: row.description,
        postedAt: row.posted_date,
      });
      if (job && matchesTerms(job, options.terms)) jobs.push(job);
      if (jobs.length >= options.limit) break;
    }
    if (fresh === 0 || rows.length < 100) break;
  }
  return jobs;
}

function ibmFilter(): JsonRecord {
  return { bool: { must: [{ term: { field_keyword_05: "United States" } }] } };
}

async function fetchIbm(
  options: ReturnType<typeof commonOptions>,
): Promise<CreateJobInput[]> {
  const jobs: CreateJobInput[] = [];
  const query = options.terms.join(" ");
  for (let from = 0; from < 600 && jobs.length < options.limit; from += 30) {
    if (options.cancelled()) break;
    const body = {
      appId: "careers",
      scopes: ["careers2"],
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ["title", "description"],
              },
            },
          ],
        },
      },
      post_filter: ibmFilter(),
      size: 30,
      from,
      sort: [{ _score: "desc" }, { pageviews: "desc" }],
      lang: "zz",
      localeSelector: {},
      sm: { query, lang: "zz" },
      _source: [
        "_id",
        "title",
        "url",
        "description",
        "field_keyword_17",
        "field_keyword_19",
      ],
    };
    const response = await request(IBM_API, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as JsonRecord;
    const hits = (payload.hits as JsonRecord | undefined)?.hits;
    if (!Array.isArray(hits))
      throw new Error("IBM returned an unexpected search response");
    for (const hit of hits) {
      const source = (hit as JsonRecord)?._source as JsonRecord | undefined;
      if (!source) continue;
      const job = makeJob("ibm", {
        id: (hit as JsonRecord)?._id,
        title: source.title,
        employer: "IBM",
        url: source.url,
        location: [source.field_keyword_19, source.field_keyword_17]
          .filter(Boolean)
          .join(" · "),
        description: source.description,
      });
      if (job && matchesTerms(job, options.terms)) jobs.push(job);
      if (jobs.length >= options.limit) break;
    }
    if (hits.length < 30) break;
  }
  return jobs;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function tag(block: string, name: string): string {
  const match = block.match(
    new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"),
  );
  return match ? decodeXml(match[1]) : "";
}

export function parseHigherEdJobsFeed(xml: string): CreateJobInput[] {
  const jobs: CreateJobInput[] = [];
  for (const item of xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? []) {
    const description = tag(item, "description");
    const split = description.match(/^(.*)\s+\(([^()]*)\)$/);
    const job = makeJob("higheredjobs", {
      id: tag(item, "guid"),
      title: tag(item, "title"),
      employer: split?.[1] ?? description,
      url: tag(item, "link"),
      location: split?.[2] ?? "United States",
      description: tag(item, "content:encoded") || description,
      postedAt: tag(item, "pubDate"),
    });
    if (job) jobs.push(job);
  }
  return jobs;
}

async function fetchHigherEdJobs(
  options: ReturnType<typeof commonOptions>,
): Promise<CreateJobInput[]> {
  const response = await request(HIGHER_ED_JOBS_RSS);
  const body = await response.text();
  if (/<(?:html|iframe)\b/i.test(body) && !/<rss\b/i.test(body)) {
    throw new Error("HigherEdJobs RSS is currently unavailable upstream");
  }
  const jobs = parseHigherEdJobsFeed(body);
  return jobs
    .filter((job) => matchesTerms(job, options.terms))
    .slice(0, options.limit);
}

export async function runUsBoard(
  context: ExtractorRuntimeContext,
): Promise<ExtractorRunResult> {
  const options = commonOptions(context);
  if (options.cancelled()) return { success: true, jobs: [] };
  options.progress(`${context.source}: fetching US listings`);
  try {
    const jobs =
      context.source === "amazon"
        ? await fetchAmazon(options)
        : context.source === "ibm"
          ? await fetchIbm(options)
          : context.source === "higheredjobs"
            ? await fetchHigherEdJobs(options)
            : [];
    return { success: true, jobs };
  } catch (error) {
    return {
      success: false,
      jobs: [],
      error: error instanceof Error ? error.message : "upstream failure",
    };
  }
}
