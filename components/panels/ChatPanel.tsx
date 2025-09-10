
import React, { useState } from 'react';
import type { ContextMemory } from '../../src/core/types';

interface ChatPanelProps {
    contextMemory: ContextMemory;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ contextMemory }) => {
    const [messages, setMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
    const [inputValue, setInputValue] = useState('');

    const handleSend = () => {
        if (!inputValue.trim()) return;
        
        const newMessages = [...messages, { sender: 'user' as const, text: inputValue }];
        
        // Mock AI response
        setTimeout(() => {
            setMessages(prev => [...prev, { sender: 'ai' as const, text: `This is a mock AI response to: "${inputValue}". Context Memory is set to: ${contextMemory}.` }]);
        }, 500);

        setMessages(newMessages);
        setInputValue('');
    };

    const getContextLabel = () => {
        switch(contextMemory) {
            case 'full': return 'Full Context';
            case 'recent': return 'Recent Context';
            case 'none': return 'No Context';
        }
    }

    return (
        <div className="h-full flex flex-col bg-neutral-900">
            <div className="p-3 border-b border-neutral-800">
                <h2 className="text-lg font-semibold text-gray-200">Chat with Apprentice</h2>
                <p className="text-xs text-sky-400">Context Mode: {getContextLabel()}</p>
            </div>
            <div className="flex-grow overflow-y-auto sidebar-panel-content p-3 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-2 rounded-lg ${msg.sender === 'user' ? 'bg-sky-700 text-white' : 'bg-neutral-700 text-gray-200'}`}>
                           <p className="text-sm">{msg.text}</p>
                        </div>
                    </div>
                ))}
                 {messages.length === 0 && (
                    <div className="text-center text-sm text-gray-500 pt-8">
                        Start a conversation with the AI assistant.
                    </div>
                )}
            </div>
            <div className="p-3 border-t border-neutral-800 flex space-x-2">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    className="flex-grow p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200 text-sm"
                />
                <button
                    onClick={handleSend}
                    className="px-4 py-2 text-sm text-white bg-sky-600 hover:bg-sky-700 rounded-md disabled:opacity-50"
                    disabled={!inputValue.trim()}
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default ChatPanel;
