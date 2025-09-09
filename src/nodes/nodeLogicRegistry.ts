
import { NodeType, NodeExecutionFunction } from '../core/types';

// Import all static node logic modules
import * as textInputLogic from './textInput';
import * as displayTextLogic from './displayText';
import * as displayDataLogic from './displayData';
import * as displayImageLogic from './displayImage';
import * as imageGeneratorLogic from './imageGenerator';
import * as sketchpadLogic from './sketchpad';
import * as multiPromptLogic from './multiPromptNode';
import * as llmPromptLogic from './llmPrompt'; // Import the new logic
// Note: Dynamic nodes are handled by a separate function, not this registry.

/**
 * A registry mapping static node types to their specific execution logic.
 * This allows the main execution loop to be type-agnostic and simply
 * look up the correct function to run for a given node.
 */
export const staticNodeLogics: Record<string, NodeExecutionFunction> = {
  [NodeType.TextInput]: textInputLogic.execute,
  [NodeType.RawTextInput]: textInputLogic.execute, // Reuses the same simple logic
  [NodeType.DisplayText]: displayTextLogic.execute,
  [NodeType.DisplayData]: displayDataLogic.execute,
  [NodeType.DisplayImage]: displayImageLogic.execute,
  [NodeType.ImageGenerator]: imageGeneratorLogic.execute,
  [NodeType.Sketchpad]: sketchpadLogic.execute,
  [NodeType.MultiPromptNode]: multiPromptLogic.execute,
  [NodeType.GeminiPrompt]: llmPromptLogic.execute, // Add Gemini Prompt to the registry
  [NodeType.LocalLLMPrompt]: llmPromptLogic.execute, // Add Local LLM Prompt to the registry
  // LocalModelFileSelector is an input node; its logic is to pass its data forward, same as TextInput.
  [NodeType.LocalModelFileSelector]: textInputLogic.execute,
};
