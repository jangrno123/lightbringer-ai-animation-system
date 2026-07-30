# Adoption guide

## Start with the workflow, not the full platform

Studios should validate production gates before investing in every integration.

## Phase 1 — Define the production truth

Create:

- a screenplay approval rule;
- a scene and shot naming convention;
- an entity registry for characters, locations, props, and equipment;
- a version convention for reference assets;
- a definition of “approved output.”

Success condition: every render can be traced to an approved screenplay and an identified shot.

## Phase 2 — Introduce shot-level structure

Separate:

- dialogue;
- visual direction;
- audio direction;
- performance;
- framing;
- camera;
- timing.

Allow artists to edit, split, merge, exclude, restore, and lock shots.

Success condition: the team can revise one shot without rebuilding the scene.

## Phase 3 — Lock continuity before prompting

Attach visible entities and locations to every shot. Show unresolved items clearly. Keep the asset library independent from workflow stages.

Success condition: no prompt generation begins with an unresolved visible character or location.

## Phase 4 — Compile prompt masters

Maintain scene-level style and negative prompts once. Compile shot-specific masters only after continuity approval.

Success condition: reviewers can compare creative intent and model-facing input.

## Phase 5 — Add persistent queues and recovery

Track `queued`, `running`, `completed`, and `failed`. Save successful shot outputs immediately. Retry only the missing work.

Success condition: one timeout cannot destroy completed work.

## Phase 6 — Gate expensive rendering

Snapshot inputs, show scope and cost, require human approval, and preserve every attempt.

Success condition: no external render runs without an attributable decision.

## Phase 7 — Add deterministic previz where it pays

Use 3D layout for scenes where spatial consistency, eyelines, scale, choreography, or camera continuity create repeated generation failures.

Success condition: layout corrections occur before video credits are spent.

## Minimum viable team

| Responsibility | May be combined in a small team |
|---|---|
| Screenplay and adaptation | Writer |
| Creative approval | Director or supervisor |
| Asset identity and continuity | Art / continuity lead |
| Prompt and generation review | AI animation artist |
| Cost approval and scheduling | Producer |
| Integrations and reliability | Technical director |

## Vendor-neutral integration checklist

For every LLM, image, or video provider, confirm:

- supported input and output formats;
- structured output reliability;
- maximum request and response sizes;
- timeout behavior;
- job status and cancellation;
- content retention policy;
- cost reporting;
- regional and privacy requirements;
- rate limits;
- model version pinning;
- reproducibility metadata.

## Before public demonstration

- Use original or licensed demo material.
- Remove unreleased story content and client names.
- Use anonymized screenshots.
- Never expose admin URLs, keys, tokens, user emails, or audit logs.
- Label estimates as estimates.
- Separate the public framework from the private production deployment.
