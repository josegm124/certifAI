# API examples

All protected examples require the `certifai_session` cookie returned by login
or registration.

```http
GET /api/catalog/certificates
```

This public endpoint returns active certificate products from SQLite, including
their related level, current price and display features. Money is returned in
minor units; for example, EUR 349 is `34900`.

```http
POST /api/auth/register
Content-Type: application/json

{"companyName":"Google","name":"Lalo","email":"lalo@google.com","role":"Risk","password":"password123"}
```

```http
POST /api/assessments
Content-Type: application/json

{"aiSystemName":"Customer Support Assistant"}
```

```http
PUT /api/assessments/:id/domains/strategy/answers
Content-Type: application/json

{"answers":[
  {"questionId":1,"score":4},
  {"questionId":2,"score":3},
  {"questionId":3,"score":3},
  {"questionId":4,"score":4},
  {"questionId":5,"score":3}
]}
```

Each domain request must contain every canonical question from that domain and
no others. Repeating the same PUT safely updates that domain.

```http
POST /api/assessments/:id/finalize
Content-Type: application/json

{}
```

Finalization rejects anything other than the 36 persisted canonical answers
and computes the official score, band and immutable control flags on the
server. It is safe to retry.

```http
GET /api/assessments/:id/certificate-options
```

Returns only active products at or below the stored result band. A failed
critical control or an Aware result returns no eligible products.

```http
POST /api/assessments/:id/evidence-dossier
Content-Type: application/json

{"selectedProductId":"assured-certificate"}
```

The assessment must be finalised and the selected product must be eligible.
The response contains exactly nine evidence items.

```http
PUT /api/evidence-dossiers/:id/items/16
Content-Type: application/json

{"writtenReference":"AI Risk Assessment v3, section 4, Governance Drive"}
```

Optional private files use
`POST /api/evidence-dossiers/:id/items/:questionId/attachment` with one
multipart field named `file`. PDF, DOCX, PNG and JPEG are accepted up to 10 MB.
The same endpoint with `GET` downloads the file and `DELETE` removes it.

```http
POST /api/evidence-dossiers/:id/finalize
Content-Type: application/json

{"signatoryName":"Lalo Guerrero","acceptedDeclaration":true}
```

Issuance atomically locks the dossier and creates one badge. Retrying returns
the already-issued dossier and badge.

```http
POST /api/assessments/:id/remediation
Content-Type: application/json

{}
```

Creates a new linked draft with copied scores and carried critical-control
references. Each domain is resaved with `"confirmed":true`; all nine domain
confirmations are required before the remediation assessment can be finalised.
