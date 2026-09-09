export type IssueStatus =
  | 'backlog'
  | 'todo'
  | 'in_progress'
  | 'in_review'
  | 'done'
  | 'cancelled';

export type IssuePriority = 'none' | 'urgent' | 'high' | 'medium' | 'low';

export interface IssueComment {
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
  comments: IssueComment[];
}

export interface ProjectSummary {
  slug: string;
  name: string;
  description: string;
  status: string;
  openIssues: number;
  totalIssues: number;
}

export interface ProjectFull {
  slug: string;
  name: string;
  description: string;
  status: string;
  issues: Issue[];
  openIssues?: number;
  totalIssues?: number;
}

export const ISSUE_STATUSES: IssueStatus[] = [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
];

export const ISSUE_PRIORITIES: IssuePriority[] = [
  'none',
  'urgent',
  'high',
  'medium',
  'low',
];

export function statusLabel(status: IssueStatus): string {
  switch (status) {
    case 'backlog':
      return 'Backlog';
    case 'todo':
      return 'To do';
    case 'in_progress':
      return 'In progress';
    case 'in_review':
      return 'In review';
    case 'done':
      return 'Done';
    case 'cancelled':
      return 'Cancelled';
  }
}
