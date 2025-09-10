import React, { useEffect, useState, useRef, useCallback } from 'react';
import type { EchoTask } from '../../src/core/types';
import { llmService } from '../../src/services/llmService';

interface ActivityViewProps {
  activity: EchoTask;
  onComplete: () => void;
  onClose: () => void;
  feedback: string | null;
  isFeedbackLoading: boolean;
}

const ActivityView: React.FC<ActivityViewProps> = ({ activity, onComplete, onClose, feedback, isFeedbackLoading }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [mathAnswer, setMathAnswer] = useState('');
  const [writingText, setWritingText] = useState('');
  const sketchpadCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [musicDescription, setMusicDescription] = useState<string | null>(null);
  const [isMusicLoading, setIsMusicLoading] = useState(false);

  useEffect(() => {
    // Reset local state when the activity changes
    setMathAnswer('');
    setWritingText('');
    setIsSpeaking(false);
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setMusicDescription(null);
    setIsMusicLoading(false);
  }, [activity]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (!isFeedbackLoading || feedback)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isFeedbackLoading, feedback]);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  const getCoords = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = sketchpadCanvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in event) { // Touch event
      return {
        offsetX: event.touches[0].clientX - rect.left,
        offsetY: event.touches[0].clientY - rect.top
      };
    } else { // Mouse event
      return {
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
    }
  };


  // --- Drawing Logic for Art Activity ---
  const getCanvasContext = useCallback(() => {
    const canvas = sketchpadCanvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }, []);

  const startDrawing = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    const context = getCanvasContext();
    if (!context) return;
    setIsDrawing(true);
    // FIX: Pass the React synthetic event directly to getCoords instead of the nativeEvent.
    // The getCoords function is typed to accept a synthetic event.
    const { offsetX, offsetY } = getCoords(event);
    context.beginPath();
    context.moveTo(offsetX, offsetY);
  }, [getCanvasContext]);

  const draw = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    event.stopPropagation();
    if (!isDrawing) return;
    const context = getCanvasContext();
    if (!context) return;
    // FIX: Pass the React synthetic event directly to getCoords instead of the nativeEvent.
    // The getCoords function is typed to accept a synthetic event.
    const { offsetX, offsetY } = getCoords(event);
    context.lineTo(offsetX, offsetY);
    context.stroke();
  }, [isDrawing, getCanvasContext]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;
    const context = getCanvasContext();
    if (!context) return;
    context.closePath();
    setIsDrawing(false);
  }, [isDrawing, getCanvasContext]);

  const clearCanvas = useCallback(() => {
    const canvas = sketchpadCanvasRef.current;
    const context = getCanvasContext();
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, [getCanvasContext]);
  
  // Effect to initialize canvas when art activity is shown
  useEffect(() => {
    if (activity.type === 'art' || activity.type === 'writing') {
      const canvas = sketchpadCanvasRef.current;
      const context = getCanvasContext();
      if (canvas && context) {
        // Use ResizeObserver for robust canvas sizing
        const observer = new ResizeObserver(entries => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            canvas.width = width;
            canvas.height = height;
            // Reset drawing styles on resize
            context.lineCap = 'round';
            context.strokeStyle = '#FFFFFF';
            context.lineWidth = 4;
          }
        });
        observer.observe(canvas);

        // Initial setup
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        context.lineCap = 'round';
        context.strokeStyle = '#FFFFFF';
        context.lineWidth = 4;

        return () => observer.disconnect();
      }
    }
  }, [activity.type, getCanvasContext]);


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
    
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (event) => {
      console.error('SpeechSynthesisUtterance.onerror:', event);
      setIsSpeaking(false);
    };
    
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleGenerateMusic = async (genre: string) => {
    setIsMusicLoading(true);
    setMusicDescription(null);

    const durationMinutes = activity.duration || 5;
    const prompt = `You are a creative music director. Describe a ${durationMinutes}-minute piece of instrumental ${genre} music suitable for background play during a child's free time. The description should be vivid and imaginative, detailing the tempo, instruments, and overall feeling of the song.`;

    try {
        const { text, error } = await llmService.generateText(prompt);
        if (error) {
            throw new Error(error);
        }
        setMusicDescription(text);
    } catch (e) {
        console.error("Failed to generate music description:", e);
        setMusicDescription("Could not generate a music description at this time. Enjoy the quiet or hum your own tune!");
    } finally {
        setIsMusicLoading(false);
    }
  };


  const renderActivityContent = () => {
    switch (activity.type) {
      case 'reading':
        return (
          <div className="text-center">
            <h3 className="text-3xl font-bold text-cyan-400 mb-4">{activity.content?.title || activity.name}</h3>
            <div className="bg-neutral-800 p-4 rounded-lg max-h-64 overflow-y-auto text-left mb-6">
                <p className="text-lg text-gray-300 leading-relaxed">{activity.content?.body || 'Loading story...'}</p>
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
        return (
          <div className="text-center">
            <h3 className="text-3xl font-bold text-cyan-400 mb-4">{activity.content?.title || activity.name}</h3>
            <div className="bg-neutral-800 p-6 rounded-lg space-y-6">
              <p className="text-xl text-gray-300">{activity.content?.body || 'Let\'s get started!'}</p>
              <input
                type="number"
                value={mathAnswer}
                onChange={(e) => setMathAnswer(e.target.value)}
                placeholder="Answer"
                className="nodrag nowheel w-48 mx-auto p-2 bg-neutral-900 border-2 border-neutral-700 rounded-lg text-4xl text-center font-bold text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                aria-label="Math answer input"
              />
            </div>
          </div>
        );
      case 'art':
        return (
          <div className="text-center w-full h-full flex flex-col">
              <div className="shrink-0">
                 <h3 className="text-3xl font-bold text-cyan-400 mb-2">{activity.content?.title || activity.name}</h3>
                 <p className="text-lg text-gray-300 mb-4">{activity.content?.body || 'Let\'s get creative!'}</p>
              </div>
              <div className="w-full flex-grow bg-neutral-800 rounded-lg p-2 flex flex-col space-y-2 min-h-0">
                  <canvas
                    ref={sketchpadCanvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                    className="w-full h-full bg-neutral-950 rounded cursor-crosshair"
                    style={{ touchAction: 'none' }}
                  />
              </div>
              <div className="flex space-x-4 mt-4 shrink-0">
                  <button
                    onClick={clearCanvas}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Clear Canvas
                  </button>
                  <button
                    onClick={onComplete}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    I'm Finished!
                  </button>
              </div>
          </div>
        );
      case 'writing':
        return (
          <div className="text-center w-full h-full flex flex-col">
            <div className="shrink-0">
              <h3 className="text-3xl font-bold text-cyan-400 mb-2">{activity.content?.title || activity.name}</h3>
              <p className="text-lg text-gray-300 mb-4">{activity.content?.body || 'Let\'s get started!'}</p>
            </div>
            <div className="w-full flex-grow grid grid-cols-2 gap-4 min-h-0">
              {/* Left side: Sketchpad */}
              <div className="h-full flex flex-col bg-neutral-800 rounded-lg p-2 space-y-2">
                <label className="text-sm font-bold text-gray-400">Draw or write here</label>
                <canvas
                  ref={sketchpadCanvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  onTouchCancel={stopDrawing}
                  className="w-full h-full bg-neutral-950 rounded cursor-crosshair"
                  style={{ touchAction: 'none' }}
                />
                <button
                  onClick={clearCanvas}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-lg text-xs transition-colors"
                >
                  Clear Sketchpad
                </button>
              </div>
              {/* Right side: Text Input */}
              <div className="h-full flex flex-col bg-neutral-800 rounded-lg p-2 space-y-2">
                <label className="text-sm font-bold text-gray-400">Or type here</label>
                <textarea
                  value={writingText}
                  onChange={(e) => setWritingText(e.target.value)}
                  placeholder="Type your sentences..."
                  className="nodrag nowheel w-full h-full flex-grow p-2 bg-neutral-900 border-2 border-neutral-700 rounded-lg text-lg text-gray-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition resize-none"
                  aria-label="Writing practice text input"
                />
              </div>
            </div>
          </div>
        );
      case 'play':
        return (
          <div className="text-center w-full h-full flex flex-col items-center justify-center">
            <h3 className="text-3xl font-bold text-cyan-400 mb-4">{activity.content?.title || activity.name}</h3>
            <p className="text-lg text-gray-300 mb-6 max-w-lg">{activity.content?.body}</p>
            
            <div className="bg-neutral-800 p-6 rounded-lg w-full max-w-2xl">
                <p className="text-lg text-gray-300 mb-4">If you would like, here is a couple of music choices you can play in the background while you are playing:</p>
                <div className="flex justify-center space-x-4 mb-6">
                    {['Pop', 'Electronica', 'Funk'].map(genre => (
                        <button
                            key={genre}
                            onClick={() => handleGenerateMusic(genre)}
                            disabled={isMusicLoading}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors text-lg disabled:opacity-50"
                        >
                            {genre}
                        </button>
                    ))}
                </div>
                {isMusicLoading && (
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                        <p className="ml-3 text-gray-300">Composing your track...</p>
                    </div>
                )}
                {musicDescription && !isMusicLoading && (
                    <div className="bg-neutral-900 p-4 rounded-lg border border-neutral-700">
                        <h4 className="font-bold text-purple-400 mb-2">Your Soundtrack:</h4>
                        <p className="text-gray-300 whitespace-pre-wrap">{musicDescription}</p>
                    </div>
                )}
            </div>
          </div>
        );
      case 'social_studies':
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

    return (
       <>
        <div className={`w-full flex-grow flex flex-col ${activity.type === 'art' || activity.type === 'writing' ? 'items-stretch' : 'items-center justify-center'}`}>
          {renderActivityContent()}
        </div>
        {activity.type !== 'art' && (
            <button
              onClick={onComplete}
              className="mt-8 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full transition-colors text-xl shadow-lg"
            >
              I'm Finished!
            </button>
        )}
       </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4" onClick={!isFeedbackLoading && feedback ? onClose : undefined}>
      <div className="bg-neutral-900 border-4 border-dotted border-neutral-700 rounded-2xl shadow-2xl w-full max-w-3xl h-[90vh] max-h-[45rem] p-8 flex flex-col items-stretch justify-center relative" onClick={(e) => e.stopPropagation()}>
        {renderContent()}
      </div>
    </div>
  );
};

export default ActivityView;