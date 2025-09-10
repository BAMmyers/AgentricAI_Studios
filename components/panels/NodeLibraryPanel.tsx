

import React, { useState, useMemo } from 'react';
import type { DynamicNodeConfig } from '../../src/core/types';

interface NodeLibraryPanelProps {
  agents: DynamicNodeConfig[];
}

const NodeLibraryPanel: React.FC<NodeLibraryPanelProps> = ({ agents }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleDragStart = (e: React.DragEvent, agent: DynamicNodeConfig) => {
    e.dataTransfer.setData('application/json', JSON.stringify(agent));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const groupedAndSortedAgents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const agentsToShow = term
      ? agents.filter(
          (agent) =>
            agent.name.toLowerCase().includes(term) ||
            (agent.category && agent.category.toLowerCase().includes(term)) ||
            (agent.description && agent.description.toLowerCase().includes(term))
        )
      : agents;

    const grouped: { [key: string]: DynamicNodeConfig[] } = {};
    agentsToShow.forEach(agent => {
        const category = agent.category || 'General';
        if (!grouped[category]) { grouped[category] = []; }
        grouped[category].push(agent);
    });

    const categoryOrder = [
        'Input', 'Display', 'Utility', 'AI / LLM', 'Creative', 'Research', 'Code / Execution',
        'Core Assistant', 'User Support', 'Custom Agents', 'Echo Project', 'Administrative'
    ];
    
    return Object.entries(grouped).sort(([catA], [catB]) => {
        const indexA = categoryOrder.indexOf(catA);
        const indexB = categoryOrder.indexOf(catB);
        if (indexA === -1 && indexB === -1) return catA.localeCompare(catB);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

  }, [agents, searchTerm]);

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      <div className="p-3 border-b border-neutral-800">
        <h2 className="text-lg font-semibold text-gray-200 mb-2">Node Library</h2>
        <input
          type="search"
          placeholder="Search nodes..."
          className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-sm placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="flex-grow overflow-y-auto sidebar-panel-content">
        {groupedAndSortedAgents.length > 0 ? (
          groupedAndSortedAgents.map(([category, agentList]) => (
            <div key={category} className="mb-2">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider px-3 py-1 sticky top-0 bg-neutral-900">{category}</h3>
              {agentList.map(agent => (
                <div
                  key={agent.name}
                  draggable
                  onDragStart={(e) => handleDragStart(e, agent)}
                  className="p-2 mx-2 rounded-md hover:bg-neutral-800 cursor-grab transition-colors border border-transparent hover:border-sky-600"
                  title={agent.description}
                >
                  <div className="flex items-center">
                    <span className="mr-2 text-lg" style={{ minWidth: '20px', textAlign: 'center' }}>
                      {agent.icon || '⚙️'}
                    </span>
                    <span className="font-medium text-sm text-gray-100">{agent.name}</span>
                  </div>
                </div>
              ))}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm text-center p-4">No matching agents found.</p>
        )}
      </div>
    </div>
  );
};

export default NodeLibraryPanel;
