# FRP event-stream profile

Neutral event names are `OutcomeRequested`, `ObservationReceived`,
`ContradictionRaised`, `ClassificationCommitted`, `CertificateIssued`,
`ChallengeRaised`, `OutcomeReopened`, and `OutcomeSuperseded`.

Every event MUST bind an event id, tenant/context, semantic object hash,
protocol version, event time, producer time, predecessor when ordered, and
integrity material. Consumers MUST tolerate duplicate and out-of-order delivery.
Kafka, CloudEvents, and generic pub/sub bindings MAY carry the same envelope.
Events inform evaluation; no transport acknowledgment declares FINAL.
