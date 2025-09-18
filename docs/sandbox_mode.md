# AgentricAI Studios: Sandbox Mode

## 1. The Philosophy: A Space for Uninhibited Creation

In the pursuit of true innovation, there must be a space free from judgment, pre-conceived notions, and even the established rules of the environment. The Sandbox Mode in AgentricAI Studios is designed to be precisely that space. It is an isolated, ephemeral, and completely private environment where creators can experiment with raw, unfiltered ideas without consequence.

The core principles of the Sandbox are:
-   **Absolute Privacy:** What happens in the sandbox, stays in the sandbox. The main AgentricAI system, including its logging and profiling agents, has **zero visibility** into the activities within this mode. This is to guarantee that a user's experimental processes do not create any bias in the system and to ensure the user feels completely safe to explore any idea, no matter how unconventional.
-   **Total Isolation:** The sandbox is a temporary, in-memory canvas. Your primary work in the main "Studio" is kept safe and separate in the persistent database. When you enter the sandbox, you start with a blank slate. When you leave, everything you created is permanently destroyed, unless explicitly promoted through the review process.
-   **Unrestricted Ideation:** Within the sandbox, AI interactions are conceptually less constrained. This allows for the exploration of ideas that might be filtered or reshaped by the safety and ethical guidelines of a production environment. It is a space for "what if," not just "what is."
-   **High-Performance Experimentation (Conceptual):** For advanced use cases, the sandbox could be conceptually linked to dedicated high-performance resources. An experiment involving a swarm of thousands of agents could be offloaded from the user's local machine to a dedicated **GPU cluster**, allowing for resource-intensive simulations without impacting the main studio's performance.

## 2. How It Works: The Workflow

### Entering and Exiting
-   You can enter Sandbox Mode via a switch in the settings panel of the Studio.
-   A warning modal will appear, explaining the ephemeral and private nature of the sandbox. You must confirm to proceed.
-   Upon entering, your main studio workflow is saved in the background, and you are presented with a blank canvas with a distinct "hazard" theme (yellow and black) to constantly remind you which mode you are in.
-   To leave, simply switch the mode back to "Studio." Your original studio workflow will be restored, and the sandbox contents will be permanently deleted from memory.

### Creation and Experimentation
-   Inside the sandbox, you can create and connect agents just like in the main studio.
-   You have access to a special tool: the **"Raw Text Input"** node. This node allows you to provide direct, unfiltered text to other agents, bypassing any preliminary structuring or safety filtering. This is ideal for testing the absolute raw output of a processing agent.
-   You can define new, dynamic agents using natural language. These agents exist only within the current sandbox session and are not saved unless promoted.

## 3. The Airlock: The "Request for Review" Process

The only way to move a creation from the volatile sandbox into the permanent main studio is through the "Request for Review" airlock. This is a critical security and quality control feature that ensures the integrity of the main application.

1.  **Submission:** On any custom agent you create within the sandbox, a **"Request Review"** button will be visible.
2.  **AI Review:** Clicking this button serializes the configuration of your new agent and submits it to the immutable administrative agent, **"The Gatekeeper."** This is the *only* point where the main AI system "sees" your sandbox creation. "The Gatekeeper" analyzes the agent's logic, inputs, and outputs for safety, compliance, and functionality against the main studio's strict standards. It uses the **Threat Pattern Matcher (`TPM`)** tool to scan the `executionLogicPrompt` for any malicious code or harmful instructions.
3.  **The Decision:** The Gatekeeper will return one of two decisions:
    -   **Approved:** If the agent is deemed safe, functional, and compliant, it is "promoted." Its configuration is saved to the persistent database and will appear in your Node Library in the main studio from now on. You will receive a success notification.
    -   **Denied:** If the agent is flagged for potential misuse, is poorly defined, or violates safety protocols, it will be denied. You will receive a notification with a clear reason for the denial. The agent will remain in the sandbox and will be deleted when you exit.

This process allows for maximum creative freedom while ensuring that only safe, well-defined, and compliant tools are integrated into the main, stable creative environment.
