
import { NodeType, PortDefinition } from './types';
import type { DynamicNodeConfig } from './types';

export const DEFAULT_NODE_WIDTH = 220;
export const DEFAULT_NODE_HEIGHT = 100;
export const MIN_NODE_WIDTH = 180;
export const MIN_NODE_HEIGHT = 80;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 2.0;
export const ZOOM_SENSITIVITY = 0.001;

export const DEFAULT_EDGE_COLOR = '#9ca3af'; // gray-400

export const DATA_TYPE_STROKE_COLORS: Record<PortDefinition['dataType'], string> = {
  text: '#0ea5e9',    // sky-500
  image: '#84cc16',   // lime-500
  number: '#f59e0b',  // amber-500
  boolean: '#f43f5e', // rose-500
  json: '#d946ef',    // fuchsia-500
  any: '#9ca3af',     // gray-400 (neutral for 'any')
};

export const NODE_CONFIG: Record<string, DynamicNodeConfig> = {
  [NodeType.TextInput]: {
    name: NodeType.TextInput,
    isDynamic: false,
    inputs: [],
    outputs: [{ id: 'text_out', name: 'Text', dataType: 'text' }],
    color: 'bg-blue-600',
    icon: '📝',
    description: 'Provides a standard text input field.',
    category: "Input",
    defaultHeight: 120,
  },
  [NodeType.RawTextInput]: {
    name: NodeType.RawTextInput,
    isDynamic: false,
    inputs: [],
    outputs: [{ id: 'raw_text_out', name: 'Raw Text', dataType: 'text' }],
    color: 'bg-yellow-600',
    icon: '⚡',
    description: 'A raw, direct text input node for unfiltered creation, primarily for use in the Sandbox.',
    category: "Input",
    defaultHeight: 120,
  },
  [NodeType.GeminiPrompt]: {
    name: NodeType.GeminiPrompt,
    isDynamic: false,
    inputs: [{ id: 'prompt_in', name: 'Prompt', dataType: 'text' }],
    outputs: [{ id: 'response_out', name: 'Response', dataType: 'text' }],
    color: 'bg-purple-600',
    icon: '✨',
    description: 'Sends a prompt to Gemini and outputs its text response.',
    category: "AI / LLM",
    defaultHeight: 130,
  },
  [NodeType.LocalLLMPrompt]: {
    name: NodeType.LocalLLMPrompt,
    isDynamic: false,
    inputs: [{ id: 'prompt_in', name: 'Prompt', dataType: 'text' }],
    outputs: [{ id: 'response_out', name: 'Response', dataType: 'text' }],
    color: 'bg-orange-600',
    icon: '🧠',
    description: 'Sends a prompt to the configured local LLM.',
    category: "AI / LLM",
    defaultHeight: 130,
  },
  [NodeType.ImageGenerator]: {
    name: NodeType.ImageGenerator,
    isDynamic: false,
    inputs: [
        { id: 'prompt_in', name: 'Prompt', dataType: 'text' },
        { id: 'local_model_identifier_in', name: 'Local Model ID', dataType: 'text' }
    ],
    outputs: [{ id: "image_out", name: "Image", dataType: "image" }],
    color: 'bg-teal-600',
    icon: '🖼️',
    description: 'Generates an image from a prompt.',
    category: "AI / LLM",
    defaultHeight: 150,
  },
  [NodeType.DisplayData]: {
    name: NodeType.DisplayData,
    isDynamic: false,
    inputs: [{ id: 'data_in', name: 'Data', dataType: 'any' }],
    outputs: [],
    color: 'bg-green-600',
    icon: '📺',
    description: 'Displays any connected data as JSON.',
    category: "Display",
    defaultHeight: 150,
  },
  [NodeType.DisplayImage]: {
    name: NodeType.DisplayImage,
    isDynamic: false,
    inputs: [{ id: 'image_in', name: 'Image', dataType: 'image' }],
    outputs: [],
    color: 'bg-lime-600',
    icon: '🏞️',
    description: 'Displays an input image.',
    category: "Display",
    defaultHeight: 180,
  },
  [NodeType.DisplayText]: {
    name: NodeType.DisplayText,
    isDynamic: false,
    inputs: [{ id: 'text_in', name: 'Text', dataType: 'text' }],
    outputs: [],
    color: 'bg-slate-500',
    icon: '📄',
    description: 'Displays input text content.',
    category: "Display",
    defaultHeight: 150,
  },
  [NodeType.Sketchpad]: {
    name: NodeType.Sketchpad,
    isDynamic: false,
    inputs: [],
    outputs: [{ id: 'sketch_image_out', name: 'Sketch Output', dataType: 'image' }],
    color: 'bg-stone-500',
    icon: '✏️',
    description: 'A canvas for freehand drawing.',
    category: "Creative",
    defaultHeight: 220,
  },
  [NodeType.LocalModelFileSelector]: { 
    name: NodeType.LocalModelFileSelector,
    isDynamic: false,
    inputs: [],
    outputs: [{ id: 'model_identifier_out', name: 'Model Identifier', dataType: 'text' }],
    color: 'bg-gray-600',
    icon: '📂',
    description: 'Selects a local model file.',
    category: "Input",
    defaultHeight: 110,
  },
  [NodeType.MultiPromptNode]: {
    name: NodeType.MultiPromptNode,
    isDynamic: false,
    inputs: [
      { id: 'prompt_part_1', name: 'Part 1', dataType: 'any' },
      { id: 'prompt_part_2', name: 'Part 2', dataType: 'any' },
      { id: 'prompt_part_3', name: 'Part 3', dataType: 'any' },
    ],
    outputs: [{ id: 'assembled_prompt_out', name: 'Assembled Prompt', dataType: 'text' }],
    color: 'bg-slate-600',
    icon: '🧩',
    description: 'Combines inputs into a single text prompt.',
    category: "Utility",
    defaultHeight: 180,
  },
};

export const DATA_TYPE_COLORS: Record<PortDefinition['dataType'], string> = {
  text: 'bg-sky-500',
  image: 'bg-lime-500',
  number: 'bg-amber-500',
  boolean: 'bg-rose-500',
  json: 'bg-fuchsia-500',
  any: 'port-any-gradient',
};

export const ANY_TYPE_PORT_COLOR = 'port-any-gradient';
