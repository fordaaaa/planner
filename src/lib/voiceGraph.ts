import type { Edge } from '@xyflow/react';
import type { WorkflowGraph, WorkflowNode } from './types';

export type CommandKeyword = 'start' | 'agent' | 'subagent' | 'tool' | 'decision' | 'end';

export interface Command {
  keyword: CommandKeyword;
  label: string;
}

const KEYWORDS: CommandKeyword[] = ['start', 'agent', 'subagent', 'tool', 'decision', 'end'];
const KEYWORD_PATTERN = new RegExp(`\\b(${KEYWORDS.join('|')})\\b`, 'gi');

export class VoiceGraphError extends Error {}

export function tokenizeCommands(transcript: string): Command[] {
  const matches = [...transcript.matchAll(KEYWORD_PATTERN)];
  const commands: Command[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const keyword = match[1].toLowerCase() as CommandKeyword;
    const labelStart = match.index! + match[0].length;
    const labelEnd = i + 1 < matches.length ? matches[i + 1].index! : transcript.length;
    const label = transcript.slice(labelStart, labelEnd).replace(/^[\s,:.-]+|[\s,:.-]+$/g, '');
    commands.push({ keyword, label });
  }

  return commands;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

const MAIN_STEP_HEIGHT = 160;
const MAIN_X = 300;
const SUBAGENT_X_START = 560;
const SUBAGENT_X_STEP = 220;

export function commandsToGraph(commands: Command[]): WorkflowGraph {
  const nodes: WorkflowNode[] = [];
  const edges: Edge[] = [];

  let startId: string | null = null;
  let lastAgentId: string | null = null;
  let lastAgentY = 0;
  let currentChildren: string[] = [];
  let mainStep = 0;
  let ended = false;

  const addNode = (id: string, kind: WorkflowNode['data']['kind'], label: string, x: number, y: number) => {
    nodes.push({
      id,
      type: 'agent',
      position: { x, y },
      data: { label: label || kind, kind, description: '' },
    });
  };

  const addEdge = (source: string, target: string, kind: 'sequence' | 'spawn') => {
    edges.push({
      id: nextId('edge'),
      source,
      target,
      className: kind === 'spawn' ? 'spawn-edge' : undefined,
    });
  };

  const leaves = (): string[] => {
    if (currentChildren.length) return currentChildren;
    if (lastAgentId) return [lastAgentId];
    if (startId) return [startId];
    return [];
  };

  for (const { keyword, label } of commands) {
    if (ended) {
      throw new VoiceGraphError(`Heard "${keyword}" after "end" — workflow is already closed`);
    }

    switch (keyword) {
      case 'start': {
        if (startId) throw new VoiceGraphError('Heard a second "start" — a workflow can only have one');
        startId = nextId('start');
        addNode(startId, 'start', label, MAIN_X, mainStep * MAIN_STEP_HEIGHT);
        break;
      }

      case 'agent':
      case 'tool':
      case 'decision': {
        if (!startId) throw new VoiceGraphError(`Heard "${keyword}" before "start"`);
        mainStep += 1;
        const id = nextId(keyword);
        const y = mainStep * MAIN_STEP_HEIGHT;
        addNode(id, keyword, label, MAIN_X, y);
        for (const source of leaves()) addEdge(source, id, 'sequence');
        lastAgentId = id;
        lastAgentY = y;
        currentChildren = [];
        break;
      }

      case 'subagent': {
        if (!lastAgentId) throw new VoiceGraphError('Heard "subagent" before any "agent"');
        const id = nextId('subagent');
        const x = SUBAGENT_X_START + currentChildren.length * SUBAGENT_X_STEP;
        addNode(id, 'subagent', label, x, lastAgentY + 90);
        addEdge(lastAgentId, id, 'spawn');
        currentChildren.push(id);
        break;
      }

      case 'end': {
        if (!startId) throw new VoiceGraphError('Heard "end" before "start"');
        mainStep += 1;
        const id = nextId('end');
        addNode(id, 'end', label, MAIN_X, mainStep * MAIN_STEP_HEIGHT);
        for (const source of leaves()) addEdge(source, id, 'sequence');
        ended = true;
        break;
      }
    }
  }

  return { nodes, edges };
}

export function transcriptToGraph(transcript: string): WorkflowGraph {
  return commandsToGraph(tokenizeCommands(transcript));
}
