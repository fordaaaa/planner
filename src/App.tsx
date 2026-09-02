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
import { exportGraph, importGraph, loadFromLocalStorage, saveToLocalStorage } from './lib/graphStorage';
import type { WorkflowNode, WorkflowNodeData } from './lib/types';
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

  const handleAddNode = useCallback(() => {
    const id = nextNodeId();
    const newNode: WorkflowNode = {
      id,
      type: 'agent',
      position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 300 },
      data: { label: 'New step', kind: 'agent', description: '' },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedId(id);
  }, []);

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

  const handleClear = useCallback(() => {
    if (!confirm('Clear the whole canvas?')) return;
    setNodes(STARTER_GRAPH.nodes);
    setEdges(STARTER_GRAPH.edges);
    setSelectedId(null);
  }, []);

  const handleExport = useCallback(() => {
    exportGraph({ nodes, edges });
  }, [nodes, edges]);

  const handleImport = useCallback(async (file: File) => {
    try {
      const graph = await importGraph(file);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setSelectedId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to import workflow');
    }
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="app">
      <Toolbar
        onAddNode={handleAddNode}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
      />
      <div className="app-body">
        <Canvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(node) => setSelectedId(node?.id ?? null)}
        />
        <NodeInspector node={selectedNode} onChange={handleNodeDataChange} onDelete={handleDeleteNode} />
      </div>
    </div>
  );
}

export default App;
