
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { DynamicNodeConfig, Point } from '../src/core/types';

interface FloatingSearchMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: Point; // Viewport coordinates for positioning the menu
  agents: DynamicNodeConfig[];
  onSelectAgent: (agentConfig: DynamicNodeConfig, clickViewportPosition: Point) => void;
  initialClickViewportPosition: Point; // Viewport coordinates of the double-click
}

const FloatingSearchMenu: React.FC<FloatingSearchMenuProps> = ({
  isOpen,
  onClose,
  position,
  agents,
  onSelectAgent,
  initialClickViewportPosition,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

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
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(agent);
    });

    // Define a preferred order for categories to ensure a consistent and logical layout
    const categoryOrder = [
        'Input', 'Display', 'Utility', 'AI / LLM', 'Creative', 'Research', 'Code / Execution',
        'Core Assistant', 'User Support', 'Custom Agents', 'Echo Project', 'Administrative'
    ];
    
    return Object.entries(grouped).sort(([catA], [catB]) => {
        const indexA = categoryOrder.indexOf(catA);
        const indexB = categoryOrder.indexOf(catB);
        if (indexA === -1 && indexB === -1) return catA.localeCompare(catB); // Both not in list, sort alphabetically
        if (indexA === -1) return 1; // A is not in list, goes to the end
        if (indexB === -1) return -1; // B is not in list, goes to the end
        return indexA - indexB; // Sort based on predefined order
    });

  }, [agents, searchTerm]);

  if (!isOpen) {
    return null;
  }

  const menuWidth = 320;
  const menuHeight = 450;
  let top = position.y;
  let left = position.x;

  if (left + menuWidth > window.innerWidth) left = window.innerWidth - menuWidth - 10;
  if (top + menuHeight > window.innerHeight) top = window.innerHeight - menuHeight - 10;
  if (left < 0) left = 10;
  if (top < 0) top = 10;


  return (
    <div
      ref={menuRef}
      className="fixed bg-black border-4 border-dotted border-neutral-800 rounded-lg shadow-2xl z-50 p-3"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        width: `${menuWidth}px`,
        maxHeight: `${menuHeight}px`,
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="flex items-center mb-2 space-x-2">
        <input
          ref={inputRef}
          type="search"
          placeholder="Search nodes/agents..."
          className="flex-grow p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-sm placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-red-500 focus:outline-none rounded-full hover:bg-neutral-700 transition-colors"
          aria-label="Close search menu"
          title="Close search"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto flex-grow pr-1">
        {groupedAndSortedAgents.length > 0 ? (
          groupedAndSortedAgents.map(([category, agentList]) => (
            <div key={category} className="mb-2">
              <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider px-2 py-1 sticky top-0 bg-black bg-opacity-80 backdrop-blur-sm">{category}</h3>
              {agentList.map(agent => (
                <div
                  key={agent.name}
                  onClick={() => onSelectAgent(agent, initialClickViewportPosition)}
                  className="p-2 ml-2 rounded-md hover:bg-neutral-800 cursor-pointer transition-colors border border-transparent hover:border-sky-600"
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
          <p className="text-gray-500 text-sm text-center p-4">
            No matching agents found.
          </p>
        )}
      </div>
    </div>
  );
};

export default FloatingSearchMenu;
