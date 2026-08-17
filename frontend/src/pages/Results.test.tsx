// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ResultsPageState } from "../lib/resultsHydration";
import Results from "./Results";

const doubles = vi.hoisted(() => ({
  loadResultsPage: vi.fn(),
  setAssessment: vi.fn(),
  setServer: vi.fn(),
  store: {
    org: "Example Ltd",
    answers: {},
    assessmentId: null as string | null,
    aiSystemName: "",
    server: null,
  },
}));

vi.mock("../lib/resultsHydration", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/resultsHydration")>(),
  loadResultsPage: doubles.loadResultsPage,
}));

vi.mock("../store/useStore", () => ({
  useStore: () => ({
    ...doubles.store,
    setAssessment: doubles.setAssessment,
    setServer: doubles.setServer,
  }),
}));

function renderResults() {
  return render(
    <MemoryRouter initialEntries={["/results"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/results" element={<Results />} />
        <Route path="/start" element={<div>Start destination</div>} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("results route fallbacks", () => {
  beforeEach(() => {
    doubles.store.assessmentId = null;
    doubles.store.server = null;
    doubles.loadResultsPage.mockReset();
    doubles.setAssessment.mockReset();
    doubles.setServer.mockReset();
  });

  afterEach(cleanup);

  it("redirects an account without assessments to start instead of showing 0/36", async () => {
    doubles.loadResultsPage.mockResolvedValue({ kind: "empty" } satisfies ResultsPageState);
    renderResults();

    expect(await screen.findByText("Start destination")).toBeTruthy();
    expect(screen.queryByText(/0 of 36 answers/i)).toBeNull();
  });

  it("redirects a failed result request to the dashboard", async () => {
    doubles.loadResultsPage.mockRejectedValue(new Error("request failed"));
    renderResults();

    expect(await screen.findByText("Dashboard destination")).toBeTruthy();
    expect(screen.queryByText(/0 of 36 answers/i)).toBeNull();
  });

  it("ignores an obsolete load after the assessment id changes", async () => {
    let resolveFirst: (state: ResultsPageState) => void = () => undefined;
    const first = new Promise<ResultsPageState>((resolve) => { resolveFirst = resolve; });
    const current = { kind: "result", assessment: { id: "current" }, response: { marker: "current" } } as unknown as ResultsPageState;
    const obsolete = { kind: "result", assessment: { id: "obsolete" }, response: { marker: "obsolete" } } as unknown as ResultsPageState;
    doubles.store.assessmentId = "obsolete";
    doubles.loadResultsPage.mockReturnValueOnce(first).mockResolvedValueOnce(current);
    const view = renderResults();

    doubles.store.assessmentId = "current";
    view.rerender(
      <MemoryRouter initialEntries={["/results"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes><Route path="/results" element={<Results />} /></Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(doubles.setServer).toHaveBeenCalledTimes(1));
    resolveFirst(obsolete);
    await Promise.resolve();

    expect(doubles.setServer).toHaveBeenCalledTimes(1);
    expect(doubles.setServer).toHaveBeenCalledWith((current as Extract<ResultsPageState, { kind: "result" }>).response);
  });
});
