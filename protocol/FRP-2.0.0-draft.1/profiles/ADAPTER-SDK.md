# Adapter SDK contract

Adapters translate source-native events or queries into AOEs. They implement:

```text
discoverCapabilities() -> candidate predicates (not authority)
observe(request, approvedSSC) -> source-native response
normalize(response, approvedMapping) -> AOE
health() -> availability/freshness signal
```

Reference classes include REST, webhook, event bus, SQL export, IAM, ledger,
and object storage. Candidate discovery is advisory. Authority and mappings
require institutional approval. Vendor-specific adapters MUST remain outside
FSK and MUST expose upstream dependencies for independence analysis.
