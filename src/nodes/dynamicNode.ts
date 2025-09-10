
import type { NodeExecutionFunction, NodeExecutionResult, NodeData, Environment, LlmService } from '../core/types';

/**
 * Executes a dynamic node based on its executionLogicPrompt.
 * This function handles filling placeholders, calling the LLM, and parsing the response.
 */
export const execute: NodeExecutionFunction = async (
  node: NodeData,
  llmService: LlmService,
  // FIX: Module '"../core/types"' has no exported member 'AppMode'. The correct type is 'Environment'.
  appMode: Environment
): Promise<NodeExecutionResult> => {
  if (!node.executionLogicPrompt) {
    return { error: "Node is dynamic but has no execution logic prompt." };
  }

  // Replace placeholders in the prompt with actual input data
  let filledPrompt = node.executionLogicPrompt;
  for (const inputPort of node.inputs) {
    const placeholder = `{${inputPort.id}}`;
    let value = node.data[inputPort.id];

    // Ensure value is a string for prompt injection
    if (value === undefined || value === null) {
      value = ''; // Use empty string for missing inputs
    } else if (typeof value !== 'string') {
      try {
        value = JSON.stringify(value, null, 2);
      } catch {
        value = String(value);
      }
    }
    filledPrompt = filledPrompt.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
  }

  // Call the LLM service
  const { text, error: serviceError, groundingMetadata } = await llmService.generateText(
    filledPrompt,
    node.requiresWebSearch,
    appMode === 'sandbox'
  );

  if (serviceError) {
    return { error: serviceError };
  }

  let resultData: Record<string, any> = {};

  // Handle multiple outputs by parsing JSON
  if (node.outputs.length > 1) {
    try {
      let cleanJsonStr = text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = cleanJsonStr.match(fenceRegex);
      if (match && match[2]) {
        cleanJsonStr = match[2].trim();
      }

      const parsedJson = JSON.parse(cleanJsonStr);
      if (typeof parsedJson === 'object' && parsedJson !== null) {
        resultData = parsedJson;
      } else {
        throw new Error("LLM response was not a valid JSON object.");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      return { error: `Error parsing LLM JSON response: ${errorMessage}. Response snippet: ${text.substring(0, 200)}` };
    }
  } else if (node.outputs.length === 1) {
    // Handle a single output
    const outputPortId = node.outputs[0].id;
    resultData[outputPortId] = text;
  }

  return { outputs: resultData, groundingMetadata };
};
