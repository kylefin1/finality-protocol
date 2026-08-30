------------------------------ MODULE FinalityKernel ------------------------------
EXTENDS Naturals, Sequences, FiniteSets

(***************************************************************************
 Meaningful finite-state model of the Finality Semantic Kernel. The model   
 does not assert that a real source tells the truth. It checks that, under  
 the declared observation assumptions, mandatory false state and hard      
 contradiction cannot coexist with FINAL and that REOPEN preserves lineage.
***************************************************************************)

CONSTANTS Sources

States == {"OPEN", "PENDING", "FINAL", "CONTRADICTED", "CURE_REQUIRED",
           "FAILED", "REOPENED", "SUPERSEDED"}

VARIABLES state, observed, mandatoryFalse, hardContradiction,
          stopTriggered, lineage, generation

vars == <<state, observed, mandatoryFalse, hardContradiction,
          stopTriggered, lineage, generation>>

Init == /\ state = "OPEN"
        /\ observed = {}
        /\ mandatoryFalse = FALSE
        /\ hardContradiction = FALSE
        /\ stopTriggered = FALSE
        /\ lineage = <<>>
        /\ generation = 0

Observe(s) == /\ s \in Sources
              /\ observed' = observed \cup {s}
              /\ UNCHANGED <<state, mandatoryFalse, hardContradiction,
                              stopTriggered, lineage, generation>>

MakeMandatoryFalse == /\ mandatoryFalse' = TRUE
                       /\ IF state = "FINAL"
                             THEN /\ state' = "REOPENED"
                                  /\ generation' = generation + 1
                                  /\ lineage' = Append(lineage, <<generation + 1, "REOPENED">>)
                             ELSE /\ UNCHANGED <<state, lineage, generation>>
                       /\ UNCHANGED <<observed, hardContradiction, stopTriggered>>

RaiseContradiction == /\ hardContradiction' = TRUE
                      /\ IF state = "FINAL"
                            THEN /\ state' = "REOPENED"
                                 /\ generation' = generation + 1
                                 /\ lineage' = Append(lineage, <<generation + 1, "REOPENED">>)
                            ELSE /\ UNCHANGED <<state, lineage, generation>>
                      /\ UNCHANGED <<observed, mandatoryFalse, stopTriggered>>

Stop == /\ stopTriggered' = TRUE
        /\ state' = "FAILED"
        /\ generation' = generation + 1
        /\ lineage' = Append(lineage, <<generation + 1, "FAILED">>)
        /\ UNCHANGED <<observed, mandatoryFalse, hardContradiction>>

Classify ==
  LET next == IF stopTriggered THEN "FAILED"
              ELSE IF state = "FINAL" /\ (hardContradiction \/ mandatoryFalse)
                THEN "REOPENED"
              ELSE IF hardContradiction THEN "CONTRADICTED"
              ELSE IF observed = {} THEN "OPEN"
              ELSE IF observed # Sources THEN "PENDING"
              ELSE IF mandatoryFalse THEN "CURE_REQUIRED"
              ELSE "FINAL"
  IN /\ state' = next
     /\ generation' = generation + 1
     /\ lineage' = Append(lineage, <<generation + 1, next>>)
     /\ UNCHANGED <<observed, mandatoryFalse, hardContradiction, stopTriggered>>

Next == (\E s \in Sources: Observe(s)) \/ MakeMandatoryFalse \/
        RaiseContradiction \/ Stop \/ Classify

Spec == Init /\ [][Next]_vars

TypeOK == /\ state \in States
          /\ observed \subseteq Sources
          /\ mandatoryFalse \in BOOLEAN
          /\ hardContradiction \in BOOLEAN
          /\ stopTriggered \in BOOLEAN
          /\ lineage \in Seq(Nat \X States)
          /\ generation \in Nat

NoFalseFinal == state = "FINAL" =>
  ~mandatoryFalse /\ ~hardContradiction /\ ~stopTriggered /\ observed = Sources

ReopenHasLineage == state = "REOPENED" =>
  Len(lineage) > 0 /\ lineage[Len(lineage)][2] = "REOPENED"

NoHistoryMutation == \A i \in 1..Len(lineage): lineage[i][1] = i

=============================================================================
