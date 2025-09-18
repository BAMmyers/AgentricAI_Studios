import React, { useState, useCallback, useEffect, ForwardedRef, useMemo, useRef } from 'react';
import type { NodeData, Edge, Point, Port } from '../src/core/types';
// Renamed CanvasComponentProps from App to avoid conflict with local definition
import type { CanvasComponentProps as AppCanvasComponentInternalProps } from '../src/core/types';
import NodeComponent from './NodeComponent'; // Ensured path is correct
import { MIN_ZOOM, MAX_ZOOM, ZOOM_SENSITIVITY, DATA_TYPE_STROKE_COLORS, DEFAULT_EDGE_COLOR, MIN_NODE_HEIGHT, MIN_NODE_WIDTH, DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../src/core/constants';

// Use the props from types.ts, and add onViewTransformChange
interface CanvasComponentProps extends AppCanvasComponentInternalProps {
  onViewTransformChange: (transform: { x: number, y: number, k: number }) => void;
  highlightedNodeId?: string | null;
  activeDrawingToolNodeId: string | null; // ID of the node that has drawing lock
  setActiveDrawingToolNodeId: (nodeId: string | null) => void; // Setter for the lock
  isWorkflowRunning: boolean;
  onRemoveEdge: (edgeId: string) => void;
}


interface DraggingStateBase {
  initialMouseX: number; // Viewport coords
  initialMouseY: number; // Viewport coords
}
interface NodeDraggingState extends DraggingStateBase {
  type: 'node';
  nodeId: string;
  initialNodeX: number; // World coords
  initialNodeY: number; // World coords
}
interface PanningState extends DraggingStateBase {
  type: 'pan';
  initialViewX: number; // World coords
  initialViewY: number; // World coords
}
interface ResizingState extends DraggingStateBase {
    type: 'resizing_node';
    nodeId: string;
    initialNodeX: number;
    initialNodeY: number;
    initialNodeWidth: number;
    initialNodeHeight: number;
}
type DraggingState = NodeDraggingState | PanningState | ResizingState;


interface ConnectingState {
  sourceNodeId: string;
  sourceOutputId: string;
  startPoint: Point; // Viewport coordinates
  currentEndPoint: Point; // Viewport coordinates
  sourceDataType: Port['dataType'];
}

const GridBackground: React.FC<{ viewTransform: { x: number, y: number, k: number } }> = React.memo(({ viewTransform }) => {
  const { x, y, k } = viewTransform;
  const gridSize = 50 * k;
  const smallGridSize = 10 * k;

  const smallGridColor = "#262626"; // neutral-800
  const largeGridColor = "#404040"; // neutral-700

  const strongStroke = Math.max(0.3, 1 * Math.sqrt(k))/k;
  const weakStroke = Math.max(0.1, 0.5 * Math.sqrt(k))/k;

  return (
    <svg width="100%" height="100%" className="absolute inset-0 pointer-events-none">
      <defs>
        <pattern id="smallGridCanvas" width={smallGridSize} height={smallGridSize} patternUnits="userSpaceOnUse" patternTransform={`translate(${x % smallGridSize} ${y % smallGridSize})`}>
          <path d={`M ${smallGridSize} 0 L 0 0 0 ${smallGridSize}`} fill="none" stroke={smallGridColor} strokeWidth={weakStroke} />
        </pattern>
        <pattern id="gridCanvas" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse" patternTransform={`translate(${x % gridSize} ${y % gridSize})`}>
          <rect width={gridSize} height={gridSize} fill="url(#smallGridCanvas)" />
          <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke={largeGridColor} strokeWidth={strongStroke} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#gridCanvas)" />
    </svg>
  );
});


const CanvasComponent = React.forwardRef<HTMLDivElement, CanvasComponentProps>(
  (props, ref: ForwardedRef<HTMLDivElement>) => {
  const {
    nodes,
    edges,
    onNodeDrag,
    setNodes,
    onAddEdge,
    onInteractionEnd,
    onAddNode,
    executeNode,
    updateNodeInternalState,
    onRemoveNode,
    onRemoveEdge,
    onViewTransformChange,
    highlightedNodeId,
    activeDrawingToolNodeId,
    setActiveDrawingToolNodeId,
    appMode,
    onRequestReview,
    isWorkflowRunning,
  } = props;

  const [viewTransform, setViewTransformState] = useState({ x: 150, y: 100, k: 1 });
  const [draggingState, setDraggingState] = useState<DraggingState | null>(null);
  const [connectingState, setConnectingState] = useState<ConnectingState | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const pinchStartDistance = useRef<number | null>(null);

  useEffect(() => {
    onViewTransformChange(viewTransform);
  }, [viewTransform, onViewTransformChange]);

  const setViewTransform = useCallback((newTransformOrCallback: React.SetStateAction<{ x: number; y: number; k: number; }>) => {
    setViewTransformState(prevTransform => {
        const newTransform = typeof newTransformOrCallback === 'function'
            ? newTransformOrCallback(prevTransform)
            : newTransformOrCallback;
        return newTransform;
    });
  }, []);


  const worldToViewport = useCallback((worldX: number, worldY: number): Point => {
    return {
      x: worldX * viewTransform.k + viewTransform.x,
      y: worldY * viewTransform.k + viewTransform.y,
    };
  }, [viewTransform]);

  const viewportToWorld = useCallback((viewportX: number, viewportY: number): Point => {
    const currentCanvas = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (!currentCanvas) return { x: 0, y: 0 };
    const rect = currentCanvas.getBoundingClientRect();
    return {
      x: (viewportX - rect.left - viewTransform.x) / viewTransform.k,
      y: (viewportY - rect.top - viewTransform.y) / viewTransform.k,
    };
  }, [viewTransform, ref]);

  const getPortInfo = useCallback((nodeId: string, portId: string, portType: 'input' | 'output'): { point: Point, dataType: Port['dataType'] } | null => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.currentWidth || !node.currentHeight) return null;

    const portArray = portType === 'input' ? node.inputs : node.outputs;
    const portIndex = portArray.findIndex(p => p.id === portId);
    const port = portArray[portIndex];
    if (portIndex === -1 || !port) return null;

    const portSpacing = 25;
    const headerHeight = 36;
    const nodePaddingY = 6;

    const portPillHeight = 20;
    const totalPortsHeight = portArray.length * portPillHeight + (portArray.length > 0 ? (portArray.length -1) * 4 : 0);
    const contentAreaHeight = node.currentHeight - headerHeight - (nodePaddingY * 2) - (node.error ? 30 : 0) - (node.executionTime && node.executionTime !=='N/A' && !node.error ? 20 : 0) ;

    let portRelativeY = headerHeight + nodePaddingY + (portIndex * portSpacing) + (portSpacing / 2);

    if (contentAreaHeight > totalPortsHeight) {
        const offsetY = (contentAreaHeight - totalPortsHeight) / 2;
        portRelativeY = headerHeight + nodePaddingY + offsetY + (portIndex * (portPillHeight + 4)) + (portPillHeight/2) ;
    } else {
         portRelativeY = headerHeight + nodePaddingY + (portIndex * portSpacing) + (portSpacing / 2);
    }

    const portRelativeX = portType === 'input' ? 0 : node.currentWidth;
    const portWorldX = node.x + portRelativeX;
    const portWorldY = node.y + portRelativeY;

    return { point: worldToViewport(portWorldX, portWorldY), dataType: port.dataType };
  }, [nodes, worldToViewport]);


  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const currentCanvas = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (!currentCanvas || isWorkflowRunning) {
        if(isWorkflowRunning) e.preventDefault();
        return;
    }
    const target = e.target as HTMLElement;

    if (target.closest('.edge-delete-button')) {
      e.stopPropagation();
      return;
    }

    if (activeDrawingToolNodeId) {
        const isNodeElement = target.closest('.draggable-node');
        if (!isNodeElement || (isNodeElement && isNodeElement.id !== activeDrawingToolNodeId)) {
             e.stopPropagation();
             e.preventDefault();
             setDraggingState(null);
             setConnectingState(null);
             return;
        }
        if (target.closest('.node-header') || target.closest('.port-handle') || target.closest('[data-resize-handle="true"]')) {
             e.stopPropagation();
             e.preventDefault();
             setDraggingState(null);
             setConnectingState(null);
             return;
        }
    }


    const closeButton = target.closest('button[aria-label="Close node"]');
    if (closeButton && activeDrawingToolNodeId) {
        e.stopPropagation();
        return;
    }
    if (closeButton) return;

    const nodeElement = target.closest('.draggable-node');
    const portElement = target.closest('.port-handle') as HTMLElement | null;
    const resizeHandle = target.closest<HTMLElement>('[data-resize-handle="true"]');

    if (resizeHandle && nodeElement && !activeDrawingToolNodeId) {
        e.stopPropagation();
        const nodeId = resizeHandle.dataset.nodeId;
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            setDraggingState({
                type: 'resizing_node',
                nodeId: nodeId!,
                initialMouseX: e.clientX,
                initialMouseY: e.clientY,
                initialNodeX: node.x,
                initialNodeY: node.y,
                initialNodeWidth: node.currentWidth || DEFAULT_NODE_WIDTH,
                initialNodeHeight: node.currentHeight || DEFAULT_NODE_HEIGHT,
            });
        }
    } else if (portElement && !activeDrawingToolNodeId) {
        e.stopPropagation();
        const nodeId = portElement.dataset.nodeId;
        const portId = portElement.dataset.portId;
        const portType = portElement.dataset.portType as ('input' | 'output');

        if (nodeId && portId && portType === 'output') {
            const portInfo = getPortInfo(nodeId, portId, 'output');
            if (portInfo && currentCanvas) {
                const canvasRect = currentCanvas.getBoundingClientRect();
                setConnectingState({
                    sourceNodeId: nodeId,
                    sourceOutputId: portId,
                    startPoint: portInfo.point,
                    currentEndPoint: { x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top },
                    sourceDataType: portInfo.dataType,
                });
            }
        }
    } else if (nodeElement && target.closest('.node-header') && !activeDrawingToolNodeId) {
      // Check if the click was on a non-draggable part of the header.
      if (target.closest('.node-header-icon, .node-header-status, button')) {
          return; // Do not start dragging.
      }
      e.stopPropagation();
      const nodeId = nodeElement.id;
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        const worldMouse = viewportToWorld(e.clientX, e.clientY);
        setDraggingState({
          type: 'node',
          nodeId: nodeId,
          initialMouseX: worldMouse.x,
          initialMouseY: worldMouse.y,
          initialNodeX: node.x,
          initialNodeY: node.y,
        });
        currentCanvas.classList.add('grabbing');
      }
    } else if (e.button === 0 && !target.closest('button, input, textarea, select, .port-handle, [data-resize-handle="true"], .draggable-node') && !activeDrawingToolNodeId) {
      setDraggingState({
        type: 'pan',
        initialMouseX: e.clientX,
        initialMouseY: e.clientY,
        initialViewX: viewTransform.x,
        initialViewY: viewTransform.y,
      });
      currentCanvas.classList.add('grabbing');
    } else if (activeDrawingToolNodeId && e.button === 0 && !target.closest('.draggable-node')) {
        e.preventDefault();
    }

  }, [nodes, viewportToWorld, viewTransform, getPortInfo, setViewTransform, ref, activeDrawingToolNodeId, isWorkflowRunning]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (activeDrawingToolNodeId && draggingState?.type !== 'node') {
        if (draggingState?.type === 'pan' || draggingState?.type === 'resizing_node') {
            return;
        }
    }
    
    if (!draggingState && !connectingState) return;
    const currentCanvas = (ref as React.RefObject<HTMLDivElement>)?.current;

    if (connectingState && currentCanvas && !activeDrawingToolNodeId) {
        const canvasRect = currentCanvas.getBoundingClientRect();
        setConnectingState(prev => prev ? { ...prev, currentEndPoint: {x: e.clientX - canvasRect.left, y: e.clientY - canvasRect.top }} : null);

    } else if (draggingState && !activeDrawingToolNodeId) {
        if (draggingState.type === 'node') {
            const worldMouse = viewportToWorld(e.clientX, e.clientY);
            const dx = worldMouse.x - draggingState.initialMouseX;
            const dy = worldMouse.y - draggingState.initialMouseY;
            onNodeDrag(draggingState.nodeId, draggingState.initialNodeX + dx, draggingState.initialNodeY + dy);
        } else if (draggingState.type === 'pan') {
            const dx = e.clientX - draggingState.initialMouseX;
            const dy = e.clientY - draggingState.initialMouseY;
            setViewTransform(prev => ({ ...prev, x: draggingState.initialViewX + dx, y: draggingState.initialViewY + dy }));
        } else if (draggingState.type === 'resizing_node') {
            const deltaX = e.clientX - draggingState.initialMouseX;
            const deltaY = e.clientY - draggingState.initialMouseY;
            const newWidth = Math.max(MIN_NODE_WIDTH, draggingState.initialNodeWidth + deltaX / viewTransform.k);
            const newHeight = Math.max(MIN_NODE_HEIGHT, draggingState.initialNodeHeight + deltaY / viewTransform.k);
            setNodes(prev => prev.map(n => n.id === draggingState.nodeId ? { ...n, currentWidth: newWidth, currentHeight: newHeight } : n));
        }
    }
  }, [draggingState, connectingState, viewportToWorld, onNodeDrag, setNodes, viewTransform.k, setViewTransform, ref, activeDrawingToolNodeId]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const currentCanvas = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (currentCanvas) {
        currentCanvas.classList.remove('grabbing');
    }

    if (draggingState && (draggingState.type === 'node' || draggingState.type === 'resizing_node')) {
      onInteractionEnd();
    }

    if (connectingState && !activeDrawingToolNodeId) {
        const targetElement = e.target as HTMLElement;
        const portElement = targetElement.closest('.port-handle') as HTMLElement | null;
        if (portElement) {
            const targetNodeId = portElement.dataset.nodeId;
            const targetInputId = portElement.dataset.portId;
            const portType = portElement.dataset.portType as ('input' | 'output');

            if (targetNodeId && targetInputId && portType === 'input') {
                const sourceNode = nodes.find(n => n.id === connectingState.sourceNodeId);
                const targetNode = nodes.find(n => n.id === targetNodeId);
                if (sourceNode && targetNode) {
                    const sourcePort = sourceNode.outputs.find(p => p.id === connectingState.sourceOutputId);
                    const targetPort = targetNode.inputs.find(p => p.id === targetInputId);

                    if (sourcePort && targetPort && (targetPort.dataType === 'any' || targetPort.dataType === sourcePort.dataType || sourcePort.dataType === 'any')) {
                        const newEdge: Edge = {
                            id: `edge-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
                            sourceNodeId: connectingState.sourceNodeId,
                            sourceOutputId: connectingState.sourceOutputId,
                            targetNodeId: targetNodeId,
                            targetInputId: targetInputId,
                        };
                        onAddEdge(newEdge);
                    } else {
                        console.warn("Cannot connect: Incompatible port data types or port not found.");
                    }
                }
            }
        }
    }
    setConnectingState(null);
    setDraggingState(null);
  }, [nodes, connectingState, onAddEdge, onInteractionEnd, ref, activeDrawingToolNodeId, draggingState]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (activeDrawingToolNodeId) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const currentCanvas = (ref as React.RefObject<HTMLDivElement>)?.current;
    if (!currentCanvas) return;

    const scrollDelta = e.deltaY;
    const zoomFactor = Math.pow(1 - ZOOM_SENSITIVITY, scrollDelta);
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewTransform.k * zoomFactor));

    if (newZoom === viewTransform.k) return;

    const rect = currentCanvas.getBoundingClientRect();
    const mouseXViewport = e.clientX - rect.left;
    const mouseYViewport = e.clientY - rect.top;

    const worldXUnderMouse = (mouseXViewport - viewTransform.x) / viewTransform.k;
    const worldYUnderMouse = (mouseYViewport - viewTransform.y) / viewTransform.k;

    const newViewX = mouseXViewport - worldXUnderMouse * newZoom;
    const newViewY = mouseYViewport - worldYUnderMouse * newZoom;

    setViewTransform({ x: newViewX, y: newViewY, k: newZoom });
  }, [viewTransform.k, viewTransform.x, viewTransform.y, setViewTransform, ref, activeDrawingToolNodeId]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDistance.current = Math.sqrt(dx * dx + dy * dy);
            // Also treat 2-finger touch as a pan start
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
             setDraggingState({
                type: 'pan',
                initialMouseX: midX,
                initialMouseY: midY,
                initialViewX: viewTransform.x,
                initialViewY: viewTransform.y,
            });
            return;
        }

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mockMouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: touch.target,
                button: 0,
                stopPropagation: () => e.stopPropagation(),
                preventDefault: () => e.preventDefault(),
            } as unknown as React.MouseEvent;
            handleMouseDown(mockMouseEvent);
        }
    }, [handleMouseDown, viewTransform]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        const currentCanvas = (ref as React.RefObject<HTMLDivElement>)?.current;
        if (!currentCanvas) return;

        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            if (pinchStartDistance.current) {
                const zoomFactor = currentDistance / pinchStartDistance.current;
                const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewTransform.k * zoomFactor));

                if (newZoom !== viewTransform.k) {
                    const rect = currentCanvas.getBoundingClientRect();
                    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

                    const worldXUnderMouse = (midX - viewTransform.x) / viewTransform.k;
                    const worldYUnderMouse = (midY - viewTransform.y) / viewTransform.k;

                    const newViewX = midX - worldXUnderMouse * newZoom;
                    const newViewY = midY - worldYUnderMouse * newZoom;
                    
                    setViewTransform({ x: newViewX, y: newViewY, k: newZoom });
                    pinchStartDistance.current = currentDistance; // Update for continuous zoom
                }
            }
             // Handle 2-finger panning
            if (draggingState?.type === 'pan') {
                const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const d_x = midX - draggingState.initialMouseX;
                const d_y = midY - draggingState.initialMouseY;
                setViewTransform(prev => ({ ...prev, x: draggingState.initialViewX + d_x, y: draggingState.initialViewY + d_y }));
            }
            return;
        }

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mockMouseEvent = {
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: touch.target,
            } as unknown as React.MouseEvent;
            handleMouseMove(mockMouseEvent);
        }
    }, [handleMouseMove, viewTransform, draggingState]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        e.preventDefault();
        pinchStartDistance.current = null;
        const touch = e.changedTouches[0];
        const mockMouseEvent = {
            target: touch.target,
        } as unknown as React.MouseEvent;
        handleMouseUp(mockMouseEvent);
    }, [handleMouseUp]);


  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
        try {
            const agentConfig = JSON.parse(data);
            const worldPoint = viewportToWorld(e.clientX, e.clientY);
            onAddNode(agentConfig, worldPoint);
        } catch (error) {
            console.error("Failed to parse dropped node data:", error);
        }
    }
  };

  const getEdgeColor = (sourceDataType: Port['dataType'], targetDataType: Port['dataType']): string => {
    if (sourceDataType === 'any' && targetDataType === 'any') return DEFAULT_EDGE_COLOR;
    if (sourceDataType === 'any') return DATA_TYPE_STROKE_COLORS[targetDataType] || DEFAULT_EDGE_COLOR;
    if (targetDataType === 'any') return DATA_TYPE_STROKE_COLORS[sourceDataType] || DEFAULT_EDGE_COLOR;
    return DATA_TYPE_STROKE_COLORS[sourceDataType] || DEFAULT_EDGE_COLOR;
  };
  
  const canvasClassName = `w-full h-full relative overflow-hidden bg-neutral-900 ${isWorkflowRunning ? 'cursor-wait' : (activeDrawingToolNodeId ? 'cursor-default' : 'grab')}`;

  const edgeToDeleteButton = useMemo(() => {
    if (!hoveredEdgeId) return null;

    const edge = edges.find(e => e.id === hoveredEdgeId);
    if (!edge) return null;

    const sourcePortInfo = getPortInfo(edge.sourceNodeId, edge.sourceOutputId, 'output');
    const targetPortInfo = getPortInfo(edge.targetNodeId, edge.targetInputId, 'input');
    if (!sourcePortInfo || !targetPortInfo) return null;

    const startPoint = sourcePortInfo.point;
    const endPoint = targetPortInfo.point;

    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const controlPointX1 = startPoint.x + dx * 0.3;
    const controlPointY1 = startPoint.y + dy * 0.1;
    const controlPointX2 = startPoint.x + dx * 0.7;
    const controlPointY2 = endPoint.y - dy * 0.1;

    // Calculate midpoint of Bezier curve (at t=0.5)
    const midX = 0.125 * startPoint.x + 0.375 * controlPointX1 + 0.375 * controlPointX2 + 0.125 * endPoint.x;
    const midY = 0.125 * startPoint.y + 0.375 * controlPointY1 + 0.375 * controlPointY2 + 0.125 * endPoint.y;

    return (
      <button
        className="edge-delete-button absolute w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg hover:bg-red-700 transition-all z-10"
        style={{
          left: `${midX - 12}px`, // Center the button
          top: `${midY - 12}px`,
          transform: `scale(${1 / viewTransform.k})`, // Counter-scale with zoom
          transformOrigin: 'center center',
        }}
        onClick={(e) => {
          e.stopPropagation();
          onRemoveEdge(hoveredEdgeId);
          setHoveredEdgeId(null);
        }}
        title="Delete connection"
      >
        &times;
      </button>
    );
  }, [hoveredEdgeId, edges, getPortInfo, onRemoveEdge, viewTransform.k]);


  return (
    <div
      ref={ref}
      className={canvasClassName}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { handleMouseUp; setHoveredEdgeId(null); }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      tabIndex={0}
      style={{ touchAction: 'none' }}
    >
      <GridBackground viewTransform={viewTransform} />
      <div
        className="absolute top-0 left-0"
        style={{ transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.k})`, transformOrigin: '0 0', willChange: 'transform' }}
      >
        {nodes.map(node => (
          <NodeComponent
            key={node.id}
            node={node}
            executeNode={executeNode}
            updateNodeInternalState={updateNodeInternalState}
            onCloseNode={onRemoveNode}
            isHighlighted={node.id === highlightedNodeId}
            activeDrawingToolNodeId={activeDrawingToolNodeId}
            setActiveDrawingToolNodeId={setActiveDrawingToolNodeId}
            appMode={appMode}
            onRequestReview={onRequestReview}
          />
        ))}
      </div>
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
        {edges.map(edge => {
            const sourcePortInfo = getPortInfo(edge.sourceNodeId, edge.sourceOutputId, 'output');
            const targetPortInfo = getPortInfo(edge.targetNodeId, edge.targetInputId, 'input');

            if (!sourcePortInfo || !targetPortInfo) return null;

            const startPoint = sourcePortInfo.point;
            const endPoint = targetPortInfo.point;
            const edgeColor = getEdgeColor(sourcePortInfo.dataType, targetPortInfo.dataType);

            const dx = endPoint.x - startPoint.x;
            const dy = endPoint.y - startPoint.y;
            const controlPointX1 = startPoint.x + dx * 0.3;
            const controlPointY1 = startPoint.y + dy * 0.1;
            const controlPointX2 = startPoint.x + dx * 0.7;
            const controlPointY2 = endPoint.y - dy * 0.1;

            const pathData = `M ${startPoint.x} ${startPoint.y} C ${controlPointX1} ${controlPointY1}, ${controlPointX2} ${controlPointY2}, ${endPoint.x} ${endPoint.y}`;

            return (
              <g key={edge.id} onMouseEnter={() => setHoveredEdgeId(edge.id)} onMouseLeave={() => setHoveredEdgeId(null)} className="pointer-events-auto">
                {/* Wider, transparent path for easier hover detection */}
                <path d={pathData} stroke="transparent" strokeWidth="20" fill="none" className="cursor-pointer" />
                {/* The visible edge path */}
                <path d={pathData} stroke={edgeColor} strokeWidth="2.5" fill="none" className="transition-all pointer-events-none"/>
              </g>
            );
        })}
        {connectingState && (
            <path
                d={`M ${connectingState.startPoint.x} ${connectingState.startPoint.y} L ${connectingState.currentEndPoint.x} ${connectingState.currentEndPoint.y}`}
                stroke={DATA_TYPE_STROKE_COLORS[connectingState.sourceDataType] || DEFAULT_EDGE_COLOR}
                strokeWidth="2.5"
                fill="none"
                strokeDasharray="5,3"
            />
        )}
      </svg>
      {edgeToDeleteButton}
    </div>
  );
});
CanvasComponent.displayName = 'CanvasComponent';

export default CanvasComponent;