

import React, { useState, useEffect } from 'react';
import type { LlmServiceConfig, Environment, ExecutionRuntime, AiMode, ContextMemory } from '../../src/core/types';
import ModeSelector from '../ModeSelector';

interface SettingsPanelProps {
  llmConfig: LlmServiceConfig;
  onLlmSettingsSave: (newConfig: LlmServiceConfig) => void;
  hasApiKey: boolean;
  environment: Environment;
  setEnvironment: (mode: Environment) => void;
  executionRuntime: ExecutionRuntime;
  setExecutionRuntime: (runtime: ExecutionRuntime) => void;
  aiMode: AiMode;
  setAiMode: (mode: AiMode) => void;
  contextMemory: ContextMemory;
  setContextMemory: (mode: ContextMemory) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = (props) => {
  const { 
    llmConfig, onLlmSettingsSave, hasApiKey, 
    environment, setEnvironment, 
    executionRuntime, setExecutionRuntime, 
    aiMode, setAiMode, 
    contextMemory, setContextMemory
  } = props;
  
  const [draftConfig, setDraftConfig] = useState(llmConfig);

  useEffect(() => {
    setDraftConfig(llmConfig);
  }, [llmConfig]);

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      <div className="p-3 border-b border-neutral-800">
        <h2 className="text-lg font-semibold text-gray-200">Settings</h2>
      </div>
      <div className="flex-grow overflow-y-auto sidebar-panel-content p-3 space-y-6">
        
        <ModeSelector
            label="Environment"
            options={[
                { value: 'studio', label: 'Studio' },
                { value: 'sandbox', label: 'Sandbox' },
                { value: 'echo', label: 'Echo' },
            ]}
            value={environment}
            onChange={(val) => setEnvironment(val as Environment)}
        />

        <ModeSelector
            label="Execution Runtime"
            options={[
                { value: 'net', label: 'Net' },
                { value: 'local', label: 'Local' },
                { value: 'native', label: 'Native' },
            ]}
            value={executionRuntime}
            onChange={(val) => setExecutionRuntime(val as ExecutionRuntime)}
        />

        <ModeSelector
            label="AI Mode"
            options={[
                { value: 'agent', label: 'Agent' },
                { value: 'assist', label: 'Assist' },
                { value: 'chat', label: 'Chat' },
            ]}
            value={aiMode}
            onChange={(val) => setAiMode(val as AiMode)}
        />

        <ModeSelector
            label="Contextual Memory (for Chat)"
            options={[
                { value: 'full', label: 'Full' },
                { value: 'recent', label: 'Recent (3)' },
                { value: 'none', label: 'None' },
            ]}
            value={contextMemory}
            onChange={(val) => setContextMemory(val as ContextMemory)}
        />

        <div className="border-t border-neutral-700 pt-4 mt-4">
            <h3 className="text-md font-semibold text-gray-300 mb-2">LLM Endpoints</h3>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Active LLM</label>
              <select
                value={draftConfig.activeRuntime}
                onChange={(e) => setDraftConfig({ ...draftConfig, activeRuntime: e.target.value as LlmServiceConfig['activeRuntime'] })}
                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200"
              >
                {hasApiKey && <option value="gemini">Gemini (Cloud)</option>}
                <option value="local_lm_studio">Local (LM Studio)</option>
                <option value="local_ollama">Local (Ollama)</option>
              </select>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">LM Studio Base URL</label>
              <input
                type="text"
                value={draftConfig.localEndpoints.lm_studio.baseUrl}
                onChange={(e) => setDraftConfig({ ...draftConfig, localEndpoints: { ...draftConfig.localEndpoints, lm_studio: { ...draftConfig.localEndpoints.lm_studio, baseUrl: e.target.value } } })}
                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200"
                placeholder="http://localhost:1234/v1"
              />
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Ollama Base URL</label>
              <input
                type="text"
                value={draftConfig.localEndpoints.ollama.baseUrl}
                onChange={(e) => setDraftConfig({ ...draftConfig, localEndpoints: { ...draftConfig.localEndpoints, ollama: { ...draftConfig.localEndpoints.ollama, baseUrl: e.target.value } } })}
                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200"
                placeholder="http://localhost:11434/v1"
              />
            </div>
             <div className="mt-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Ollama Model Name</label>
              <input
                type="text"
                value={draftConfig.localEndpoints.ollama.modelName}
                onChange={(e) => setDraftConfig({ ...draftConfig, localEndpoints: { ...draftConfig.localEndpoints, ollama: { ...draftConfig.localEndpoints.ollama, modelName: e.target.value } } })}
                className="w-full p-2 bg-neutral-800 border border-neutral-700 rounded-md text-gray-200"
                placeholder="e.g., gemma:latest"
              />
            </div>
        </div>
      </div>
      <div className="p-3 border-t border-neutral-800">
        <button
          onClick={() => onLlmSettingsSave(draftConfig)}
          className="w-full px-4 py-2 text-sm text-white bg-sky-600 hover:bg-sky-700 rounded-md"
        >
          Save LLM Settings
        </button>
      </div>
    </div>
  );
};

export default SettingsPanel;
