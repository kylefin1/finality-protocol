# FRP HTTP binding profile

HTTP transports canonical FRP objects; it does not define outcome semantics.

| Method | Route | Body/result |
| --- | --- | --- |
| `POST` | `/outcomes` | Outcome Contract; returns immutable outcome id. |
| `POST` | `/observations` | AOE; returns observation commitment. |
| `GET` | `/outcomes/{id}` | Current classification plus current certificate reference. |
| `GET` | `/outcomes/{id}/certificate` | Portable FOC v2. |
| `GET` | `/outcomes/{id}/lineage` | Ordered certificate lineage. |
| `POST` | `/outcomes/{id}/challenge` | Signed challenge artifact. |

Servers MUST use idempotency keys for submissions, reject unsupported critical
extensions, enforce tenant/source scope before evaluation, and return structured
error codes. An HTTP 2xx response MUST NOT itself mean `FINAL`.
