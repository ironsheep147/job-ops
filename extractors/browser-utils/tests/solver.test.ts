import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { firefoxLaunch } = vi.hoisted(() => ({
  firefoxLaunch: vi.fn(),
}));

vi.mock("playwright", () => ({
  firefox: { launch: firefoxLaunch },
}));

vi.mock("../src/launch.js", () => ({
  createLaunchOptions: vi.fn(async () => ({ launchOptions: {} })),
}));

import { solveChallenge } from "../src/solver.js";

const storageDirs: string[] = [];

function createContext(cookieNames: string[]) {
  const page = {
    content: async () => "<html><body>Job listing</body></html>",
    goto: async () => null,
    waitForTimeout: async () => undefined,
    evaluate: async () => "Mozilla/5.0 TestUA",
  };

  return {
    cookies: async () =>
      cookieNames.map((name) => ({
        name,
        value: "value",
        domain: ".hiringcafe.com",
        path: "/",
        expires: Date.now() / 1000 + 3600,
        httpOnly: true,
        secure: true,
        sameSite: "None" as const,
      })),
    pages: () => [page],
    newPage: async () => page,
  };
}

async function storageDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "job-ops-solver-"));
  storageDirs.push(dir);
  return dir;
}

afterEach(async () => {
  firefoxLaunch.mockReset();
  await Promise.all(
    storageDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("solveChallenge", () => {
  it("returns an error when no challenge is visible and no reusable cookie is saved", async () => {
    const browser = {
      newContext: async () => createContext([]),
      close: vi.fn(async () => undefined),
    };
    firefoxLaunch.mockResolvedValue(browser);

    const result = await solveChallenge(
      "https://hiringcafe.com/job/req-1",
      "hiringcafe",
      await storageDir(),
    );

    expect(result).toEqual({
      status: "error",
      message:
        "Challenge appeared solved, but no reusable Cloudflare clearance cookie was saved.",
    });
    expect(browser.close).toHaveBeenCalledOnce();
  });

  it("reports success after saving a reusable clearance cookie", async () => {
    const browser = {
      newContext: async () => createContext(["cf_clearance"]),
      close: vi.fn(async () => undefined),
    };
    firefoxLaunch.mockResolvedValue(browser);

    const result = await solveChallenge(
      "https://hiringcafe.com/job/req-1",
      "hiringcafe",
      await storageDir(),
    );

    expect(result).toEqual({ status: "solved", cookiesSaved: 1 });
    expect(browser.close).toHaveBeenCalledOnce();
  });
});
