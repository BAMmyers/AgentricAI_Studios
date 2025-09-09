
import { NodeExecutionFunction, NodeExecutionResult, NodeData } from '../core/types';

/**
 * Execution logic for the DisplayData node.
 * This node is primarily for visualization, so its execution is a "pass-through".
 * It signals success so the workflow can continue, but doesn't modify the data.
 */
export const execute: NodeExecutionFunction = async (
  node: NodeData
): Promise<NodeExecutionResult> => {
  const inputPortId = node.inputs[0]?.id;

  // The node has "succeeded" in its execution if it has received data to display.
  // It doesn't have an output, so we return an empty outputs object.
  if (inputPortId && node.data[inputPortId] !== undefined) {
    return { outputs: {} };
  }
  
  // If no data is present, it's not an error, it's just waiting.
  // We can indicate success without outputs.
  return { outputs: {} };
};
