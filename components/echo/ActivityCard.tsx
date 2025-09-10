

import React from 'react';
import type { EchoTask } from '../../src/core/types';

interface ActivityCardProps {
  task: EchoTask;
  onStartTask: (taskId: string) => void;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ task, onStartTask }) => {

  const getEngagementColor = () => {
    switch (task.engagement) {
      case 'high': return 'border-green-400';
      case 'medium': return 'border-cyan-400';
      case 'low': return 'border-fuchsia-500';
      default: return 'border-neutral-700';
    }
  };
  
  const cardClasses = [
    'relative', 'flex-shrink-0', 'w-48', 'h-64', 'bg-neutral-900',
    'rounded-xl', 'p-4', 'flex', 'flex-col', 'items-center', 'justify-center',
    'transition-all', 'duration-500', // Increased duration for smoother fade
    'cursor-pointer', 'border-4',
    getEngagementColor(),
    task.status === 'completed' ? 'opacity-40 grayscale' : '',
    task.status === 'current' ? 'transform scale-110 shadow-lg z-10' : 'hover:scale-105',
  ].join(' ');

  const glowClasses = task.status === 'current' 
    ? 'absolute -inset-1 bg-green-400 rounded-xl blur opacity-60 animate-pulse' 
    : '';

  return (
    <div className="relative" style={{ perspective: '1000px' }}>
      <div className={glowClasses}></div>
      <div
        className={cardClasses}
        onClick={() => onStartTask(task.id)}
      >
        <div className="text-6xl mb-4">{task.icon}</div>
        <h3 className="text-xl font-bold text-center text-gray-100">{task.name}</h3>
        <p className="text-sm text-gray-400">{task.time}</p>

        {task.status === 'completed' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-green-400" viewBox="0 0 24 24">
              <g fill="none" stroke="currentColor" strokeWidth="2">
                <path className="completed-checkmark-circle" strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path className="completed-checkmark-check" strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
              </g>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityCard;