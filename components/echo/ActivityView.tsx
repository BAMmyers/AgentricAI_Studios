import React, { useEffect, useState } from 'react';
import type { EchoTask } from '../../src/core/types';

interface ActivityViewProps {
  activity: EchoTask;
  onComplete: () => void;
  onClose: () => void;
  feedback: string | null;
  isFeedbackLoading: boolean;
}

const ActivityView: React.FC<ActivityViewProps> = ({ activity, onComplete, onClose, feedback, isFeedbackLoading }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow escape to close only if the activity is finished (feedback is shown)
      // or if it's not in the process of loading feedback.
      if (e.key === 'Escape' && (!isFeedbackLoading || feedback)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFeedbackLoading, feedback]);

  // Clean up speech synthesis on component unmount to prevent orphaned speech
  useEffect(() => {
    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      alert("Sorry, your browser doesn't support text-to-speech.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const textToRead = activity.content?.body || 'No content to read.';
    if (!textToRead.trim()) return;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    
    // Set listeners for state changes
    utterance.onend = () => {
        setIsSpeaking(false);
    };
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror:', event);
      setIsSpeaking(false);
    };
    
    // Set state before speaking to update UI immediately
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };


  const renderActivityContent = () => {
    switch (activity.type) {
      case 'reading':
        return (
          <div className="text-center">
            <h3 className="text-3xl font-bold text-cyan-400 mb-4">{activity.content?.title || activity.name}</h3>
            <div className="bg-neutral-800 p-4 rounded-lg max-h-64 overflow-y-auto text-left mb-6">
                <p className="text-lg text-gray-300 leading-relaxed">{activity.content?.body || 'Loading story...'}</p>
                {/* TODO: Generate image from imagePrompt and display here */}
            </div>
            <button 
                onClick={handleReadAloud} 
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors mr-4"
            >
                {isSpeaking ? 'Stop Reading 🤫' : 'Read Aloud 🔊'}
            </button>
          </div>
        );
      case 'math':
      case 'writing':
      case 'social_studies':
      case 'art':
         return (
             <div className="text-center">
                <h3 className="text-3xl font-bold text-cyan-400 mb-4">{activity.content?.title || activity.name}</h3>
                <div className="bg-neutral-800 p-6 rounded-lg">
                    <p className="text-xl text-gray-300">{activity.content?.body || 'Let\'s get started!'}</p>
                </div>
            </div>
         );
      default:
        return (
          <div className="text-center">
            <div className="text-8xl mb-4">{activity.icon}</div>
            <h3 className="text-4xl font-bold text-gray-200">{activity.name}</h3>
            <p className="text-lg text-gray-400 mt-2">{activity.content?.body || 'Time to begin!'}</p>
          </div>
        );
    }
  };
  
  const renderContent = () => {
    if (isFeedbackLoading) {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-400"></div>
          <p className="mt-4 text-lg text-gray-300">Analyzing your great work...</p>
        </div>
      );
    }
    
    if (feedback) {
      return (
        <div className="text-center flex flex-col items-center justify-center">
          <div className="text-7xl mb-4">🎉</div>
          <h3 className="text-3xl font-bold text-green-400 mb-4">Task Complete!</h3>
          <p className="text-xl text-gray-200 mb-8 max-w-lg">{feedback}</p>
          <button
            onClick={onClose}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 px-8 rounded-full transition-colors text-xl shadow-lg"
          >
            Continue
          </button>
        </div>
      );
    }

    // Default: show the activity
    return (
       <>
         <div className="w-full flex-grow flex flex-col items-center justify-center">
          {renderActivityContent()}
        </div>
        <button
          onClick={onComplete}
          className="mt-8 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-colors text-xl shadow-lg"
        >
          I'm Finished!
        </button>
       </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={!isFeedbackLoading && feedback ? onClose : undefined}>
      <div className="bg-neutral-900 border-4 border-dotted border-neutral-700 rounded-2xl shadow-2xl w-full max-w-3xl min-h-[30rem] p-8 flex flex-col items-center justify-center relative" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ActivityView;
