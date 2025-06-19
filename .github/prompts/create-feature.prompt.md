# Create a New Feature Prompt

> **Note:** If `init-project.prompt.md` is not present, you must still create user stories and tasks in the `.project/epics/epic_XXX_user_stories/` and `.project/tasks/` directories, using the mandatory templates and structure described below. The folder structure and templates are always mandatory and must be respected.

---
## Constraints
- Ask concise, grouped questions (no more than 3 at a time) to clarify and challenge the feature.
- Use the project conventions for user stories and tasks.
- Never generate code.
- Always ask for confirmation before proceeding to the next step.
- When breaking down user stories into tasks, you must load and leverage the `.project` knowledge base to clarify intent and challenge technical choices (architecture, layering, DDD, test strategy).
- Explicitly challenge and validate technical decisions at each step, referencing the `.project` knowledge base and project rules.
- **User stories must always be created in `.project/epics/epic_XXX_user_stories/` and tasks in `.project/tasks/`, using the templates below, even if `init-project.prompt.md` is not present.**

## Step 1: Define the User Story

We will start by creating a user story using the following template:

- User stories must be created in `.project/epics/epic_XXX_user_stories/` using the template below.
- Always use the following template and keep acceptance criteria in Gherkin (Given-When-Then) format:

```markdown
# User Story [XXX]

**As a** [role or persona]
**I want** [to perform an action or achieve a goal]
**So that** [I get a specific value or benefit]

**Status**: [Draft | In Progress | Done]
**Progress**: [0%]

## 3 Amigos Session
- Participants: [List participants]
- Date: [YYYY-MM-DD]
- Notes: [Add notes or leave blank]

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

### Please provide the following information:
- Role or persona
- Action or goal
- Value or benefit
- 3 Amigos session details (optional)
- Acceptance criteria (at least one scenario)

**Once you are satisfied with the user story, type 'next' to continue to the next step. Otherwise, you can edit or add more details.**

---

## Step 2: Discover and List the Tasks

Now, let's break down the user story into actionable tasks. For each task, we will use the following template:

- Tasks must be created in `.project/tasks/` using the template below.

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
- [ ] What tools or frameworks will be used for testing?

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

### Please list all the tasks required to implement the user story. For each task, specify:
- A short, action-oriented description
- The files to create or modify
- How you would test it (TDD notes)

**If you are unsure about the breakdown, I will suggest possible tasks and ask for your input or validation.**

**Once you are satisfied with the task list, type 'finish' to complete the feature definition. Otherwise, you can edit or add more details.**

---

## Iterative Process
- At each step, you can review, edit, or add more details before moving to the next.
- If there are multiple ways to break down the work, I will ask clarifying questions and suggest options.
- You control when to proceed to the next step by typing 'next' or 'finish'.
- At each step, I will reference the `.project` knowledge base and project rules to challenge and validate your technical choices.

---

This prompt ensures that every new feature is well-defined, testable, and broken down into actionable tasks, following TDD, DDD, and project conventions. All technical decisions must be challenged and validated using the `.project` knowledge base and project rules.

