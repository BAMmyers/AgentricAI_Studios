
import type { NodeExecutionFunction, NodeExecutionResult, NodeData, LlmService, Environment } from '../core/types';

/**
 * A generic execution function for simple LLM prompt nodes.
 * It takes a prompt from a single input, calls the LLM service, and returns the text response.
 */
export const execute: NodeExecutionFunction = async (
  node: NodeData,
  llmService: LlmService,
  // FIX: Module '"../core/types"' has no exported member 'AppMode'. The correct type is 'Environment'.
  appMode: Environment
): Promise<NodeExecutionResult> => {
  const inputPort = node.inputs.find(p => p.id === 'prompt_in');
  const outputPort = node.outputs.find(p => p.id === 'response_out');

  if (!inputPort) {
    return { error: `Node '${node.name}' is missing its 'prompt_in' input.` };
  }
  if (!outputPort) {
    return { error: `Node '${node.name}' is missing its 'response_out' output.` };
  }

  const prompt = node.data[inputPort.id];
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return { error: `Node '${node.name}' requires a non-empty text prompt.` };
  }

  // Use the node's requiresWebSearch flag, default to false if not present
  const enableWebSearch = node.requiresWebSearch || false;

  const { text, error: serviceError, groundingMetadata } = await llmService.generateText(
    prompt,
    enableWebSearch,
    appMode === 'sandbox'
  );

  if (serviceError) {
    return { error: serviceError };
  }

  return {
    outputs: {
      [outputPort.id]: text,
    },
    groundingMetadata,
  };
};
