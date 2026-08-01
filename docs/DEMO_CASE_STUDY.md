# Working demo case study — ORBITAL ECHO

[English](DEMO_CASE_STUDY.md) · [한국어](DEMO_CASE_STUDY.ko.md)

This case study shows LIGHTBRINGER operating on an original, non-client screenplay. It was created to demonstrate the product without exposing an unreleased title, production asset, user account, or API credential.

> Proposed and system-architected by **AI Creator BAO** · Developed and operated by **STUDIO GENESIS**

## Demo scope

| Metric | Result |
| --- | ---: |
| Screenplay duration | 42 seconds |
| Safe work segments | 2 |
| Production shots | 6 |
| Character identities | 3 |
| Location identities | 2 |
| Synchronized reference assets | 5 |
| Prompt masters | 6 Korean + 6 English + 6 storyboard |
| Completed storyboard jobs shown | 3 |
| Failed stages | 0 |

The screenshots were captured from the working LIGHTBRINGER application using an isolated public-demo mode. The mode uses the same application UI, API contracts, data schemas, progression rules, asset bindings, prompt surfaces, and render-history components as production. Its output is deterministic so reviewers can reproduce the walkthrough without spending model or video credits.

## Original screenplay input

```text
INT. LIGHTBRINGER OBSERVATION ROOM - ARTIFICIAL NIGHT

Blue starlight cuts across the cracked observation window. Pilot ARIA rests one hand on a fractured holographic console.

ARIA
(steadying her breath, eyes fixed on the window)
Forty-two seconds until the jump gate closes. If we miss it now, there is no way back.

Navigator NOX appears as a cyan hologram and reports an unregistered life sign. The black reconnaissance drone WARDEN-7 descends through a buckling ceiling panel.

ARIA
(turning toward the drone)
Drop the emergency bulkhead. I will verify the signal.
```

The complete sources are available in [English](../examples/orbital-echo/input-screenplay.en.txt) and [Korean](../examples/orbital-echo/input-screenplay.ko.txt).

## 1. Approved screenplay

The screenplay is reviewed before any model-intensive production stage. The selected scene shows its source, approval state, assignee, duration, and comment history.

![Approved screenplay in LIGHTBRINGER](../assets/demo/en/01-approved-screenplay.png)

## 2. Segment explorer and shot timing

LIGHTBRINGER divides the 42-second scene into two stable work units. Each segment remains independently selectable, retryable, and reviewable. The selected segment exposes one shot at a time instead of expanding every shot in the episode.

![Segment explorer and shot timing](../assets/demo/en/02-shot-design.png)

Example output for `DEMO-SH002`:

| Field | Locked value |
| --- | --- |
| Duration | 9 seconds |
| Framing | Medium close-up |
| Camera | Locked camera with subtle handheld vibration |
| Dialogue | Aria: Forty-two seconds until the jump gate closes. If we miss it now, there is no way back. |
| Visual direction | Red console error light reflects under Aria's face |
| Audio direction | Controlled breath and console error tone |

The machine-readable samples are available in [English](../examples/orbital-echo/shot-output.sample.en.json) and [Korean](../examples/orbital-echo/shot-output.sample.json).

## 3. Continuity and asset synchronization

Characters and locations are production identities, not names pasted into prompts. Each shot can use a different subset of scene assets. The green indicators show that the selected shot's visible character and location identities are bound.

![Continuity and asset synchronization](../assets/demo/en/03-continuity-assets.png)

Demo identities:

- `@ARIA_PILOT` — Aria, starship pilot;
- `@NOX_NAV` — Nox, cyan navigation hologram;
- `@WARDEN7_DRONE` — Warden-7, six-legged reconnaissance drone;
- `@LB_OBSERVATION` — LIGHTBRINGER observation room;
- `@LB_BREACH` — damaged starboard ceiling zone.

## 4. Prompt master

Prompt generation begins only after timing and continuity are ready. Shared style, terminology, and negatives are defined once. Every shot then receives seven structured layers plus three review surfaces:

- Korean master for human review;
- English master for video generation;
- English storyboard master for a still frame;
- shot-specific negative additions.

![Prompt master editor](../assets/demo/en/04-prompt-master.png)

The complete sample structure is available at [`examples/orbital-echo/prompt-master.sample.json`](../examples/orbital-echo/prompt-master.sample.json).

## 5. Render cost gate and result history

Render requests show eligible shots and estimated credits before execution. Completed attempts remain grouped by shot so regeneration never erases the earlier result.

![Render planning workspace](../assets/demo/en/05-render-storyboard.png)

![Completed storyboard attempts](../assets/demo/en/06-render-results.png)

### Demo storyboard contact sheet

![Three-shot ORBITAL ECHO storyboard](../assets/demo/lightbringer-demo-storyboard.png)

The concept frames are original demo material. They do not use a client title, existing character, or unreleased production asset.

## What this demonstrates

LIGHTBRINGER is not presented as another generation model. The demo proves the operating layer around multiple models:

1. a reviewed screenplay remains the source of truth;
2. long-form work is navigated through stable segments;
3. dialogue, visual direction, audio direction, performance, camera, and timing are editable production fields;
4. character and location identity is locked before prompt compilation;
5. Korean review intent and English generation input remain traceable;
6. credit-intensive rendering requires a human approval gate;
7. outputs, retries, and failures retain lineage.

## Reproduction boundary

The commercial application source, credentials, private database, and client media are not included in this repository. The public example contains sanitized inputs, representative outputs, screenshots, and schemas for workflow evaluation. Teams can use the [adoption guide](ADOPTION_GUIDE.md) to map the same stages onto their own stack.
