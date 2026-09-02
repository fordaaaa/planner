import { describe, expect, it } from 'vitest';
import { commandsToGraph, tokenizeCommands, VoiceGraphError } from './voiceGraph';

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

  it('is case-insensitive and strips punctuation from labels', () => {
    const commands = tokenizeCommands('Start: build it. Agent, build website.');
    expect(commands).toEqual([
      { keyword: 'start', label: 'build it' },
      { keyword: 'agent', label: 'build website' },
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
    const start = graph.nodes.find((n) => n.data.kind === 'start')!;
    const end = graph.nodes.find((n) => n.data.kind === 'end')!;

    expect(graph.edges).toContainEqual(expect.objectContaining({ source: start.id, target: agent.id }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: agent.id, target: sub1.id }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: agent.id, target: sub2.id }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: sub1.id, target: end.id }));
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: sub2.id, target: end.id }));
  });

  it('chains sequential agents with no subagents directly', () => {
    const graph = commandsToGraph(tokenizeCommands('start go agent one agent two end'));
    const [n1, n2] = graph.nodes.filter((n) => n.data.kind === 'agent');
    expect(graph.edges).toContainEqual(expect.objectContaining({ source: n1.id, target: n2.id }));
  });

  it('rejects a second start', () => {
    expect(() => commandsToGraph(tokenizeCommands('start a start b'))).toThrow(VoiceGraphError);
  });

  it('rejects subagent before any agent', () => {
    expect(() => commandsToGraph(tokenizeCommands('start a subagent b'))).toThrow(VoiceGraphError);
  });

  it('rejects agent before start', () => {
    expect(() => commandsToGraph(tokenizeCommands('agent a'))).toThrow(VoiceGraphError);
  });

  it('rejects commands after end', () => {
    expect(() => commandsToGraph(tokenizeCommands('start a end agent b'))).toThrow(VoiceGraphError);
  });
});
