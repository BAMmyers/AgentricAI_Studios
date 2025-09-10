

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { NodeData, Port, NodeComponentProps as AppNodeComponentProps } from '../src/core/types';
import { NodeType } from '../src/core/types';
import { DATA_TYPE_COLORS, ANY_TYPE_PORT_COLOR, MIN_NODE_HEIGHT, MIN_NODE_WIDTH, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../src/core/constants';

// Extending props to include appMode for conditional rendering
interface NodeComponentProps extends AppNodeComponentProps {
    onRequestReview: (nodeId: string) => void;
}

const PortPill: React.FC<{ port: Port; type: 'input' | 'output'; nodeId: string, isDisabled: boolean }> = ({ port, type, nodeId, isDisabled }) => {
  const isInput = type === 'input';
  const portColorClass = port.dataType === 'any' ? ANY_TYPE_PORT_COLOR : DATA_TYPE_COLORS[port.dataType] || 'bg-gray-400';

  return (
    <div
      className={`port-handle flex items-center my-1 px-2 py-0.5 rounded text-xs transition-colors
                  ${isInput ? 'justify-start -ml-1' : 'justify-end -mr-1'}
                  ${isDisabled ? 'bg-neutral-700 opacity-50 cursor-not-allowed' : 'bg-neutral-800 hover:bg-neutral-700 hover:bg-opacity-70 text-gray-300'}`}
      title={`${port.name} (${port.dataType})${isDisabled ? ' (Disabled)' : ''}`}
      data-node-id={nodeId}
      data-port-id={port.id}
      data-port-type={type}
      style={isDisabled ? { pointerEvents: 'none' } : {}}
    >
      <div className={`w-2.5 h-2.5 rounded-full border border-gray-400 shadow-sm
                      ${isInput ? 'mr-1.5' : 'ml-1.5 order-last'}
                      ${portColorClass}`}></div>
      <span className={`truncate max-w-[70px] ${isDisabled ? 'text-gray-500' : 'text-gray-300'}`}>{port.name}</span>
    </div>
  );
};

const NodeStatusIndicator: React.FC<{ status: NodeData['status'] }> = ({ status }) => {
    let bgColor = 'bg-neutral-500';
    let pulse = false;
    switch (status) {
        case 'running': bgColor = 'bg-sky-500'; pulse = true; break;
        case 'success': bgColor = 'bg-green-500'; break;
        case 'error': bgColor = 'bg-red-500'; break;
        default: bgColor = 'bg-neutral-500';
    }
    return <div className={`w-3 h-3 rounded-full ${bgColor} ${pulse ? 'animate-pulse' : ''}`} title={`Status: ${status}`}></div>;
};


function NodeComponent({
    node,
    executeNode,
    updateNodeInternalState,
    onCloseNode,
    isHighlighted,
    activeDrawingToolNodeId,
    setActiveDrawingToolNodeId,
    appMode,
    onRequestReview
}: NodeComponentProps): JSX.Element {
  const nodeBaseBg = 'bg-black';
  const nodeHeaderBg = 'bg-neutral-900';

  const isEffectivelyDisabled = useMemo(() => activeDrawingToolNodeId !== null && activeDrawingToolNodeId !== node.id, [activeDrawingToolNodeId, node.id]);
  
  const isSandboxedNode = appMode === 'sandbox' && node.isDynamic && !node.isImmutable && !node.isPromoted;

  const borderClass = useMemo(() => {
    if (isHighlighted && !isEffectivelyDisabled) return 'border-sky-400';
    if (isSandboxedNode) return 'border-yellow-400';

    switch (node.status) {
      case 'success': return 'node-status-success-border';
      case 'error': return 'node-status-error-border';
      case 'running': return 'node-status-running-border'; // For animation
      default: return 'border-neutral-800';
    }
  }, [isHighlighted, isEffectivelyDisabled, isSandboxedNode, node.status]);

  const computedBoxShadowColor = useMemo(() => {
    if (isEffectivelyDisabled) return 'rgba(0, 0, 0, 0.3)';
    if (isHighlighted) return 'rgba(56, 189, 248, 0.6)'; // sky-400
    if (node.status === 'running') return 'rgba(56, 189, 248, 0.5)'; // sky-500
    if (node.status === 'success') return 'rgba(34, 197, 94, 0.5)';  // green-500
    if (node.status === 'error') return 'rgba(239, 68, 68, 0.5)';    // red-500
    return 'rgba(0, 0, 0, 0.5)';
  }, [isHighlighted, node.status, isEffectivelyDisabled]);

  // --- Sketchpad Logic ---
  const sketchpadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCanvasContext = useCallback(() => {
      const canvas = sketchpadCanvasRef.current;
      if (!canvas) return null;
      return canvas.getContext('2d');
  }, []);

  const getCoords = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = sketchpadCanvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in event) { // Touch event
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top
      };
    } else { // Mouse event
      return {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
    }
  };

  const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
      event.stopPropagation();
      const context = getCanvasContext();
      if (!context) return;
      setActiveDrawingToolNodeId(node.id);
      setIsDrawing(true);
      // FIX: Pass the React synthetic event directly to getCoords instead of the nativeEvent.
      // The getCoords function is typed to accept a synthetic event.
      const { offsetX, offsetY } = getCoords(event);
      context.beginPath();
      context.moveTo(offsetX, offsetY);
  }, [getCanvasContext, setActiveDrawingToolNodeId, node.id]);

  const draw = useCallback((event: React.MouseEvent | React.TouchEvent) => {
      event.stopPropagation();
      if (!isDrawing) return;
      const context = getCanvasContext();
      if (!context) return;
      // FIX: Pass the React synthetic event directly to getCoords instead of the nativeEvent.
      // The getCoords function is typed to accept a synthetic event.
      const { offsetX, offsetY } = getCoords(event);
      context.lineTo(offsetX, offsetY);
      context.stroke();
  }, [isDrawing, getCanvasContext]);

  const stopDrawing = useCallback(() => {
      if (!isDrawing) return;
      const context = getCanvasContext();
      const canvas = sketchpadCanvasRef.current;
      if (!context || !canvas) return;
      context.closePath();
      setIsDrawing(false);
      setActiveDrawingToolNodeId(null);
      
      const outputPortId = node.outputs[0]?.id;
      if (outputPortId) {
          const imageDataUrl = canvas.toDataURL('image/png');
          updateNodeInternalState(node.id, { [outputPortId]: imageDataUrl });
      }
  }, [isDrawing, getCanvasContext, setActiveDrawingToolNodeId, node.outputs, updateNodeInternalState, node.id]);


  const clearCanvas = useCallback(() => {
      const canvas = sketchpadCanvasRef.current;
      const context = getCanvasContext();
      if (!canvas || !context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      const outputPortId = node.outputs[0]?.id;
      if (outputPortId) {
          updateNodeInternalState(node.id, { [outputPortId]: null });
      }
  }, [getCanvasContext, updateNodeInternalState, node.id, node.outputs]);

  useEffect(() => {
      if (node.type === NodeType.Sketchpad) {
          const canvas = sketchpadCanvasRef.current;
          const context = getCanvasContext();
          if (canvas && context) {
              canvas.width = canvas.offsetWidth;
              canvas.height = canvas.offsetHeight;
              context.lineCap = 'round';
              context.strokeStyle = '#FFFFFF';
              context.lineWidth = 3;
          }
      }
  }, [node.type, getCanvasContext, node.currentWidth, node.currentHeight]);


  const handleInputChange = (key: string, value: any) => {
    updateNodeInternalState(node.id, { [key]: value });
  };
  
  const renderNodeContent = () => {
    const internalElementClasses = "nodrag nowheel w-full p-1 bg-neutral-900 border border-neutral-700 rounded text-xs resize-none text-gray-200 focus:ring-sky-500 focus:border-sky-500";
    const buttonBaseClasses = "px-2 py-1 rounded text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed";

    switch (node.type) {
      case NodeType.TextInput:
      case NodeType.RawTextInput: {
        const outputPortForDisplay = node.outputs[0]?.id;
        return (
          <textarea
            className={`${internalElementClasses} h-full`}
            value={node.data[outputPortForDisplay] || ''}
            onChange={(e) => handleInputChange(outputPortForDisplay, e.target.value)}
            placeholder={node.type === NodeType.RawTextInput ? "Raw text input..." : "Enter text here..."}
            style={{minHeight: '40px'}}
          />
        );
      }
      case NodeType.DisplayText: {
        const inputPortId = node.inputs[0]?.id;
        if (!inputPortId) return <div className="text-xs text-red-500">Config Error: No input port.</div>;
        const textToShow = node.data[inputPortId] ?? 'Awaiting text...';
        return (
          <div className="nodrag nowheel w-full h-full p-1 text-xs text-gray-200 overflow-y-auto">
            <p className="whitespace-pre-wrap">{String(textToShow)}</p>
          </div>
        );
      }
      case NodeType.DisplayData: {
        const inputPortId = node.inputs[0]?.id;
        if (!inputPortId) return <div className="text-xs text-red-500">Config Error: No input port.</div>;
        const dataToShow = node.data[inputPortId] ?? { message: 'Awaiting data...' };
        let displayString;
        try {
            displayString = JSON.stringify(dataToShow, null, 2);
        } catch {
            displayString = String(dataToShow);
        }
        return (
          <pre className="nodrag nowheel w-full h-full p-1 text-xs bg-neutral-900 text-green-400 rounded overflow-auto">
            <code>{displayString}</code>
          </pre>
        );
      }
      case NodeType.DisplayImage: {
        const inputPortId = node.inputs[0]?.id;
        if (!inputPortId) return <div className="text-xs text-red-500">Config Error: No input port.</div>;
        const imageSrc = node.data[inputPortId];
        return (
          <div className="nodrag nowheel w-full h-full flex items-center justify-center bg-black bg-opacity-20 rounded">
            {imageSrc ? (
              <img src={imageSrc} alt="Generated output" className="max-w-full max-h-full object-contain" />
            ) : (
              <p className="text-xs text-gray-500">Awaiting image...</p>
            )}
          </div>
        );
      }
      case NodeType.LocalModelFileSelector: {
        const outputPortForDisplay = node.outputs[0]?.id;
        return (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <label htmlFor={`model-selector-${node.id}`} className="text-xs text-gray-400 mb-1 w-full text-center">Local Model ID</label>
            <input
              id={`model-selector-${node.id}`}
              type="text"
              className={`${internalElementClasses} text-center`}
              value={node.data[outputPortForDisplay] || ''}
              onChange={(e) => handleInputChange(outputPortForDisplay, e.target.value)}
              placeholder="e.g., stable-diffusion-v1.5"
            />
          </div>
        );
      }
      case NodeType.GeminiPrompt:
      case NodeType.LocalLLMPrompt: {
        const isLlmNodeDisabled = node.status === 'running' || !node.data[node.inputs[0]?.id];
        return (
          <button
            onClick={() => executeNode(node.id)}
            disabled={isLlmNodeDisabled}
            className={`${buttonBaseClasses} ${node.color || 'bg-sky-600'} hover:opacity-80 w-full`}
            title={isLlmNodeDisabled && !(node.status === 'running') ? "Connect a prompt to run" : "Run Prompt"}
          >
            {node.status === 'running' ? 'Running...' : 'Run Prompt'}
          </button>
        );
      }
      case NodeType.ImageGenerator: {
        const isImageNodeDisabled = node.status === 'running' || !node.data[node.inputs.find(i => i.id === 'prompt_in')?.id];
         return (
          <button
            onClick={() => executeNode(node.id)}
            disabled={isImageNodeDisabled}
            className={`${buttonBaseClasses} ${node.color || 'bg-teal-600'} hover:opacity-80 w-full`}
            title={isImageNodeDisabled && !(node.status === 'running') ? "A prompt is required to generate an image" : "Generate Image"}
          >
            {node.status === 'running' ? 'Generating...' : 'Generate Image'}
          </button>
        );
      }
      case NodeType.MultiPromptNode: {
        return <p className="text-xs text-gray-400 text-center p-2">Assembles inputs into a single text prompt automatically.</p>;
      }
      case NodeType.Sketchpad: {
        const isDrawingToolActive = activeDrawingToolNodeId === node.id;
        return (
          <div className="nodrag nowheel w-full h-full flex flex-col items-center justify-center space-y-1">
            <canvas
              ref={sketchpadCanvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
              className={`w-full flex-grow bg-neutral-950 rounded cursor-crosshair ${isDrawingToolActive ? 'ring-2 ring-sky-400' : ''}`}
              style={{ touchAction: 'none' }}
            />
            <button
              onClick={clearCanvas}
              className={`${buttonBaseClasses} bg-red-600 hover:bg-red-700 w-full`}
            >
              Clear
            </button>
          </div>
        );
      }
      default:
        // Render a run button for any dynamic, executable node.
        // This is especially for nodes with inputs that require manual triggering.
        if (node.isDynamic && node.executionLogicPrompt) {
            const allRequiredInputsPresent = node.inputs.every(inputPort =>
                (node.data[inputPort.id] !== undefined && node.data[inputPort.id] !== null && String(node.data[inputPort.id]).trim() !== '')
            );
            const isDynamicNodeDisabled = node.status === 'running' || (node.inputs.length > 0 && !allRequiredInputsPresent);

            return (
                <div className="flex flex-col space-y-1 w-full items-center justify-center">
                    <button
                        onClick={() => executeNode(node.id)}
                        disabled={isDynamicNodeDisabled}
                        className={`${buttonBaseClasses} ${node.color || 'bg-sky-600'} hover:opacity-80 w-full`}
                        title={isDynamicNodeDisabled && !(node.status === 'running') ? "Connect all required inputs" : "Run Node"}>
                        Run Node
                    </button>
                    {isSandboxedNode && (
                       <button
                           onClick={() => onRequestReview(node.id)}
                           disabled={node.status === 'running' || node.status === 'success'}
                           className={`${buttonBaseClasses} bg-green-600 hover:bg-green-700`}
                           title="Submit this agent for review to be promoted to your permanent library.">
                           {node.status === 'running' && node.error === "Submitting for review..." ? "Submitting..." : (node.status === 'success' && node.error === "Approved!" ? "Approved!" : "Request Review")}
                       </button>
                    )}
                </div>
            );
        }
        return <div className="text-xs text-gray-500 p-1">Node content area.</div>;
    }
  };

  const nodeStyle: React.CSSProperties = {
    left: node.x,
    top: node.y,
    width: `${node.currentWidth || DEFAULT_NODE_WIDTH}px`,
    height: `${node.currentHeight || DEFAULT_NODE_HEIGHT}px`,
    minWidth: `${MIN_NODE_WIDTH}px`,
    minHeight: `${MIN_NODE_HEIGHT}px`,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: `0 0 10px ${computedBoxShadowColor}`,
    opacity: isEffectivelyDisabled ? 0.6 : 1,
    transition: 'opacity 0.3s ease-in-out, box-shadow 0.3s ease-in-out, border-color 0.3s ease-in-out',
    borderStyle: isSandboxedNode ? 'dashed' : 'dotted',
    borderWidth: '4px',
  };
  
  return (
    <div
      id={node.id}
      className={`draggable-node absolute shadow-lg rounded-md ${nodeBaseBg} ${borderClass} transition-all duration-150 group`}
      style={nodeStyle}
    >
      <div className={`node-header p-1.5 h-9 flex items-center rounded-t-sm ${nodeHeaderBg} cursor-grab`}>
        {node.isImmutable && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 text-yellow-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <title>This agent is immutable and cannot be deleted.</title>
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
            </svg>
        )}
        <span className="node-header-icon text-md mr-1.5 text-gray-200" style={{minWidth: '20px', textAlign: 'center'}}>{node.icon || '⚙️'}</span>
        <span className="font-semibold text-sm truncate text-gray-200 flex-grow mr-1">{node.name}</span>
        <div className="node-header-status"><NodeStatusIndicator status={node.status} /></div>
        <button
          onClick={(e) => { e.stopPropagation(); onCloseNode(node.id); }}
          className={`ml-1.5 p-0.5 text-gray-400 focus:outline-none rounded-full ${node.isImmutable ? 'opacity-30 cursor-not-allowed' : 'hover:text-red-500 hover:bg-neutral-700'}`}
          aria-label="Close node"
          title={node.isImmutable ? "This agent cannot be removed." : "Close node"}
          disabled={node.isImmutable}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-grow flex p-1.5 min-h-0 overflow-hidden">
        <div className="w-[60px] flex-shrink-0 pr-1 flex flex-col items-start justify-center space-y-0.5">
          {node.inputs.map(port => ( <PortPill key={port.id} port={port} type="input" nodeId={node.id} isDisabled={false} /> ))}
        </div>
        <div className="flex-grow min-w-0 flex flex-col justify-start items-stretch p-0.5">
          {renderNodeContent()}
        </div>
        <div className="w-[60px] flex-shrink-0 pl-1 flex flex-col items-end justify-center space-y-0.5">
          {node.outputs.map(port => ( <PortPill key={port.id} port={port} type="output" nodeId={node.id} isDisabled={false}/> ))}
        </div>
      </div>
      {node.error && (
        <div className="p-1.5 bg-red-700 bg-opacity-80 text-white text-xs rounded-b-sm border-t border-red-500 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
          <strong>Error:</strong> {node.error}
        </div>
      )}
      
      {!isEffectivelyDisabled && (
        <div
          data-resize-handle="true"
          data-node-id={node.id}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity z-10"
          title="Resize Node"
        >
          <svg className="w-full h-full text-neutral-500" fill="none" viewBox="0 0 12 12" stroke="currentColor">
              <line x1="1" y1="11" x2="11" y2="1" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="11" x2="11" y2="6" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default React.memo(NodeComponent);