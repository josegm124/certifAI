import {
  getActiveAssessment,
  getAssessment,
  getAssessments,
  getResult,
  type AssessmentRecord,
  type FinalizationResponse,
} from "./api";

export type ResultsPageState =
  | { kind: "empty" }
  | { kind: "draft"; assessment: AssessmentRecord }
  | { kind: "result"; assessment: AssessmentRecord; response: FinalizationResponse };

export interface ResultsHydrationDependencies {
  getActiveAssessment: typeof getActiveAssessment;
  getAssessment: typeof getAssessment;
  getAssessments: typeof getAssessments;
  getResult: typeof getResult;
}

const defaultDependencies: ResultsHydrationDependencies = {
  getActiveAssessment,
  getAssessment,
  getAssessments,
  getResult,
};

export async function loadResultsPage(
  assessmentId: string | null,
  dependencies: ResultsHydrationDependencies = defaultDependencies,
): Promise<ResultsPageState> {
  if (assessmentId) {
    const { assessment } = await dependencies.getAssessment(assessmentId);
    if (assessment.status === "draft") return { kind: "draft", assessment };
    return {
      kind: "result",
      assessment,
      response: await dependencies.getResult(assessment.id),
    };
  }

  const { assessment: active } = await dependencies.getActiveAssessment();
  if (active) return { kind: "draft", assessment: active };

  const { assessments } = await dependencies.getAssessments();
  const latest = assessments
    .filter((candidate) => candidate.status === "finalized")
    .sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")))[0];

  if (!latest) return { kind: "empty" };
  return {
    kind: "result",
    assessment: latest,
    response: await dependencies.getResult(latest.id),
  };
}
