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
import VoicePanel from './components/VoicePanel';
import ToastStack from './components/ToastStack';
import ConfirmModal from './components/ConfirmModal';
import OnboardingHint from './components/OnboardingHint';
import { exportGraph, importGraph, loadFromLocalStorage, saveToLocalStorage } from './lib/graphStorage';
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
  const [confirmClear, setConfirmClear] = useState(false);
  const { toasts, push: pushToast, dismiss: dismissToast } = useToasts();

  useEffect(() => {
    const saved = loadFromLocalStorage();
    if (saved) {
      setNodes(saved.nodes);
      setEdges(saved.edges);
    }
  }, []);

  useEffect(() => {
    saveToLocalStorage({ nodes, edges });
  }, [nodes, edges]);

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

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;
  const showOnboarding = nodes.length === 1 && edges.length === 0 && !voiceOpen;

  return (
    <div className="app">
      <Toolbar
        onAddNode={handleAddNode}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
        onToggleVoice={() => setVoiceOpen((v) => !v)}
        voiceOpen={voiceOpen}
      />
      <div className="app-body">
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
        </Canvas>
        <NodeInspector node={selectedNode} onChange={handleNodeDataChange} onDelete={handleDeleteNode} />
      </div>
      {voiceOpen && <VoicePanel onCompile={handleVoiceCompile} onClose={() => setVoiceOpen(false)} />}
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
    </div>
  );
}

export default App;
