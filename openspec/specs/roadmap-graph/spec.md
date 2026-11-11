# roadmap-graph Specification

## Purpose
Provide a validated, ordered roadmap whose next-work recommendation agrees with actual proposal and archive state rather than stale labels.

## Requirements

### Requirement: Roadmap references form a validated graph

The roadmap SHALL reject duplicate IDs, unknown references, invalid statuses, missing milestones, self-dependencies and dependency cycles. Validation references SHALL resolve but SHALL NOT become dependency edges. Parked entries SHALL retain a revisit condition.

#### Scenario: Invalid dependency graph

- **WHEN** a roadmap contains a cycle, duplicate ID or missing dependency
- **THEN** validation SHALL fail with a stable diagnostic identifying the offending IDs without modifying the roadmap

#### Scenario: Validation link points forward

- **WHEN** a valid entry names a later entry as its validator
- **THEN** the link SHALL be checked for existence without changing dependency order or creating a false cycle

### Requirement: Completion derives from delivered artifacts

A dependency SHALL be satisfied only by an unambiguous archive directory or an explicit done-by-review disposition with delivery evidence. Active and archived identity collisions, duplicate archives and stale lifecycle labels SHALL be reported. A planned roadmap entry with an active proposal SHALL be treated as active work.

#### Scenario: Stale archive label

- **WHEN** an entry claims archived status but has no corresponding archive directory
- **THEN** validation SHALL reject that claim and next-work selection SHALL not treat the dependency as satisfied

#### Scenario: Date-prefixed change identity

- **WHEN** a change ID itself starts with a date
- **THEN** archive matching SHALL strip exactly the archive date prefix and preserve the complete original ID, rejecting ambiguous matches

### Requirement: Next-work selection is deterministic and read-only

The next command SHALL report active work and select the first eligible planned entry in roadmap order only when no active proposal needs attention. Eligible dependencies SHALL all be satisfied. Text and JSON output SHALL be stable for identical inputs, and the command SHALL never edit files or propose a change.

#### Scenario: Ready entry after a done-by-review dependency

- **WHEN** no proposal is active and the first planned entry depends only on archived or evidenced done-by-review entries
- **THEN** the command SHALL select that entry and explain its dependency state

#### Scenario: Active work or no eligible entry

- **WHEN** proposals are active, all entries are delivered or remaining entries are blocked or parked
- **THEN** the command SHALL report that state explicitly, list active or blocked IDs in deterministic order, and avoid silently selecting a later entry
