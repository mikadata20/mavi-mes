import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Zap,
  Play,
  Save,
  X,
  Plus,
  Minus,
  Clock,
  Database,
  Cpu,
  AlertCircle,
  History,
  CheckCircle2,
  Settings2,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Link2,
  Mail,
  ExternalLink,
  Copy,
  Trash2,
  Clipboard,
  Layers,
  ClipboardPaste
} from 'lucide-react';

// Custom Node for the Start Event (Trigger)
const EventNode = ({ data }) => (
  <div style={{
    padding: '15px',
    borderRadius: '12px',
    backgroundColor: 'white',
    border: '2px solid #3b82f6',
    minWidth: '220px',
    boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
        <Zap size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase' }}>Event Trigger</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{data.label || 'Select Event...'}</div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6' }} />
  </div>
);

// Custom Node for Actions
const ActionNode = ({ data }) => {
  const getActionIcon = () => {
    switch (data.type) {
      case 'UPDATE_RECORD': return <Database size={18} />;
      case 'CREATE_RECORD': return <Plus size={18} />;
      case 'AI_SUMMARIZE':
      case 'AI_EXTRACT':
      case 'AI_TRANSLATE': return <Sparkles size={18} />;
      default: return <Play size={18} />;
    }
  };

  const getActionLabel = () => {
    switch (data.type) {
      case 'UPDATE_RECORD': return 'Update Record';
      case 'CREATE_RECORD': return 'Create Record';
      case 'LOG_MESSAGE': return 'Log Message';
      case 'HTTP_REQUEST': return 'HTTP Connector';
      case 'CONNECTOR_FUNCTION': return 'Connector';
      case 'SEND_NOTIFICATION': return 'Notification';
      case 'AI_SUMMARIZE': return 'AI: Summarize';
      case 'AI_EXTRACT': return 'AI: Extract Data';
      case 'AI_TRANSLATE': return 'AI: Translate';
      default: return 'Action';
    }
  };

  return (
    <div style={{
      padding: '15px',
      borderRadius: '12px',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      minWidth: '220px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#64748b' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
          {getActionIcon()}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>{getActionLabel()}</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{data.label || 'Configure...'}</div>
        </div>
      </div>
      {data.tableId && (
        <div style={{ fontSize: '0.65rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '4px', border: '1px solid #f1f5f9' }}>
          Table: {data.tableId}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#10b981' }} />
    </div>
  );
};

// Custom Node for Decisions
const DecisionNode = ({ data }) => (
  <div style={{
    padding: '15px',
    borderRadius: '12px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    minWidth: '220px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#64748b' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316' }}>
        <AlertCircle size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#f97316', textTransform: 'uppercase' }}>Decision</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{data.label || 'IF Condition'}</div>
      </div>
    </div>
    {data.condition && (
      <div style={{ fontSize: '0.65rem', color: '#64748b', backgroundColor: '#fff7ed', padding: '4px 8px', borderRadius: '4px', marginBottom: '10px', textAlign: 'center' }}>
        {data.condition.field} {data.condition.operator} {data.condition.value}
      </div>
    )}
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
      <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>YES</div>
      <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>NO</div>
    </div>
    <Handle type="source" id="yes" position={Position.Bottom} style={{ left: '25%', background: '#10b981' }} />
    <Handle type="source" id="no" position={Position.Bottom} style={{ left: '75%', background: '#ef4444' }} />
  </div>
);

const LoopNode = ({ data }) => (
  <div style={{
    padding: '15px',
    borderRadius: '12px',
    backgroundColor: 'white',
    border: '1px solid #e2e8f0',
    minWidth: '220px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
  }}>
    <Handle type="target" position={Position.Top} style={{ background: '#64748b' }} />
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7' }}>
        <RefreshCw size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a855f7', textTransform: 'uppercase' }}>Loop (For Each)</div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b' }}>{data.label || 'Iterate List'}</div>
      </div>
    </div>
    {data.listPath && (
      <div style={{ fontSize: '0.65rem', color: '#64748b', backgroundColor: '#faf5ff', padding: '4px 8px', borderRadius: '4px', marginBottom: '10px', textAlign: 'center' }}>
        List: {data.listPath}
      </div>
    )}
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
      <div style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 700 }}>BODY</div>
      <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>EXIT</div>
    </div>
    <Handle type="source" id="body" position={Position.Bottom} style={{ left: '25%', background: '#a855f7' }} />
    <Handle type="source" id="exit" position={Position.Bottom} style={{ left: '75%', background: '#64748b' }} />
  </div>
);

const nodeTypes = {
  event: EventNode,
  action: ActionNode,
  decision: DecisionNode,
  loop: LoopNode
};

const initialNodes = [
  {
    id: 'start-node',
    type: 'event',
    data: { label: 'Click to choose event' },
    position: { x: 250, y: 50 },
  }
];

const initialEdges = [];

const AutomationEditor = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState('EDIT');
  const [automationName, setAutomationName] = useState('Untitled Automation');
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [tables, setTables] = useState([]);
  const [currentAuto, setCurrentAuto] = useState(null);
  const [menu, setMenu] = useState(null);
  const [clipboard, setClipboard] = useState(null);
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();

  useEffect(() => {
    import('../utils/database').then(db => {
      db.getTables().then(setTables);
    });

    const saved = localStorage.getItem('mes_automations');
    if (saved) {
      const allAutos = JSON.parse(saved);
      const existing = allAutos.find(a => a.name === automationName || a.id === 'default_auto');
      if (existing) {
        setCurrentAuto(existing);
        setAutomationName(existing.name);
        const source = existing.development || existing.published || existing;
        setNodes(source.nodes || initialNodes);
        setEdges(source.edges || initialEdges);
      }
    }
  }, []);

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      setMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
        type: 'node',
      });
    },
    [setMenu]
  );

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      setMenu({
        id: null,
        top: event.clientY,
        left: event.clientX,
        type: 'pane',
      });
    },
    [setMenu]
  );

  const onPaneClick = useCallback(() => setMenu(null), [setMenu]);

  const deleteNode = useCallback((id) => {
    if (id === 'start-node') return;
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    setMenu(null);
  }, [setNodes, setEdges]);

  const copyNode = useCallback((id) => {
    const node = nodes.find((n) => n.id === id);
    if (node) {
      setClipboard({ ...node });
    }
    setMenu(null);
  }, [nodes]);

  const duplicateNode = useCallback((id) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;

    const newId = `node_${Date.now()}`;
    const newNode = {
      ...node,
      id: newId,
      position: { x: node.position.x + 20, y: node.position.y + 20 },
    };

    setNodes((nds) => nds.concat(newNode));
    setMenu(null);
  }, [nodes, setNodes]);

  const pasteNode = useCallback(() => {
    if (!clipboard || !menu) return;

    const id = `node_${Date.now()}`;
    const rect = reactFlowWrapper.current?.getBoundingClientRect();
    const position = project({
      x: menu.left - (rect?.left || 0),
      y: menu.top - (rect?.top || 0),
    });

    const newNode = {
      ...clipboard,
      id,
      position,
    };

    setNodes((nds) => nds.concat(newNode));
    setMenu(null);
  }, [clipboard, menu, project, setNodes]);

  const handleSave = () => {
    const saved = localStorage.getItem('mes_automations');
    const allAutos = saved ? JSON.parse(saved) : [];

    const eventNode = nodes.find(n => n.type === 'event');
    const devVersion = {
      nodes,
      edges,
      trigger: {
        type: eventNode?.data.triggerType || 'MANUAL',
        schedule: eventNode?.data.schedule || null
      },
      updatedAt: new Date().toISOString()
    };

    const updatedAuto = currentAuto ? {
      ...currentAuto,
      name: automationName,
      development: devVersion
    } : {
      id: `auto_${Date.now()}`,
      name: automationName,
      active: true,
      development: devVersion,
      published: null,
      history: []
    };

    const newAllAutos = allAutos.filter(a => a.id !== updatedAuto.id);
    newAllAutos.push(updatedAuto);
    localStorage.setItem('mes_automations', JSON.stringify(newAllAutos));
    setCurrentAuto(updatedAuto);
    alert('Development Version Saved!');
  };

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
    if (node.id === 'start-node') {
      setShowEventPicker(true);
    }
  };

  const handlePublish = async () => {
    const saved = localStorage.getItem('mes_automations');
    const allAutos = saved ? JSON.parse(saved) : [];

    const eventNode = nodes.find(n => n.type === 'event');
    const newVersionNum = (currentAuto?.published?.version || 0) + 1;

    const snapshot = {
      version: newVersionNum,
      publishedAt: new Date().toISOString(),
      nodes,
      edges,
      trigger: {
        type: eventNode?.data.triggerType || 'MANUAL',
        schedule: eventNode?.data.schedule || null
      }
    };

    const updatedAuto = currentAuto ? {
      ...currentAuto,
      name: automationName,
      published: snapshot,
      history: [snapshot, ...(currentAuto.history || [])].slice(0, 10) // Keep last 10
    } : {
      id: `auto_${Date.now()}`,
      name: automationName,
      active: true,
      development: snapshot,
      published: snapshot,
      history: [snapshot]
    };

    const newAllAutos = allAutos.filter(a => a.id !== updatedAuto.id);
    newAllAutos.push(updatedAuto);
    localStorage.setItem('mes_automations', JSON.stringify(newAllAutos));
    setCurrentAuto(updatedAuto);

    // Refresh engine with just the published versions
    import('../utils/automationEngine').then(module => {
      module.default.refresh();
    });

    alert(`Version ${newVersionNum} Published!`);
  };

  const handleRestore = (version) => {
    if (!window.confirm(`Restore to version ${version.version}? This will overwrite your current development draft.`)) return;

    setNodes(version.nodes);
    setEdges(version.edges);
    setActiveTab('EDIT');
    alert(`Restored to version ${version.version}. Don't forget to Save or Publish!`);
  };

  const isRecursiveLoop = () => {
    const eventNode = nodes.find(n => n.type === 'event');
    if (eventNode?.data.triggerType !== 'TABLE_ROW_UPDATED') return false;

    // Check if any action node updates the same table
    return nodes.some(n =>
      n.type === 'action' &&
      (n.data.type === 'UPDATE_RECORD' || n.data.type === 'CREATE_RECORD') &&
      n.data.tableId &&
      // This is a simple check; in real Tulip it might be more complex
      n.data.tableId === eventNode.data.tableId
    );
  };

  return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#f8fafc' }}>
      {/* Left: Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          height: '70px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          zIndex: 10
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Automations / {automationName}
              {isRecursiveLoop() && (
                <span title="Potential Infinite Loop Detected" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={14} /> <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>LOOPING WARNING</span>
                </span>
              )}
            </div>
            <input
              value={automationName}
              onChange={(e) => setAutomationName(e.target.value)}
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                color: '#1e293b',
                width: '400px'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center' }}>
              {currentAuto?.development?.updatedAt ? `Saved ${new Date(currentAuto.development.updatedAt).toLocaleTimeString()}` : 'Not saved yet'}
            </span>
            <button
              onClick={handleSave}
              style={{
                padding: '10px 20px',
                backgroundColor: 'white',
                color: '#1e293b',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >Save Draft</button>
            <button
              onClick={handlePublish}
              style={{
                padding: '10px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            >Publish v{(currentAuto?.published?.version || 0) + 1}</button>
          </div>
        </header>

        {/* Workspace */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#cbd5e1" variant="dots" gap={20} />
            <Controls />
            <MiniMap />

            {/* View Navigation Overlay (Mockup style) */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              backgroundColor: 'white',
              padding: '5px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              gap: '5px',
              alignItems: 'center',
              zIndex: 5
            }}>
              <button style={{ border: 'none', background: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}><Settings2 size={16} /></button>
              <div style={{ width: '1px', height: '16px', backgroundColor: '#e2e8f0' }}></div>
              <button style={{ border: 'none', background: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}><Plus size={16} /></button>
              <button style={{ border: 'none', background: 'none', padding: '5px', borderRadius: '4px', cursor: 'pointer' }}><Minus size={16} /></button>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0 5px' }}>100%</div>
            </div>
          </ReactFlow>

          {/* Event Picker Overlay */}
          {showEventPicker && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '400px',
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              padding: '24px',
              zIndex: 100,
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Choose an event</h3>
                <button onClick={() => setShowEventPicker(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { icon: Clock, label: 'When timer fires...', sub: 'Schedule recurring tasks' },
                  { icon: Database, label: 'When field changes...', sub: 'React to table updates' },
                  { icon: Cpu, label: 'When machine outputs...', sub: 'Respond to IoT data', triggerType: 'MACHINE_TRIGGER' },
                  { icon: Link2, label: 'When connector finishes...', sub: 'Trigger on API callback', triggerType: 'CONNECTOR_TRIGGER' }
                ].map((ev, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (!ev.comingSoon) {
                        const triggerType = ev.triggerType ||
                          (ev.label === 'When field changes...' ? 'TABLE_ROW_UPDATED' :
                            ev.label === 'When timer fires...' ? 'TIMER' : 'MANUAL');
                        setNodes(nds => nds.map(n => n.id === 'start-node' ? { ...n, data: { ...n.data, label: ev.label, triggerType } } : n));
                        setShowEventPicker(false);
                      }
                    }}
                    style={{
                      padding: '15px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      cursor: ev.comingSoon ? 'not-allowed' : 'pointer',
                      opacity: ev.comingSoon ? 0.6 : 1,
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={e => !ev.comingSoon && (e.currentTarget.style.borderColor = '#3b82f6')}
                    onMouseLeave={e => !ev.comingSoon && (e.currentTarget.style.borderColor = '#e2e8f0')}
                  >
                    <div style={{ color: '#3b82f6' }}><ev.icon size={20} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{ev.label}</span>
                        {ev.comingSoon && <span style={{ fontSize: '0.6rem', fontWeight: 800, backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px' }}>COMING SOON</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ev.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Logic Editor & History */}
      <div style={{ width: '400px', backgroundColor: 'white', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
        {/* Tabs for Right Panel */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('EDIT')}
            style={{
              flex: 1, padding: '15px', border: 'none', background: 'none',
              borderBottom: activeTab === 'EDIT' ? '2px solid #3b82f6' : 'none',
              color: activeTab === 'EDIT' ? '#3b82f6' : '#64748b',
              fontWeight: 700, cursor: 'pointer'
            }}
          >Element Logic</button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            style={{
              flex: 1, padding: '15px', border: 'none', background: 'none',
              borderBottom: activeTab === 'HISTORY' ? '2px solid #3b82f6' : 'none',
              color: activeTab === 'HISTORY' ? '#3b82f6' : '#64748b',
              fontWeight: 700, cursor: 'pointer'
            }}
          >Version History</button>
        </div>

        {activeTab === 'EDIT' ? (
          selectedNode ? (
            <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Logic Editor</h3>
                <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Label</label>
                  <input
                    value={selectedNode.data.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label } } : n));
                    }}
                    style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                </div>

                {selectedNode.type === 'decision' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Condition (IF)</label>
                    <input
                      placeholder="Field (e.g. record.quantity)"
                      value={selectedNode.data.condition?.field || ''}
                      onChange={(e) => {
                        const field = e.target.value;
                        setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, condition: { ...n.data.condition, field } } } : n));
                      }}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                    <select
                      value={selectedNode.data.condition?.operator || '=='}
                      onChange={(e) => {
                        const operator = e.target.value;
                        setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, condition: { ...n.data.condition, operator } } } : n));
                      }}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    >
                      <option value="==">equals</option>
                      <option value="!=">not equals</option>
                      <option value="<">less than</option>
                      <option value=">">greater than</option>
                      <option value="contains">contains</option>
                    </select>
                    <input
                      placeholder="Value"
                      value={selectedNode.data.condition?.value || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, condition: { ...n.data.condition, value } } } : n));
                      }}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                  </div>
                )}

                {selectedNode.type === 'action' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Action Configuration</label>
                    <select
                      value={selectedNode.data.type || 'LOG_MESSAGE'}
                      onChange={(e) => {
                        const type = e.target.value;
                        const label = type === 'UPDATE_RECORD' ? 'Update Table' :
                          type === 'CREATE_RECORD' ? 'Create Record' : 'Log Message';
                        setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, type, label } } : n));
                      }}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    >
                      <option value="LOG_MESSAGE">Log Message</option>
                      <option value="UPDATE_RECORD">Update Table Record</option>
                      <option value="CREATE_RECORD">Create Table Record</option>
                      <option value="HTTP_REQUEST">HTTP Connector (API)</option>
                      <option value="SEND_NOTIFICATION">Send Notification</option>
                      <option disabled>──────────</option>
                      <option value="AI_SUMMARIZE">AI: Summarize Text</option>
                      <option value="AI_EXTRACT">AI: Extract Data from Text</option>
                      <option value="AI_TRANSLATE">AI: Translate Text</option>
                    </select>

                    {selectedNode.data.type === 'UPDATE_RECORD' && (
                      <>
                        <div>
                          <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Target Table</label>
                          <select
                            value={selectedNode.data.tableId || ''}
                            onChange={(e) => {
                              const tableId = e.target.value;
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, tableId } } : n));
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                          >
                            <option value="">Select a table...</option>
                            {tables.map(t => <option key={t.id} value={t.id}>{t.name || t.id}</option>)}
                          </select>
                        </div>
                        <input
                          placeholder="Record ID Path (e.g. record.id)"
                          value={selectedNode.data.recordIdPath || ''}
                          onChange={(e) => {
                            const recordIdPath = e.target.value;
                            setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, recordIdPath } } : n));
                          }}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                        <textarea
                          placeholder='JSON Data (e.g. {"status": "Replenish"})'
                          value={typeof selectedNode.data.data === 'string' ? selectedNode.data.data : JSON.stringify(selectedNode.data.data || {})}
                          onChange={(e) => {
                            try {
                              const val = JSON.parse(e.target.value);
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, data: val } } : n));
                            } catch (err) {
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, data: e.target.value } } : n));
                            }
                          }}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                        />
                      </>
                    )}
                    {selectedNode.data.type === 'CREATE_RECORD' && (
                      <>
                        <div>
                          <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Target Table</label>
                          <select
                            value={selectedNode.data.tableId || ''}
                            onChange={(e) => {
                              const tableId = e.target.value;
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, tableId } } : n));
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                          >
                            <option value="">Select a table...</option>
                            {tables.map(t => <option key={t.id} value={t.id}>{t.name || t.id}</option>)}
                          </select>
                        </div>
                        <textarea
                          placeholder='JSON Data (e.g. {"item": "Bolts", "qty": 100})'
                          value={typeof selectedNode.data.data === 'string' ? selectedNode.data.data : JSON.stringify(selectedNode.data.data || {})}
                          onChange={(e) => {
                            try {
                              const val = JSON.parse(e.target.value);
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, data: val } } : n));
                            } catch (err) {
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, data: e.target.value } } : n));
                            }
                          }}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                        />
                      </>
                    )}
                    {selectedNode.data.type === 'HTTP_REQUEST' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Endpoint URL</label>
                          <input
                            placeholder="https://api.example.com/data"
                            value={selectedNode.data.url || ''}
                            onChange={(e) => {
                              const url = e.target.value;
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, url } } : n));
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Method</label>
                            <select
                              value={selectedNode.data.method || 'GET'}
                              onChange={(e) => {
                                const method = e.target.value;
                                setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, method } } : n));
                              }}
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                            >
                              <option value="GET">GET</option>
                              <option value="POST">POST</option>
                              <option value="PUT">PUT</option>
                            </select>
                          </div>
                        </div>
                        <textarea
                          placeholder='JSON Request Body'
                          value={typeof selectedNode.data.data === 'string' ? selectedNode.data.data : JSON.stringify(selectedNode.data.data || {})}
                          onChange={(e) => {
                            try {
                              const val = JSON.parse(e.target.value);
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, data: val } } : n));
                            } catch (err) {
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, data: e.target.value } } : n));
                            }
                          }}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                        />
                      </div>
                    )}
                    {selectedNode.data.type === 'SEND_NOTIFICATION' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                          placeholder="Recipient (Email/UserID)"
                          value={selectedNode.data.recipient || ''}
                          onChange={(e) => {
                            const recipient = e.target.value;
                            setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, recipient } } : n));
                          }}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                        <textarea
                          placeholder="Message"
                          value={selectedNode.data.message || ''}
                          onChange={(e) => {
                            const message = e.target.value;
                            setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, message } } : n));
                          }}
                          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: '80px' }}
                        />
                      </div>
                    )}

                    {(selectedNode.data.type === 'AI_SUMMARIZE' || selectedNode.data.type === 'AI_TRANSLATE' || selectedNode.data.type === 'AI_EXTRACT') && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div>
                          <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Input Text (Variable/Path)</label>
                          <input
                            placeholder="e.g. record.notes"
                            value={selectedNode.data.inputPath || ''}
                            onChange={(e) => {
                              const inputPath = e.target.value;
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, inputPath } } : n));
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                          />
                        </div>
                        
                        {selectedNode.data.type === 'AI_TRANSLATE' && (
                          <div>
                            <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Target Language</label>
                            <input
                              placeholder="e.g. Indonesian, Japanese"
                              value={selectedNode.data.targetLanguage || ''}
                              onChange={(e) => {
                                const targetLanguage = e.target.value;
                                setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, targetLanguage } } : n));
                              }}
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                            />
                          </div>
                        )}

                        {selectedNode.data.type === 'AI_EXTRACT' && (
                          <div>
                            <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Extraction Schema (JSON)</label>
                            <textarea
                              placeholder='e.g. {"part_number": "text", "quantity": "number"}'
                              value={selectedNode.data.extractionSchema || ''}
                              onChange={(e) => {
                                const extractionSchema = e.target.value;
                                setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, extractionSchema } } : n));
                              }}
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px', minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                            />
                          </div>
                        )}

                        <div>
                          <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Output Variable</label>
                          <input
                            placeholder="e.g. record.summary_ai"
                            value={selectedNode.data.outputPath || ''}
                            onChange={(e) => {
                              const outputPath = e.target.value;
                              setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, outputPath } } : n));
                            }}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                          />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', backgroundColor: '#f0f9ff', padding: '10px', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                          <div style={{ fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <Sparkles size={12} /> AI Note
                          </div>
                          This action will use the default AI Assistant connector configured in Integrations.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedNode.type === 'loop' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Loop Configuration</label>
                    <input
                      placeholder="List Path (e.g. record.items)"
                      value={selectedNode.data.listPath || ''}
                      onChange={(e) => {
                        const listPath = e.target.value;
                        setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, listPath, label: `Loop: ${listPath}` } } : n));
                      }}
                      style={{ padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                    />
                    <div style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>
                      Injected variables: <code>element</code> and <code>position</code>.
                    </div>
                  </div>
                )}

                {selectedNode.type === 'event' && selectedNode.data.triggerType === 'TIMER' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Schedule Configuration</label>

                    <div>
                      <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Frequency</label>
                      <select
                        value={selectedNode.data.schedule?.frequency || 'HOURLY'}
                        onChange={(e) => {
                          const frequency = e.target.value;
                          setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, schedule: { ...n.data.schedule, frequency } } } : n));
                        }}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                      >
                        <option value="HOURLY">Every Hour</option>
                        <option value="DAILY">Once a Day</option>
                        <option value="WEEKLY">Once a Week</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Time (HH:MM)</label>
                      <input
                        type="time"
                        value={selectedNode.data.schedule?.time || '00:00'}
                        onChange={(e) => {
                          const time = e.target.value;
                          setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, schedule: { ...n.data.schedule, time } } } : n));
                        }}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0', marginTop: '4px' }}
                      />
                    </div>

                    {selectedNode.data.schedule?.frequency === 'WEEKLY' && (
                      <div>
                        <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Run on Days</label>
                        <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, dIdx) => (
                            <button
                              key={dIdx}
                              onClick={() => {
                                const days = selectedNode.data.schedule?.days || [];
                                const newDays = days.includes(dIdx) ? days.filter(d => d !== dIdx) : [...days, dIdx];
                                setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, schedule: { ...n.data.schedule, days: newDays } } } : n));
                              }}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: '1px solid #e2e8f0',
                                backgroundColor: (selectedNode.data.schedule?.days || []).includes(dIdx) ? '#3b82f6' : 'white',
                                color: (selectedNode.data.schedule?.days || []).includes(dIdx) ? 'white' : '#64748b',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >{day}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedNode.data.triggerType === 'MACHINE_TRIGGER' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Machine / IoT Config</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.65rem', color: '#64748b' }}>MQTT Topic</label>
                      <input
                        placeholder="factory/line1/temp"
                        value={selectedNode.data.topic || ''}
                        onChange={(e) => {
                          const topic = e.target.value;
                          setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, topic } } : n));
                        }}
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '0.65rem', color: '#64748b' }}>Filter Condition (Optional)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          placeholder="Key"
                          value={selectedNode.data.condition?.field || ''}
                          onChange={(e) => {
                            const field = e.target.value;
                            setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, condition: { ...n.data.condition, field } } } : n));
                          }}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                        <select
                          value={selectedNode.data.condition?.operator || '=='}
                          onChange={(e) => {
                            const operator = e.target.value;
                            setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, condition: { ...n.data.condition, operator } } } : n));
                          }}
                          style={{ width: '60px', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        >
                          <option value="==">=</option>
                          <option value=">">&gt;</option>
                          <option value="<">&lt;</option>
                        </select>
                        <input
                          placeholder="Value"
                          value={selectedNode.data.condition?.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, condition: { ...n.data.condition, value } } } : n));
                          }}
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'event' && (
                  <button
                    onClick={() => setShowEventPicker(true)}
                    style={{ padding: '10px', backgroundColor: '#eff6ff', color: '#3b82f6', border: '1px solid #bae6fd', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}
                  >Change Event Type</button>
                )}
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    const id = `node_${Date.now()}`;
                    const newNode = {
                      id,
                      type: 'action',
                      position: { x: selectedNode.position.x, y: selectedNode.position.y + 150 },
                      data: { label: 'New Action' }
                    };
                    setNodes(nds => [...nds, newNode]);
                    setEdges(eds => [...eds, { id: `e_${selectedNode.id}_${id}`, source: selectedNode.id, target: id }]);
                  }}
                  style={{ flex: 1, padding: '12px', backgroundColor: '#001e3c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Action
                </button>
                <button
                  onClick={() => {
                    const id = `node_${Date.now()}`;
                    const newNode = {
                      id,
                      type: 'decision',
                      position: { x: selectedNode.position.x, y: selectedNode.position.y + 150 },
                      data: { label: 'IF condition' }
                    };
                    setNodes(nds => [...nds, newNode]);
                    setEdges(eds => [...eds, { id: `e_${selectedNode.id}_${id}`, source: selectedNode.id, target: id }]);
                  }}
                  style={{ flex: 1, padding: '12px', backgroundColor: 'white', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <AlertCircle size={16} /> Decision
                </button>
                <button
                  onClick={() => {
                    const id = `node_${Date.now()}`;
                    const newNode = {
                      id,
                      type: 'loop',
                      position: { x: selectedNode.position.x, y: selectedNode.position.y + 150 },
                      data: { label: 'For Each loop' }
                    };
                    setNodes(nds => [...nds, newNode]);
                    setEdges(eds => [...eds, { id: `e_${selectedNode.id}_${id}`, source: selectedNode.id, target: id }]);
                  }}
                  style={{ flex: 1, padding: '12px', backgroundColor: 'white', border: '1px solid #e2e8f0', color: '#1e293b', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <RefreshCw size={16} /> Loop
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '0.8rem' }}>
              <Settings2 size={40} style={{ marginBottom: '10px', opacity: 0.2 }} />
              <p>Select a node on the canvas to edit its logic properties.</p>
            </div>
          )
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {currentAuto?.history && currentAuto.history.length > 0 ? (
                  currentAuto.history.map((version, idx) => (
                    <div key={idx} style={{
                      padding: '15px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      borderLeft: version.version === currentAuto.published?.version ? '4px solid #10b981' : '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>v{version.version}</span>
                          {version.version === currentAuto.published?.version && (
                            <span style={{ fontSize: '0.6rem', fontWeight: 800, backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: '4px' }}>PUBLISHED</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(version.publishedAt).toLocaleDateString()}</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '12px' }}>
                        Published by Supervisor
                      </div>
                      <button
                        onClick={() => handleRestore(version)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <History size={14} /> Restore this version
                      </button>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                    <History size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>No publication history yet.</p>
                    <p style={{ fontSize: '0.75rem' }}>Publish your first version to see it here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Context Menu Component */}
        {menu && (
          <div style={{
            position: 'fixed',
            top: menu.top,
            left: menu.left,
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            padding: '6px',
            zIndex: 1000,
            minWidth: '160px'
          }}>
            {menu.type === 'node' ? (
              <>
                <button
                  onClick={() => copyNode(menu.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', color: '#1e293b' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Copy size={14} /> Copy
                </button>
                <button
                  onClick={() => duplicateNode(menu.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', color: '#1e293b' }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Layers size={14} /> Duplicate
                </button>
                {menu.id !== 'start-node' && (
                  <>
                    <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '4px 0' }} />
                    <button
                      onClick={() => deleteNode(menu.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', color: '#ef4444' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Trash2 size={14} /> Delete Node
                    </button>
                  </>
                )}
              </>
            ) : (
              <button
                onClick={pasteNode}
                disabled={!clipboard}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: 'none', background: 'none', cursor: clipboard ? 'pointer' : 'not-allowed', borderRadius: '4px', fontSize: '0.85rem', color: clipboard ? '#1e293b' : '#94a3b8' }}
                onMouseEnter={e => clipboard && (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={e => clipboard && (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <ClipboardPaste size={14} /> Paste Node
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const WrappedAutomationEditor = (props) => (
  <ReactFlowProvider>
    <AutomationEditor {...props} />
  </ReactFlowProvider>
);

export default WrappedAutomationEditor;
