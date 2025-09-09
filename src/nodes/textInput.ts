
import { NodeExecutionFunction, NodeExecutionResult, NodeData } from '../core/types';

/**
 * Execution logic for the TextInput and RawTextInput nodes.
 * This function simply takes the text value stored in the node's internal
 * data (edited by the user in the UI) and passes it to the output port.
 */
export const execute: NodeExecutionFunction = async (
  node: NodeData
): Promise<NodeExecutionResult> => {
  const outputPort = node.outputs[0];
  if (!outputPort) {
    return { error: "Text Input node is missing its output port configuration." };
  }

  // The text value is stored in the node's data object under the output port's ID.
  const textValue = node.data[outputPort.id] || '';

  return {
    outputs: {
      [outputPort.id]: textValue,
    },
  };
};
