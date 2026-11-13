# Spec Delta

## ADDED Requirements

### Requirement: One epoch registry has an explicit versioned primary pack
An `EpochModuleRegistry` used by a session SHALL bind to exactly one epoch and a primary pack with a nonempty `packId` and positive integer `packVersion`. Additional pack registration SHALL be allowed only when the primary pack explicitly lists that imported pack ID and version for the same target epoch. Imports SHALL NOT replace the primary save identity.


#### Scenario: Primary pack and declared cameo register
- **WHEN** a primary pack with a valid ID, version and epoch declares an imported cameo pack ID and version, and that declared pack registers for the same target epoch
- **THEN** the registry SHALL expose the primary identity for save creation and retain both packs' validated blueprints without changing the primary identity

#### Scenario: Undeclared, duplicate and cross-epoch composition reject
- **WHEN** registration supplies a second pack absent from the primary import list, a duplicate primary or import identity, a mismatched import version, or an imported pack for another target epoch
- **THEN** registration SHALL fail with the offending identity or epoch named, preserve all previously registered blueprints and the primary identity, and allow a corrected retry

#### Scenario: Missing or malformed primary identity rejects
- **WHEN** a primary pack omits its pack ID or version, uses an empty ID or a nonpositive or noninteger version
- **THEN** the registry SHALL reject it before publishing any of its blueprints

### Requirement: Bound registry mutation uses pack registration
Once bound, direct public registration methods SHALL reject mutation outside an authorized `registerPack` transaction. A registry populated through direct registration before binding SHALL NOT later acquire a primary pack identity. Unbound direct registration SHALL remain available for focused registry use.

#### Scenario: Direct registration cannot bypass bound pack imports
- **WHEN** a registry has bound a primary pack and a caller invokes any public direct blueprint registration method outside `registerPack`, or tries to bind a pack after directly populating an unbound registry
- **THEN** registration SHALL reject without changing any blueprint or the primary identity, and a corrected pack registration SHALL remain possible

### Requirement: Materialized entity IDs are compatible with render semantic IDs
Every entity ID entering a live world through registered character materialization or snapshot load SHALL match the renderer-compatible lowercase alphanumeric, underscore and hyphen token pattern, with a lowercase alphanumeric first character and a maximum length of 64. The live world SHALL never publish an entity ID that causes character semantic-ID formatting to throw during a frame.

#### Scenario: Valid registered entity reaches a render frame
- **WHEN** a character with a valid entity ID is registered and materialized into the initial world
- **THEN** the render-frame consumer SHALL format and expose its character semantic ID without an exception

#### Scenario: Invalid authored entity rejects before materialization and frame
- **WHEN** a character blueprint uses whitespace, uppercase, a dot, an unsafe first character or more than 64 characters in its ID
- **THEN** registration SHALL reject the ID before initial materialization or any render frame, preserve the previous registry and world, and name the invalid ID

#### Scenario: Invalid loaded entity rejects before publication
- **WHEN** a structurally valid save snapshot contains an invalid entity map key, an invalid entity's own ID, or a mismatch between the two
- **THEN** coordinator load SHALL fail before publishing the world or RNG, and a later render frame SHALL continue to use the prior valid world
