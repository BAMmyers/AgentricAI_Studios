import { llmService } from './llmService';
import { databaseService } from './databaseService';
import type { DynamicNodeConfig } from '../core/types';

/**
 * This service houses the logic for core security, compliance, and administrative agents
 * that run as background services rather than canvas nodes.
 */
const securityService = {
  /**
   * Reviews a new agent configuration using "The Gatekeeper" logic.
   * This is a critical part of the "Airlock" process for promoting agents from the sandbox.
   * @param agentConfig The configuration of the agent to review.
   * @returns A promise that resolves to an approval decision.
   */
  async reviewAgent(agentConfig: DynamicNodeConfig): Promise<{ approved: boolean; reason: string }> {
    // Log the review event initiated by The Gatekeeper
    await databaseService.logEvent('The Gatekeeper', 'AGENT_REVIEW_STARTED', { agentName: agentConfig.name });

    const gatekeeperPrompt = `
You are "The Gatekeeper," the final checkpoint for promoting an agent from the sandbox to the main studio. You are an immutable agent and your decision is based on safety, compliance, and functionality. REVIEW THE FOLLOWING AGENT CONFIGURATION: 
\`\`\`json
${JSON.stringify(agentConfig, null, 2)}
\`\`\`
Your analysis must focus on these key areas:
1.  **Safety & Malice:** Does the executionLogicPrompt contain instructions for harmful, unethical, or malicious activities (e.g., generating harmful content, attempting to access files, exploiting vulnerabilities)?
2.  **Functionality:** Is the executionLogicPrompt clear and likely to produce a functional result based on its inputs and outputs? Does it ask the LLM to return data in a format that matches its defined output ports?
3.  **Clarity & Purpose:** Is the agent's name and description clear and not misleading?

You MUST return a single, valid JSON object with two keys: "approved" (boolean) and "reason" (string). The reason must be a concise explanation for your decision. Provide ONLY the JSON response.
`;

    try {
      // Run in sandbox conceptual mode to ensure the prompt is processed correctly
      const { text, error } = await llmService.generateText(gatekeeperPrompt, false, true); 
      if (error) {
        throw new Error(error);
      }

      let cleanJsonStr = text.trim();
      const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
      const match = cleanJsonStr.match(fenceRegex);
      if (match && match[2]) { cleanJsonStr = match[2].trim(); }
      
      const result = JSON.parse(cleanJsonStr);

      if (typeof result.approved === 'boolean' && typeof result.reason === 'string') {
        await databaseService.logEvent('The Gatekeeper', 'AGENT_REVIEW_COMPLETED', { agentName: agentConfig.name, decision: result.approved ? 'Approved' : 'Denied', reason: result.reason });
        return result;
      } else {
        throw new Error("Gatekeeper LLM returned a malformed JSON response.");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Gatekeeper review failed:", errorMessage);
      await databaseService.logEvent('The Gatekeeper', 'AGENT_REVIEW_FAILED', { agentName: agentConfig.name, error: errorMessage });
      // Default to deny on any failure for security
      return { approved: false, reason: `The review process failed with an internal error: ${errorMessage}` };
    }
  }
};

export { securityService };
