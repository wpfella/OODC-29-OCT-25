import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'An unexpected error occurred.';
      let isFirebaseError = false;

      try {
        const parsedError = JSON.parse(this.state.error?.message || '{}');
        if (parsedError.error) {
          isFirebaseError = true;
          if (parsedError.error.includes('insufficient permissions')) {
            errorMessage = 'You do not have permission to perform this action. Please check your account access.';
          } else if (parsedError.error.includes('Quota exceeded')) {
            errorMessage = 'Firebase quota exceeded. Please try again tomorrow.';
          } else if (parsedError.error.includes('offline')) {
            errorMessage = 'You appear to be offline or the Firebase configuration is incorrect.';
          } else {
            errorMessage = parsedError.error;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            <p className="text-slate-600 mb-8">
              {errorMessage}
            </p>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
            {isFirebaseError && (
              <p className="mt-6 text-xs text-slate-400">
                This error was reported by the database service.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
