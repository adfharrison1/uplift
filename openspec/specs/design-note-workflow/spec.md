# design-note-workflow Specification

## Purpose
Integrate raw design notes into the living design system without losing owner intent, duplicating decisions or presenting planned gameplay as shipped code.

## Requirements

### Requirement: Raw notes receive approved dispositions

The design-note workflow SHALL preserve raw notes in the inbox until researched, reviewed and approved. Each processed note SHALL have a disposition pointing to its canonical home or recording its rejection, deferral or existing coverage. Unknown names SHALL be researched before interpretation; conflicts with pillars or the rules spine SHALL be raised to the owner.

#### Scenario: Existing coverage

- **WHEN** a real inbox note is already fully represented in the design documents
- **THEN** the workflow SHALL verify its meaning and disposition without adding duplicate design text, and remove only approved, fully dispositioned inbox material

#### Scenario: Unapproved or failed processing

- **WHEN** review fails or the owner has not approved a note's proposed interpretation
- **THEN** its original inbox text SHALL remain intact and the workflow SHALL not treat the proposal as a decision

### Requirement: Document integrity survives every derived edit

The design-notes, review-gates and periodic-review skills SHALL require one canonical statement per concept, correct system placement, status-index and Where-facts-live upkeep, roadmap and disposition updates, verbatim owner wording, and independent fidelity and coherence reviews. Moves or restructures SHALL carry a no-loss mapping.

#### Scenario: Concept moves into a feature document

- **WHEN** approved design content moves into a design file
- **THEN** its old location SHALL point to the canonical home, its index and disposition references SHALL resolve, and two independent reviewers SHALL verify no loss and overall coherence

#### Scenario: No affected index entry

- **WHEN** an edit does not require changes to a particular index or roadmap entry
- **THEN** the integrity record SHALL state that the existing entry was checked and remains correct rather than fabricate an unrelated edit

### Requirement: Design status and budgets remain truthful

Design-note integration SHALL mark planned work with resolvable roadmap references and SHALL never write planned capabilities into AGENTS guides. Root AGENTS SHALL remain at most 1,050 words and config context below 1,500 words. The approximately 14,000-word design target SHALL remain aspirational until the deferred engineering split is authorized.

#### Scenario: Planned behavior is accepted

- **WHEN** the owner approves a future mechanic
- **THEN** it SHALL be recorded in the appropriate design home with planned status and a roadmap disposition, while shipped-code agent guidance remains unchanged

#### Scenario: Budget pressure

- **WHEN** design integration needs additional space
- **THEN** the workflow SHALL consider an indexed feature file with a no-loss review, preserve owner exemplars verbatim and avoid performing the deferred engineering restructure merely to meet an aspirational target
