
# AgentricAI Studios: Sandbox Mode

## 1. The Philosophy: A Space for Uninhibited Creation

In the pursuit of true innovation, there must be a space free from judgment, pre-conceived notions, and even the established rules of the environment. The Sandbox Mode in AgentricAI Studios is designed to be precisely that space. It is an isolated, ephemeral, and completely private environment where creators can experiment with raw, unfiltered ideas without consequence.

The core principles of the Sandbox are:
-   **Absolute Privacy:** What happens in the sandbox, stays in the sandbox. The main AgentricAI system, including its logging and profiling agents, has **zero visibility** into the activities within this mode. This is to guarantee that a user's experimental processes do not create any bias in the system and to ensure the user feels completely safe to explore any idea, no matter how unconventional.
-   **Total Isolation:** The sandbox is a temporary canvas. Your primary work in the main "Studio" is kept safe and separate. When you enter the sandbox, you start with a blank slate. When you leave, everything you created is deleted, unless you have explicitly chosen to promote it through the review process.
-   **Unrestricted Ideation:** Within the sandbox, AI interactions are conceptually less constrained. This allows for the exploration of ideas that might be filtered or reshaped by the safety and ethical guidelines of a production environment. It is a space for "what if," not just "what is."

## 2. How It Works: The Workflow

### Entering and Exiting
-   You can enter Sandbox Mode via a button in the main header of the Creator Studio.
-   A warning modal will appear, explaining the ephemeral nature of the sandbox. You must confirm to proceed.
-   Upon entering, your main studio workflow is saved in the background, and you are presented with a blank canvas with a distinct "hazard" theme (yellow and black) to constantly remind you which mode you are in.
-   To leave, simply click the "Exit Sandbox" button. Your original studio workflow will be restored, and the sandbox contents will be permanently deleted.

### Creation and Experimentation
-   Inside the sandbox, you can create and connect agents just like in the main studio.
-   You have access to a special tool: the **"Raw Text Input"** node. This node allows you to provide direct, unfiltered text to other agents, bypassing any preliminary structuring or filtering. This is ideal for testing the absolute raw output of a processing agent.
-   You can define new, dynamic agents using natural language. These agents exist only within the current sandbox session.

## 3. The Airlock: The "Request for Review" Process

The only way to move a creation from the volatile sandbox into the permanent main studio is through the "Request for Review" airlock. This is a critical safety feature that ensures the integrity of the main application.

1.  **Submission:** On any custom agent you create within the sandbox, a **"Request Review"** button will be visible.
2.  **AI Review:** Clicking this button sends the configuration of your new agent to a special, immutable administrative agent called **"The Gatekeeper."** This is the *only* point where the main AI system "sees" your creation. The Gatekeeper analyzes the agent's logic, inputs, and outputs for safety, compliance, and functionality against the main studio's standards.
3.  **The Decision:** The Gatekeeper will return one of two decisions:
    -   **Approved:** If the agent is deemed safe and functional, it is "promoted." It will be permanently saved to your local browser storage and will appear in your agent list every time you use the main studio. You will receive a success notification.
    -   **Denied:** If the agent is flagged for potential misuse, is poorly defined, or violates safety protocols, it will be denied. You will receive a notification with the reason for the denial. The agent will remain in the sandbox and will be deleted when you exit.

This process allows for maximum creative freedom while ensuring that only safe, well-defined, and compliant tools are integrated into the main, stable creative environment.
