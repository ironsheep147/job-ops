import { access } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PORTED_PUBLIC_SOURCES = [
  "a16zspeedrun",
  "agenticjobs",
  "builtin",
  "cryptocurrencyjobs",
  "fourdayweek",
  "generalistworld",
  "hackernews",
  "himalayas",
  "jobicy",
  "nodesk",
  "pythonorg",
  "remoteok",
  "remotive",
  "themuse",
  "weworkremotely",
  "workingnomads",
] as const;

const PORTED_CREDENTIAL_SOURCES = ["seek"] as const;

const root = resolve(import.meta.dirname, "..");
const extractorsRoot = join(root, "extractors");
const timeoutMs = Number.parseInt(process.env.SMOKE_TIMEOUT_MS ?? "30000", 10);

type SmokeResult = {
  source: string;
  status: "PASS" | "FAIL";
  jobs: number;
  detail: string;
};

function createContext(source: string) {
  return {
    source,
    selectedSources: [source],
    settings: {
      jobspyResultsWanted: "3",
      searchCities: undefined,
      jobspyLocation: undefined,
      workplaceTypes: JSON.stringify(["remote", "hybrid", "onsite"]),
    },
    searchTerms: [],
    selectedCountry: source === "seek" ? "australia" : "united states",
    shouldCancel: () => false,
  };
}

async function loadManifest(source: string) {
  const candidates = [
    join(extractorsRoot, source, "manifest.ts"),
    join(extractorsRoot, source, "src", "manifest.ts"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
    } catch {
      continue;
    }
    const loaded = await import(pathToFileURL(candidate).href);
    return loaded.manifest ?? loaded.default;
  }

  throw new Error(`manifest not found for ${source}`);
}

async function runOne(source: string): Promise<SmokeResult> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const manifest = await loadManifest(source);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () => reject(new Error(`timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });
    const result = await Promise.race([
      manifest.run(createContext(source)),
      timeoutPromise,
    ]);

    if (!result.success) {
      return {
        source,
        status: "FAIL",
        jobs: 0,
        detail: result.error ?? "extractor returned success=false",
      };
    }

    if (!Array.isArray(result.jobs) || result.jobs.length === 0) {
      return {
        source,
        status: "FAIL",
        jobs: 0,
        detail: "extractor returned no jobs",
      };
    }

    const invalid = result.jobs.find(
      (job: { source?: string; title?: string; jobUrl?: string }) =>
        job.source !== source ||
        typeof job.title !== "string" ||
        job.title.trim().length === 0 ||
        typeof job.jobUrl !== "string" ||
        !/^https:\/\//i.test(job.jobUrl),
    );
    if (invalid) {
      return {
        source,
        status: "FAIL",
        jobs: result.jobs.length,
        detail: "returned a job with invalid source, title, or HTTPS URL",
      };
    }

    return {
      source,
      status: "PASS",
      jobs: result.jobs.length,
      detail: result.jobs[0].title,
    };
  } catch (error) {
    return {
      source,
      status: "FAIL",
      jobs: 0,
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function main(): Promise<void> {
  const results: SmokeResult[] = [];
  for (const source of PORTED_PUBLIC_SOURCES) {
    const result = await runOne(source);
    results.push(result);
    console.log(
      `${result.status}\t${result.source}\t${result.jobs}\t${result.detail}`,
    );
  }

  for (const source of PORTED_CREDENTIAL_SOURCES) {
    if (!process.env.APIFY_TOKEN) {
      console.log(`SKIP\t${source}\t0\tAPIFY_TOKEN is not configured`);
      continue;
    }
    const result = await runOne(source);
    results.push(result);
    console.log(
      `${result.status}\t${result.source}\t${result.jobs}\t${result.detail}`,
    );
  }

  const failures = results.filter((result) => result.status === "FAIL");
  console.log(
    `\n${results.length - failures.length}/${results.length} public extractors passed`,
  );
  if (failures.length > 0) process.exitCode = 1;
}

void main();
