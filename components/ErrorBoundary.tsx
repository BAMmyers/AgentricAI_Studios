
import React, { Component, ErrorInfo, ReactNode } from "react";
import { mechanicService } from "../src/services/mechanicService";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true, errorId: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // Log the error with the mechanic service
    mechanicService.logBug(error, `React render error: ${JSON.stringify(errorInfo.componentStack)}`);
    // We could try to get an ID back from the service to show a specific report, but for now, just logging is enough.
  }

  private handleReset = () => {
    // This is a simple reset. For a more robust solution, you might need to
    // navigate the user away or fully reload the application state.
    this.setState({ hasError: false, errorId: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-gray-900 flex flex-col items-center justify-center text-gray-300 p-8 text-center">
          <div className="text-6xl mb-4">💥</div>
          <h1 className="text-3xl font-bold text-red-500 mb-2">A Critical Error Occurred</h1>
          <p className="text-lg mb-4">
            The application has encountered a problem it can't recover from on its own.
          </p>
          <div className="bg-gray-800 p-4 rounded-lg border border-red-700 mb-6 w-full max-w-2xl">
              <p className="font-semibold text-yellow-400">The Mechanic has been notified!</p>
              <p className="text-sm text-gray-400">
                This bug has been logged automatically. You can check The Mechanic's bug report (the 🔧 icon)
                for a detailed analysis and a potential fix suggestion after reloading the app.
              </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
