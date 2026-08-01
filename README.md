# LIGHTBRINGER

### From approved screenplay to asset-consistent, cost-gated AI animation production

![LIGHTBRINGER — AI Animation Production System](assets/lightbringer-social-preview.png)

[English](README.md) · [한국어](docs/README.ko.md)

[**Run the public demo →**](#run-the-public-demo) · [60-second tour](docs/QUICK_TOUR.md) · [Working case study](docs/DEMO_CASE_STUDY.md) · [Workflow](docs/WORKFLOW.md) · [Discuss](https://github.com/jangrno123/lightbringer-ai-animation-system/discussions)

**Proposed and system-architected by AI Creator BAO · Developed and operated by STUDIO GENESIS**

> LIGHTBRINGER is the production control layer between an approved screenplay and image/video generation. It keeps shots editable, identities synchronized, costs visible, and every approval or retry traceable.

## See the working product

The original public demo **ORBITAL ECHO** follows one 42-second scene through the real LIGHTBRINGER workflow. It uses isolated deterministic data, so no client work, private account, credential, or external model credit is exposed.

![Segment explorer, shot timing, and editable production fields](assets/demo/en/focus-02-shot-design.png)

| Screenplay | Segments | Shots | Asset identities | Storyboard results | Failed stages |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 42 sec | 2 | 6 | 5 | 3 | 0 |

Start with the [60-second visual tour](docs/QUICK_TOUR.md), then inspect the complete [English](docs/DEMO_CASE_STUDY.md) or [Korean](docs/DEMO_CASE_STUDY.ko.md) case study.

## Run the public demo

The repository now includes a deployable clean-room demo with original dummy data. Node.js 20 or newer is the only local requirement.

```bash
npm start
```

Open `http://localhost:4173`. The default deterministic Mock API costs nothing. To connect your own LLM, store its key in server-side secret environment variables—never in the browser—and select either the Anthropic or OpenAI-compatible adapter.

[Self-hosting and BYO API guide →](docs/SELF_HOSTED_DEMO.md)

## What the system does

```text
approved screenplay
        ↓
segment explorer → shot design + timing
        ↓
continuity + versioned @asset identities
        ↓
Korean review master + English generation master
        ↓
storyboard / previz → human cost approval → video render
        ↓
result history, retry, version, recovery
```

| Production stage | Human decision | System output |
| --- | --- | --- |
| Screenplay | Writers and reviewers approve the source | Versioned screenplay and review history |
| Shot design | Artists edit split, camera, direction, dialogue, and timing | Navigable shot records |
| Continuity | The team confirms visible characters and locations per shot | Locked `@asset` identities and state |
| Prompt master | Directors review intent before generation | Korean, English-video, and storyboard masters |
| Render | A producer reviews targets and estimated cost | Preserved outputs, attempts, failures, and lineage |

## Why it exists

Generating a single AI shot is fast. Producing a coherent episode is an operations problem.

| Production failure | LIGHTBRINGER control |
| --- | --- |
| Characters and locations drift between shots | Versioned shot-level asset locks |
| Long scripts become hundreds of unmanageable cards | Segment explorer with one selected work unit |
| LLM output is truncated or times out | Fast batch path with targeted shot-level fallback |
| Korean creative intent diverges from English engine input | Parallel review and generation masters |
| Expensive renders are repeated too early | Human approval gate before paid generation |
| Completed work disappears during retry or deletion | Persistent history, trash, recovery, and lineage |

See the full [workflow specification](docs/WORKFLOW.md) and [reference architecture](docs/ARCHITECTURE.md).

## What is public

This repository is a **public workflow specification, working-product case study, and clean-room runnable demo**, not the commercial application source distribution.

Included:

- real application screenshots in Korean and English;
- an original neutral screenplay and editable shot records;
- bilingual prompt-master examples;
- a deployable dummy UI, deterministic Mock API, and server-side BYO API adapters;
- workflow, architecture, adoption, and evaluation documents;
- issue templates for production feedback.

Not included:

- customer or unreleased production data;
- reference media and private asset libraries;
- accounts, audit logs, admin routes, or API credentials;
- the commercial LIGHTBRINGER application source.

## Explore the repository

| If you want to… | Start here |
| --- | --- |
| Understand the product quickly | [60-second product tour](docs/QUICK_TOUR.md) |
| Inspect a complete run | [Working demo case study](docs/DEMO_CASE_STUDY.md) |
| Read the production rules | [Workflow specification](docs/WORKFLOW.md) |
| Evaluate system boundaries | [Architecture](docs/ARCHITECTURE.md) |
| Adopt the stages in another stack | [Adoption guide](docs/ADOPTION_GUIDE.md) |
| Evaluate outcomes without inflated claims | [Industry impact and metrics](docs/INDUSTRY_IMPACT.md) |
| Inspect machine-readable examples | [`examples/orbital-echo`](examples/orbital-echo/README.md) |
| Run safely or connect your own API | [Self-hosted demo guide](docs/SELF_HOSTED_DEMO.md) |

## Status and participation

LIGHTBRINGER is a working internal production system under active development at STUDIO GENESIS. The public framework is currently preparing the bilingual working-demo release.

- Review the [roadmap](ROADMAP.md) and [changelog](CHANGELOG.md).
- Share a bottleneck through the [workflow-feedback issue form](https://github.com/jangrno123/lightbringer-ai-animation-system/issues/new?template=workflow-feedback.yml).
- Start a broader conversation in [GitHub Discussions](https://github.com/jangrno123/lightbringer-ai-animation-system/discussions).
- Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change.

## STUDIO GENESIS

**AI Creator BAO** is the proposer and system architect of LIGHTBRINGER. **STUDIO GENESIS** develops and operates the system, connecting human creative decisions with reproducible production data.

[STUDIO GENESIS website](https://www.studiogenesis.co.kr) · [Citation](CITATION.cff) · [License](LICENSE)

The public documentation and diagrams are available under the repository license. `LIGHTBRINGER` and `STUDIO GENESIS` brand identifiers are excluded from the license grant.
