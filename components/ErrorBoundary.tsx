import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
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

  public render() {
    if (this.state.hasError) {
      let errorMessage = this.state.error?.message || 'Ismeretlen hiba';
      let isFirestoreError = false;

      try {
        const parsedError = JSON.parse(errorMessage);
        if (parsedError && parsedError.operationType) {
          isFirestoreError = true;
          errorMessage = `Adatbázis hiba (${parsedError.operationType}): ${parsedError.error}`;
        }
      } catch (e) {
        // Not a JSON error string
      }

      return (
        <div className="min-h-[100dvh] flex items-center justify-center bg-[#0d0d12] text-white p-4">
          <div className="max-w-md w-full bg-[#16161d] border border-red-500/30 p-8 rounded-[2.5rem] shadow-2xl text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="ph-fill ph-warning-circle text-red-500 text-4xl"></i>
            </div>
            <h1 className="text-2xl font-black mb-3 text-white">Hoppá, valami elromlott!</h1>
            <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Váratlan hiba történt az alkalmazás futása közben. Kérjük, próbáld meg frissíteni az oldalt.
            </p>
            
            <div className="bg-black/50 p-4 rounded-2xl text-left overflow-auto max-h-40 mb-8 border border-white/5">
              <code className="text-xs text-red-400 font-mono break-words">
                {errorMessage}
              </code>
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-colors uppercase tracking-widest text-sm shadow-lg shadow-red-500/20 active:scale-95"
            >
              Oldal frissítése
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
