import React, { useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MarkerType,
    Handle,
    Position
} from 'reactflow';
import dagre from 'dagre';
import { 
    Play, 
    Square, 
    Database, 
    CheckCircle2, 
    ArrowRight,
    Cpu
} from 'lucide-react';
import 'reactflow/dist/style.css';

// --- CUSTOM NODES ---

const StartNode = ({ data }) => (
    <div style={{
        padding: '12px 24px',
        borderRadius: '30px',
        background: 'linear-gradient(135deg, #10b981, #059669)',
        border: 'none',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)',
        fontWeight: 800,
        fontSize: '0.85rem',
        minWidth: '140px',
        justifyContent: 'center'
    }}>
        <Play size={16} fill="white" />
        APP START
        <Handle type="source" position={Position.Bottom} style={{ background: '#10b981' }} />
    </div>
);

const StepNode = ({ data }) => (
    <div style={{
        padding: '16px 20px',
        borderRadius: '12px',
        background: data.isSelected ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#fff',
        border: `2px solid ${data.isSelected ? '#60a5fa' : '#e2e8f0'}`,
        color: data.isSelected ? '#fff' : '#1e293b',
        minWidth: '200px',
        boxShadow: data.isSelected ? '0 10px 25px rgba(59, 130, 246, 0.3)' : '0 4px 6px -1px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        position: 'relative'
    }}>
        <Handle type="target" position={Position.Top} style={{ background: '#3b82f6' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Square size={14} style={{ color: data.isSelected ? 'white' : '#94a3b8' }} />
            <div style={{ fontSize: '0.65rem', color: data.isSelected ? 'rgba(255,255,255,0.7)' : '#64748b', textTransform: 'uppercase', fontWeight: 800 }}>Step</div>
        </div>
        <div style={{ fontWeight: 800, fontSize: '1rem' }}>{data.label}</div>
        <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6' }} />
    </div>
);

const ActionNode = ({ data }) => (
    <div style={{
        padding: '10px 16px',
        borderRadius: '8px',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        color: '#1e293b',
        minWidth: '160px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        fontSize: '0.75rem',
        fontWeight: 600
    }}>
        <Handle type="target" position={Position.Top} style={{ background: '#cbd5e1' }} />
        <div style={{ 
            width: '24px', 
            height: '24px', 
            borderRadius: '6px', 
            backgroundColor: data.type === 'CONNECTOR' ? '#eff6ff' : '#fff1f2', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: data.type === 'CONNECTOR' ? '#3b82f6' : '#e11d48'
        }}>
            {data.type === 'CONNECTOR' ? <Cpu size={14} /> : <Database size={14} />}
        </div>
        <div style={{ flex: 1 }}>{data.label}</div>
    </div>
);

const EndNode = ({ data }) => (
    <div style={{
        padding: '12px 24px',
        borderRadius: '30px',
        background: '#f1f5f9',
        border: '2px solid #e2e8f0',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontWeight: 800,
        fontSize: '0.85rem',
        minWidth: '160px',
        justifyContent: 'center'
    }}>
        <Handle type="target" position={Position.Top} style={{ background: '#cbd5e1' }} />
        <CheckCircle2 size={16} color="#10b981" />
        {data.label || 'APP COMPLETE'}
    </div>
);

const nodeTypes = {
    start: StartNode,
    step: StepNode,
    action: ActionNode,
    end: EndNode
};

// --- LAYOUT ENGINE ---

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
    const isHorizontal = direction === 'LR';
    dagreGraph.setGraph({ rankdir: direction });

    nodes.forEach((node) => {
        let width = 200, height = 80;
        if (node.type === 'start' || node.type === 'end') { width = 160; height = 45; }
        if (node.type === 'action') { width = 180; height = 50; }
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return {
        nodes: nodes.map((node) => {
            const nodeWithPosition = dagreGraph.node(node.id);
            node.targetPosition = isHorizontal ? Position.Left : Position.Top;
            node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;
            node.position = {
                x: nodeWithPosition.x - (dagreGraph.node(node.id).width / 2),
                y: nodeWithPosition.y - (dagreGraph.node(node.id).height / 2),
            };
            return node;
        }),
        edges,
    };
};

// --- MAIN COMPONENT ---

const AppDiagram = ({ steps = [], currentStepId, onSelectStep }) => {
    const { nodes: lNodes, edges: lEdges } = useMemo(() => {
        const nodes = [];
        const edges = [];
        
        const safeAddActionNode = (stepId, type, label, nodeId) => {
            if (!nodes.find(n => n.id === nodeId)) {
                nodes.push({ id: nodeId, type: 'action', data: { type, label }, position: { x: 0, y: 0 } });
                edges.push({
                    id: `e-${stepId}-${nodeId}`,
                    source: stepId,
                    target: nodeId,
                    style: { stroke: type === 'TABLE' ? '#e11d48' : '#3b82f6', strokeDasharray: '5,5', opacity: 0.6 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: type === 'TABLE' ? '#e11d48' : '#3b82f6' }
                });
            }
        };

        const safeAddTransition = (sourceId, targetId, label) => {
            if (targetId === 'end-complete' && !nodes.find(n => n.id === 'end-complete')) {
                nodes.push({ id: 'end-complete', type: 'end', data: { label: 'COMPLETE' }, position: { x: 0, y: 0 } });
            }
            if (targetId) {
                edges.push({
                    id: `e-${sourceId}-${targetId}-${Math.random()}`,
                    source: sourceId,
                    target: targetId,
                    label: label,
                    labelStyle: { fontSize: 10, fontWeight: 700, fill: '#64748b' },
                    labelBgStyle: { fill: '#fff', fillOpacity: 0.8, rx: 4 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                    style: { stroke: '#94a3b8', strokeWidth: 1.5 }
                });
            }
        };

        // 1. Add Start
        nodes.push({ id: 'start', type: 'start', data: { label: 'Start' }, position: { x: 0, y: 0 } });
        if (steps && steps.length > 0) {
            edges.push({ id: 'e-start-first', source: 'start', target: steps[0].id, style: { stroke: '#10b981', strokeWidth: 3 }, animated: true });
        }

        // 2. Add Steps and Extraction Triggers
        if (steps) {
            steps.forEach((step, idx) => {
                nodes.push({
                    id: step.id,
                    type: 'step',
                    data: { label: step.title, isSelected: step.id === currentStepId },
                    position: { x: 0, y: 0 }
                });

                // Extract logic from components
                (step.components || []).forEach(comp => {
                    // Legacy Actions
                    if (comp.type === 'BUTTON') {
                        if (comp.props.action === 'NEXT_STEP') {
                            if (idx < steps.length - 1) safeAddTransition(step.id, steps[idx+1].id, comp.props.label || 'Next');
                        } else if (comp.props.action === 'GO_TO_STEP') {
                            safeAddTransition(step.id, comp.props.targetStepId, comp.props.label || 'Go to');
                        } else if (comp.props.action === 'COMPLETE_APP') {
                            safeAddTransition(step.id, 'end-complete', comp.props.label || 'Finish');
                        }
                    }

                    // Modern Triggers
                    (comp.props.triggers || []).forEach(trig => {
                        (trig.actions || []).forEach(act => {
                            if (act.type === 'GO_TO_STEP') safeAddTransition(step.id, act.payload.targetId || act.payload.targetStepId, trig.name || 'Trigger');
                            else if (act.type === 'NEXT_STEP') { if (idx < steps.length - 1) safeAddTransition(step.id, steps[idx+1].id, trig.name || 'Next'); }
                            else if (act.type === 'COMPLETE_APP') safeAddTransition(step.id, 'end-complete', trig.name || 'Complete');
                            
                            if (act.type && act.type.includes('TABLE_RECORD')) safeAddActionNode(step.id, 'TABLE', `Table: ${act.payload.placeholderId}`, `data-${step.id}-${act.payload.placeholderId}`);
                            if (act.type === 'SEND_TO_CONNECTOR') safeAddActionNode(step.id, 'CONNECTOR', `Connector: ${act.payload.connectorId}`, `conn-${step.id}-${act.payload.connectorId}`);
                        });
                    });
                });

                // Extract logic from Step level triggers
                (step.triggers || []).forEach(trig => {
                    (trig.actions || []).forEach(act => {
                        if (act.type === 'GO_TO_STEP') safeAddTransition(step.id, act.payload.targetId || act.payload.targetStepId, trig.name || 'Step Logic');
                        if (act.type && act.type.includes('TABLE_RECORD')) safeAddActionNode(step.id, 'TABLE', `Data Op`, `data-step-${step.id}-${Math.random()}`);
                    });
                });
            });
        }

        return getLayoutedElements(nodes, edges);
    }, [steps, currentStepId]);

    const onNodeClick = (event, node) => {
        if (node.type === 'step' && onSelectStep) onSelectStep(node.id);
    };

    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#f8fafc', position: 'relative' }}>
            <ReactFlow
                nodes={lNodes}
                edges={lEdges}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                fitView
                minZoom={0.2}
                maxZoom={1.5}
            >
                <Background color="#cbd5e1" gap={30} size={1} />
                <Controls />
            </ReactFlow>

            {/* Float HUD for Context */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', pointerEvents: 'none', zIndex: 10 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowRight size={16} color="#3b82f6" />
                    APP LOGIC MAP
                </div>
                <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>Automated Flow Documentation</div>
            </div>
        </div>
    );
};

export default AppDiagram;
