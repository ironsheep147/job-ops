import { z } from "zod";

export const EXTRACTOR_SOURCE_IDS = [
  "gradcracker",
  "indeed",
  "linkedin",
  "glassdoor",
  "ukvisajobs",
  "adzuna",
  "hiringcafe",
  "startupjobs",
  "workingnomads",
  "golangjobs",
  "jobindex",
  "seek",
  "naukri",
  "fiveamsat",
  "wazzuf",
  "freehire",
  "builtin",
  "themuse",
  "hackernews",
  "remoteok",
  "remotive",
  "weworkremotely",
  "jobicy",
  "himalayas",
  "nodesk",
  "fourdayweek",
  "cryptocurrencyjobs",
  "pythonorg",
  "a16zspeedrun",
  "agenticjobs",
  "generalistworld",
  "amazon",
  "ibm",
  "higheredjobs",
  "manual",
] as const;

export type ExtractorSourceId = (typeof EXTRACTOR_SOURCE_IDS)[number];

export interface ExtractorSourceMetadata {
  label: string;
  order: number;
  category: "pipeline" | "manual";
  requiresCredentials?: boolean;
  ukOnly?: boolean;
}

export const EXTRACTOR_SOURCE_METADATA: Record<
  ExtractorSourceId,
  ExtractorSourceMetadata
> = {
  gradcracker: {
    label: "Gradcracker",
    order: 10,
    category: "pipeline",
    ukOnly: true,
  },
  indeed: { label: "Indeed", order: 20, category: "pipeline" },
  linkedin: { label: "LinkedIn", order: 30, category: "pipeline" },
  glassdoor: { label: "Glassdoor", order: 40, category: "pipeline" },
  ukvisajobs: {
    label: "UK Visa Jobs",
    order: 50,
    category: "pipeline",
    requiresCredentials: true,
    ukOnly: true,
  },
  adzuna: {
    label: "Adzuna",
    order: 60,
    category: "pipeline",
    requiresCredentials: true,
  },
  hiringcafe: { label: "Hiring Cafe", order: 70, category: "pipeline" },
  startupjobs: { label: "startup.jobs", order: 80, category: "pipeline" },
  workingnomads: {
    label: "Working Nomads",
    order: 90,
    category: "pipeline",
  },
  golangjobs: {
    label: "Golang Jobs",
    order: 100,
    category: "pipeline",
  },
  jobindex: {
    label: "Jobindex",
    order: 103,
    category: "pipeline",
  },
  seek: {
    label: "Seek",
    order: 105,
    category: "pipeline",
    requiresCredentials: true,
  },
  naukri: {
    label: "Naukri",
    order: 107,
    category: "pipeline",
  },
  fiveamsat: { label: "Khamsat", order: 109, category: "pipeline" },
  wazzuf: { label: "WUZZUF", order: 110, category: "pipeline" },
  freehire: { label: "FreeHire", order: 115, category: "pipeline" },
  builtin: { label: "Built In", order: 116, category: "pipeline" },
  themuse: { label: "The Muse", order: 117, category: "pipeline" },
  hackernews: {
    label: "Hacker News Who Is Hiring",
    order: 118,
    category: "pipeline",
  },
  remoteok: { label: "Remote OK", order: 119, category: "pipeline" },
  remotive: { label: "Remotive", order: 120, category: "pipeline" },
  weworkremotely: { label: "We Work Remotely", order: 121, category: "pipeline" },
  jobicy: { label: "Jobicy", order: 122, category: "pipeline" },
  himalayas: { label: "Himalayas", order: 123, category: "pipeline" },
  nodesk: { label: "NoDesk", order: 124, category: "pipeline" },
  fourdayweek: { label: "4 Day Week", order: 125, category: "pipeline" },
  cryptocurrencyjobs: { label: "Cryptocurrency Jobs", order: 126, category: "pipeline" },
  pythonorg: { label: "Python.org Jobs", order: 127, category: "pipeline" },
  a16zspeedrun: { label: "a16z Speedrun Talent Network", order: 128, category: "pipeline" },
  agenticjobs: { label: "Agentic Engineering Jobs", order: 129, category: "pipeline" },
  generalistworld: { label: "Generalist World", order: 130, category: "pipeline" },
  amazon: { label: "Amazon / AWS", order: 131, category: "pipeline" },
  ibm: { label: "IBM Careers", order: 132, category: "pipeline" },
  higheredjobs: { label: "HigherEdJobs", order: 133, category: "pipeline" },
  manual: { label: "Manual", order: 120, category: "manual" },
};

export const PIPELINE_EXTRACTOR_SOURCE_IDS = EXTRACTOR_SOURCE_IDS.filter(
  (source) => EXTRACTOR_SOURCE_METADATA[source].category === "pipeline",
);

const extractorSourceTuple = EXTRACTOR_SOURCE_IDS as unknown as [
  ExtractorSourceId,
  ...ExtractorSourceId[],
];

export const extractorSourceEnum = z.enum(extractorSourceTuple);

export function isExtractorSourceId(value: string): value is ExtractorSourceId {
  return EXTRACTOR_SOURCE_IDS.includes(value as ExtractorSourceId);
}

export function sourceLabel(source: ExtractorSourceId): string {
  return EXTRACTOR_SOURCE_METADATA[source].label;
}

export function sortSources<T extends { source: ExtractorSourceId }>(
  values: T[],
): T[] {
  return [...values].sort(
    (left, right) =>
      EXTRACTOR_SOURCE_METADATA[left.source].order -
      EXTRACTOR_SOURCE_METADATA[right.source].order,
  );
}
