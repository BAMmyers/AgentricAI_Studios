import { llmService } from './llmService';
import { databaseService } from './databaseService';
import type { BugReport } from '../core/types';

type BugListener = (bugs: Map<string, BugReport>) => void;

class MechanicService {
  private bugDatabase = new Map<string, BugReport>();
  private listeners = new Set<BugListener>();

  public async init() {
    // --- Load Persistent Bugs from Database ---
    try {
        await databaseService.init(); // Ensure DB is ready
        const storedBugs = await databaseService.loadBugReports();
        storedBugs.forEach(bug => {
            // If a bug is re-logged on startup before this, the stored one will overwrite it,
            // which is fine as it preserves the count and original timestamp.
            this.bugDatabase.set(bug.id, bug);
        });
        this.notifyListeners();
        console.log(`🔧 The Mechanic loaded ${storedBugs.length} persistent bug reports from the database.`);
    } catch (e) {
        console.error("The Mechanic failed to load persistent bugs:", e);
    }
    
    // --- Global Error Listener ---
    window.onerror = (message, source, lineno, colno, error) => {
      if (error) {
        this.logBug(error, `Unhandled error at ${source}:${lineno}:${colno}`);
      } else {
        const syntheticError = new Error(String(message));
        this.logBug(syntheticError, `Unhandled error (from onerror) at ${source}:${lineno}:${colno}`);
      }
      return true; // Prevents the default browser error handling
    };

    // --- Global Unhandled Promise Rejection Listener ---
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.logBug(error, 'Unhandled promise rejection');
    };

    console.log("🔧 The Mechanic is on duty. Global error handlers initialized.");
  }

  public logBug = (error: Error, context: string = "No context provided") => {
    // Create a consistent ID for grouping identical errors
    const bugId = `${error.message.split('\n')[0]}:${error.stack?.split('\n')[1]?.trim() || ''}`;
    let bugToPersist: BugReport;

    if (this.bugDatabase.has(bugId)) {
      // Increment count for existing bug
      const existingBug = this.bugDatabase.get(bugId)!;
      existingBug.count += 1;
      existingBug.timestamp = new Date().toISOString();
      this.bugDatabase.set(bugId, existingBug);
      bugToPersist = existingBug;
    } else {
      // Create new bug report
      const newBug: BugReport = {
        id: bugId,
        error: {
          message: error.message,
          stack: error.stack,
        },
        context,
        timestamp: new Date().toISOString(),
        count: 1,
        isSuggestionLoading: true,
        status: 'new',
      };
      this.bugDatabase.set(bugId, newBug);
      this.fetchSuggestionForBug(bugId);
      bugToPersist = newBug;
    }
    
    // Persist the updated or new bug report to the database
    databaseService.saveBugReport(bugToPersist).catch(e => console.error("Failed to persist bug report:", e));

    this.notifyListeners();
  }

  private async fetchSuggestionForBug(bugId: string) {
    const bug = this.bugDatabase.get(bugId);
    if (!bug) return;

    try {
      const suggestion = await llmService.getExecutionSuggestion(
        "A user encountered this error in the AgentricAI Studios application.",
        {
          errorMessage: bug.error.message,
          errorStack: bug.error.stack,
          errorContext: bug.context,
        },
        bug.error.message
      );
      bug.suggestion = suggestion;
    } catch (e) {
      bug.suggestion = `The Mechanic failed to get a suggestion: ${e instanceof Error ? e.message : String(e)}`;
    } finally {
      bug.isSuggestionLoading = false;
      this.bugDatabase.set(bugId, bug);
      databaseService.saveBugReport(bug).catch(e => console.error("Failed to persist bug suggestion:", e));
      this.notifyListeners();
    }
  }

  public getBugReports(): BugReport[] {
    return Array.from(this.bugDatabase.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public markAsSeen(bugId: string) {
    const bug = this.bugDatabase.get(bugId);
    if (bug && bug.status === 'new') {
        bug.status = 'seen';
        this.bugDatabase.set(bugId, bug);
        databaseService.saveBugReport(bug).catch(e => console.error("Failed to persist bug status update:", e));
        this.notifyListeners();
    }
  }

  public subscribe(listener: BugListener) {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.bugDatabase);
  }

  public unsubscribe(listener: BugListener) {
    this.listeners.delete(listener);
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener(new Map(this.bugDatabase)); // Provide a copy
    }
  }
}

export const mechanicService = new MechanicService();