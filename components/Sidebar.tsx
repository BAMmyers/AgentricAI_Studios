

import React, { useState, useCallback, useRef, useEffect } from 'react';
import NodeLibraryPanel from './panels/NodeLibraryPanel';
import HistoryPanel from './panels/HistoryPanel';
import WorkflowPanel from './panels/WorkflowPanel';
import SettingsPanel from './panels/SettingsPanel';
import ChatPanel from './panels/ChatPanel';
import type { DynamicNodeConfig, ExecutionHistoryEntry, SavedWorkflow, LlmServiceConfig, Environment, ExecutionRuntime, AiMode, ContextMemory } from '../src/core/types';

type PanelType = 'nodes' | 'history' | 'workflows' | 'settings' | 'chat';

interface SidebarProps {
  availableAgents: DynamicNodeConfig[];
  executionHistory: ExecutionHistoryEntry[];
  setExecutionHistory: React.Dispatch<React.SetStateAction<ExecutionHistoryEntry[]>>;
  savedWorkflows: Record<string, SavedWorkflow>;
  currentWorkflowName: string;
  setCurrentWorkflowName: (name: string) => void;
  onSave: () => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  llmConfig: LlmServiceConfig;
  onLlmSettingsSave: (newConfig: LlmServiceConfig) => void;
  hasApiKey: boolean;
  environment: Environment;
  setEnvironment: (mode: Environment) => void;
  executionRuntime: ExecutionRuntime;
  setExecutionRuntime: (runtime: ExecutionRuntime) => void;
  aiMode: AiMode;
  setAiMode: (mode: AiMode) => void;
  contextMemory: ContextMemory;
  setContextMemory: (mode: ContextMemory) => void;
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

const Sidebar: React.FC<SidebarProps> = (props) => {
  const [activePanel, setActivePanel] = useState<PanelType>('nodes');
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing && sidebarRef.current) {
      const newWidth = e.clientX - sidebarRef.current.getBoundingClientRect().left;
      setWidth(Math.max(MIN_WIDTH, Math.min(newWidth, MAX_WIDTH)));
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  const toggleCollapse = () => {
      setIsCollapsed(!isCollapsed);
  }

  const panelContent = () => {
    switch (activePanel) {
      case 'nodes': return <NodeLibraryPanel agents={props.availableAgents} />;
      case 'history': return <HistoryPanel history={props.executionHistory} setHistory={props.setExecutionHistory} />;
      case 'workflows': return <WorkflowPanel {...props} />;
      case 'settings': return <SettingsPanel {...props} />;
      case 'chat': return <ChatPanel contextMemory={props.contextMemory} />;
      default: return null;
    }
  };

  return (
    <aside
      ref={sidebarRef}
      className="h-full flex z-10 bg-neutral-950 border-r-4 border-dotted border-neutral-800"
      style={{ width: isCollapsed ? '48px' : `${width}px`, transition: 'width 0.2s ease-in-out' }}
    >
      <div className="w-12 h-full bg-black bg-opacity-30 flex flex-col items-center py-4 space-y-4 flex-shrink-0">
        <SidebarButton icon="キュー" label="Queue" isActive={activePanel === 'history'} onClick={() => setActivePanel('history')} />
        <SidebarButton icon="ノード" label="Node Library" isActive={activePanel === 'nodes'} onClick={() => setActivePanel('nodes')} />
        <SidebarButton icon="保存" label="Workflows" isActive={activePanel === 'workflows'} onClick={() => setActivePanel('workflows')} />
        {props.aiMode === 'chat' && (
             <SidebarButton icon="💬" label="Chat" isActive={activePanel === 'chat'} onClick={() => setActivePanel('chat')} />
        )}
        <SidebarButton icon="⚙️" label="Settings" isActive={activePanel === 'settings'} onClick={() => setActivePanel('settings')} />
        <div className="flex-grow"></div>
        <button onClick={toggleCollapse} className="p-2 text-gray-400 hover:text-white hover:bg-neutral-700 rounded-md" title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isCollapsed ? 
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /> :
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              }
            </svg>
        </button>
      </div>

      {!isCollapsed && (
        <>
            <div className="flex-grow h-full flex flex-col min-w-0">
                {panelContent()}
            </div>
            <div
                className={`sidebar-resizer ${isResizing ? 'is-resizing' : ''}`}
                onMouseDown={handleMouseDown}
            />
        </>
      )}
    </aside>
  );
};

const SidebarButton: React.FC<{ icon: string; label: string; isActive: boolean; onClick: () => void }> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
      isActive ? 'bg-sky-600 text-white' : 'text-gray-400 hover:bg-neutral-700 hover:text-white'
    }`}
    title={label}
  >
    <span className="text-xl font-bold tracking-tighter">{icon}</span>
  </button>
);


export default Sidebar;
