import { describe, expect, it } from 'vitest';
import { commandsToGraph, tokenizeCommands, WorkflowGraphError } from './workflowGraph';

describe('tokenizeCommands', () => {
  it('splits a transcript into keyword-led commands', () => {
    const commands = tokenizeCommands(
      'start build the website agent build website subagent check backend subagent check frontend end',
    );

    expect(commands).toEqual([
      { keyword: 'start', label: 'build the website' },
      { keyword: 'agent', label: 'build website' },
      { keyword: 'subagent', label: 'check backend' },
      { keyword: 'subagent', label: 'check frontend' },
      { keyword: 'end', label: '' },
    ]);
  });
});

describe('commandsToGraph', () => {
  it('builds the start -> agent -> two subagents -> end example', () => {
    const graph = commandsToGraph(
      tokenizeCommands(
        'start build the website agent build website subagent check backend subagent check frontend end',
      ),
    );

    const kinds = graph.nodes.map((n) => n.data.kind);
    expect(kinds).toEqual(['start', 'agent', 'subagent', 'subagent', 'end']);

    const agent = graph.nodes.find((n) => n.data.kind === 'agent')!;
    const [sub1, sub2] = graph.nodes.filter((n) => n.data.kind === 'subagent');
    const end = graph.nodes.find((n) => n.data.kind === 'end')!;

    expect(graph.edges).toContainEqual(expect.objectContaining({ source: agent.id, target: sub1.id }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: agent.id, target: sub2.id }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: sub1.id, target: end.id }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: sub2.id, target: end.id }));
  });

  it('rejects a second start', () => {
    expect(() => commandsToGraph(tokenizeCommands('start a start b'))).toThrow(WorkflowGraphError);
  });

  it('rejects agent before start', () => {
    expect(() => commandsToGraph(tokenizeCommands('agent a'))).toThrow(WorkflowGraphError);
  });

  it('rejects commands after end', () => {
    expect(() => commandsToGraph(tokenizeCommands('start a end agent b'))).toThrow(WorkflowGraphError);
  });
});
