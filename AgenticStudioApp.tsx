
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { initialSystemAgents } from './src/core/agentDefinitions';
import type { NodeData, Edge, DynamicNodeConfig, Point, AppMode, LlmServiceConfig } from './src/core/types';
import { NODE_CONFIG, DEFAULT_NODE_WIDTH } from './src/core/constants';
import CanvasComponent from './components/CanvasComponent';
import FloatingSearchMenu from './components/FloatingSearchMenu';
import EchoApp from './components/echo/EchoApp';
import MechanicStatus from './components/MechanicStatus';
import { llmService } from './src/services/llmService';
import { mechanicService } from './src/services/mechanicService';
import { staticNodeLogics } from './src/nodes/nodeLogicRegistry';
import { execute as executeDynamicNode } from './src/nodes/dynamicNode';
import { prelimNodes, prelimEdges } from './src/core/prelim-test-data';

// --- Constants for localStorage keys ---
const AUTOSAVE_NODES_KEY = 'agenticStudio_autosave_nodes_v2';
const AUTOSAVE_EDGES_KEY = 'agenticStudio_autosave_edges_v2';
const AUTOSAVE_AGENTS_KEY = 'agenticStudio_autosave_custom_agents_v2';
const AUTOSAVE_LLM_CONFIG_KEY = 'llmServiceConfig';

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
  const [appMode, setAppMode] = useState<AppMode>('studio');
  
  // --- Core States ---
  const [llmConfig, setLlmConfig] = useState<LlmServiceConfig>(llmService.getConfiguration());
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempLlmConfig, setTempLlmConfig] = useState<LlmServiceConfig>(llmService.getConfiguration());
  const [dynamicNodeDefinitionPrompt, setDynamicNodeDefinitionPrompt] = useState('');
  const [isDefiningNode, setIsDefiningNode] = useState(false);
  const [nodeDefinitionError, setNodeDefinitionError] = useState<string | null>(null);

  // --- Canvas Interaction States ---
  const [showSearchMenu, setShowSearchMenu] = useState(false);
  const [searchMenuViewportPosition, setSearchMenuViewportPosition] = useState<Point>({ x: 0, y: 0 });
  const [lastDoubleClickViewportPosition, setLastDoubleClickViewportPosition] = useState<Point>({ x: 0, y: 0 });
  const [appViewTransform, setAppViewTransform] = useState<{ x: number, y: number, k: number }>({ x: 0, y: 0, k: 1 });
  const [isWorkflowRunning, setIsWorkflowRunning] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [activeDrawingToolNodeId, setActiveDrawingToolNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);


  // --- Initialization ---
  useEffect(() => {
    mechanicService.init();

    const savedNodes = localStorage.getItem(AUTOSAVE_NODES_KEY);
    const savedEdges = localStorage.getItem(AUTOSAVE_EDGES_KEY);
    const savedAgents = localStorage.getItem(AUTOSAVE_AGENTS_KEY);

    if (savedNodes && savedEdges && JSON.parse(savedNodes).length > 0) {
      setNodes(JSON.parse(savedNodes));
      setEdges(JSON.parse(savedEdges));
      console.log("AgentricAI Studios: Autosaved workflow from previous session loaded.");
    } else {
      setNodes(prelimNodes);
      setEdges(prelimEdges);
      console.log("AgentricAI Studios: No autosaved workflow found, loading preliminary test data.");
    }
    
    // All system agents are now available on the canvas. They will be sorted into categories by the search menu.
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
    
    const customAgents = savedAgents ? JSON.parse(savedAgents) : [];
    setAvailableAgents([...staticAgents, ...allSystemAgents, ...customAgents]);

  }, []);

  // --- Autosaving Effects ---
  useEffect(() => { localStorage.setItem(AUTOSAVE_NODES_KEY, JSON.stringify(nodes)); }, [nodes]);
  useEffect(() => { localStorage.setItem(AUTOSAVE_EDGES_KEY, JSON.stringify(edges)); }, [edges]);
  useEffect(() => {
    const customAgents = availableAgents.filter(a => a.category === 'Custom Agents');
    localStorage.setItem(AUTOSAVE_AGENTS_KEY, JSON.stringify(customAgents));
  }, [availableAgents]);
  
  const handleNodeDrag = useCallback((nodeId: string, x: number, y: number) => {
    setNodes(prevNodes => prevNodes.map(n => n.id === nodeId ? { ...n, x, y } : n));
  }, []);

  const addNodeToCanvas = useCallback((agentConfig: DynamicNodeConfig, worldX?: number, worldY?: number) => {
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
      x: worldX ?? 150,
      y: worldY ?? 100,
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
    setNodes(prev => [...prev, baseNode]);
  }, []);

  const onRemoveNode = useCallback((nodeIdToRemove: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeIdToRemove));
    setEdges(prev => prev.filter(edge => edge.sourceNodeId !== nodeIdToRemove && edge.targetNodeId !== nodeIdToRemove));
    if (highlightedNodeId === nodeIdToRemove) setHighlightedNodeId(null);
    if (activeDrawingToolNodeId === nodeIdToRemove) setActiveDrawingToolNodeId(null);
  }, [highlightedNodeId, activeDrawingToolNodeId]);

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

    setEdges(prev => prev.filter(edge => edge.id !== edgeIdToRemove));

    const targetNode = nodes.find(n => n.id === edgeToRemove.targetNodeId);
    if (targetNode) {
      const inputPort = targetNode.inputs.find(p => p.id === edgeToRemove.targetInputId);
      if (inputPort) {
        // Reset the input data to its default or null to prevent stale data
        updateNodeInternalState(targetNode.id, { [inputPort.id]: inputPort.exampleValue ?? null }, 'idle');
      }
    }
  }, [edges, nodes, updateNodeInternalState]);

  const executeNode = useCallback(async (nodeId: string): Promise<NodeData['status']> => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 'error';
    if (activeDrawingToolNodeId && activeDrawingToolNodeId !== nodeId) return 'idle';

    setHighlightedNodeId(nodeId);
    updateNodeInternalState(nodeId, {}, 'running', null, '...');
    const startTime = performance.now();
    let finalStatus: NodeData['status'] = 'error';

    try {
        const executionFn = staticNodeLogics[node.type] ?? (node.isDynamic ? executeDynamicNode : null);
        if (!executionFn) {
            throw new Error(`Execution logic not found for node type: ${node.type}`);
        }
        
        const result = await executionFn(node, llmService, appMode);

        const executionTime = ((performance.now() - startTime) / 1000).toFixed(2) + 's';

        if (result.error) {
            updateNodeInternalState(nodeId, {}, 'error', result.error, executionTime);
            finalStatus = 'error';
            mechanicService.logBug(new Error(result.error), `Node Execution Error: ${node.name} (ID: ${node.id})`);
        } else {
            updateNodeInternalState(nodeId, result.outputs || {}, 'success', null, executionTime);
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
        const executionTime = ((performance.now() - startTime) / 1000).toFixed(2) + 's';
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Unhandled error executing node ${nodeId}:`, error);
        updateNodeInternalState(nodeId, {}, 'error', errorMessage, executionTime);
        finalStatus = 'error';
        mechanicService.logBug(error as Error, `Unhandled Node Execution Error: ${node.name} (ID: ${node.id})`);
    } finally {
        if (!isWorkflowRunning && highlightedNodeId === nodeId) {
            setHighlightedNodeId(null);
        }
    }
    return finalStatus;
  }, [nodes, edges, updateNodeInternalState, isWorkflowRunning, highlightedNodeId, activeDrawingToolNodeId, appMode]);

  const runFullWorkflow = async () => {
    if (isWorkflowRunning || activeDrawingToolNodeId) return;
    setIsWorkflowRunning(true);
  
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
        break; // Stop execution on first error
      }
    }
  
    setIsWorkflowRunning(false);
    setHighlightedNodeId(null);
  };
  
  const handleDefineNewNode = async () => {
    if (!dynamicNodeDefinitionPrompt.trim() || isDefiningNode) return;
    setIsDefiningNode(true);
    setNodeDefinitionError(null);
    try {
        const nodeConfig = await llmService.defineNodeFromPrompt(dynamicNodeDefinitionPrompt, appMode === 'sandbox');
        if (nodeConfig) {
            const completeNodeConfig: DynamicNodeConfig = { ...nodeConfig, isDynamic: true, category: "Custom Agents" };
            setAvailableAgents(prev => [...prev, completeNodeConfig]);
            setDynamicNodeDefinitionPrompt('');
        } else {
            setNodeDefinitionError("LLM failed to return a valid node configuration. Check console for details.");
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setNodeDefinitionError(`Error: ${errorMessage}`);
        mechanicService.logBug(error as Error, "Define New Node Error");
    } finally {
        setIsDefiningNode(false);
    }
  };

  const llmStatusMessage = useMemo(() => {
    if (llmConfig.activeRuntime === 'gemini') return GEMINI_API_KEY ? "Gemini Active" : "Gemini (No API Key)";
    return `${llmConfig.activeRuntime === 'local_lm_studio' ? 'LM Studio' : 'Ollama'} Active`;
  }, [llmConfig.activeRuntime]);

  const handleSaveLlmSettings = () => {
    llmService.setConfiguration(tempLlmConfig);
    setLlmConfig(llmService.getConfiguration());
    setShowSettingsModal(false);
  };

  const handleCanvasDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (activeDrawingToolNodeId) return;
    const target = event.target as HTMLElement;
    if (target.closest('.draggable-node, .port-handle, button, input, textarea, select, [data-resize-handle="true"]')) return;
    setSearchMenuViewportPosition({ x: event.clientX, y: event.clientY });
    setLastDoubleClickViewportPosition({ x: event.clientX, y: event.clientY });
    setShowSearchMenu(true);
  };

  const handleSelectAgentFromSearch = (agentConfig: DynamicNodeConfig) => {
    const { x: worldX, y: worldY } = viewportToWorld(lastDoubleClickViewportPosition.x, lastDoubleClickViewportPosition.y);
    addNodeToCanvas(agentConfig, worldX, worldY);
    setShowSearchMenu(false);
  };

  const viewportToWorld = useCallback((viewportX: number, viewportY: number): Point => {
    const currentCanvas = canvasRef.current;
    if (!currentCanvas) return { x: 0, y: 0 };
    const rect = currentCanvas.getBoundingClientRect();
    return {
      x: (viewportX - rect.left - appViewTransform.x) / appViewTransform.k,
      y: (viewportY - rect.top - appViewTransform.y) / appViewTransform.k,
    };
  }, [appViewTransform]);

  if (appMode === 'echo') {
    return (
        <div className="flex flex-col h-screen bg-black">
             <header className="bg-neutral-950 p-2 shadow-md flex items-center justify-end border-b-4 border-dotted border-neutral-800">
                <button onClick={() => setAppMode('studio')} className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md text-sm font-medium">
                    Return to Studio
                </button>
             </header>
            <EchoApp />
        </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen bg-gray-900 text-gray-300 ${appMode === 'sandbox' ? 'sandbox-mode' : ''}`}>
      <header className="bg-neutral-950 p-2 shadow-md flex items-center justify-between border-b-4 border-dotted border-neutral-800 space-x-2">
        <div className="flex items-center space-x-2">
            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCAxMjAgMTIwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxkZWZzPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJnbG93R3JhZGllbnQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMDBCN0QwOyBzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojOGE0QkFFOyBzdG9wLW9wYWNpdHk6MSIgLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDYwIDYwKSBzY2FsZSgwLjgpIHRyYW5zbGF0ZSgtNjAgLTYwKSI+CiAgICAgIDxnPgogICAgICAgICAgPHBhdGggZD0iTTYwIDEwQTE1IDE1IDkwIDAgMSA2MCAyNUExNSAxNSAyNzAgMCAxIDYwIDEwWiIgZmlsbD0idXJsKCNnbG93R3JhZGllbnQpIiB0cmFuc2Zvcm09InJvdGF0ZSgzMCA2MCA2MCkiPgogICAgICAgICAgICA8YW5pbWF0ZVRyYW5zZm9ybSBhdHRyaWJ1dGVOYW1lPSJ0cmFuc2Zvcm0iIHR5cGU9InJvdGF0ZSIgZnJvbT0iMzAgNjAgNjAiIHRvPSIzOTIgNjAgNjAiIGR1cj0iMTVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICAgICAgICAgIDwvcGF0aD4KICAgICAgICAgIDxwYXRoIGQ9Ik02MCAxMEExNSA1NSA5MCAwIDEgNjAgMjVBMTUgMTUgMjcwIDAgMSA2MCAxMFoiIGZpbGw9InVybCgjZ2xvd0dyYWRpZW50KSIgdHJhbnNmb3JtPSJyb3RhdGUoMTUwIDYwIDYwKSI+CiAgICAgICAgICAgIDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiBmcm9tPSIxNTAgNjAgNjAiIHRvPSI1MTIgNjAgNjAiIGR1cj0iMTVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICAgICAgICAgIDwvcGF0aD4KICAgICAgICAgIDxwYXRoIGQ9Ik02MCAxMEExNSA1NSA5MCAwIDEgNjAgMjVBMTUgMTUgMjcwIDAgMSA2MCAxMFoiIGZpbGw9InVybCgjZ2xvd0dyYWRpZW50KSIgdHJhbnNmb3JtPSJyb3RhdGUoMjcwIDYwIDYwKSI+CiAgICAgICAgICAgIDxhbmltYXRlVHJhbnNmb3JtIGF0dHJpYnV0ZU5hbWU9InRyYW5zZm9ybSIgdHlwZT0icm90YXRlIiBmcm9tPSIyNzAgNjAgNjAiIHRvPSI2MzIgNjAgNjAiIGR1cj0iMTVzIiByZXBlYXRDb3VudD0iaW5kZWZpbml0ZSIgLz4KICAgICAgICAgIDwvcGF0aD4KICAgICAgICAgIDxjaXJjbGUgY3g9IjYwIiBjeT0iNjAiIHI9IjEyIiBmaWxsPSIjMUEwRjJCIiBzdHJva2U9IiMwQkQ3RDAiIHN0cm9rZS13aWR0aD0iMiIvPgogICAgICAgICAgPGNpcmNsZSBjeD9iNjAiIGN5PSI2MCIgcj0iNSIgZmlsbD0idXJsKCNnbG93R3JhZGllbnQpIi8+CiAgICAgIDwvZz4KICA8L2c+Cjwvc3ZnPg==" alt="AgentricAI Logo" className="h-7 w-7" />
            <h1 className="text-xl font-bold text-sky-400">AgentricAI Studios</h1>
        </div>
        <div className="flex-grow"></div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setAppMode('echo')} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-sm font-medium">
                Open Echo View
            </button>
            <span className={`text-xs px-2 py-1 rounded-md ${llmConfig.activeRuntime === 'gemini' ? (GEMINI_API_KEY ? 'bg-green-600' : 'bg-red-600') : 'bg-sky-600'}`}>
                {llmStatusMessage}
            </span>
            <button onClick={() => { setTempLlmConfig(llmConfig); setShowSettingsModal(true); }} className="p-1.5 rounded-md hover:bg-neutral-700" title="LLM Settings">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </button>
            <button onClick={runFullWorkflow} disabled={isWorkflowRunning || nodes.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium disabled:opacity-50" title="Run full workflow">
                {isWorkflowRunning ? 'Running...' : 'Run Full Workflow'}
            </button>
            <button onClick={() => { setNodes([]); setEdges([]); }} className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm font-medium">
                Clear Canvas
            </button>
        </div>
      </header>

      <div className="flex-grow flex relative" onDoubleClick={handleCanvasDoubleClick}>
        <CanvasComponent
          ref={canvasRef} nodes={nodes} edges={edges} onNodeDrag={handleNodeDrag}
          setNodes={setNodes} setEdges={setEdges} executeNode={executeNode}
          updateNodeInternalState={updateNodeInternalState} onRemoveNode={onRemoveNode}
          onRemoveEdge={handleRemoveEdge} onViewTransformChange={setAppViewTransform} 
          highlightedNodeId={highlightedNodeId} activeDrawingToolNodeId={activeDrawingToolNodeId} 
          setActiveDrawingToolNodeId={setActiveDrawingToolNodeId} isWorkflowRunning={isWorkflowRunning} 
          appMode={appMode} onRequestReview={(nodeId) => console.log(`Review requested for ${nodeId}`)}
        />
        <FloatingSearchMenu
            isOpen={showSearchMenu} onClose={() => setShowSearchMenu(false)}
            position={searchMenuViewportPosition} agents={availableAgents}
            onSelectAgent={handleSelectAgentFromSearch}
            initialClickViewportPosition={lastDoubleClickViewportPosition}
        />
      </div>

      <div className="define-node-container bg-neutral-950 p-3 shadow-md border-t-4 border-dotted border-neutral-800">
        <h3 className="text-md font-semibold mb-2 text-sky-400">Define New Agent/Node</h3>
        <div className="flex space-x-2 items-start">
            <textarea
                value={dynamicNodeDefinitionPrompt} onChange={(e) => setDynamicNodeDefinitionPrompt(e.target.value)}
                placeholder="Describe the node you want to create..."
                className="flex-grow p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-sm h-20"
                disabled={isDefiningNode}
            />
            <button onClick={handleDefineNewNode} disabled={isDefiningNode || !dynamicNodeDefinitionPrompt.trim()}
                className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 h-20">
                {isDefiningNode ? 'Defining...' : 'Define Node'}
            </button>
        </div>
        {nodeDefinitionError && <p className="text-red-500 text-xs mt-1">{nodeDefinitionError}</p>}
      </div>

      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 p-6 rounded-lg shadow-2xl w-full max-w-lg border-4 border-dotted border-neutral-800">
            <h2 className="text-xl font-semibold mb-6 text-sky-400">LLM Settings</h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Active Runtime</label>
                    <select value={tempLlmConfig.activeRuntime} onChange={(e) => setTempLlmConfig({...tempLlmConfig, activeRuntime: e.target.value as LlmServiceConfig['activeRuntime']})}
                        className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200">
                        {GEMINI_API_KEY && <option value="gemini">Gemini (Cloud)</option>}
                        <option value="local_lm_studio">Local (LM Studio)</option>
                        <option value="local_ollama">Local (Ollama)</option>
                    </select>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-300 mb-1">LM Studio Base URL</label>
                     <input type="text" value={tempLlmConfig.localEndpoints.lm_studio.baseUrl} onChange={(e) => setTempLlmConfig({...tempLlmConfig, localEndpoints: {...tempLlmConfig.localEndpoints, lm_studio: {...tempLlmConfig.localEndpoints.lm_studio, baseUrl: e.target.value}}})}
                        className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200" placeholder="http://localhost:1234/v1"/>
                </div>
                 <div>
                     <label className="block text-sm font-medium text-gray-300 mb-1">Ollama Base URL</label>
                     <input type="text" value={tempLlmConfig.localEndpoints.ollama.baseUrl} onChange={(e) => setTempLlmConfig({...tempLlmConfig, localEndpoints: {...tempLlmConfig.localEndpoints, ollama: {...tempLlmConfig.localEndpoints.ollama, baseUrl: e.target.value}}})}
                        className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200" placeholder="http://localhost:11434/v1"/>
                </div>
            </div>
            <div className="mt-8 flex justify-end space-x-3">
              <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-sm bg-neutral-700 hover:bg-neutral-600 rounded-md">Cancel</button>
              <button onClick={handleSaveLlmSettings} className="px-4 py-2 text-sm text-white bg-sky-600 hover:bg-sky-700 rounded-md">Save Settings</button>
            </div>
          </div>
        </div>
      )}
      <MechanicStatus />
    </div>
  );
};

export default AgenticStudioApp;
