import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { EchoTask, TaskStatus } from '../../src/core/types';
import { initialEchoTasks } from '../../src/core/echoData';
import Timeline from './Timeline';
import ActivityView from './ActivityView';
import { llmService } from '../../src/services/llmService';

const EchoApp: React.FC = () => {
  const [tasks, setTasks] = useState<EchoTask[]>(initialEchoTasks);
  const [currentActivity, setCurrentActivity] = useState<EchoTask | null>(null);
  const [interactionLog, setInteractionLog] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isFeedbackLoading, setIsFeedbackLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);


  useEffect(() => {
    // On mount, find the first 'upcoming' task and set it as 'current'
    const firstUpcomingIndex = tasks.findIndex(t => t.status === 'upcoming');
    if (firstUpcomingIndex !== -1) {
      setTasks(currentTasks => currentTasks.map((task, index) => 
        index === firstUpcomingIndex ? { ...task, status: 'current' } : task
      ));
    }
  }, []); // Run only once on mount
  
  useEffect(() => {
    if (currentActivity && currentActivity.duration) {
      setTimeLeft(currentActivity.duration * 60); // minutes to seconds

      if (timerRef.current) window.clearInterval(timerRef.current);

      timerRef.current = window.setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime === null || prevTime <= 1) {
            window.clearInterval(timerRef.current!);
            // Optionally, trigger auto-completion here in the future
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      setTimeLeft(null);
    }

    // Cleanup
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [currentActivity]);

  const handleStartTask = useCallback((taskId: string) => {
    const taskToStart = tasks.find(t => t.id === taskId);
    // Only allow starting the 'current' task
    if (taskToStart && taskToStart.status === 'current') {
      setCurrentActivity(taskToStart);
      setInteractionLog(prev => [...prev, `Started task: ${taskToStart.name}`]);
      console.log(`Task started: ${taskToStart.name} (ID: ${taskToStart.id}) at ${new Date().toISOString()}`);
    }
  }, [tasks]);

  const handleCompleteTask = useCallback(async () => {
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
  }, [currentActivity, interactionLog]);

  const handleCloseActivityView = useCallback(() => {
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
  }, []);

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  const handleUndo = useCallback(() => {
    if (currentActivity) return; // Only works from timeline view

    setTasks(currentTasks => {
        const currentIndex = currentTasks.findIndex(t => t.status === 'current');
        let lastCompletedIndex = -1;
        for (let i = currentTasks.length - 1; i >= 0; i--) {
            if (currentTasks[i].status === 'completed') {
                lastCompletedIndex = i;
                break;
            }
        }
        
        if (lastCompletedIndex !== -1) {
            const newTasks = [...currentTasks];
            newTasks[lastCompletedIndex] = { ...newTasks[lastCompletedIndex], status: 'current' };
            if (currentIndex !== -1) {
                newTasks[currentIndex] = { ...newTasks[currentIndex], status: 'upcoming' };
            }
            return newTasks;
        }
        return currentTasks;
    });
  }, [currentActivity]);

  const handleContinue = useCallback(() => {
    if (currentActivity) {
        handleCompleteTask();
    } else {
        const currentTask = tasks.find(t => t.status === 'current');
        if (currentTask) {
            handleStartTask(currentTask.id);
        }
    }
  }, [currentActivity, tasks, handleCompleteTask, handleStartTask]);
  
  const canUndo = !currentActivity && tasks.some(t => t.status === 'completed');
  const canContinue = !!currentActivity || tasks.some(t => t.status === 'current');

  return (
    <div className="flex-grow flex flex-col bg-black text-gray-200 overflow-hidden">
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="w-1/3"></div> {/* Left spacer */}
        <div className="w-1/3 text-center">
          <h2 className="text-2xl font-bold text-green-400 flex items-baseline justify-center">
            <button onClick={handleUndo} className="font-bold hover:text-white disabled:opacity-50 transition-colors" title="Undo Last Task" disabled={!canUndo}>E</button>
            <span>cho Project Daily Schedul</span>
            <button onClick={handleContinue} className="font-bold hover:text-white disabled:opacity-50 transition-colors" title="Continue" disabled={!canContinue}>e</button>
          </h2>
          <p className="text-sm text-gray-400">A dynamic, adaptive companion for learning and growth.</p>
        </div>
        <div className="w-1/3 flex justify-end items-center pr-4">
          {currentActivity && timeLeft !== null && (
            <div className="bg-neutral-900 border-2 border-neutral-700 rounded-lg px-4 py-2 text-center shadow-lg">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Time Remaining</p>
              <p className="text-4xl font-mono font-bold text-sky-400">{formatTime(timeLeft)}</p>
            </div>
          )}
        </div>
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