import { describe, expect, it, vi } from "vitest";
import { completeEvidenceDossier } from "./evidenceWorkflow";
import type { EvidenceDossierResponse } from "./api";

const issued: EvidenceDossierResponse = {
  dossier: {
    id: "dossier-1",
    assessmentId: "assessment-1",
    selectedProductId: "advanced-certificate",
    status: "issued",
    signatoryName: "Ada Lovelace",
    acceptedDeclaration: true,
    signedAt: "2026-08-17T00:00:00.000Z",
    issuedAt: "2026-08-17T00:00:00.000Z",
  },
  selectedProduct: null,
  items: [],
  completion: { completedItems: 9, totalItems: 9, complete: true },
  badge: {
    id: "badge-1",
    productId: "advanced-certificate",
    tier: "advanced",
    score: 92,
    verificationToken: "token-1",
    issuedAt: "2026-08-17T00:00:00.000Z",
    expiresAt: "2027-08-17T00:00:00.000Z",
  },
};

describe("evidence dossier completion", () => {
  it("persists every current reference before requesting issuance", async () => {
    const order: string[] = [];
    const saveReference = vi.fn(async (_dossierId: string, questionId: number) => {
      order.push(`save:${questionId}`);
      return issued;
    });
    const finalize = vi.fn(async () => {
      order.push("finalize");
      return issued;
    });

    const result = await completeEvidenceDossier({
      dossierId: "dossier-1",
      items: [
        { questionId: 1, writtenReference: "AI Strategy v2" },
        { questionId: 8, writtenReference: "Value report" },
      ],
      signatoryName: "Ada Lovelace",
      acceptedDeclaration: true,
    }, { saveReference, finalize });

    expect(order).toEqual(["save:1", "save:8", "finalize"]);
    expect(finalize).toHaveBeenCalledWith("dossier-1", "Ada Lovelace", true);
    expect(result.badge?.verificationToken).toBe("token-1");
  });

  it("does not issue when a reference save fails", async () => {
    const saveReference = vi.fn().mockRejectedValue(new Error("save failed"));
    const finalize = vi.fn();
    await expect(completeEvidenceDossier({
      dossierId: "dossier-1",
      items: [{ questionId: 1, writtenReference: "AI Strategy v2" }],
      signatoryName: "Ada Lovelace",
      acceptedDeclaration: true,
    }, { saveReference, finalize })).rejects.toThrow("save failed");
    expect(finalize).not.toHaveBeenCalled();
  });
});
