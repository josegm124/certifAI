import { describe, expect, it, vi } from "vitest";
import type { AssessmentRecord, FinalizationResponse } from "./api";
import {
  loadResultsPage,
  type ResultsHydrationDependencies,
} from "./resultsHydration";

const assessment = (id: string, status: "draft" | "finalized", completedAt: string | null = null) => ({
  id,
  status,
  completedAt,
} as AssessmentRecord);

const dependencies = (overrides: Partial<ResultsHydrationDependencies> = {}) => ({
  getActiveAssessment: vi.fn().mockResolvedValue({ assessment: null }),
  getAssessment: vi.fn(),
  getAssessments: vi.fn().mockResolvedValue({ assessments: [] }),
  getResult: vi.fn(),
  ...overrides,
} as unknown as ResultsHydrationDependencies);

describe("results page hydration", () => {
  it("returns empty when the account has no draft or finalized assessment", async () => {
    const state = await loadResultsPage(null, dependencies());
    expect(state).toEqual({ kind: "empty" });
  });

  it("reloads the most recently completed finalized result", async () => {
    const older = assessment("older", "finalized", "2026-08-15T10:00:00.000Z");
    const latest = assessment("latest", "finalized", "2026-08-16T10:00:00.000Z");
    const response = { assessment: latest } as FinalizationResponse;
    const getResult = vi.fn().mockResolvedValue(response);
    const state = await loadResultsPage(null, dependencies({
      getAssessments: vi.fn().mockResolvedValue({ assessments: [older, latest] }),
      getResult,
    }));

    expect(state).toEqual({ kind: "result", assessment: latest, response });
    expect(getResult).toHaveBeenCalledWith("latest");
  });

  it("propagates request failures so the route can leave the loading screen", async () => {
    const failure = new Error("network unavailable");
    await expect(loadResultsPage(null, dependencies({
      getActiveAssessment: vi.fn().mockRejectedValue(failure),
    }))).rejects.toBe(failure);
  });
});
