
import { NodeExecutionFunction, NodeExecutionResult, NodeData } from '../core/types';

/**
 * Execution logic for the DisplayText node.
 * As a display node, its purpose is to render text. It successfully "executes"
 * by having text data available on its input.
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
