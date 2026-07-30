# Reference architecture

## System boundary

LIGHTBRINGER is a production orchestration layer positioned between creative teams and generative providers.

```mermaid
flowchart TB
    subgraph People["Human production team"]
        W["Writer"]
        R["Reviewer / IP supervisor"]
        D["Director / storyboard artist"]
        P["Producer"]
    end

    subgraph Core["LIGHTBRINGER control layer"]
        UX["Focused production UI"]
        SM["Workflow state machine"]
        Q["Persistent queues"]
        V["Versions and audit"]
        REG["Entity + asset registry"]
        COST["Cost approval gate"]
    end

    subgraph Intelligence["Bounded AI services"]
        TEXT["LLM analysis and compilation"]
        IMAGE["Storyboard image generation"]
        VIDEO["Video generation"]
    end

    subgraph Deterministic["Deterministic production tools"]
        BL["Blender layout worker"]
        CHECK["Spatial and identity validation"]
    end

    subgraph Data["Production data"]
        DB["Structured shared database"]
        MEDIA["Versioned media storage"]
    end

    People --> UX
    UX --> SM
    SM --> Q
    SM --> V
    SM --> REG
    SM --> COST
    Q --> TEXT
    COST --> IMAGE
    COST --> VIDEO
    Q <--> BL
    BL --> CHECK
    Core <--> Data
    Intelligence <--> Data
    Deterministic <--> Data
```

## Design principles

### Deterministic orchestration

LLMs should not own permissions, workflow transitions, job claiming, cost approval, version restoration, or audit history. Those are deterministic software responsibilities.

### Bounded model calls

Every request should have:

- a defined production stage;
- a limited source segment;
- a structured response schema;
- a known retry boundary;
- an immediately persisted result.

### Single source of identity

One entity registry should supply names and aliases to:

- screenplay analysis;
- shot entity lists;
- asset library matching;
- continuity locks;
- prompt compilation;
- 3D proxies and validation;
- render snapshots.

### Immutable render snapshots

A render attempt should reference the exact:

- screenplay revision;
- shot revision;
- asset versions;
- common prompt;
- shot prompt;
- negative prompts;
- layout or storyboard input;
- provider and model.

Later edits create a new attempt rather than rewriting the historical input.

## Suggested logical data model

```mermaid
erDiagram
    PROJECT ||--o{ SCENE : contains
    SCENE ||--o{ SCREENPLAY_REVISION : has
    SCENE ||--o{ SEGMENT : divides
    SEGMENT ||--o{ SHOT : contains
    SHOT ||--o{ SHOT_ENTITY : displays
    ENTITY ||--o{ SHOT_ENTITY : referenced_by
    ENTITY ||--o{ ENTITY_ASSET : represented_by
    ASSET ||--o{ ENTITY_ASSET : linked
    SHOT ||--o{ ASSET_LOCK : freezes
    ASSET ||--o{ ASSET_LOCK : selected
    SHOT ||--o{ PROMPT_REVISION : compiles
    SHOT ||--o{ LAYOUT_REVISION : positions
    SHOT ||--o{ RENDER_JOB : generates
    RENDER_JOB ||--o{ RENDER_RESULT : produces
    SCENE ||--o{ COMMENT : discusses
    SCENE ||--o{ AUDIT_EVENT : records
```

## Provider abstraction

Production data should not depend on one vendor's response shape.

The system should normalize:

- provider availability;
- model selection;
- timeout and retry semantics;
- structured output parsing;
- token and cost metadata;
- provider error messages;
- media job status.

The provider adapter returns a canonical production result. The workflow layer decides what happens next.

## Local 3D worker pattern

Cloud applications cannot directly control a studio workstation running Blender. A safe pattern is outbound polling:

1. The local worker authenticates to LIGHTBRINGER.
2. It claims one queued layout or capture job with a lease.
3. It downloads coordinates and a deterministic script.
4. Blender renders clay, depth, or validation passes.
5. The worker uploads results and releases the claim.
6. Expired claims return to the queue.

This avoids inbound ports, fixed IP requirements, and duplicate execution.

## Security boundary

A commercial deployment should include:

- authenticated users and explicit invitations;
- least-privilege roles;
- owner-only destructive actions;
- server-side API keys;
- signed or authenticated media delivery;
- audit logs for login, permission, deletion, approval, and restore events;
- private object storage for production media;
- rate limits and budget ceilings;
- backup and recovery tests.

Public documentation must never include production credentials, client media, private prompts, or unreleased story content.
