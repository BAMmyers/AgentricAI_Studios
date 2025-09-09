
import { NodeExecutionFunction, NodeExecutionResult, NodeData } from '../core/types';

/**
 * Execution logic for the Sketchpad node.
 * The actual drawing is handled in the component. This execution function
 * simply passes the generated image data from its internal state to its output.
 */
export const execute: NodeExecutionFunction = async (
  node: NodeData
): Promise<NodeExecutionResult> => {
  const outputPort = node.outputs[0];
  if (!outputPort) {
    return { error: "Sketchpad node is missing its output port configuration." };
  }

  // The image data is stored in the node's data object by the component itself.
  const imageData = node.data[outputPort.id];

  return {
    outputs: {
      [outputPort.id]: imageData || null, // Pass through the data or null if empty
    },
  };
};
