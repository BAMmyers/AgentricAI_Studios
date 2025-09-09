

# AgentricAI Studios: An Overview

**AgentricAI Studios: powered by Google Technologies**

AgentricAI Studios is a dynamic, web-based visual environment designed for creating, experimenting with, and executing sophisticated AI agents and complex workflows. It empowers users to intuitively build and manage AI-driven processes through a node-based interface.

This platform now features multiple modes of operation:
1.  **Studio (Creator Mode):** The core node-based visual programming environment where developers design and test agentic workflows.
2.  **Sandbox Mode:** An isolated, ephemeral version of the Studio for completely unrestricted and private experimentation.
3.  **Explorer (Echo Mode):** The user-facing application for the student, powered by the workflows built in the Studio.

## The Sandbox: An Environment for Unrestricted Innovation

To foster true creativity, AgentricAI Studios includes a **Sandbox Mode**. This is a critical feature that provides a completely private and isolated space for experimentation without the constraints of the main studio.

-   **Total Privacy & Isolation:** The sandbox is ephemeral. Work is not saved, and nothing created within it is logged or used to profile the user. It is a space for raw, uninhibited creation.
-   **The "Airlock" Review Process:** Creations cannot leave the sandbox freely. A user must submit a custom-defined agent for review. An AI agent, **"The Gatekeeper,"** assesses the submission for safety and compliance. If approved, the new agent is "promoted" to the user's permanent library in the main studio. If denied, it is deleted when the sandbox session ends.
-   **Unfiltered Tools:** The sandbox includes tools like the **"Raw Text Input"** node, allowing users to bypass any preliminary AI filtering and send their exact text directly to processing agents.

For a full breakdown of this feature, see the **[Sandbox Mode documentation](./docs/sandbox_mode.md)**.

## The 'Why': The Echo Project - A Detailed Vision

AgentricAI Studios is the engine for a profound mission: **The Echo Project**. For a full breakdown, please see the **[Echo Project documentation](./docs/ECHO_PROJECT.md)**. The core goal is to create a hyper-adaptive, autonomous, and private learning companion for children with unique educational needs.

### Ethical Failsafe Protocol

To guarantee the integrity of its mission, AgentricAI Studios is built with a non-overridable **Ethical Failsafe Protocol**. Core administrative and security agents like **"The Guardian"** and **"The Black Box"** are architecturally immutable and cannot be altered or deleted. They form an "egg" that silently monitors the system for misuse and can initiate an irreversible halt to prevent any violation of the platform's foundational purpose.

## Core Capabilities (Studio Mode)

*   **Visual Workflow Construction:** Drag and drop "Juggernaut" agents (nodes) and connect them.
*   **Intelligent Agent System ("Juggernauts"):** A rich library of agents for various tasks, including "The Apprentice," "Echo Project Orchestrator," and "Code Debugger." For a complete, "ironclad" list of all system agents and their unabridged execution logic, see the **[Juggernaut Logic Files Manifest](./docs/JUGGERNAUT_LOGIC_FILES.md)**.
*   **Dynamic Node Definition:** Define new custom agents in natural language.
*   **Flexible LLM Integration:** Utilizes Google's models and supports local LLMs (LM Studio, Ollama).

## Technology Stack

*   **Frontend:** React, TypeScript, Tailwind CSS, Vite
*   **Core AI:** Google GenAI SDK for Gemini and Imagen models.
*   **Persistence:** Browser `localStorage` for autosaving workflows and the custom agent library.

## Getting Started

1.  **Clone the Repository**
2.  **Install Dependencies:** `npm install`
3.  **API Key:** Create a `.env` file and add `API_KEY=YOUR_GEMINI_API_KEY_HERE`.
4.  **Run in Development Mode:** `npm run dev`