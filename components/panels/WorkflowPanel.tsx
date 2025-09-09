
import React from 'react';
import type { SavedWorkflow } from '../../src/core/types';

interface WorkflowPanelProps {
  savedWorkflows: Record<string, SavedWorkflow>;
  currentWorkflowName: string;
  setCurrentWorkflowName: (name: string) => void;
  onSave: () => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
}

const WorkflowPanel: React.FC<WorkflowPanelProps> = (props) => {
  const { savedWorkflows, currentWorkflowName, setCurrentWorkflowName, onSave, onLoad, onDelete } = props;
  
  return (
    <div className="h-full flex flex-col bg-neutral-900">
      <div className="p-3 border-b border-neutral-800">
        <h2 className="text-lg font-semibold text-gray-200 mb-2">Workflows</h2>
        <div className="flex space-x-2">
            <input
              type="text"
              value={currentWorkflowName}
              onChange={(e) => setCurrentWorkflowName(e.target.value)}
              placeholder="Enter workflow name..."
              className="flex-grow p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200 text-sm"
            />
            <button
                onClick={onSave}
                className="px-4 py-2 text-sm text-white bg-sky-600 hover:bg-sky-700 rounded-md disabled:opacity-50"
                disabled={!currentWorkflowName.trim()}
            >
                Save
            </button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto sidebar-panel-content">
        <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider px-3 py-2 sticky top-0 bg-neutral-900">Saved Workflows</h3>
        {Object.keys(savedWorkflows).length === 0 ? (
            <p className="text-sm text-gray-500 px-3 py-2">No saved workflows yet.</p>
        ) : (
            <ul>
                {Object.values(savedWorkflows).map(wf => (
                    <li key={wf.name} className="flex items-center justify-between p-2 mx-2 rounded-md hover:bg-neutral-800 group">
                        <span className="text-sm text-gray-200 truncate" title={wf.name}>{wf.name}</span>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onLoad(wf.name)} className="p-1 text-sky-400 hover:bg-neutral-700 rounded" title="Load">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h5M4 9a9 9 0 0114.65-4.13l-1.42 1.42A7 7 0 005.4 9zM20 20v-5h-5M20 15a9 9 0 01-14.65 4.13l1.42-1.42A7 7 0 0018.6 15z" /></svg>
                            </button>
                            <button onClick={() => { if (window.confirm(`Are you sure you want to delete "${wf.name}"?`)) onDelete(wf.name) }} className="p-1 text-red-500 hover:bg-neutral-700 rounded" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        )}
      </div>
    </div>
  );
};

export default WorkflowPanel;
