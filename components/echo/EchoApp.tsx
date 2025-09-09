import React, { useState, useEffect } from 'react';
import type { EchoTask, TaskStatus } from '../../src/core/types';
import { initialEchoTasks } from '../../src/core/echoData';
import Timeline from './Timeline';
import ActivityView from './ActivityView';
import { llmService } from '../../src/services/llmService';
import { initialSystemAgents } from '../../src/core/agentDefinitions';


const EchoApp: React.FC = () => {
  const [tasks, setTasks] = useState<EchoTask[]>(initialEchoTasks);
  const [currentActivity, setCurrentActivity] = useState<EchoTask | null>(null);
  const [interactionLog, setInteractionLog] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);

  useEffect(() => {
    // On mount, find the first 'upcoming' task and set it as 'current'
    const firstUpcomingIndex = tasks.findIndex(t => t.status === 'upcoming');
    if (firstUpcomingIndex !== -1) {
      setTasks(currentTasks => currentTasks.map((task, index) => 
        index === firstUpcomingIndex ? { ...task, status: 'current' } : task
      ));
    }
  }, []); // Run only once on mount

  const handleStartTask = (taskId: string) => {
    const taskToStart = tasks.find(t => t.id === taskId);
    // Only allow starting the 'current' task
    if (taskToStart && taskToStart.status === 'current') {
      setCurrentActivity(taskToStart);
      setInteractionLog(prev => [...prev, `Started task: ${taskToStart.name}`]);
      console.log(`Task started: ${taskToStart.name} (ID: ${taskToStart.id}) at ${new Date().toISOString()}`);
    }
  };

  const handleCompleteTask = async () => {
    if (!currentActivity) return;

    setIsFeedbackLoading(true);
    
    // Mark task as completed immediately for UI responsiveness
    const completedTaskId = currentActivity.id;
    setTasks(currentTasks => currentTasks.map(task => 
      task.id === completedTaskId ? { ...task, status: 'completed' as TaskStatus } : task
    ));
    setInteractionLog(prev => [...prev, `Completed task: ${currentActivity.name}`]);
    console.log(`Task completed: ${currentActivity.name} (ID: ${completedTaskId}) at ${new Date().toISOString()}`);
    
    // Generate AI Feedback
    const feedbackPrompt = `You are the Echo Project Orchestrator, an AI companion for a child's learning journey. The user has just completed the '${currentActivity.name}' activity. Their recent interactions have been: [${interactionLog.join(', ')}]. Provide a short (1-2 sentences), positive, and personalized feedback message directly to the child. Be encouraging and specific if possible.`;

    const { text, error } = await llmService.generateText(feedbackPrompt, false);

    if (error) {
        console.error("Failed to get AI feedback:", error);
        setFeedback("You did an amazing job!"); // Fallback feedback
    } else {
        setFeedback(text);
    }
    setIsFeedbackLoading(false);
  };

  const handleCloseActivityView = () => {
    // Reset feedback and close the modal
    setFeedback(null);
    setCurrentActivity(null);

    // Set the next 'upcoming' task to 'current'
    // Use a function for setting state to ensure we have the latest version of tasks
    setTasks(currentTasks => {
        const newTasks = [...currentTasks];
        const nextUpcomingIndex = newTasks.findIndex(t => t.status === 'upcoming');
        if (nextUpcomingIndex !== -1) {
            newTasks[nextUpcomingIndex] = { ...newTasks[nextUpcomingIndex], status: 'current' as TaskStatus };
        }
        return newTasks;
    });
  };

  return (
    <div className="flex-grow flex flex-col bg-black text-gray-200 overflow-hidden">
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-2xl font-bold text-center text-green-400">Echo Project Daily Schedule</h2>
        <p className="text-center text-sm text-gray-400">A dynamic, adaptive companion for learning and growth.</p>
      </div>
      <Timeline tasks={tasks} onStartTask={handleStartTask} />

      {currentActivity && (
        <ActivityView 
          activity={currentActivity} 
          onComplete={handleCompleteTask} 
          onClose={handleCloseActivityView}
          feedback={feedback}
          isFeedbackLoading={isFeedbackLoading}
        />
      )}
    </div>
  );
};

export default EchoApp;
