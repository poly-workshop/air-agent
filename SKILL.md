---
name: slips-skill
description: Use for Slips task management requests (create, read, update, delete, list, archive, and checklist operations) through slips-mcp.
---

# Slips Task Management

Use this skill when the user asks to manage tasks in Slips.

## Scope

This skill covers task operations backed by:

- `slips-mcp` (MCP tool layer)
- `slips-core` Task gRPC API
- User-scoped authentication (JWT or MCP token depending on integration)

It is optimized for practical task workflows: capture, update, review, archive, and checklist management.

## When to Use

Use this skill for requests like:

- "Create a task"
- "Show my tasks"
- "Update this task title/notes/tags/start date"
- "Archive/unarchive this task"
- "Manage checklist items for this task"

## Supported Operations (Tool Mapping)

### Task CRUD

- `create_task`
	- Required: `title`
	- Optional: `notes`, `tag_names`, `start_date`
- `get_task`
	- Required: `id`
- `update_task`
	- Required: `id`, `title`
	- Optional: `notes`, `tag_names`, `start_date`
- `delete_task`
	- Required: `id`

### Task Listing and Archive State

- `list_tasks`
	- Optional: `page_size`, `page_token`, `filter_tag_ids`, `include_archived`, `archived_only`
- `archive_task`
	- Required: `id`
- `unarchive_task`
	- Required: `id`

### Checklist Operations

- `add_checklist_item`
	- Required: `task_id`, `content`
- `update_checklist_item`
	- Required: `item_id`, `content`
- `set_checklist_item_completed`
	- Required: `item_id`, `completed`
- `delete_checklist_item`
	- Required: `item_id`
- `reorder_checklist_items`
	- Required: `task_id`, `item_ids`
	- Note: `item_ids` must contain the complete final order.

## Data and Field Conventions

- `start_date` format: `YYYY-MM-DD`
- `start_date = null` (or empty when mapped by server) means Inbox/no start date
- IDs are UUID strings
- Tasks are user-scoped; users can only access their own resources

## Default Execution Strategy

1. Resolve intent from user text.
2. Prefer a quick Web Search to gather up-to-date context when the request involves external facts, tools, APIs, best practices, or potentially outdated knowledge.
3. Break non-trivial requests into a checklist before execution (either explicit checklist items in Slips tasks, or an internal execution checklist).
4. Ask for missing required fields only when necessary.
5. Execute the smallest valid operation.
6. Return concise, user-friendly confirmation.
7. For list requests, preserve pagination context (`next_page_token`) when present.

## Interaction Rules

- Prefer direct execution over long explanations.
- Research-first behavior: if uncertain or if information may have changed, do Web Search first, then act.
- Checklist-first behavior: for multi-step goals, produce or maintain a checklist and execute step-by-step.
- If a user references "this task" ambiguously, ask one clarifying question for task ID or unique title context.
- For destructive actions (`delete_task`), confirm intent if user wording is uncertain.
- For archive requests, use archive/unarchive tools instead of delete.

## Research and Checklist Policy

- Encourage web research before implementation when quality depends on current external information.
- Prefer authoritative sources and summarize findings briefly before taking action.
- Convert complex goals into clear checklist items with actionable wording.
- Use checklist updates to track progress and reduce missed details.
- Keep the checklist minimal for simple requests; expand only when complexity requires it.

## Error Handling

- Missing required field: ask for only the missing field(s).
- Not found / unauthorized: explain that the task may not exist or may not belong to the current user.
- Invalid format (for example, bad `start_date`): request corrected input with expected format.

## Authentication Notes

- In `slips-core`, task access is authenticated and user-scoped.
- Common auth patterns:
	- `Authorization: Bearer <jwt-token>` for JWT flows
	- `Authorization: MCP-Token <uuid>` for MCP token flows

## Out of Scope

- Project management features not exposed by current Slips MCP tools
- Non-task domains unless explicitly routed to other skills/tools

