# FRP agent/MCP profile

Reference tools:

```text
requestOutcome(contract)
submitObservation(aoe)
getOutcomeState(outcomeId)
verifyCertificate(bundle)
```

An agent may request an outcome or submit a permitted observation. It MUST NOT
alter approved source authority, STOP rules, or contract meaning without the
institutional authorization required for a new contract version. Agent
self-report is `ACTOR_ASSERTION` by default. Tool success is not outcome FINAL.
