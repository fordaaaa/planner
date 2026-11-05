export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';

export type IssuePriority = 'none' | 'urgent' | 'high' | 'medium' | 'low';

export interface Comment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Issue {
  key: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  labels: string[];
  assignee: string | null;
  parent: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  action: 'issue_created' | 'issue_updated' | 'comment_added' | 'agent_note';
  issueKey?: string;
  detail: string;
}

export interface Project {
  slug: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'done';
  issueCounter: number;
  createdAt: string;
  updatedAt: string;
  issues: Issue[];
  activity?: ActivityEntry[];
}
