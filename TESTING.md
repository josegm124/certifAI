# Testing

Run the complete automated checks from the project root:

```bash
npm test
npm run build
git diff --check
```

The current suites cover:

- weighted scoring without certificate caps;
- the four readiness result bands;
- exactly nine Stage 2 red-flag controls;
- all 36 control/stage threshold combinations;
- the zero threshold for Q8 at Stage 2;
- certificate eligibility with and without failed flags;
- selection of a lower eligible certificate product;
- canonical question and framework mappings;
- password hashing and signed session tokens;
- frontend readiness presentation helpers.

## Manual workflow

1. Register and start a readiness assessment for a named AI system.
2. Save all nine domains and reload to confirm recovery from SQLite.
3. Finalize and confirm the score and result band are not capped by red flags.
4. Confirm only failed controls appear with remediation guidance.
5. Open certificate options. A failed flag must block every product.
6. For an eligible result, choose a supported product and open its dossier.
7. Save all nine evidence references, attach and replace a supported file, then
   sign and issue.
8. Retry issuance and confirm no duplicate certificate is created.
9. Open public verification without a session. Confirm adoption stage appears
   in JSON/HTML and that no evidence reference, filename, digest or attachment
   content is exposed.
10. Log in as another account and confirm assessments, dossiers and downloads
    cannot be accessed across accounts.

Uploads accept PDF, PNG, JPEG and DOCX extension/MIME pairs up to 10 MB.
Automated evidence review is not available and must be labelled “In
development”.
