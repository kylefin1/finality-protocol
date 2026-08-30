# Formal-model boundary

`FinalityKernel.tla` models evidence arrival, missing sources, hard contradictions,
mandatory false predicates, STOP, `FINAL`, and `REOPENED` lineage. The checked
safety target is conditional: if mandatory observations are authentic and
correctly normalized, a mandatory false predicate cannot produce `FINAL`.

The frozen release executes `model_check.py`, a separate bounded explicit-state
checker over the same two-source abstraction. The TLA+ model is supplied for
TLC review, but the release does not claim a machine-checked refinement proof,
a theorem about real-world source truth, or external formal verification.
