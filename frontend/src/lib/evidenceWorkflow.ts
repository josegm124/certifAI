import {
  finalizeEvidenceDossier,
  saveEvidenceReference,
  type EvidenceDossierResponse,
} from "./api";

interface EvidenceReferenceInput {
  questionId: number;
  writtenReference: string;
}

interface CompleteEvidenceDossierInput {
  dossierId: string;
  items: EvidenceReferenceInput[];
  signatoryName: string;
  acceptedDeclaration: boolean;
}

interface EvidenceWorkflowDependencies {
  saveReference: typeof saveEvidenceReference;
  finalize: typeof finalizeEvidenceDossier;
}

const defaultDependencies: EvidenceWorkflowDependencies = {
  saveReference: saveEvidenceReference,
  finalize: finalizeEvidenceDossier,
};

export async function completeEvidenceDossier(
  input: CompleteEvidenceDossierInput,
  dependencies: EvidenceWorkflowDependencies = defaultDependencies,
): Promise<EvidenceDossierResponse> {
  for (const item of input.items) {
    await dependencies.saveReference(input.dossierId, item.questionId, item.writtenReference);
  }
  return dependencies.finalize(
    input.dossierId,
    input.signatoryName,
    input.acceptedDeclaration,
  );
}
