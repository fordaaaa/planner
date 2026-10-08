import { useCallback, useEffect, useState } from 'react';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from '@xyflow/react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import NodeInspector from './components/NodeInspector';
import BlocksPanel from './components/BlocksPanel';
import ShellPanel, { type ShellResult } from './components/ShellPanel';
import ConsentBanner from './components/ConsentBanner';
import { BLOCK_MAP, BLOCKS, TEMPLATE_MAP, WORKFLOW_TEMPLATES } from './lib/blocks';
import { formatStepList, parseShellLine, SHELL_HELP_LINES } from './lib/shell';
import { downloadMarkdown, downloadPrompt, graphToPromptChain } from './lib/planExport';
import VoicePanel from './components/VoicePanel';
import ToastStack from './components/ToastStack';
import ConfirmModal from './components/ConfirmModal';
import OnboardingHint from './components/OnboardingHint';
import ProjectsView from './pm/ProjectsView';
import BoardView from './pm/BoardView';
import { clearSavedGraph, exportGraph, getPersistPref, importGraph, loadFromLocalStorage, saveToLocalStorage, setPersistPref, type PersistPref } from './lib/graphStorage';
import { useToasts } from './lib/useToasts';
import type { WorkflowGraph, WorkflowNode, WorkflowNodeData } from './lib/types';
import './App.css';

const STARTER_GRAPH: { nodes: WorkflowNode[]; edges: Edge[] } = {
  nodes: [
    {
      id: 'start-1',
      type: 'agent',
      position: { x: 250, y: 50 },
      data: { label: 'Start', kind: 'start', description: '' },
    },
  ],
  edges: [],
};

let nodeIdCounter = 1;
function nextNodeId() {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

function App() {
  const [nodes, setNodes] = useState<WorkflowNode[]>(STARTER_GRAPH.nodes);
  const [edges, setEdges] = useState<Edge[]>(STARTER_GRAPH.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [shellOpen, setShellOpen] = useState(false);
  const [blocksOpen, setBlocksOpen] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [view, setView] = useState<'canvas' | 'pm'>('canvas');
  const [pmSlug, setPmSlug] = useState<string | null>(null);
  // null = user hasn't chosen yet (consent banner shows). Default is session-only:
  // every visit starts fresh unless they opt into browser saving.
  const [persist, setPersist] = useState<PersistPref | null>(() => getPersistPref());
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  useEffect(() => {
    if (getPersistPref() !== 'remember') return;
    const saved = loadFromLocalStorage();
    if (saved) {
      setNodes(saved.nodes);
      setEdges(saved.edges);
    }
  }, []);

  useEffect(() => {
    if (persist === 'remember') {
      saveToLocalStorage({ nodes, edges });
    }
  }, [nodes, edges, persist]);

  const onNodesChange: OnNodesChange<WorkflowNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [],
  );

  const addChainedNode = useCallback((parentId: string | null) => {
    const id = nextNodeId();

    setNodes((nds) => {
      const parent = parentId ? nds.find((n) => n.id === parentId) : null;
      const position = parent
        ? { x: parent.position.x, y: parent.position.y + 160 }
        : { x: 100 + Math.random() * 300, y: 100 + Math.random() * 300 };
      const newNode: WorkflowNode = {
        id,
        type: 'agent',
        position,
        data: { label: 'New step', kind: 'agent', description: '' },
      };
      return [...nds, newNode];
    });

    if (parentId) {
      setEdges((eds) => [...eds, { id: `edge-${id}`, source: parentId, target: id }]);
    }

    setSelectedId(id);
  }, []);

  const handleAddNode = useCallback(() => {
    addChainedNode(selectedId);
  }, [addChainedNode, selectedId]);

  const isPristineStarter = useCallback(
    (n: WorkflowNode) =>
      nodes.length === 1 && n.id === nodes[0]?.id && n.data.label === 'Start' && !n.data.description,
    [nodes],
  );

  /**
   * Append a step after the selection (or the lowest node). Returns a short
   * confirmation line for shell output. Reuses a pristine Start node for
   * start-kind steps instead of duplicating it.
   */
  const appendStep = useCallback(
    (kind: WorkflowNodeData['kind'], label: string, description: string): string => {
      const anchor = selectedId ? nodes.find((n) => n.id === selectedId) : null;
      const bottom = nodes.reduce((acc, n) => (n.position.y > acc.position.y ? n : acc), nodes[0]);

      if (kind === 'start' && bottom && isPristineStarter(bottom) && !anchor) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === bottom.id ? { ...n, data: { ...n.data, label, kind, description } } : n,
          ),
        );
        setSelectedId(bottom.id);
        return `~ applied to Start as [${kind}] ${label}`;
      }

      const parent = anchor ?? bottom ?? null;
      const id = nextNodeId();
      const position = parent
        ? kind === 'subagent'
          ? { x: parent.position.x + 220, y: parent.position.y + 90 }
          : { x: parent.position.x, y: parent.position.y + 160 }
        : { x: 250, y: 50 };
      const newNode: WorkflowNode = {
        id,
        type: 'agent',
        position,
        data: { label, kind, description },
      };
      setNodes((nds) => [...nds, newNode]);
      if (parent) {
        setEdges((eds) => [
          ...eds,
          {
            id: `edge-${id}`,
            source: parent.id,
            target: id,
            className: kind === 'subagent' ? 'spawn-edge' : undefined,
          },
        ]);
      }
      setSelectedId(id);
      return `+ [${kind}] ${label}`;
    },
    [nodes, selectedId, isPristineStarter],
  );

  const handleInsertBlock = useCallback(
    (blockId: string, quiet = false) => {
      const block = BLOCK_MAP[blockId];
      if (!block) return `? unknown block "${blockId}"`;
      const line = appendStep(block.kind, block.label, block.prompt);
      if (!quiet) pushToast(`Added “${block.title}”`, 'success');
      return `+ ${block.title} ${line}`;
    },
    [appendStep, pushToast],
  );

  const handleInsertTemplate = useCallback(
    (templateId: string, quiet = false) => {
      const template = TEMPLATE_MAP[templateId];
      if (!template) return `? unknown template "${templateId}"`;
      const anchor = selectedId ? nodes.find((n) => n.id === selectedId) : null;
      const bottom = nodes.length
        ? nodes.reduce((acc, n) => (n.position.y > acc.position.y ? n : acc), nodes[0])
        : null;
      let cursor = anchor ?? bottom;
      let cursorY = cursor ? cursor.position.y : -110;
      const cursorX = cursor ? cursor.position.x : 250;

      // Reuse pristine Start node when the template opens with a start-kind block.
      let firstStepSkipped = false;
      const newNodes: WorkflowNode[] = [];
      const newEdges: Edge[] = [];
      let lastMainId: string | null = cursor ? cursor.id : null;
      let lastMainY = cursorY;
      let lastMainX = cursorX;
      let forkCount = 0;

      template.steps.forEach((step, i) => {
        const block = BLOCK_MAP[step.blockId];
        if (!block) return;
        if (i === 0 && block.kind === 'start' && cursor && isPristineStarter(cursor) && !anchor) {
          // Rewrite starter in place.
          const starterId = cursor.id;
          setNodes((nds) =>
            nds.map((n) =>
              n.id === starterId
                ? { ...n, data: { ...n.data, label: block.label, kind: block.kind, description: block.prompt } }
                : n,
            ),
          );
          lastMainId = starterId;
          lastMainY = cursor.position.y;
          lastMainX = cursor.position.x;
          firstStepSkipped = true;
          return;
        }
        const id = nextNodeId();
        if (step.fork && lastMainId) {
          newNodes.push({
            id,
            type: 'agent',
            position: { x: lastMainX + 260 + forkCount * 220, y: lastMainY + 90 },
            data: { label: block.label, kind: block.kind, description: block.prompt },
          });
          newEdges.push({ id: `edge-${id}`, source: lastMainId, target: id, className: 'spawn-edge' });
          forkCount += 1;
        } else {
          lastMainY += 160;
          newNodes.push({
            id,
            type: 'agent',
            position: { x: lastMainX, y: lastMainY },
            data: { label: block.label, kind: block.kind, description: block.prompt },
          });
          if (lastMainId) newEdges.push({ id: `edge-${id}`, source: lastMainId, target: id });
          lastMainId = id;
          forkCount = 0;
        }
      });

      if (newNodes.length) {
        setNodes((nds) => [...nds, ...newNodes]);
        setEdges((eds) => [...eds, ...newEdges]);
        setSelectedId(newNodes[newNodes.length - 1].id);
      } else if (firstStepSkipped && cursor) {
        setSelectedId(cursor.id);
      }
      if (!quiet) pushToast(`Inserted “${template.title}” (${template.steps.length} steps)`, 'success');
      return `+ ${template.title} (${template.steps.length} steps)`;
    },
    [nodes, selectedId, isPristineStarter, pushToast],
  );

  const handleNodeDataChange = useCallback((id: string, data: Partial<WorkflowNodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
    );
  }, []);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedId(null);
  }, []);

  const handleClear = useCallback(() => setConfirmClear(true), []);

  const handleConfirmClear = useCallback(() => {
    setNodes(STARTER_GRAPH.nodes);
    setEdges(STARTER_GRAPH.edges);
    setSelectedId(null);
    setConfirmClear(false);
    pushToast('Canvas cleared', 'info');
  }, [pushToast]);

  const handleExport = useCallback(() => {
    exportGraph({ nodes, edges });
    pushToast('Workflow exported', 'success');
  }, [nodes, edges, pushToast]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const graph = await importGraph(file);
        setNodes(graph.nodes);
        setEdges(graph.edges);
        setSelectedId(null);
        pushToast('Workflow imported', 'success');
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'Failed to import workflow', 'error');
      }
    },
    [pushToast],
  );

  const handleVoiceCompile = useCallback(
    (graph: WorkflowGraph) => {
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setSelectedId(null);
      setVoiceOpen(false);
      pushToast('Workflow compiled from voice', 'success');
    },
    [pushToast],
  );

  const handleExportMarkdown = useCallback(() => {
    downloadMarkdown({ nodes, edges });
    pushToast('Plan.md exported', 'success');
  }, [nodes, edges, pushToast]);

  const handleExportPrompt = useCallback(() => {
    if (!graphToPromptChain({ nodes, edges })) {
      pushToast('No prompts to export yet', 'info');
      return;
    }
    downloadPrompt({ nodes, edges });
    pushToast('Prompt exported', 'success');
  }, [nodes, edges, pushToast]);

  const handleCopyChain = useCallback(async () => {
    const text = graphToPromptChain({ nodes, edges });
    if (!text) {
      pushToast('No prompts to copy yet', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      pushToast('Prompt chain copied', 'success');
    } catch {
      pushToast('Copy failed — clipboard unavailable', 'error');
    }
  }, [nodes, edges, pushToast]);

  const handleTogglePersist = useCallback(() => {
    const next: PersistPref = persist === 'remember' ? 'session' : 'remember';
    setPersist(next);
    setPersistPref(next);
    if (next === 'session') {
      clearSavedGraph();
      pushToast('Session-only — saved copy deleted from this browser', 'info');
    } else {
      saveToLocalStorage({ nodes, edges });
      pushToast('Remembering this plan in this browser', 'success');
    }
  }, [persist, nodes, edges, pushToast]);

  const handleConsentSession = useCallback(() => {
    setPersist('session');
    setPersistPref('session');
  }, []);

  const handleConsentRemember = useCallback(() => {
    setPersist('remember');
    setPersistPref('remember');
    saveToLocalStorage({ nodes, edges });
    pushToast('Remembering this plan in this browser', 'success');
  }, [nodes, edges, pushToast]);

  const handleToggleVoice = useCallback(() => {
    setVoiceOpen((v) => {
      if (!v) setShellOpen(false);
      return !v;
    });
  }, []);

  const handleToggleShell = useCallback(() => {
    setShellOpen((v) => {
      if (!v) setVoiceOpen(false);
      return !v;
    });
  }, []);

  const handleShell = useCallback(
    (line: string): ShellResult => {
      const catalogs = {
        blocks: BLOCKS.map((b) => ({ id: b.id, title: b.title })),
        templates: WORKFLOW_TEMPLATES.map((t) => ({ id: t.id, title: t.title })),
      };
      const action = parseShellLine(line, catalogs);
      switch (action.type) {
        case 'empty':
          return { lines: [] };
        case 'add-step':
          return { lines: [appendStep(action.kind, action.label, '')] };
        case 'insert-block':
          return { lines: [handleInsertBlock(action.blockId, true) ?? `? unknown block`] };
        case 'insert-template':
          return { lines: [handleInsertTemplate(action.templateId, true) ?? `? unknown template`] };
        case 'list-steps':
          return { lines: formatStepList(nodes) };
        case 'list-blocks':
          return { lines: BLOCKS.map((b) => `${b.id} — ${b.title}`) };
        case 'list-templates':
          return { lines: WORKFLOW_TEMPLATES.map((t) => `${t.id} (${t.steps.length}) — ${t.title}`) };
        case 'help':
          return { lines: SHELL_HELP_LINES };
        case 'clear':
          return { lines: [], clear: true };
        case 'unknown':
          return {
            lines: [`? unknown command: ${action.input}`, action.hint ?? 'type `help` for commands'],
          };
      }
    },
    [appendStep, handleInsertBlock, handleInsertTemplate, nodes],
  );

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
  const showOnboarding = nodes.length === 1 && edges.length === 0 && !voiceOpen;

  // Keyboard shortcuts: Delete removes the selected node, Escape closes
  // voice-first then deselects. Ignored while typing in a field.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'Escape') {
        if (voiceOpen) setVoiceOpen(false);
        else if (shellOpen) setShellOpen(false);
        else setSelectedId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        handleDeleteNode(selectedId);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, voiceOpen, shellOpen, handleDeleteNode]);

  return (
    <div className="app">
      <Toolbar
        onAddNode={handleAddNode}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
        onToggleVoice={handleToggleVoice}
        voiceOpen={voiceOpen}
        shellOpen={shellOpen}
        onToggleShell={handleToggleShell}
        pmActive={view === 'pm'}
        onTogglePm={() => setView((v) => (v === 'pm' ? 'canvas' : 'pm'))}
        blocksOpen={blocksOpen}
        onToggleBlocks={() => setBlocksOpen((v) => !v)}
        onExportMarkdown={handleExportMarkdown}
        onExportPrompt={handleExportPrompt}
        onCopyChain={handleCopyChain}
        persistOn={persist === 'remember'}
        onTogglePersist={handleTogglePersist}
      />
      {view === 'pm' ? (
        pmSlug ? (
          <BoardView slug={pmSlug} onBack={() => setPmSlug(null)} />
        ) : (
          <ProjectsView onOpenProject={setPmSlug} onBack={() => setView('canvas')} />
        )
      ) : (
      <div className="app-body">
        {blocksOpen && (
          <BlocksPanel
            onInsertBlock={handleInsertBlock}
            onInsertTemplate={handleInsertTemplate}
            onClose={() => setBlocksOpen(false)}
            anchorLabel={selectedNode?.data.label ?? null}
          />
        )}
        <Canvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(node) => setSelectedId(node?.id ?? null)}
          onAddChild={addChainedNode}
        >
          {showOnboarding && <OnboardingHint />}
          {voiceOpen && view === 'canvas' && <VoicePanel onCompile={handleVoiceCompile} onClose={() => setVoiceOpen(false)} />}
          {shellOpen && view === 'canvas' && <ShellPanel onRun={handleShell} onClose={() => setShellOpen(false)} />}
        </Canvas>
        <NodeInspector node={selectedNode} onChange={handleNodeDataChange} onDelete={handleDeleteNode} />
      </div>
      )}
      {confirmClear && (
        <ConfirmModal
          title="Clear the canvas?"
          body="This removes every node and edge and resets to a single Start node. This can't be undone."
          confirmLabel="Clear"
          onConfirm={handleConfirmClear}
          onCancel={() => setConfirmClear(false)}
        />
      )}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      {view === 'canvas' && persist === null && (
        <ConsentBanner onSessionOnly={handleConsentSession} onRemember={handleConsentRemember} />
      )}
    </div>
  );
}

export default App;
