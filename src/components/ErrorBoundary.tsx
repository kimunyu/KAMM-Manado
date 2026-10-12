import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  ShieldAlert 
} from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  key?: React.Key;
  isRoot?: boolean;
  moduleName?: string;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  onNavigateHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showTechnicalDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showTechnicalDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary Caught] [${this.props.moduleName || 'Application Root'}]:`, error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showTechnicalDetails: false,
      copied: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyDetails = (): void => {
    const { error, errorInfo } = this.state;
    const details = [
      `Module: ${this.props.moduleName || 'Root Application'}`,
      `Time: ${new Date().toISOString()}`,
      `Error: ${error?.name}: ${error?.message}`,
      `Stack:\n${error?.stack || 'N/A'}`,
      `Component Stack:\n${errorInfo?.componentStack || 'N/A'}`
    ].join('\n\n');

    navigator.clipboard.writeText(details).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch((err) => {
      console.warn('Gagal menyalin detail error:', err);
    });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { isRoot, moduleName, fallbackTitle, fallbackMessage, onNavigateHome } = this.props;
    const { error, errorInfo, showTechnicalDetails, copied } = this.state;

    const title = fallbackTitle || (
      isRoot 
        ? 'Aplikasi Mengalami Kendala Tak Terduga' 
        : `Terjadi Kendala pada Modul ${moduleName || 'Terkait'}`
    );

    const message = fallbackMessage || (
      isRoot
        ? 'Terjadi kesalahan sistem yang tidak tertangani. Anda dapat memuat ulang aplikasi atau menyalin laporan error untuk disampaikan ke tim teknis.'
        : `Komponen pada modul ${moduleName || 'ini'} mengalami kendala saat memproses data. Bagian aplikasi lainnya tetap berjalan normal.`
    );

    if (isRoot) {
      return (
        <div className="min-h-screen bg-[#07090e] text-[#e0e4eb] flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="w-full max-w-2xl bg-[#10131c] border border-rose-900/60 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-rose-950/40 border-b border-rose-900/40 px-6 py-5 flex items-center space-x-4">
              <div className="p-3 bg-rose-600/20 text-rose-400 border border-rose-500/30 rounded-xl shrink-0">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
                <p className="text-xs text-rose-300/80 mt-0.5">Sistem Pengendalian Error &amp; Pemulihan Aplikasi</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-[#a2abbd] leading-relaxed">
                {message}
              </p>

              {error && (
                <div className="p-3.5 bg-rose-950/30 border border-rose-900/50 rounded-xl text-xs font-mono text-rose-200 break-words flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>{error.name}:</strong> {error.message}
                  </span>
                </div>
              )}

              {/* Technical Details Accordion */}
              <div className="border border-[#222738] rounded-xl overflow-hidden bg-[#0c0e15]">
                <button
                  type="button"
                  onClick={() => this.setState({ showTechnicalDetails: !showTechnicalDetails })}
                  className="w-full px-4 py-2.5 text-xs text-[#8e96a8] hover:text-white flex items-center justify-between transition-colors"
                >
                  <span className="font-medium">Detail Diagnostik Teknis</span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="h-4 w-4 text-[#8e96a8]" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-[#8e96a8]" />
                  )}
                </button>

                {showTechnicalDetails && (
                  <div className="p-4 border-t border-[#222738] text-[11px] font-mono text-[#7b8599] space-y-3 overflow-x-auto max-h-60">
                    <div>
                      <div className="text-rose-400 font-semibold mb-1">Stack Trace:</div>
                      <pre className="whitespace-pre-wrap">{error?.stack || 'Tidak ada stack trace.'}</pre>
                    </div>
                    {errorInfo?.componentStack && (
                      <div>
                        <div className="text-amber-400 font-semibold mb-1">Component Hierarchy:</div>
                        <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={this.handleCopyDetails}
                  className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1a1f2e] text-[#a4b0c7] hover:bg-[#23293d] hover:text-white border border-[#2b334a] transition-all"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Berhasil Disalin!' : 'Salin Laporan Error'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Muat Ulang Halaman</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Module-Level Error Fallback (Rendered inline inside the main application layout)
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto my-6 animate-in fade-in duration-150">
        <div className="bg-[#121520] border border-rose-900/60 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-start space-x-4">
            <div className="p-3 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <p className="text-xs text-[#9aa4b7] leading-relaxed">{message}</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl text-xs font-mono text-rose-200 break-words">
              <strong>Error:</strong> {error.message}
            </div>
          )}

          {/* Collapsible Tech Stack */}
          <div className="border border-[#222738] rounded-xl overflow-hidden bg-[#0c0e15]">
            <button
              type="button"
              onClick={() => this.setState({ showTechnicalDetails: !showTechnicalDetails })}
              className="w-full px-4 py-2 text-xs text-[#8e96a8] hover:text-white flex items-center justify-between transition-colors"
            >
              <span>Detail Teknis Modul</span>
              {showTechnicalDetails ? (
                <ChevronUp className="h-3.5 w-3.5 text-[#8e96a8]" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-[#8e96a8]" />
              )}
            </button>
            {showTechnicalDetails && (
              <div className="p-3 border-t border-[#222738] text-[11px] font-mono text-[#7b8599] max-h-48 overflow-y-auto space-y-2">
                <div>{error?.stack}</div>
                {errorInfo?.componentStack && <div>{errorInfo.componentStack}</div>}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={this.handleCopyDetails}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1f2e] text-[#a4b0c7] hover:bg-[#23293d] hover:text-white border border-[#2b334a] transition-all"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Detail'}</span>
            </button>

            <div className="flex items-center space-x-2">
              {onNavigateHome && (
                <button
                  type="button"
                  onClick={() => {
                    this.handleReset();
                    onNavigateHome();
                  }}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e2333] hover:bg-[#282f45] text-white border border-[#2e374f] transition-all"
                >
                  <Home className="h-3.5 w-3.5 text-blue-400" />
                  <span>Ke Dashboard</span>
                </button>
              )}

              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Coba Lagi Modul Ini</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
