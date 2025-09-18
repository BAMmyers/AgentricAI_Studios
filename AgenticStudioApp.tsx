import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { initialSystemAgents } from './src/core/agentDefinitions';
import type { NodeData, Edge, DynamicNodeConfig, Point, Environment, LlmServiceConfig, ExecutionHistoryEntry, SavedWorkflow, ExecutionRuntime, AiMode, ContextMemory } from './src/core/types';
import { NODE_CONFIG, DEFAULT_NODE_WIDTH } from './src/core/constants';
import CanvasComponent from './components/CanvasComponent';
import EchoApp from './components/echo/EchoApp';
import MechanicStatus from './components/MechanicStatus';
import { llmService } from './src/services/llmService';
import { databaseService } from './src/services/databaseService';
import { mechanicService } from './src/services/mechanicService';
import { staticNodeLogics } from './src/nodes/nodeLogicRegistry';
import { execute as executeDynamicNode } from './src/nodes/dynamicNode';
import { prelimNodes, prelimEdges } from './src/core/prelim-test-data';
import Sidebar from './components/Sidebar';
import DefineNodeModal from './components/DefineNodeModal';
import { securityService } from './src/services/securityService';

const createPortsFromDefinitions = (portDefs: DynamicNodeConfig['inputs'] | DynamicNodeConfig['outputs'], type: 'input' | 'output') => {
  return portDefs.map((def, index) => ({
    id: def.id || `${type}-${def.name.toLowerCase().replace(/\s+/g, '_')}-${index}`,
    name: def.name,
    type,
    dataType: def.dataType,
    exampleValue: def.exampleValue
  }));
};

const GEMINI_API_KEY = process.env.API_KEY;

const AgenticStudioApp: React.FC = () => {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [availableAgents, setAvailableAgents] = useState<DynamicNodeConfig[]>([]);
  
  // --- Core States ---
  const [showDefineNodeModal, setShowDefineNodeModal] = useState(false);

  // --- Algorithmic Mode States ---
  const [environment, setEnvironment] = useState<Environment>('studio');
  const [executionRuntime, setExecutionRuntime] = useState<ExecutionRuntime>('native');
  const [aiMode, setAiMode] = useState<AiMode>('agent');
  const [contextMemory, setContextMemory] = useState<ContextMemory>('full');

  // --- Canvas Interaction States ---
  const [appViewTransform, setAppViewTransform] = useState<{ x: number, y: number, k: number }>({ x: 0, y: 0, k: 1 });
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [activeDrawingToolNodeId, setActiveDrawingToolNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Undo/Redo History State ---
  const [history, setHistory] = useState<{ nodes: NodeData[], edges: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // --- Sidebar & Panels State ---
  const [executionHistory, setExecutionHistory] = useState<ExecutionHistoryEntry[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<Record<string, SavedWorkflow>>({});
  const [currentWorkflowName, setCurrentWorkflowName] = useState('Untitled Workflow');
  const [llmConfig, setLlmConfig] = useState<LlmServiceConfig>(llmService.getConfiguration());
  
  const isInitialMount = useRef(true);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const pushToHistory = useCallback((currentNodes: NodeData[], currentEdges: Edge[], actionName?: string) => {
      const newHistory = history.slice(0, historyIndex + 1);
      const lastState = newHistory[newHistory.length - 1];
      if (lastState && JSON.stringify(lastState.nodes) === JSON.stringify(currentNodes) && JSON.stringify(lastState.edges) === JSON.stringify(currentEdges)) {
          return;
      }
      newHistory.push({ nodes: JSON.parse(JSON.stringify(currentNodes)), edges: JSON.parse(JSON.stringify(currentEdges)) });
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      const { nodes: pastNodes, edges: pastEdges } = history[newIndex];
      setNodes(JSON.parse(JSON.stringify(pastNodes)));
      setEdges(JSON.parse(JSON.stringify(pastEdges)));
      setHistoryIndex(newIndex);
    }
  }, [canUndo, history, historyIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      const { nodes: futureNodes, edges: futureEdges } = history[newIndex];
      setNodes(JSON.parse(JSON.stringify(futureNodes)));
      setEdges(JSON.parse(JSON.stringify(futureEdges)));
      setHistoryIndex(newIndex);
    }
  }, [canRedo, history, historyIndex]);

  // --- Initialization ---
  useEffect(() => {
    const initializeApp = async () => {
        // Initialize services that require async setup
        await databaseService.init();
        await mechanicService.init();
        
        const storedWorkflows = await databaseService.loadWorkflows();
        if(storedWorkflows) { setSavedWorkflows(storedWorkflows); }

        let initialNodes: NodeData[], initialEdges: Edge[];
        const autosavedWorkflow = await databaseService.loadWorkflow('__autosave');

        if (autosavedWorkflow && autosavedWorkflow.nodes.length > 0) {
          initialNodes = autosavedWorkflow.nodes;
          initialEdges = autosavedWorkflow.edges;
          console.log("AgentricAI Studios: Autosaved workflow from previous session loaded from database.");
        } else {
          initialNodes = prelimNodes;
          initialEdges = prelimEdges;
          console.log("AgentricAI Studios: No autosaved workflow found, loading preliminary test data.");
        }
        setNodes(initialNodes);
        setEdges(initialEdges);
        
        const initialHistory = [{ nodes: initialNodes, edges: initialEdges }];
        setHistory(initialHistory);
        setHistoryIndex(0);
        
        const allSystemAgents = initialSystemAgents;
        const staticAgents = Object.entries(NODE_CONFIG).map(([key, config]) => ({
          name: key,
          description: config.description || "A standard node.",
          inputs: config.inputs,
          outputs: config.outputs,
          color: config.color,
          icon: config.icon,
          isDynamic: false,
          category: config.category,
          requiresWebSearch: config.requiresWebSearch || false,
          defaultHeight: config.defaultHeight,
        }));
        
        const customAgents = await databaseService.loadCustomAgents();
        setAvailableAgents([...staticAgents, ...allSystemAgents, ...customAgents]);
    };

    initializeApp().catch(error => {
      console.error("A critical error occurred during application initialization:", error);
      mechanicService.logBug(error as Error, "Critical Application Initialization Failure");
    });
  }, []);

  // --- Autosaving Workflow to DB (debounced) ---
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }

    const handler = setTimeout(() => {
        // This now saves the workflow regardless of content, correctly persisting an empty canvas state.
        console.log("Autosaving session to database...");
        databaseService.saveWorkflow('__autosave', nodes, edges);
    }, 1000);

    return () => {
        clearTimeout(handler);
    };
  }, [nodes, edges]);

  // --- Autosaving Custom Agents to DB ---
  useEffect(() => {
    if (isInitialMount.current) return; // Don't save on initial load
    const customAgents = availableAgents.filter(a => a.category === 'Custom Agents');
    databaseService.saveCustomAgents(customAgents);
  }, [availableAgents]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName.toLowerCase() === 'input' || (e.target as HTMLElement).tagName.toLowerCase() === 'textarea') {
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  const handleNodeDrag = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prevNodes => prevNodes.map(n => n.id === nodeId ? { ...n, x, y } : n));
  }, []);

  const onAddNode = useCallback((agentConfig: DynamicNodeConfig, worldPoint: Point) => {
    const newNodeId = `${agentConfig.name.replace(/\s+/g, '_')}-${Date.now()}`;
    const baseNodeData: NodeData['data'] = {};
    agentConfig.inputs.forEach(inputDef => {
        if (inputDef.exampleValue !== undefined && inputDef.id) {
            baseNodeData[inputDef.id] = inputDef.exampleValue;
        }
    });

    const baseNode: NodeData = {
      id: newNodeId,
      type: agentConfig.name,
      name: agentConfig.name,
      x: worldPoint.x ?? 150,
      y: worldPoint.y ?? 100,
      inputs: createPortsFromDefinitions(agentConfig.inputs, 'input'),
      outputs: createPortsFromDefinitions(agentConfig.outputs, 'output'),
      data: baseNodeData,
      isDynamic: !!agentConfig.isDynamic,
      color: agentConfig.color || 'bg-gray-700',
      icon: agentConfig.icon || '⚙️',
      requiresWebSearch: agentConfig.requiresWebSearch || false,
      category: agentConfig.category || "General",
      status: 'idle',
      currentWidth: agentConfig.currentWidth || DEFAULT_NODE_WIDTH,
      currentHeight: agentConfig.defaultHeight || 100,
      ...(agentConfig.isDynamic && { executionLogicPrompt: agentConfig.executionLogicPrompt }),
      isImmutable: agentConfig.isImmutable,
      description: agentConfig.description,
    };
    const newNodes = [...nodes, baseNode];
    setNodes(newNodes);
    pushToHistory(newNodes, edges);
  }, [nodes, edges, pushToHistory]);

  const onRemoveNode = useCallback((nodeIdToRemove: string) => {
    const newNodes = nodes.filter(node => node.id !== nodeIdToRemove);
    const newEdges = edges.filter(edge => edge.sourceNodeId !== nodeIdToRemove && edge.targetNodeId !== nodeIdToRemove);
    setNodes(newNodes);
    setEdges(newEdges);
    pushToHistory(newNodes, newEdges);
    if (highlightedNodeId === nodeIdToRemove) setHighlightedNodeId(null);
    if (activeDrawingToolNodeId === nodeIdToRemove) setActiveDrawingToolNodeId(null);
  }, [nodes, edges, pushToHistory, highlightedNodeId, activeDrawingToolNodeId]);

  const updateNodeInternalState = useCallback((nodeId: string, dataChanges: Partial<NodeData['data']>, status?: NodeData['status'], error?: string | null, executionTime?: string) => {
    setNodes(prevNodes => {
      const newNodes = prevNodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...dataChanges },
            status: status !== undefined ? status : node.status,
            error: error !== undefined ? error : node.error,
            executionTime: executionTime !== undefined ? executionTime : node.executionTime,
          };
        }
        return node;
      });
      return newNodes;
    });
  }, []);
  
  const handleRemoveEdge = useCallback((edgeIdToRemove: string) => {
    const edgeToRemove = edges.find(e => e.id === edgeIdToRemove);
    if (!edgeToRemove) return;
    const newEdges = edges.filter(edge => edge.id !== edgeIdToRemove);
    setEdges(newEdges);
    const targetNode = nodes.find(n => n.id === edgeToRemove.targetNodeId);
    if (targetNode) {
      const inputPort = targetNode.inputs.find(p => p.id === edgeToRemove.targetInputId);
      if (inputPort) {
        updateNodeInternalState(targetNode.id, { [inputPort.id]: inputPort.exampleValue ?? null }, 'idle');
      }
    }
    pushToHistory(nodes, newEdges);
  }, [edges, nodes, pushToHistory, updateNodeInternalState]);

  const onAddEdge = useCallback((newEdge: Edge) => {
    setEdges(prev => {
        const filtered = prev.filter(edge => !(edge.targetNodeId === newEdge.targetNodeId && edge.targetInputId === newEdge.targetInputId));
        const newEdges = [...filtered, newEdge];
        pushToHistory(nodes, newEdges);
        return newEdges;
    });
    const sourceNode = nodes.find(n => n.id === newEdge.sourceNodeId);
    if (sourceNode?.status === 'success' && sourceNode.data?.[newEdge.sourceOutputId] !== undefined) {
        updateNodeInternalState(newEdge.targetNodeId, { [newEdge.targetInputId]: sourceNode.data[newEdge.sourceOutputId] }, 'idle');
    }
  }, [nodes, pushToHistory, updateNodeInternalState]);

  const handleInteractionEnd = useCallback(() => {
    pushToHistory(nodes, edges);
  }, [nodes, edges, pushToHistory]);

  const executeNode = useCallback(async (nodeId: string): Promise<NodeData['status']> => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 'error';
    if (activeDrawingToolNodeId && activeDrawingToolNodeId !== nodeId) return 'idle';

    setHighlightedNodeId(nodeId);
    updateNodeInternalState(nodeId, {}, 'running', null, '...');
    const startTime = performance.now();
    let finalStatus: NodeData['status'] = 'error';
    let errorMessage: string | null = null;
    let execTime = '...';

    try {
        const executionFn = staticNodeLogics[node.type] ?? (node.isDynamic ? executeDynamicNode : null);
        if (!executionFn) {
            throw new Error(`Execution logic not found for node type: ${node.type}`);
        }
        
        const result = await executionFn(node, llmService, environment);
        execTime = ((performance.now() - startTime) / 1000).toFixed(2) + 's';

        if (result.error) {
            errorMessage = result.error;
            updateNodeInternalState(nodeId, {}, 'error', errorMessage, execTime);
            finalStatus = 'error';
            mechanicService.logBug(new Error(errorMessage), `Node Execution Error: ${node.name} (ID: ${node.id})`);
        } else {
            updateNodeInternalState(nodeId, result.outputs || {}, 'success', null, execTime);
            finalStatus = 'success';

            const connectedEdges = edges.filter(edge => edge.sourceNodeId === nodeId);
            for (const edge of connectedEdges) {
                const targetNode = nodes.find(n => n.id === edge.targetNodeId);
                const sourcePort = node.outputs.find(p => p.id === edge.sourceOutputId);
                const targetPort = targetNode?.inputs.find(p => p.id === edge.targetInputId);
                if (targetNode && sourcePort && targetPort && result.outputs?.[sourcePort.id] !== undefined) {
                    updateNodeInternalState(targetNode.id, { [targetPort.id]: result.outputs[sourcePort.id] }, 'idle');
                }
            }
        }
    } catch (error) {
        execTime = ((performance.now() - startTime) / 1000).toFixed(2) + 's';
        errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Unhandled error executing node ${nodeId}:`, error);
        updateNodeInternalState(nodeId, {}, 'error', errorMessage, execTime);
        finalStatus = 'error';
        mechanicService.logBug(error as Error, `Unhandled Node Execution Error: ${node.name} (ID: ${node.id})`);
    } finally {
        if (!isWorkflowRunning && highlightedNodeId === nodeId) {
            setHighlightedNodeId(null);
        }
        setExecutionHistory(prev => [{
            id: `${nodeId}-${Date.now()}`,
            nodeName: node.name,
            nodeIcon: node.icon || '⚙️',
            status: finalStatus as 'success' | 'error',
            timestamp: new Date().toISOString(),
            executionTime: execTime,
            error: errorMessage,
        }, ...prev]);
    }
    return finalStatus;
  }, [nodes, edges, updateNodeInternalState, isWorkflowRunning, highlightedNodeId, activeDrawingToolNodeId, environment]);

  const runFullWorkflow = async () => {
    if (isWorkflowRunning || activeDrawingToolNodeId) return;
    setIsWorkflowRunning(true);
    setExecutionHistory(prev => [{
        id: `workflow-start-${Date.now()}`,
        nodeName: 'Workflow Run',
        nodeIcon: '▶️',
        status: 'success',
        timestamp: new Date().toISOString(),
        executionTime: '0.00s'
    }, ...prev]);
  
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const inDegree = new Map(nodes.map(n => [n.id, 0]));
    const adj = new Map(nodes.map(n => [n.id, [] as string[]]));
  
    edges.forEach(edge => {
      if (nodeMap.has(edge.sourceNodeId) && nodeMap.has(edge.targetNodeId)) {
        adj.get(edge.sourceNodeId)?.push(edge.targetNodeId);
        inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
      }
    });
  
    const queue = nodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
    const executionOrder: string[] = [];
  
    while (queue.length > 0) {
      const u = queue.shift()!;
      executionOrder.push(u);
  
      adj.get(u)?.forEach(v => {
        inDegree.set(v, (inDegree.get(v) || 0) - 1);
        if (inDegree.get(v) === 0) {
          queue.push(v);
        }
      });
    }

    if (executionOrder.length !== nodes.length) {
      const cycleNodes = nodes.filter(n => !executionOrder.includes(n.id)).map(n => n.name).join(', ');
      mechanicService.logBug(new Error(`Workflow cycle detected. Involved nodes: ${cycleNodes}`), "Workflow Execution Error");
      console.warn("Cycle detected in graph, not all nodes will be executed.");
    }
  
    for (const nodeId of executionOrder) {
      const status = await executeNode(nodeId);
      if (status === 'error') {
        console.warn(`Node ${nodeId} failed during workflow execution. Aborting workflow.`);
        break;
      }
    }
  
    setIsWorkflowRunning(false);
    setHighlightedNodeId(null);
  };
  
  const handleDefineNode = useCallback(async (userDescription: string): Promise<{ success: boolean; error?: string }> => {
    const newAgentConfig = await llmService.defineNodeFromPrompt(userDescription, environment === 'sandbox');
    if (!newAgentConfig) {
      return { success: false, error: "The AI failed to define a valid node from your description. Please try rephrasing your request." };
    }
    
    // Security Review via The Gatekeeper
    const review = await securityService.reviewAgent(newAgentConfig);
    if (!review.approved) {
        return { success: false, error: `Agent review denied by The Gatekeeper: ${review.reason}` };
    }

    setAvailableAgents(prev => [...prev, { ...newAgentConfig, isDynamic: true, category: 'Custom Agents', isPromoted: true }]);
    return { success: true };
  }, [environment]);

  const handleRequestReview = useCallback(async (nodeId: string) => {
    const nodeToReview = nodes.find(n => n.id === nodeId);
    if (!nodeToReview) return;
    
    updateNodeInternalState(nodeId, {}, 'running', "Submitting for review...");

    // Create a config object from the node data for the Gatekeeper
    const configToReview: DynamicNodeConfig = {
        name: nodeToReview.name,
        description: nodeToReview.description || "A user-defined agent from the sandbox.",
        inputs: nodeToReview.inputs.map(p => ({ id: p.id, name: p.name, dataType: p.dataType })),
        outputs: nodeToReview.outputs.map(p => ({ id: p.id, name: p.name, dataType: p.dataType })),
        executionLogicPrompt: nodeToReview.executionLogicPrompt,
        color: nodeToReview.color || 'bg-gray-500',
        icon: nodeToReview.icon || '💡',
        isDynamic: true,
        category: 'Custom Agents'
    };
    
    const review = await securityService.reviewAgent(configToReview);
    
    if(review.approved) {
        updateNodeInternalState(nodeId, {}, 'success', "Approved!");
        setAvailableAgents(prev => [...prev, { ...configToReview, isPromoted: true }]);
        alert(`Agent "${configToReview.name}" has been approved and added to your Node Library!`);
    } else {
        updateNodeInternalState(nodeId, {}, 'error', `Denied: ${review.reason}`);
    }
  }, [nodes, updateNodeInternalState]);

  const handleSaveWorkflow = async () => {
    const name = currentWorkflowName.trim();
    if (!name || name === '__autosave') {
        alert("Please enter a valid name for the workflow.");
        return;
    }
    await databaseService.saveWorkflow(name, nodes, edges);
    const newSavedWorkflows = await databaseService.loadWorkflows();
    setSavedWorkflows(newSavedWorkflows);
    alert(`Workflow "${name}" saved!`);
  };
  
  const handleLoadWorkflow = async (name: string) => {
    const workflow = await databaseService.loadWorkflow(name);
    if (workflow) {
        setNodes(workflow.nodes);
        setEdges(workflow.edges);
        setCurrentWorkflowName(name);
        pushToHistory(workflow.nodes, workflow.edges, 'Load Workflow');
        setExecutionHistory([]);
    }
  };

  const handleDeleteWorkflow = async (name: string) => {
    if (window.confirm(`Are you sure you want to delete workflow "${name}"? This cannot be undone.`)) {
        await databaseService.deleteWorkflow(name);
        const newSavedWorkflows = await databaseService.loadWorkflows();
        setSavedWorkflows(newSavedWorkflows);
    }
  };

  const handleSaveLlmSettings = (newConfig: LlmServiceConfig) => {
    llmService.setConfiguration(newConfig);
    setLlmConfig(llmService.getConfiguration());
    alert("LLM settings saved!");
  };

  if (environment === 'echo') {
    return (
        <div className="flex flex-col h-screen bg-black">
             <header className="bg-neutral-950 p-2 shadow-md flex items-center justify-end border-b-4 border-dotted border-neutral-800">
                <button onClick={() => setEnvironment('studio')} className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md text-sm font-medium">
                    Return to Studio
                </button>
             </header>
            <EchoApp />
        </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-gray-900 text-gray-300 ${environment === 'sandbox' ? 'sandbox-mode' : ''}`}>
      <header className="bg-neutral-950 p-2 shadow-md flex items-center justify-between border-b-4 border-dotted border-neutral-800 space-x-2 z-20">
        <div className="flex items-center space-x-2">
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAxMjAgMTIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJnbG93R3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDBCN0QwOyBzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOGE0QkFFOyBzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDYwIDYwKSBzY2FsZSgwLjgpIHRyYW5zbGF0ZSgtNjAgLTYwKSI+CiAgICAgIDxnPgogICAgICAgICAgPHBhdGggZD0iTTYwIDEwQTE1IDE1IDkwIDAgMSA2MCAyNUExNSAxNSAyNzAgMCAxIDYwIDEwWiIgZmlsbD0idXJsKCNnbG93R3JhZGllbnQpIiB0cmFuc2Zvcm09InJvdGF0ZSgzMCA2MCA2MCkiPgogICAgICAgICAgICA8YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iIHR5cGU9InJvdGF0ZSIgZnJvbT0iMzAgNjAgNjAiIHRvPSIzOTIgNjAgNjAiIGR1cj0iMTVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICAgICAgICAgIDwvcGF0aD4KICAgICAgICAgIDxwYXRoIGQ9Ik02MCAxMEExNSA1NSA5MCAwIDEgNjAgMjVBMTUgMTUgMjcwIDAgMSA2MCAxMFoiIGZpbGw9InVybCgjZ2xvd0dyYWRpZW50KSIgdHJhbnNmb3JtPSJyb3RhdGUoMTUwIDYwIDYwKSI+CiAgICAgICAgICAgIDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiBmcm9tPSIxNTAgNjAgNjAiIHRvPSI1MTIgNjAgNjAiIGR1cj0iMTVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICAgICAgICAgIDwvcGF0aD4KICAgICAgICAgIDxwYXRoIGQ9Ik02MCAxMEExNSA1NSA5MCAwIDEgNjAgMjVBMTUgMTUgMjcwIDAgMSA2MCAxMFoiIGZpbGw9InVybCgjZ2xvd0dyYWRpZW50KSIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwIDYwIDYwKSI+CiAgICAgICAgICAgIDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiBmcm9tPSIyNzAgNjAgNjAiIHRvPSI2MzIgNjAgNjAiIGR1cj0iMTVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICAgICAgICAgIDwvcGF0aD4KICAgICAgICAgIDxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjEyIiBmaWxsPSIjMUEwRjJCIiBzdHJva2U9IiMwQkQ3RDAiIHN0cm9rZS11aWR0aD0iMiIvPgogICAgICAgICAgPGNpcmNsZSBjeD9iNjAiIGN5PSI2MCIgcj0iNSIgZmlsbD0idXJsKCNnbG93R3JhZGllbnQpIi8+CiAgICAgIDwvZz4KICA8L2c+Cjwvc3ZnPg==" alt="AgentricAI Logo" className="h-7 w-7" />
            <h1 className="text-xl font-bold text-sky-400 flex items-baseline">
                <button onClick={undo} disabled={!canUndo} className="font-bold hover:text-white disabled:opacity-50 transition-colors" title="Undo (Ctrl+Z)">A</button>
                <span>gentricAI Studio</span>
                <button onClick={redo} disabled={!canRedo} className="font-bold hover:text-white disabled:opacity-50 transition-colors" title="Redo (Ctrl+Y)">s</button>
            </h1>
        </div>
        <div className="flex-grow"></div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setShowDefineNodeModal(true)} className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M11 5a1 1 0 10-2 0v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V5z" /></svg>
                <span className="hidden md:inline">Define New Agent</span>
            </button>
             <button onClick={undo} disabled={!canUndo} className="p-1.5 rounded-md hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
            </button>
            <button onClick={redo} disabled={!canRedo} className="p-1.5 rounded-md hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed" title="Redo (Ctrl+Y)">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 15l3-3m0 0l-3-3m3 3H5m16 0a9 9 0 10-18 0 9 9 0 0018 0z" /></svg>
            </button>
            <button onClick={runFullWorkflow} disabled={isWorkflowRunning || nodes.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50 flex items-center space-x-1.5" title="Run full workflow">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                <span className="hidden md:inline">{isWorkflowRunning ? 'Running...' : 'Run Full Workflow'}</span>
            </button>
            <button onClick={() => { setNodes([]); setEdges([]); pushToHistory([], []); setExecutionHistory([]); databaseService.saveWorkflow('__autosave', [], []); }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                <span className="hidden md:inline">Clear Canvas</span>
            </button>
        </div>
      </header>

      <main className="flex-grow flex relative overflow-hidden">
        <Sidebar 
          availableAgents={availableAgents}
          executionHistory={executionHistory}
          setExecutionHistory={setExecutionHistory}
          savedWorkflows={savedWorkflows}
          currentWorkflowName={currentWorkflowName}
          setCurrentWorkflowName={setCurrentWorkflowName}
          onSave={handleSaveWorkflow}
          onLoad={handleLoadWorkflow}
          onDelete={handleDeleteWorkflow}
          llmConfig={llmConfig}
          onLlmSettingsSave={handleSaveLlmSettings}
          hasApiKey={!!GEMINI_API_KEY}
          environment={environment}
          setEnvironment={setEnvironment}
          executionRuntime={executionRuntime}
          setExecutionRuntime={setExecutionRuntime}
          aiMode={aiMode}
          setAiMode={setAiMode}
          contextMemory={contextMemory}
          setContextMemory={setContextMemory}
        />
        <div className="flex-grow h-full relative">
            <CanvasComponent
              ref={canvasRef} nodes={nodes} edges={edges} onNodeDrag={handleNodeDrag}
              setNodes={setNodes} onAddEdge={onAddEdge} executeNode={executeNode}
              updateNodeInternalState={updateNodeInternalState} onRemoveNode={onRemoveNode}
              onRemoveEdge={handleRemoveEdge} onViewTransformChange={setAppViewTransform} 
              highlightedNodeId={highlightedNodeId} activeDrawingToolNodeId={activeDrawingToolNodeId} 
              setActiveDrawingToolNodeId={setActiveDrawingToolNodeId} isWorkflowRunning={isWorkflowRunning}
              onInteractionEnd={handleInteractionEnd}
              onAddNode={onAddNode}
              appMode={environment}
              onRequestReview={handleRequestReview}
            />
        </div>
      </main>
      <MechanicStatus />
      {showDefineNodeModal && (
        <DefineNodeModal 
          isOpen={showDefineNodeModal} 
          onClose={() => setShowDefineNodeModal(false)}
          onDefine={handleDefineNode}
          isSandbox={environment === 'sandbox'}
        />
      )}
    </div>
  );
};

export default AgenticStudioApp;