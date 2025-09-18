# AgentricAI Studios: "Lite" Architecture for Local & Offline Use

## 1. Vision for AgentricAI Lite: Privacy, Control, and Offline Capability

AgentricAI Studios aims to provide a powerful and flexible AI workflow environment, "powered by Google Technologies." To enhance user privacy, enable offline capabilities, eliminate cloud service costs for the user, and cater to advanced users who wish to run their own models, an **"AgentricAI Lite"** mode is a core feature.

This mode stands in contrast to the conceptual **High-Performance Architecture** (which would leverage cloud/on-premise GPU clusters and platforms like NVIDIA's for massive scale). "Lite" mode is architected to be self-contained, running entirely on the user's local machine.

This mode allows users to leverage:
*   **Local Large Language Models (LLMs):** Primarily by interfacing with local LLM servers like LM Studio or Ollama, which provide OpenAI-compatible API endpoints.
*   **Local Database Storage:** Utilizing a browser-based SQLite database (via `sql.js`) with persistence in IndexedDB for all workflows, agent configurations, logs, and results.

The goal is to allow seamless switching between the default online mode (using Google Gemini) and this "Lite" local mode, with AgentricAI Studios intelligently adapting its functionality.

## 2. Core Components of "Lite" Mode

### 2.1. Local LLM Runtime

*   **Interface:** AgentricAI Studios communicates with local LLMs that expose an OpenAI-compatible API endpoint. LM Studio and Ollama are primary supported examples.
*   **User Configuration:** Users have full control to specify the endpoint URL and model name for their local LLM server within AgentricAI Studios settings.
*   **Model Agnostic:** While the API interface is standardized, the actual capabilities (reasoning, instruction following, JSON output generation) depend entirely on the specific model the user is running locally. AgentricAI Studios sends prompts assuming a capable instruction-following model.
*   **Service Abstraction:** The internal `llmService.ts` abstracts all LLM calls, transparently directing requests to either the Google Gemini API or the configured local endpoint based on the user's selected runtime.

### 2.2. Local Persistent Database

*   **Technology:** A full-featured SQLite database running in the browser via `sql.js`. The entire database file is persisted as a binary blob within the browser's `IndexedDB`.
*   **Benefits:**
    *   **True Offline Access:** Users can load, view, modify, and save all workflows and agent definitions even when completely offline.
    *   **Data Integrity:** Provides transactional integrity for all operations, preventing data corruption.
    *   **Performance & Scalability:** Far superior to `localStorage` for managing complex workflows and large numbers of custom agents.
    *   **Privacy:** All user-created data (workflows, agents, logs, results) remains on the user's machine by default and is never transmitted externally.
*   **"Log Agent" and "DB" Juggernaut Adaptation:** In "Lite" mode, the "Log Agent" directs all structured logs to the local SQLite instance, which is managed conceptually by a local-facing version of the "DB" Juggernaut's logic.

## 3. User Experience

*   **Runtime Switcher:** A clear UI element in the settings panel allows users to switch between "Gemini (Cloud)" and "Local LLM".
*   **Endpoint Configuration:** When "Local LLM" is selected, input fields appear for the user to enter their local server endpoint and model details.
*   **Status Indication:** The UI clearly indicates which runtime is currently active.
*   **Graceful Feature Degradation:** Some features may be different or unavailable in "Lite" mode, and the UI handles this gracefully:
    *   **Image Generation:** The "Image Generator" node will attempt to use the local endpoint. If the user's local model does not support image generation, it will return a clear, informative error instead of failing silently.
    *   **Web Search Grounding:** Agents requiring web search will not function if the local LLM lacks this capability. The results will be based purely on the model's internal knowledge. The node will indicate that the result is from local knowledge only.
    *   **Juggernaut Agent Capabilities:** The effectiveness of complex Juggernaut agents will depend heavily on the quality of the local LLM.

## 4. Data Synchronization Strategy (Conceptual)

*   **Local-First Principle:** "Lite" mode is strictly local-first. There is no automatic cloud synchronization.
*   **Manual Export/Import:** Users can manually export their workflows and custom agents to a JSON file for backup or sharing, and import them into another instance.
*   **Future Selective Sync:** A future feature could allow users, upon explicitly logging into an account, to sync specific local projects to a central cloud store. This would always be a user-initiated action, not an automatic background process.

## 5. Benefits of "AgentricAI Lite"

*   **Maximum Privacy:** Sensitive data is processed entirely on the user's machine without being sent to external cloud APIs.
*   **Full Offline Functionality:** Create, view, modify, and save workflows without an active internet connection (LLM processing still requires the local server to be running).
*   **Zero Cost:** No API token costs when using a local LLM.
*   **Infinite Customization:** Users can experiment with any local model that fits their hardware and needs.
*   **Reduced External Dependencies:** Less reliance on the availability and terms of third-party cloud services.

## 6. Limitations and Considerations

*   **User Setup:** Requires users to install and manage their own local LLM server (e.g., LM Studio, Ollama) and download models.
*   **Model Capabilities:** The quality and features of the user's chosen local LLM will significantly impact the platform's effectiveness.
*   **Resource Intensive:** Running LLMs locally can be demanding on the user's CPU/GPU and RAM.
*   **Feature Parity:** Achieving full feature parity with the high-performance cloud version is not the goal. "Lite" mode prioritizes privacy and local control over access to every possible cloud-native feature.
*   **Security of Local Endpoint:** Users are responsible for the security of their local LLM server endpoint.

By offering this robust "AgentricAI Lite" architecture, the platform caters to a broader range of user needs and preferences, reinforcing its commitment to innovation, privacy, and user empowerment.
