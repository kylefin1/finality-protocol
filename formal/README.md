# Formal-model execution

The actual safety state machine is the frozen TLA+ model at
`../protocol/FRP-2.0.0-draft.1/formal/FinalityKernel.tla`. Its bounded Python
companion explores the same disclosed transition variables without external
dependencies:

```bash
python3 protocol/FRP-2.0.0-draft.1/formal/model_check.py
```

With Apalache installed, run the machine-readable TLA+ model and configuration:

```bash
apalache-mc check \
  --config-file=protocol/FRP-2.0.0-draft.1/formal/FinalityKernel.cfg \
  protocol/FRP-2.0.0-draft.1/formal/FinalityKernel.tla
```

The model checks safety under its explicit bounded assumptions. It does not
prove that an institution chose the correct authoritative sources or that a
real source reported truthfully. CI always runs the bounded companion; the
Apalache job is reproducibly documented and may be enabled after pinning an
approved Apalache release artifact.
