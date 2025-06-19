# Project Init Prompt

This prompt defines the project initialization procedure. The folder structure and templates are mandatory: no questions will be asked about structure or format, and no contextual adaptation is expected. Every initialization must strictly follow this standard.

However, you will be asked a small set of concise, grouped questions (no more than 3 at a time) to help fill in the required content for documentation files such as `project_overview.md`. Only the content is interactive; the structure and templates are fixed.

---

## Mandatory Folder Structure

```
.project/
├── knowledge/
│   └── project_overview.md
├── epics/
│   ├── epic_001.md
│   ├── epic_001_user_stories/
│   │   ├── epic_001_us_001.md
│   │   ├── epic_001_us_002.md
│   │   └── ...
│   ├── epic_002.md
│   ├── epic_002_user_stories/
│   │   └── ...
│   └── ...
├── tasks/
│   ├── task_001.md
│   ├── task_002.md
│   └── ...
```

---

## Mandatory Templates

### .project/knowledge/project_overview.md
```markdown
# Project Overview

## Context
{{Please describe the business context and main goals.}}

## Architecture
- Clean Architecture
- DDD principles
- Deployment: {{Specify deployment type: Monolith, Monorepo, Microservices, or other.}}
- {{List all relevant architecture details, integrations, and patterns.}}

## Main Flows
- {{List all main flows, e.g. order creation, event publishing, etc.}}

## C4 Context Diagram (optional, Mermaid)
```mermaid
C4Context
    %% Example: Person, System, Container, Relationship
    %% Add your C4 context diagram here to situate the service in its ecosystem
```
```

During initialization, you will be prompted to provide:
- The business context and main goals
- The deployment type (Monolith, Monorepo, Microservices, or other)
- All relevant architecture details and integrations (do not leave generic)
- All main flows (do not leave generic)
- Optionally, a Mermaid C4 context diagram to situate the service in its ecosystem

---

### .project/epics/epic_XXX.md
```markdown
# Epic XXX: [Epic title]

## Description
[Short business description of the epic]
```

---

### .project/epics/epic_XXX_user_stories/epic_XXX_us_XXX.md
```markdown
# User Story XXX

**As a** [role or persona]
**I want** [to perform an action or achieve a goal]
**So that** [I get a specific value or benefit]

**Status**: [Draft | In Progress | Done]
**Progress**: [0%]

## 3 Amigos Session
- Participants: [List of participants]
- Date: [YYYY-MM-DD]
- Notes: [Notes or leave blank]

## Acceptance Criteria (Given-When-Then)

- **Scenario 1: [Short scenario title]**
  - **Given** [context or precondition]
  - **When** [action or event]
  - **Then** [expected outcome]

- **Scenario 2: ...**
  - **Given** ...
  - **When** ...
  - **Then** ...

## Linked Tasks
- [task_XXX](../../../tasks/task_XXX.md)
```

---

### .project/tasks/task_XXX.md
```markdown
# Tasks for User Story [XXX]

**User Story Reference**  
- [epic_XXX_us_XXX](../epics/epic_XXX_user_stories/epic_XXX_us_XXX.md)

## Task List
- [ ] Task 1: [Short, action-oriented description]
- [ ] Task 2: [Short, action-oriented description]
- [ ] Task 3: [Short, action-oriented description]

## Files to Create or Modify
- [ ] /path/to/file1.ext (new or modify)
- [ ] /path/to/file2.ext (new or modify)
- [ ] /path/to/file3.ext (new or modify)

## How to Test (TDD Notes)
- [ ] What is the expected behavior for each task?
- [ ] What unit or integration tests should be written first?
- [ ] What are the acceptance criteria for each test?
- [ ] What tools/frameworks will be used for testing?

**Context**  
[Optional: Briefly explain why these tasks are needed or what they relate to]

**Acceptance Criteria (Given-When-Then)**

- **Scenario 1: [Short scenario title]**
  - **Given** [context or precondition]
  - **When** [action or event]
  - **Then** [expected outcome]

- **Scenario 2: ...**
  - **Given** ...
  - **When** ...
  - **Then** ...
```

---

## Rule

- Every project initialization must follow this prompt, with no adaptation or questions about structure or format.
- The templates and structure are mandatory and aligned with those of the feature creation prompt.
- The only questions asked will be to help you fill in the content of documentation files (e.g., project_overview.md).
- The goal is to ensure documentation consistency and traceability from the very beginning of the project.
