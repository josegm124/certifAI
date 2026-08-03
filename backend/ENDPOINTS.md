# API examples

All protected examples require the `certifai_session` cookie returned by login
or registration.

```http
POST /api/auth/register
Content-Type: application/json

{"companyName":"Google","name":"Lalo","email":"lalo@google.com","role":"Risk","password":"password123"}
```

```http
POST /api/assessments
Content-Type: application/json

{"aiSystemName":"Customer Support Assistant","tier":2}
```

```http
PUT /api/assessments/:id/domains/strategy/answers
Content-Type: application/json

{"answers":[
  {"questionId":1,"score":4,"evidence":"Policy register","attestation":"confirmed"},
  {"questionId":2,"score":3,"evidence":"","attestation":""},
  {"questionId":3,"score":3,"evidence":"","attestation":""},
  {"questionId":4,"score":4,"evidence":"","attestation":""},
  {"questionId":5,"score":3,"evidence":"","attestation":""}
]}
```

Each domain request must contain every canonical question from that domain and
no others. Repeating the same PUT safely updates that domain.

```http
POST /api/assessments/:id/finalize
Content-Type: application/json

{"signatoryName":"Lalo Guerrero","acceptedDeclaration":true}
```

Tier 1 sends an empty object. Finalization rejects anything other than the 36
persisted canonical answers and computes the official result on the server.
