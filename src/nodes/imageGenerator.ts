
import type { NodeExecutionFunction, NodeExecutionResult, NodeData, LlmService } from '../core/types';

/**
 * Executes the ImageGenerator node by calling the llmService's generateImage method.
 */
export const execute: NodeExecutionFunction = async (
  node: NodeData,
  llmService: LlmService
): Promise<NodeExecutionResult> => {
  const promptPort = node.inputs.find(p => p.id === 'prompt_in');
  const modelIdPort = node.inputs.find(p => p.id === 'local_model_identifier_in');
  const outputPort = node.outputs[0];

  if (!promptPort) {
    return { error: "ImageGenerator node is missing 'prompt_in' input." };
  }
  if (!outputPort) {
    return { error: "ImageGenerator node is missing its output port." };
  }

  const prompt = node.data[promptPort.id];
  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return { error: "A non-empty prompt is required to generate an image." };
  }

  const localModelIdentifier = modelIdPort ? node.data[modelIdPort.id] : undefined;

  const imageResult = await llmService.generateImage(prompt, localModelIdentifier);
  
  // The service returns the image data URL on success, or an error message string on failure.
  if (imageResult.startsWith('data:image/')) {
    return {
      outputs: {
        [outputPort.id]: imageResult,
      },
    };
  } else {
    // If it's not a data URL, it's an error message from the service.
    return { error: imageResult };
  }
};
