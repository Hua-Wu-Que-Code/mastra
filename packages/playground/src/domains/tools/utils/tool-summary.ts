import { t } from '@mastra/playground-ui/lib/i18n';
import type { MessageKey } from '@mastra/playground-ui/lib/i18n';

// Product copy stays separate from the instructions sent to the model.
const summaries: Record<string, MessageKey> = {
  'count-text': 'Count characters and paragraphs in text.',
  countText: 'Count characters and paragraphs in text.',
  web_fetch: 'Read a web page.',
  web_search: 'Search the web and return sources.',
  ask_user: 'Ask a question and wait for your answer.',
  submit_plan: 'Submit a written plan for your approval.',
  task_write: 'Create a task list.',
  task_update: 'Update a task in the list.',
  task_complete: 'Mark a task as complete.',
  task_check: 'Check progress on the task list.',
  session_search: 'Find text in saved conversations.',
  present: 'Make workspace files available for download.',
  read_document: 'Read text from Office documents and PDFs.',
  subagent: 'Create a background sub-agent for a task.',
  subagent_fork: 'Create a sub-agent from the current conversation.',
  list_agents: 'List sub-agents and their status.',
  send_message: 'Send a message to a sub-agent.',
  wait_agent: 'Wait for sub-agent updates.',
  interrupt_agent: 'Stop a sub-agent and keep its conversation.',
  team_task_create: 'Create a task on the shared team board.',
  team_task_get: 'Read a task on the shared team board.',
  team_task_list: 'List tasks on the shared team board.',
  team_task_claim: 'Claim a task on the shared team board.',
  team_task_update: 'Update a task on the shared team board.',
  read_file: 'Read a workspace file.',
  mastra_workspace_read_file: 'Read a workspace file.',
  write_file: 'Write content to a workspace file.',
  mastra_workspace_write_file: 'Write content to a workspace file.',
  edit_file: 'Edit part of a workspace file.',
  mastra_workspace_edit_file: 'Edit part of a workspace file.',
  mastra_workspace_ast_edit: 'Edit code using its syntax structure.',
  list_files: 'List files in the workspace.',
  mastra_workspace_list_files: 'List files in the workspace.',
  delete: 'Delete a workspace file.',
  mastra_workspace_delete: 'Delete a workspace file.',
  file_stat: 'View file size and modification time.',
  mastra_workspace_file_stat: 'View file size and modification time.',
  mkdir: 'Create a workspace folder.',
  mastra_workspace_mkdir: 'Create a workspace folder.',
  grep: 'Find text in workspace files.',
  mastra_workspace_grep: 'Find text in workspace files.',
  knowledge_search: 'Search the knowledge base.',
  knowledge_read: 'Read a knowledge base page.',
  knowledge_list: 'List knowledge base pages.',
  knowledge_edit: 'Update a knowledge base page.',
  knowledge_write: 'Update a knowledge base page.',
  knowledge_page: 'Create, edit, move, merge or delete knowledge pages.',
  knowledge_note: 'Manage saved knowledge notes.',
  knowledge_pin: 'Pin knowledge pages or lists to conversation context.',
  skill_search: 'Find an available skill.',
  skill_read: 'Read a skill and its instructions.',
  skill: 'Read a skill and its instructions.',
  skill_list: 'List available skills.',
  recall: 'Read messages from conversation history.',
  updateWorkingMemory: 'Update saved preferences and context.',
  'update-working-memory': 'Update saved preferences and context.',
  'workflow-textReview': 'Check text length against a target.',
};

export function toolSummary(id: string, description = '') {
  const key = summaries[id];
  return key
    ? t(key)
    : description
        .split(/\n\s*\n/)[0]
        .replace(/\s+/g, ' ')
        .trim();
}
