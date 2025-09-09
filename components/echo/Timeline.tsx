
import React from 'react';
import type { EchoTask } from '../../src/core/types';
import ActivityCard from './ActivityCard';

interface TimelineProps {
  tasks: EchoTask[];
  onStartTask: (taskId: string) => void;
}

const Timeline: React.FC<TimelineProps> = ({ tasks, onStartTask }) => {
  return (
    <div className="flex-grow flex items-center p-4">
      <div className="flex space-x-6 overflow-x-auto pb-4 w-full">
        {tasks.map(task => (
          <ActivityCard key={task.id} task={task} onStartTask={onStartTask} />
        ))}
      </div>
    </div>
  );
};

export default Timeline;
