import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class HrdErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[HRD-ERROR-BOUNDARY] Terjadi error terisolasi:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-[#161922] border border-amber-500/30 rounded-xl text-slate-200">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white mb-1">
                Terjadi Kendala pada Modul Rekrutmen / HRD
              </h3>
              <p className="text-sm text-slate-400 mb-3">
                Error ini terisolasi sepenuhnya pada modul HRD dan tidak mempengaruhi modul sistem lainnya (Kontrol Sales, Mediator, Sales Acquisition, dsb.).
              </p>
              {this.state.error && (
                <div className="p-3 bg-[#0d0f14] rounded-lg border border-[#232736] text-xs font-mono text-amber-300 mb-4 overflow-x-auto">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Muat Ulang Modul Rekrutmen
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
