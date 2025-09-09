
import { NodeExecutionFunction, NodeExecutionResult, NodeData } from '../core/types';

/**
 * Execution logic for the DisplayImage node.
 * Like other display nodes, its role is visualization. Execution is a success
 * once it has an image source to display.
 */
export const execute: NodeExecutionFunction = async (
  node: NodeData
): Promise<NodeExecutionResult> => {
  const inputPortId = node.inputs[0]?.id;
  
  if (inputPortId && node.data[inputPortId] !== undefined) {
    return { outputs: {} };
  }

  return { outputs: {} };
};
