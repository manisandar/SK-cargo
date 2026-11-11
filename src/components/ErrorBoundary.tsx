import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { db } from '../data/db';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled Application Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetDatabase = async () => {
    if (window.confirm('Reset local database to fix corrupted data and reload?')) {
      try {
        await db.delete();
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      } catch (err) {
        console.error('Failed to reset DB:', err);
        window.location.reload();
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F6] dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-red-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-[#1F3A5F]">Application Error</h1>
                <p className="text-xs text-slate-500 font-medium">
                  An error occurred while loading this view.
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-mono overflow-x-auto max-h-36">
              {this.state.error?.message || 'Unknown render error'}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 bg-[#1F3A5F] hover:bg-[#162A45] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors min-h-[42px]"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetDatabase}
                className="w-full py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors min-h-[38px]"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Reset Corrupted Local Data & Restart</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
