
import React from 'react';
import type { ExecutionHistoryEntry } from '../../src/core/types';

interface HistoryPanelProps {
  history: ExecutionHistoryEntry[];
  setHistory: React.Dispatch<React.SetStateAction<ExecutionHistoryEntry[]>>;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, setHistory }) => {

  const getStatusClasses = (status: 'success' | 'error') => {
    return status === 'success' ? 'history-item-success' : 'history-item-error';
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      <div className="p-3 border-b border-neutral-800 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-200">Execution History</h2>
        <button 
            onClick={() => setHistory([])}
            className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-md disabled:opacity-50"
            disabled={history.length === 0}
            title="Clear History"
        >
          Clear
        </button>
      </div>
      <div className="flex-grow overflow-y-auto sidebar-panel-content">
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">Run a node to see its history.</p>
          </div>
        ) : (
          <ul>
            {history.map(entry => (
              <li key={entry.id} className={`p-3 border-b border-neutral-800 ${getStatusClasses(entry.status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                    <span className="text-xl mr-3">{entry.nodeIcon}</span>
                    <p className="text-sm font-medium text-gray-200 truncate" title={entry.nodeName}>
                        {entry.nodeName}
                    </p>
                  </div>
                  <div className="flex items-center flex-shrink-0 ml-2">
                    <span className="status-dot w-2.5 h-2.5 rounded-full mr-2"></span>
                    <span className="status-time text-sm font-mono">{entry.executionTime}</span>
                  </div>
                </div>
                {entry.status === 'error' && entry.error && (
                    <div className="mt-2 ml-9 p-2 bg-red-900 bg-opacity-40 rounded">
                        <p className="text-xs text-red-400 font-mono break-all">{entry.error}</p>
                    </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
