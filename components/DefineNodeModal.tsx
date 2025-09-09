
import React, { useState } from 'react';
import { mechanicService } from '../src/services/mechanicService';

interface DefineNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDefine: (prompt: string) => Promise<{ success: boolean; error?: string }>;
  isSandbox: boolean;
}

const DefineNodeModal: React.FC<DefineNodeModalProps> = ({ isOpen, onClose, onDefine, isSandbox }) => {
  const [prompt, setPrompt] = useState('');
  const [isDefining, setIsDefining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDefine = async () => {
    if (!prompt.trim() || isDefining) return;
    setIsDefining(true);
    setError(null);
    try {
        const result = await onDefine(prompt);
        if (result.success) {
            setPrompt('');
            onClose();
        } else {
            setError(result.error || "An unknown error occurred during node definition.");
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Error: ${errorMessage}`);
        mechanicService.logBug(err as Error, "Define New Node Modal Error");
    } finally {
        setIsDefining(false);
    }
  };
  
  const handleClose = () => {
      if(isDefining) return;
      setPrompt('');
      setError(null);
      onClose();
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-neutral-900 p-6 rounded-lg shadow-2xl w-full max-w-2xl border-4 border-dotted border-neutral-800" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-sky-400">Define New Agent/Node</h2>
            <button onClick={handleClose} className="p-1 rounded-full text-gray-400 hover:bg-neutral-700 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {isSandbox && (
            <div className="sandbox-warning-stripes text-center p-2 rounded-md mb-4 text-sm font-bold">
                SANDBOX MODE ACTIVE
            </div>
        )}

        <div className="space-y-4">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the node you want to create in detail. For example: 'A node that takes text as input, reverses it, and outputs the reversed text.'"
                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-sm h-32"
                disabled={isDefining}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
        <div className="mt-6 flex justify-end space-x-3">
            <button onClick={handleClose} className="px-4 py-2 text-sm bg-neutral-700 hover:bg-neutral-600 rounded-md" disabled={isDefining}>Cancel</button>
            <button onClick={handleDefine} disabled={isDefining || !prompt.trim()} className="px-4 py-2 text-sm text-white bg-sky-600 hover:bg-sky-700 rounded-md disabled:opacity-50">
                {isDefining ? 'Defining...' : 'Define Node'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default DefineNodeModal;
