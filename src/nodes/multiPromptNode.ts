
import { NodeExecutionFunction, NodeExecutionResult, NodeData } from '../core/types';

/**
 * Execution logic for the MultiPromptNode.
 * It concatenates all its inputs into a single string output.
 */
export const execute: NodeExecutionFunction = async (
  node: NodeData
): Promise<NodeExecutionResult> => {
  const outputPort = node.outputs[0];
  if (!outputPort) {
    return { error: "MultiPromptNode is missing its output port configuration." };
  }

  // Concatenate all input values in the order they are defined.
  // This ensures a predictable output string.
  const assembledPrompt = node.inputs
    .map(inputPort => {
      const value = node.data[inputPort.id];
      if (value === undefined || value === null) {
        return "";
      }
      return String(value);
    })
    .join('\n'); // Join with newlines for clarity

  return {
    outputs: {
      [outputPort.id]: assembledPrompt,
    },
  };
};
