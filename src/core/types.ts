
import type { ReactNode } from "react";
import { GroundingMetadata } from "@google/genai";

// App modes
export type Environment = 'studio' | 'echo' | 'sandbox';
export type ExecutionRuntime = 'net' | 'local' | 'native';
export type AiMode = 'agent' | 'assist' | 'chat';
export type ContextMemory = 'full' | 'recent' | 'none';


// Enum for built-in, non-dynamic node types
export enum NodeType {
  TextInput = 'Text Input',
  RawTextInput = 'Raw Text Input',
  GeminiPrompt = 'Gemini Prompt',
  LocalLLMPrompt = 'Local LLM Prompt',
  DisplayData = 'Display Data',
  ImageGenerator = 'Image Generator',
  DisplayImage = 'Display Image',
  DisplayText = 'Display Text',
  Sketchpad = 'Sketchpad',
  LocalModelFileSelector = 'Local Model File Selector',
  MultiPromptNode = 'Assemble Final Scene Prompt',
}

export interface Port {
  id: string;
  name: string;
  type: 'input' | 'output';
  dataType: 'text' | 'image' | 'number' | 'boolean' | 'json' | 'any';
  exampleValue?: string | number | boolean | null | Record<string, any>;
}

export interface PortDefinition {
  id?: string;
  name: string;
  dataType: 'text' | 'image' | 'number' | 'boolean' | 'json' | 'any';
  exampleValue?: string | number | boolean | null | Record<string, any>;
}

export interface NodeData {
  id: string;
  type: string;
  name:string;
  x: number;
  y: number;
  inputs: Port[];
  outputs: Port[];
  data: { [key: string]: any; };
  isDynamic: boolean;
  executionLogicPrompt?: string;
  color?: string;
  icon?: ReactNode | string;
  requiresWebSearch?: boolean;
  currentWidth?: number;
  currentHeight?: number;
  status: 'idle' | 'running' | 'success' | 'error';
  error?: string | null;
  category?: string;
  executionTime?: string;
  suggestion?: string;
  isSuggestionLoading?: boolean;
  isImmutable?: boolean;
  description?: string;
  isPromoted?: boolean;
}

export interface Edge {
  id: string;
  sourceNodeId: string;
  sourceOutputId: string;
  targetNodeId: string;
  targetInputId: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface DynamicNodeConfig {
  name: string;
  description: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  executionLogicPrompt?: string;
  color: string;
  icon: ReactNode | string;
  isJuggernaut?: boolean;
  isAdministrative?: boolean;
  requiresWebSearch?: boolean;
  isDynamic: boolean;
  category?: string;
  currentWidth?: number;
  currentHeight?: number;
  defaultHeight?: number;
  isImmutable?: boolean;
  isPromoted?: boolean;
}

export type LlmRuntimeType = 'gemini' | 'local_ollama' | 'local_lm_studio';

export interface LocalEndpointSettings {
  baseUrl: string;
  modelName?: string;
}

export interface LlmServiceConfig {
  activeRuntime: LlmRuntimeType;
  localEndpoints: {
    ollama: LocalEndpointSettings;
    lm_studio: LocalEndpointSettings;
  };
}

export interface LlmService {
    getConfiguration: () => LlmServiceConfig;
    setConfiguration: (config: Partial<LlmServiceConfig>) => void;
    generateText: (prompt: string, enableWebSearch?: boolean, isSandbox?: boolean) => Promise<{ text: string; groundingMetadata?: GroundingMetadata | null; error?: string }>;
    generateImage: (prompt: string, localModelIdentifier?: string) => Promise<string>;
    defineNodeFromPrompt: (userDescription: string, isSandbox?: boolean) => Promise<DynamicNodeConfig | null>;
    getExecutionSuggestion: (nodeLogicPrompt: string, inputData: Record<string, any>, errorMessageFromNode: string) => Promise<string>;
}

export interface NodeComponentProps {
  node: NodeData;
  executeNode: (nodeId: string) => Promise<NodeData['status']>;
  updateNodeInternalState: (nodeId: string, dataChanges: Partial<NodeData['data']>, status?: NodeData['status'], error?: string | null, executionTime?: string, suggestion?: string, isSuggestionLoading?: boolean) => void;
  onCloseNode: (nodeId: string) => void;
  isHighlighted?: boolean;
  activeDrawingToolNodeId: string | null;
  setActiveDrawingToolNodeId: (nodeId: string | null) => void;
  appMode: Environment;
  onRequestReview: (nodeId: string) => void;
}

export interface CanvasComponentProps {
  nodes: NodeData[];
  edges: Edge[];
  onNodeDrag: (nodeId: string, x: number, y: number) => void;
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  onAddEdge: (edge: Edge) => void;
  onInteractionEnd: () => void;
  onAddNode: (agentConfig: DynamicNodeConfig, worldPoint: Point) => void;
  executeNode: (nodeId: string) => Promise<NodeData['status']>;
  updateNodeInternalState: (nodeId: string, dataChanges: Partial<NodeData['data']>, status?: NodeData['status'], error?: string | null, executionTime?: string, suggestion?: string, isSuggestionLoading?: boolean) => void;
  onRemoveNode: (nodeId: string) => void;
  onRemoveEdge: (edgeId: string) => void;
  appMode: Environment;
  onRequestReview: (nodeId: string) => void;
  isWorkflowRunning: boolean;
}

export interface BugReport {
  id: string;
  error: {
    message: string;
    stack?: string;
  };
  context?: string;
  timestamp: string;
  count: number;
  suggestion?: string;
  isSuggestionLoading: boolean;
  status: 'new' | 'seen';
}

export interface NodeExecutionResult {
    outputs?: { [key: string]: any };
    error?: string;
    groundingMetadata?: GroundingMetadata | null;
}

export type NodeExecutionFunction = (
  node: NodeData,
  llmService: LlmService,
  appMode: Environment
) => Promise<NodeExecutionResult>;

export interface ExecutionHistoryEntry {
  id: string;
  nodeName: string;
  nodeIcon: ReactNode | string;
  status: 'success' | 'error';
  timestamp: string;
  executionTime: string;
  error?: string | null;
}

export interface SavedWorkflow {
    name: string;
    nodes: NodeData[];
    edges: Edge[];
    lastSaved: string;
}

export interface EventLog {
  id: number;
  agent: string;
  event: string;
  timestamp: string;
  details: Record<string, any>;
}

// --- Echo Project Types ---
export type TaskStatus = 'upcoming' | 'current' | 'completed';
export type PredictedEngagement = 'high' | 'medium' | 'low' | 'none';

export interface EchoTask {
  id: string;
  name: string;
  time: string;
  icon: string;
  status: TaskStatus;
  type: 'reading' | 'math' | 'art' | 'meal' | 'play' | 'writing' | 'social_studies';
  engagement?: PredictedEngagement;
  content?: {
    title?: string;
    body?: string;
    imagePrompt?: string;
  };
  duration?: number;
}
