import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  getBezierPath,
  EdgeLabelRenderer
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Cpu,
  Save,
  Undo2,
  Redo2,
  PlayCircle,
  X,
  Plus,
  Search,
  ChevronRight,
  Info,
  LogOut,
  Settings2,
  Maximize2,
  Minus,
  Layout,
  MoreVertical,
  Type,
  Hash,
  ToggleLeft,
  Calendar,
  Layers,
  Link2,
  AlertTriangle,
  GitBranch,
  RotateCw,
  Table,
  Copy,
  Trash2
} from 'lucide-react';
import engine from '../utils/automationEngine';

// Custom Node for Function Call
const FunctionCallNode = ({ data }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
    <div style={{
      padding: '15px',
      borderRadius: '50%',
      width: '80px',
      height: '80px',
      backgroundColor: 'white',
      border: '2px solid #a855f7',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 6px -1px rgba(168, 85, 247, 0.2)',
      position: 'relative'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#a855f7' }} />
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: 'serif', fontStyle: 'italic' }}>f</span>
        <span style={{ fontSize: '1rem', marginLeft: '-2px' }}>x</span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#a855f7' }} />
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>Function call</div>
      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>When function is called</div>
    </div>
  </div>
);

// Custom Node for Return
const ReturnNode = ({ data }) => (
  <div style={{
    padding: '10px 20px',
    borderRadius: '8px',
    backgroundColor: 'white',
    border: '2px solid #10b981',
    minWidth: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    transform: 'skewX(-15deg)',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#10b981' }} />
    <div style={{ transform: 'skewX(15deg)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <LogOut size={18} color="#10b981" />
      <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '4px' }}>Return</div>
    </div>
    <Handle type="source" position={Position.Bottom} style={{ background: '#10b981' }} />
  </div>
);

// Custom Node for Connector Function
const ConnectorNode = ({ data }) => (
  <div style={{
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: 'white',
    border: '1px solid #dcfce7',
    minWidth: '160px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.1)'
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#10b981' }} />
    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
      <Link2 size={20} color="#10b981" />
    </div>
    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b', textAlign: 'center' }}>Run connector fu...</div>
    <Handle type="source" position={Position.Bottom} style={{ background: '#10b981' }} />
  </div>
);

// Custom Node for Action (e.g. Table Update)
const ActionNode = ({ data, selected }) => (
  <div style={{
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: 'white',
    border: `2px solid ${selected ? '#3b82f6' : '#dcfce7'}`,
    minWidth: '160px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#10b981' }} />
    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Table size={24} color="#10b981" />
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>{data.label || 'Action'}</div>
      {data.subtext && <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{data.subtext}</div>}
    </div>
    <Handle type="source" position={Position.Bottom} style={{ background: '#10b981' }} />
  </div>
);

// Custom Node for Decision (Diamond)
const DecisionNode = ({ data, selected }) => (
  <div style={{
    position: 'relative',
    width: '100px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#3b82f6' }} />
    {/* Diamond shape */}
    <div style={{
      width: '70px',
      height: '70px',
      backgroundColor: 'white',
      border: `2px solid ${selected ? '#3b82f6' : '#bfdbfe'}`,
      transform: 'rotate(45deg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
    }}>
      <div style={{ transform: 'rotate(-45deg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GitBranch size={24} color="#3b82f6" />
      </div>
    </div>
    {/* Labels under the diamond */}
    <div style={{ position: 'absolute', top: '85px', textAlign: 'center', width: '150px' }}>
      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{data.label || 'Decision'}</div>
      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Are any conditions true?</div>
    </div>
    
    <Handle type="source" position={Position.Bottom} id="yes" style={{ background: '#3b82f6', left: '50%' }} />
    <Handle type="source" position={Position.Right} id="no" style={{ background: '#64748b', top: '50%' }} />
  </div>
);

// Custom Node for Loop
const LoopNode = ({ data, selected }) => (
  <div style={{
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: 'white',
    border: `2px solid ${selected ? '#3b82f6' : '#e2e8f0'}`,
    minWidth: '160px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px'
  }}>
    <Handle type="target" position={Position.Top} />
    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <RotateCw size={24} color="#64748b" />
    </div>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b' }}>Loop</div>
      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Iterate through items</div>
    </div>
    <Handle type="source" position={Position.Bottom} />
  </div>
);

// Custom Edge with + Button
const AddNodeEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <path
        id={id}
        style={style}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all',
            zIndex: 1
          }}
          className="nodrag nopan"
        >
          {data?.pathLabel && (
            <div style={{
              position: 'absolute',
              top: '-25px',
              backgroundColor: 'white',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: '#64748b',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              {data.pathLabel}
            </div>
          )}
          <button
            onClick={(event) => {
              event.stopPropagation();
              data?.onAddNode(id);
            }}
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: 'white',
              border: '2px solid #e2e8f0',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              color: '#64748b'
            }}
          >
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = {
  functionCall: FunctionCallNode,
  return: ReturnNode,
  connector: ConnectorNode,
  action: ActionNode,
  decision: DecisionNode,
  loop: LoopNode
};

const edgeTypes = {
  addNode: AddNodeEdge
};

const initialNodes = [
  {
    id: 'start',
    type: 'default',
    data: { label: 'Start' },
    position: { x: 250, y: 0 },
    style: { 
      borderRadius: '24px', 
      width: '80px', 
      textAlign: 'center', 
      fontSize: '0.85rem', 
      fontWeight: 800, 
      color: '#475569',
      border: '2px solid #475569',
      padding: '4px 0'
    }
  },
  {
    id: 'fx-call',
    type: 'functionCall',
    data: { label: 'Function call' },
    position: { x: 240, y: 100 },
  },
  {
    id: 'return',
    type: 'return',
    data: { label: 'Return' },
    position: { x: 230, y: 300 },
  },
  {
    id: 'end',
    type: 'default',
    data: { label: 'End' },
    position: { x: 250, y: 450 },
    style: { 
      borderRadius: '24px', 
      width: '80px', 
      textAlign: 'center', 
      fontSize: '0.85rem', 
      fontWeight: 800, 
      color: '#475569',
      border: '2px solid #475569',
      padding: '4px 0'
    }
  }
];

const initialEdges = [
  { id: 'e1', source: 'start', target: 'fx-call', type: 'addNode', data: { onAddNode: () => {} } },
  { id: 'e2', source: 'fx-call', target: 'return', type: 'addNode', data: { onAddNode: () => {} } },
  { id: 'e3', source: 'return', target: 'end', type: 'addNode', data: { onAddNode: () => {} } }
];

const FunctionsEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [functionName, setFunctionName] = useState('Line start message');
  const [description, setDescription] = useState('message to operator');
  const [inputs, setInputs] = useState([]);
  const [outputs, setOutputs] = useState([]);
  const [variables, setVariables] = useState([]);
  const [activeLeftTab, setActiveLeftTab] = useState('IO'); // IO or ASSETS
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingIO, setEditingIO] = useState(null); // { type: 'input'|'output', id }
  const [showIOMenu, setShowIOMenu] = useState(null); // { type, id }
  const [activeEdgeForMenu, setActiveEdgeForMenu] = useState(null);

  useEffect(() => {
    // Inject the callback into initial edges if they don't have it
    setEdges((eds) => 
      eds.map(edge => ({
        ...edge,
        type: 'addNode',
        data: { ...edge.data, onAddNode: (id) => setActiveEdgeForMenu(id) }
      }))
    );
  }, []);

  const DATA_TYPES = {
    string: { label: 'Text', icon: Type, color: '#3b82f6' },
    number: { label: 'Number', icon: Hash, color: '#10b981' },
    boolean: { label: 'Boolean', icon: ToggleLeft, color: '#f59e0b' },
    date: { label: 'Date', icon: Calendar, color: '#ef4444' },
    object: { label: 'Object', icon: Layers, color: '#8b5cf6' }
  };

  const onConnect = useCallback((params) => setEdges((eds) => addEdge({ ...params, type: 'addNode', data: { onAddNode: (id) => setActiveEdgeForMenu(id) } }, eds)), [setEdges]);

  const insertNodeOnEdge = (edgeId, nodeType) => {
    const edge = edges.find(e => e.id === edgeId);
    if (!edge) return;

    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return;

    // Calculate position between source and target
    const newX = (sourceNode.position.x + targetNode.position.x) / 2;
    const newY = (sourceNode.position.y + targetNode.position.y) / 2;
    const newNodeId = `node_${Date.now()}`;

    const newNode = {
      id: newNodeId,
      type: nodeType,
      data: { 
        label: nodeType === 'connector' ? 'Run connector function' : 
               nodeType === 'action' ? 'Update Operator' :
               nodeType === 'decision' ? 'Operator' :
               nodeType === 'loop' ? 'Loop' : 'Function call',
        subtext: nodeType === 'action' ? 'Create/update records' : ''
      },
      position: { x: newX, y: newY }
    };

    let newEdges = [];
    if (nodeType === 'decision') {
      // Small variation for Decision: Yes goes down, No goes right
      newEdges = [
        { id: `e_${edge.source}_${newNodeId}`, source: edge.source, target: newNodeId, type: 'addNode', data: { onAddNode: (id) => setActiveEdgeForMenu(id) } },
        { id: `e_${newNodeId}_${edge.target}_yes`, source: newNodeId, target: edge.target, sourceHandle: 'yes', type: 'addNode', data: { pathLabel: 'Yes', onAddNode: (id) => setActiveEdgeForMenu(id) } },
        // Dummy target for 'No' path or just leave it for user to connect
        { id: `e_${newNodeId}_no_branch`, source: newNodeId, target: edge.target, sourceHandle: 'no', type: 'addNode', data: { pathLabel: 'No', onAddNode: (id) => setActiveEdgeForMenu(id) } }
      ];
    } else {
      newEdges = [
        { id: `e_${edge.source}_${newNodeId}`, source: edge.source, target: newNodeId, type: 'addNode', data: { onAddNode: (id) => setActiveEdgeForMenu(id) } },
        { id: `e_${newNodeId}_${edge.target}`, source: newNodeId, target: edge.target, type: 'addNode', data: { onAddNode: (id) => setActiveEdgeForMenu(id) } }
      ];
    }

    setNodes(nds => [...nds, newNode]);
    setEdges(eds => eds.filter(e => e.id !== edgeId).concat(newEdges));
    setActiveEdgeForMenu(null);
  };

  const onNodeDragStop = useCallback((event, node) => {
    // Basic rearrangement: if a node is dropped near an edge, re-connect it
    // For this demo, we'll check if the node center is close to any edge's midpoint
    const nodeCenterX = node.position.x + 80; // approximate width/2
    const nodeCenterY = node.position.y + 40; // approximate height/2

    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target || edge.source === node.id || edge.target === node.id) return;

      const edgeMidX = (source.position.x + target.position.x) / 2;
      const edgeMidY = (source.position.y + target.position.y) / 2;

      const dist = Math.sqrt(Math.pow(nodeCenterX - edgeMidX, 2) + Math.pow(nodeCenterY - edgeMidY, 2));
      
      if (dist < 60) {
        // Drop detected on edge! Re-thread.
        const newEdges = [
          { id: `e_${edge.source}_${node.id}`, source: edge.source, target: node.id, type: 'addNode', data: { onAddNode: (id) => setActiveEdgeForMenu(id) } },
          { id: `e_${node.id}_${edge.target}`, source: node.id, target: edge.target, type: 'addNode', data: { onAddNode: (id) => setActiveEdgeForMenu(id) } }
        ];

        setEdges(eds => {
          // Remove old edges connecting this node, and the edge it was dropped on
          const filtered = eds.filter(e => e.id !== edge.id && e.source !== node.id && e.target !== node.id);
          return [...filtered, ...newEdges];
        });
      }
    });
  }, [nodes, edges, setEdges]);

  const updateNodeData = (id, newData) => {
    setNodes(nds => nds.map(node => 
      node.id === id ? { ...node, data: { ...node.data, ...newData } } : node
    ));
    // Also update selectedNode to keep UI sync
    setSelectedNode(prev => prev?.id === id ? { ...prev, data: { ...prev.data, ...newData } } : prev);
  };

  const deleteNode = (id) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedNode(null);
  };

  // Usage tracking logic
  const getUsageCount = (id, type) => {
    // A more robust app would store references in node data
    // For this demo, let's say a node "uses" an item if its name is in the node label or data
    let itemName = '';
    if (type === 'input') itemName = inputs.find(i => i.id === id)?.name;
    else if (type === 'output') itemName = outputs.find(o => o.id === id)?.name;
    else if (type === 'variable') itemName = variables.find(v => v.id === id)?.name;
    
    if (!itemName) return 0;
    
    return nodes.filter(node => 
      node.data.label?.includes(itemName) || 
      node.data.config?.referencedId === id
    ).length;
  };

  const getWhereUsed = (id, type) => {
    let itemName = '';
    if (type === 'input') itemName = inputs.find(i => i.id === id)?.name;
    else if (type === 'output') itemName = outputs.find(o => o.id === id)?.name;
    else if (type === 'variable') itemName = variables.find(v => v.id === id)?.name;
    
    if (!itemName) return [];
    
    return nodes.filter(node => 
      node.data.label?.includes(itemName) || 
      node.data.config?.referencedId === id
    ).map(node => ({ id: node.id, name: node.data.label }));
  };

  const handleAddIO = (type) => {
    const newItem = { id: Date.now(), name: `New ${type}`, type: 'string' };
    if (type === 'Input') {
      setInputs([...inputs, newItem]);
      setEditingIO({ type: 'input', id: newItem.id });
    } else if (type === 'Output') {
      setOutputs([...outputs, newItem]);
      setEditingIO({ type: 'output', id: newItem.id });
    } else {
      setVariables([...variables, newItem]);
      setEditingIO({ type: 'variable', id: newItem.id });
    }
  };

  const handleDuplicateIO = (type, id) => {
    const original = 
      type === 'input' ? inputs.find(i => i.id === id) : 
      type === 'output' ? outputs.find(o => o.id === id) :
      variables.find(v => v.id === id);

    if (!original) return;
    const newItem = { ...original, id: Date.now(), name: `${original.name} Copy` };
    
    if (type === 'input') setInputs([...inputs, newItem]);
    else if (type === 'output') setOutputs([...outputs, newItem]);
    else setVariables([...variables, newItem]);
    
    setShowIOMenu(null);
  };

  const handleDeleteIO = (type, id) => {
    if (getUsageCount(id, type) > 0) {
      alert(`Cannot delete ${type} that is currently in use.`);
      return;
    }
    if (type === 'input') setInputs(inputs.filter(i => i.id !== id));
    else if (type === 'output') setOutputs(outputs.filter(o => o.id !== id));
    else setVariables(variables.filter(v => v.id !== id));
    setShowIOMenu(null);
  };

  const handleSave = () => {
    const fnData = {
      id: `fn_${Date.now()}`,
      name: functionName,
      description,
      inputs,
      outputs,
      variables,
      nodes,
      edges
    };
    const saved = localStorage.getItem('mes_functions');
    const all = saved ? JSON.parse(saved) : [];
    localStorage.setItem('mes_functions', JSON.stringify([...all, fnData]));
    alert('Function Saved!');
  };

  const handleTest = async () => {
    console.log('[FunctionsEditor] Starting test execution...');
    try {
      const mockEventData = {
        timestamp: new Date().toISOString(),
        source: 'TEST_RUN',
        inputs: inputs.reduce((acc, input) => ({ ...acc, [input.name]: `test_${input.name}` }), {})
      };
      
      // Execute the graph directly using the engine
      await engine.executeGraph({ nodes, edges }, mockEventData);
      alert('Test Execution Complete! Check console or System Logs for results.');
    } catch (err) {
      console.error('[FunctionsEditor] Test failed:', err);
      alert('Test failed: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header style={{
        height: '64px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Functions / <span style={{ fontWeight: 800, color: '#1e293b' }}>{functionName}</span>
            </div>
            <input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add description..."
              style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', color: '#94a3b8', outline: 'none' }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button style={{ p: '8px', background: 'none', border: 'none', color: '#94a3b8' }}><Undo2 size={18} /></button>
          <button style={{ p: '8px', background: 'none', border: 'none', color: '#94a3b8' }}><Redo2 size={18} /></button>
          <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0', margin: '0 8px' }}></div>
          <button 
            onClick={handleTest}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
              backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px',
              fontSize: '0.8rem', fontWeight: 600, color: '#64748b', cursor: 'pointer'
            }}
          >
            <PlayCircle size={16} /> Test
          </button>
          <button 
            onClick={handleSave}
            style={{
              padding: '8px 24px', backgroundColor: '#3b82f6', color: 'white',
              border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
            }}
          >Save</button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Panel: Inputs & Outputs */}
        <div style={{ width: '300px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => setActiveLeftTab('IO')}
              style={{
                flex: 1, padding: '12px', border: 'none', background: 'none',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                color: activeLeftTab === 'IO' ? '#3b82f6' : '#64748b',
                borderBottom: activeLeftTab === 'IO' ? '2px solid #3b82f6' : 'none'
              }}
            >Inputs & outputs</button>
            <button 
              onClick={() => setActiveLeftTab('ASSETS')}
              style={{
                flex: 1, padding: '12px', border: 'none', background: 'none',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                color: activeLeftTab === 'ASSETS' ? '#3b82f6' : '#64748b',
                borderBottom: activeLeftTab === 'ASSETS' ? '2px solid #3b82f6' : 'none'
              }}
            >Assets</button>
          </div>

          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input 
                placeholder={activeLeftTab === 'IO' ? "Search inputs & outputs" : "Search variables"}
                style={{
                  width: '100%', padding: '8px 10px 8px 32px', borderRadius: '6px',
                  border: '1px solid #e2e8f0', fontSize: '0.75rem'
                }}
              />
            </div>

            {activeLeftTab === 'IO' ? (
              <>
                {/* Inputs Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>Inputs ({inputs.length})</div>
                    <button onClick={() => handleAddIO('Input')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><Plus size={16} /></button>
                  </div>
                  {inputs.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No Inputs</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {inputs.map(input => {
                        const isUsed = getUsageCount(input.id, 'input') > 0;
                        const TypeIcon = DATA_TYPES[input.type]?.icon || Type;
                        return (
                          <div key={input.id} style={{ 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            backgroundColor: 'white', 
                            fontSize: '0.8rem', 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '4px',
                            border: '1px solid transparent',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <TypeIcon size={14} color="#64748b" />
                              <span style={{ 
                                flex: 1, 
                                fontStyle: isUsed ? 'normal' : 'italic',
                                color: isUsed ? '#1e293b' : '#64748b',
                                fontWeight: isUsed ? 600 : 400
                              }}>{input.name}</span>
                              <button 
                                onClick={() => setShowIOMenu({ type: 'input', id: input.id })}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                              >
                                <MoreVertical size={14} />
                              </button>

                              {showIOMenu?.type === 'input' && showIOMenu.id === input.id && (
                                <div style={{
                                  position: 'absolute', top: '30px', right: '0', backgroundColor: 'white',
                                  borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                  border: '1px solid #e2e8f0', zIndex: 100, width: '120px', padding: '4px'
                                }}>
                                  <button onClick={() => { setEditingIO({ type: 'input', id: input.id }); setShowIOMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}>Edit</button>
                                  <button onClick={() => handleDuplicateIO('input', input.id)} style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}>Duplicate</button>
                                  <button onClick={() => handleDeleteIO('input', input.id)} style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>Delete</button>
                                </div>
                              )}
                              {!isUsed && (
                                <div style={{ position: 'absolute', left: '-2px', top: '50%', transform: 'translateY(-50%)', width: '2px', height: '12px', backgroundColor: '#e2e8f0', borderRadius: '2px' }}></div>
                              )}
                            </div>
                            {isUsed && (
                              <div style={{ padding: '4px 12px 8px 36px', width: '100%', borderTop: '1px solid #f8fafc' }}>
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  Where used <ChevronRight size={10} style={{ transform: 'rotate(90deg)' }} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                  {getWhereUsed(input.id, 'input').map(use => (
                                    <div key={use.id} onClick={() => setSelectedNode(nodes.find(n => n.id === use.id))} style={{ fontSize: '0.6rem', color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' }}>
                                      {use.name}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {editingIO && editingIO.type === 'input' && (
                        <div style={{ padding: '12px', border: '1px solid #3b82f6', borderRadius: '8px', backgroundColor: '#f0f9ff', marginTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1d4ed8' }}>Edit Input</span>
                            <X size={12} onClick={() => setEditingIO(null)} style={{ cursor: 'pointer' }} />
                          </div>
                          <input 
                            value={inputs.find(i => i.id === editingIO.id)?.name}
                            onChange={(e) => setInputs(inputs.map(i => i.id === editingIO.id ? { ...i, name: e.target.value } : i))}
                            style={{ width: '100%', padding: '6px', fontSize: '0.75rem', border: '1px solid #3b82f6', borderRadius: '4px', marginBottom: '8px' }}
                          />
                          <select 
                            value={inputs.find(i => i.id === editingIO.id)?.type}
                            onChange={(e) => setInputs(inputs.map(i => i.id === editingIO.id ? { ...i, type: e.target.value } : i))}
                            style={{ width: '100%', padding: '6px', fontSize: '0.75rem', border: '1px solid #bfdbfe', borderRadius: '4px' }}
                          >
                            {Object.entries(DATA_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Outputs Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>Outputs ({outputs.length})</div>
                    <button onClick={() => handleAddIO('Output')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><Plus size={16} /></button>
                  </div>
                  {outputs.length === 0 ? (
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No outputs</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {outputs.map(output => {
                        const isUsed = getUsageCount(output.id, 'output') > 0;
                        const TypeIcon = DATA_TYPES[output.type]?.icon || Type;
                        return (
                          <div key={output.id} style={{ 
                            padding: '8px 12px', 
                            borderRadius: '6px', 
                            backgroundColor: 'white', 
                            fontSize: '0.8rem', 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: '4px',
                            position: 'relative'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <TypeIcon size={14} color="#64748b" />
                              <span style={{ 
                                flex: 1, 
                                fontStyle: isUsed ? 'normal' : 'italic',
                                color: isUsed ? '#1e293b' : '#64748b',
                                fontWeight: isUsed ? 600 : 400
                              }}>{output.name}</span>
                              <button 
                                onClick={() => setShowIOMenu({ type: 'output', id: output.id })}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                              >
                                <MoreVertical size={14} />
                              </button>

                              {showIOMenu?.type === 'output' && showIOMenu.id === output.id && (
                                <div style={{
                                  position: 'absolute', top: '30px', right: '0', backgroundColor: 'white',
                                  borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                  border: '1px solid #e2e8f0', zIndex: 100, width: '120px', padding: '4px'
                                }}>
                                  <button onClick={() => { setEditingIO({ type: 'output', id: output.id }); setShowIOMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}>Edit</button>
                                  <button onClick={() => handleDuplicateIO('output', output.id)} style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}>Duplicate</button>
                                  <button onClick={() => handleDeleteIO('output', output.id)} style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>Delete</button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {editingIO && editingIO.type === 'output' && (
                        <div style={{ padding: '12px', border: '1px solid #10b981', borderRadius: '8px', backgroundColor: '#f0fdf4', marginTop: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#047857' }}>Edit Output</span>
                            <X size={12} onClick={() => setEditingIO(null)} style={{ cursor: 'pointer' }} />
                          </div>
                          <input 
                            value={outputs.find(o => o.id === editingIO.id)?.name}
                            onChange={(e) => setOutputs(outputs.map(o => o.id === editingIO.id ? { ...o, name: e.target.value } : o))}
                            style={{ width: '100%', padding: '6px', fontSize: '0.75rem', border: '1px solid #10b981', borderRadius: '4px', marginBottom: '8px' }}
                          />
                          <select 
                            value={outputs.find(o => o.id === editingIO.id)?.type}
                            onChange={(e) => setOutputs(outputs.map(o => o.id === editingIO.id ? { ...o, type: e.target.value } : o))}
                            style={{ width: '100%', padding: '6px', fontSize: '0.75rem', border: '1px solid #d1fae5', borderRadius: '4px' }}
                          >
                            {Object.entries(DATA_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Assets View (Variables) */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>Variables ({variables.length})</div>
                  <button onClick={() => handleAddIO('Variable')} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><Plus size={16} /></button>
                </div>

                {variables.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>No variables defined</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Unused Variables Section */}
                    {variables.some(v => getUsageCount(v.id, 'variable') === 0) && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Unused variables</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {variables.filter(v => getUsageCount(v.id, 'variable') === 0).map(v => {
                            const TypeIcon = DATA_TYPES[v.type]?.icon || Type;
                            return (
                              <div key={v.id} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'white', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
                                <TypeIcon size={14} color="#94a3b8" />
                                <span style={{ flex: 1, fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>{v.name}</span>
                                <button onClick={() => setShowIOMenu({ type: 'variable', id: v.id })} style={{ background: 'none', border: 'none', color: '#94a3b8' }}><MoreVertical size={14} /></button>
                                {showIOMenu?.type === 'variable' && showIOMenu.id === v.id && (
                                  <div style={{ position: 'absolute', top: '30px', right: '0', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 100, width: '120px', padding: '4px' }}>
                                    <button onClick={() => { setEditingIO({ type: 'variable', id: v.id }); setShowIOMenu(null); }} style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}>Edit</button>
                                    <button onClick={() => handleDuplicateIO('variable', v.id)} style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer' }}>Duplicate</button>
                                    <button onClick={() => handleDeleteIO('variable', v.id)} style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.75rem', border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>Delete</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Used Variables Section */}
                    {variables.some(v => getUsageCount(v.id, 'variable') > 0) && (
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Used variables</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {variables.filter(v => getUsageCount(v.id, 'variable') > 0).map(v => {
                            const TypeIcon = DATA_TYPES[v.type]?.icon || Type;
                            return (
                              <div key={v.id} style={{ padding: '8px 12px', borderRadius: '6px', backgroundColor: 'white', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <TypeIcon size={14} color="#3b82f6" />
                                  <span style={{ flex: 1, fontSize: '0.75rem', color: '#1e293b', fontWeight: 600 }}>{v.name}</span>
                                  <button onClick={() => setShowIOMenu({ type: 'variable', id: v.id })} style={{ background: 'none', border: 'none', color: '#94a3b8' }}><MoreVertical size={14} /></button>
                                </div>
                                <div style={{ padding: '4px 0 0 24px' }}>
                                  <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 600 }}>Where used</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                                    {getWhereUsed(v.id, 'variable').map(use => (
                                      <div key={use.id} onClick={() => setSelectedNode(nodes.find(n => n.id === use.id))} style={{ fontSize: '0.55rem', color: '#3b82f6', textDecoration: 'underline', cursor: 'pointer' }}>{use.name}</div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {editingIO && editingIO.type === 'variable' && (
                      <div style={{ padding: '12px', border: '1px solid #3b82f6', borderRadius: '8px', backgroundColor: '#f0f9ff', marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1d4ed8' }}>Edit Variable</span>
                          <X size={12} onClick={() => setEditingIO(null)} style={{ cursor: 'pointer' }} />
                        </div>
                        <input 
                          value={variables.find(v => v.id === editingIO.id)?.name}
                          onChange={(e) => setVariables(variables.map(v => v.id === editingIO.id ? { ...v, name: e.target.value } : v))}
                          style={{ width: '100%', padding: '6px', fontSize: '0.75rem', border: '1px solid #3b82f6', borderRadius: '4px', marginBottom: '8px' }}
                        />
                        <select 
                          value={variables.find(v => v.id === editingIO.id)?.type}
                          onChange={(e) => setVariables(variables.map(v => v.id === editingIO.id ? { ...v, type: e.target.value } : v))}
                          style={{ width: '100%', padding: '6px', fontSize: '0.75rem', border: '1px solid #bfdbfe', borderRadius: '4px' }}
                        >
                          {Object.entries(DATA_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={(e, node) => setSelectedNode(node)}
            fitView
          >
            <Background color="#cbd5e1" variant="dots" gap={20} />
            
            {/* Navigation controls overlay */}
            <div style={{
              position: 'absolute', bottom: '20px', right: '20px',
              backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              display: 'flex', gap: '8px', padding: '4px', alignItems: 'center', zIndex: 10,
              border: '1px solid #e2e8f0'
            }}>
              <button style={{ p: '6px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Center View"><Maximize2 size={16} color="#64748b" /></button>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }}></div>
              <button style={{ p: '6px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Zoom In"><Plus size={16} color="#64748b" /></button>
              <button style={{ p: '6px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Zoom Out"><Minus size={16} color="#64748b" /></button>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 8px', cursor: 'pointer' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>62%</span>
                <ChevronRight size={14} color="#64748b" style={{ transform: 'rotate(90deg)' }} />
              </div>
            </div>

            {/* Action Menu for adding node on edge */}
            {activeEdgeForMenu && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                border: '1px solid #e2e8f0',
                padding: '8px',
                zIndex: 100,
                width: '240px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderBottom: '1px solid #f1f5f9', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>Select action</span>
                  <X size={14} color="#94a3b8" onClick={() => setActiveEdgeForMenu(null)} style={{ cursor: 'pointer' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button 
                    onClick={() => insertNodeOnEdge(activeEdgeForMenu, 'action')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Table size={20} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>Create/update table...</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Modify records in a table</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => insertNodeOnEdge(activeEdgeForMenu, 'decision')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <GitBranch size={20} color="#3b82f6" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>Decision</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Check conditions and branch flow</div>
                    </div>
                  </button>

                  <button 
                    onClick={() => insertNodeOnEdge(activeEdgeForMenu, 'loop')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <RotateCw size={20} color="#64748b" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>Loop</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Iterate through a list of items</div>
                    </div>
                  </button>

                  <div style={{ height: '1px', backgroundColor: '#f1f5f9', margin: '4px 0' }}></div>

                  <button 
                    onClick={() => insertNodeOnEdge(activeEdgeForMenu, 'connector')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                      border: 'none', background: 'none', borderRadius: '10px', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Link2 size={20} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>Run connector function</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Execute an external logic block</div>
                    </div>
                  </button>
                  {/* ... other buttons ... */}
                </div>
              </div>
            )}
          </ReactFlow>
        </div>

        {/* Right Panel: Details */}
        <div style={{ width: '350px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Function call details</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Info size={16} color="#94a3b8" />
              <ChevronRight size={16} color="#94a3b8" />
            </div>
          </div>

          <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>This function requires the following inputs</div>
              {inputs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '12px' }}>No inputs defined</div>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', border: '2px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LogOut size={20} color="#cbd5e1" style={{ transform: 'rotate(180deg)' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Create one or more inputs in the left panel.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {inputs.map(input => (
                    <div key={input.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>{input.name}</label>
                      <input 
                        disabled 
                        placeholder={`Value for ${input.name}`}
                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.75rem' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedNode && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>Selected Node: {selectedNode.data.label}</div>
                {/* Node-specific configuration could go here */}
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                  Node ID: {selectedNode.id}<br/>
                  Type: {selectedNode.type}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FunctionsEditor;
