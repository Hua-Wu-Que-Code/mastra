import { randomUUID } from "node:crypto";
import { SubagentRuntime, SubagentError } from "./runtime";
import type { Actor } from "./runtime";
import type { TeamTask, Tree } from "./store";

export interface TaskUpdate {
  task_id: string;
  expected_revision: number;
  action:
    | "claim"
    | "release"
    | "edit"
    | "set_dependencies"
    | "complete"
    | "reopen"
    | "reassign"
    | "delete";
  subject?: string;
  description?: string;
  blocked_by?: string[];
  write_scopes?: string[];
  owner?: string;
}
function ready(tree: Tree, task: TeamTask) {
  return (
    task.status === "pending" &&
    task.blockedBy.every(
      (id) => tree.tasks.find((task) => task.id === id)?.status === "completed",
    )
  );
}
function view(tree: Tree, task: TeamTask) {
  const warnings = tree.tasks
    .filter(
      (other) =>
        other.id !== task.id &&
        other.status === "in_progress" &&
        other.writeScopes.some((a) =>
          task.writeScopes.some(
            (b) => a === b || a.startsWith(b + "/") || b.startsWith(a + "/"),
          ),
        ),
    )
    .map((task) => task.id);
  return { ...task, ready: ready(tree, task), writeScopeWarnings: warnings };
}
function dependencies(tree: Tree, id: string, blockedBy: string[]) {
  if (
    new Set(blockedBy).size !== blockedBy.length ||
    blockedBy.some(
      (block) => block === id || !tree.tasks.some((task) => task.id === block),
    )
  )
    throw new SubagentError(
      "INVALID_DEPENDENCIES",
      "Dependencies must name distinct existing tasks.",
    );
  const reaches = (node: string, visited = new Set<string>()): boolean => {
    if (node === id) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    return (tree.tasks.find((task) => task.id === node)?.blockedBy ?? []).some(
      (next) => reaches(next, visited),
    );
  };
  if (blockedBy.some((block) => reaches(block)))
    throw new SubagentError(
      "DEPENDENCY_CYCLE",
      "Tasks cannot depend on themselves indirectly.",
    );
}
export class TeamBoard {
  constructor(private runtime: SubagentRuntime) {}
  private async allowed(actor: Actor) {
    if (!(await this.runtime.teamEnabled(actor)))
      throw new SubagentError(
        "TEAM_DISABLED",
        "Shared tasks are disabled for this root conversation.",
      );
  }
  async create(
    actor: Actor,
    input: {
      subject: string;
      description: string;
      blocked_by?: string[];
      write_scopes?: string[];
    },
  ) {
    await this.allowed(actor);
    return this.runtime.store.edit(actor.owner, actor.root, (tree) => {
      const task: TeamTask = {
        id: randomUUID(),
        subject: input.subject,
        description: input.description,
        blockedBy: input.blocked_by ?? [],
        writeScopes: input.write_scopes ?? [],
        revision: 1,
        status: "pending",
      };
      dependencies(tree, task.id, task.blockedBy);
      tree.tasks.push(task);
      return view(tree, task);
    });
  }
  async list(
    actor: Actor,
    input: {
      status?: TeamTask["status"];
      owner?: string;
      unowned?: boolean;
      ready?: boolean;
      cursor?: number;
      limit?: number;
    },
  ) {
    await this.allowed(actor);
    const tree = await this.runtime.store.read(actor.owner, actor.root);
    const filtered = tree.tasks.filter(
      (task) =>
        (input.status === undefined || task.status === input.status) &&
        (input.owner === undefined || task.owner === input.owner) &&
        (input.unowned === undefined ||
          (task.owner === undefined) === input.unowned) &&
        (input.ready === undefined || ready(tree, task) === input.ready),
    );
    const start = input.cursor ?? 0,
      limit = input.limit ?? 50;
    return {
      tasks: filtered
        .slice(start, start + limit)
        .map((task) => view(tree, task)),
      nextCursor: start + limit < filtered.length ? start + limit : undefined,
    };
  }
  async get(actor: Actor, id: string) {
    await this.allowed(actor);
    const tree = await this.runtime.store.read(actor.owner, actor.root);
    const task = tree.tasks.find((task) => task.id === id);
    if (!task)
      throw new SubagentError("TASK_NOT_FOUND", "No task in this tree.");
    return view(tree, task);
  }
  async update(actor: Actor, input: TaskUpdate) {
    await this.allowed(actor);
    return this.runtime.store.edit(actor.owner, actor.root, (tree) => {
      const task = tree.tasks.find((task) => task.id === input.task_id);
      if (!task)
        throw new SubagentError("TASK_NOT_FOUND", "No task in this tree.");
      if (task.revision !== input.expected_revision)
        throw new SubagentError(
          "REVISION_CONFLICT",
          "Read the latest task before changing it.",
        );
      const self =
        actor.self === actor.root
          ? "lead"
          : tree.children.find((child) => child.id === actor.self)?.name;
      const isLead = actor.self === actor.root;
      if (["reassign", "delete"].includes(input.action) && !isLead)
        throw new SubagentError(
          "UNAUTHORIZED",
          "Only the lead can reassign or delete tasks.",
        );
      if (
        task.owner &&
        task.owner !== self &&
        !["reassign", "delete"].includes(input.action)
      )
        throw new SubagentError(
          "TASK_OWNED",
          "Only the owner can update this task.",
        );
      switch (input.action) {
        case "claim":
          if ((task.owner && task.owner !== self) || !ready(tree, task))
            throw new SubagentError(
              "TASK_NOT_READY",
              "Claim an unowned ready task.",
            );
          task.owner = self;
          task.status = "in_progress";
          break;
        case "release":
          task.owner = undefined;
          task.status = "pending";
          break;
        case "complete":
          if (task.owner !== self || task.status !== "in_progress")
            throw new SubagentError(
              "TASK_NOT_READY",
              "Claim the task before completing it.",
            );
          task.status = "completed";
          break;
        case "reopen":
          task.status = "pending";
          break;
        case "reassign":
          if (
            input.owner &&
            input.owner !== "lead" &&
            !tree.children.some((child) => child.name === input.owner)
          )
            throw new SubagentError(
              "UNAUTHORIZED",
              "Owner must belong to this tree.",
            );
          task.owner = input.owner;
          task.status = "pending";
          break;
        case "edit":
          if (input.subject !== undefined) task.subject = input.subject;
          if (input.description !== undefined)
            task.description = input.description;
          if (input.write_scopes !== undefined)
            task.writeScopes = input.write_scopes;
          break;
        case "set_dependencies":
          dependencies(tree, task.id, input.blocked_by ?? []);
          task.blockedBy = input.blocked_by ?? [];
          break;
        case "delete":
          if (tree.tasks.some((other) => other.blockedBy.includes(task.id)))
            throw new SubagentError(
              "TASK_REFERENCED",
              "Remove dependencies before deleting the task.",
            );
          tree.tasks = tree.tasks.filter((other) => other.id !== task.id);
          break;
      }
      task.revision++;
      return view(tree, task);
    });
  }
}
