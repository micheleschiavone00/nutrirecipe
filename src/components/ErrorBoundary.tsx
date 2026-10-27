import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 text-center">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-md w-full shadow-xl space-y-4">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-xs">
              ⚠️
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-gray-100">
                {this.props.fallbackTitle || 'Si è verificato un errore imprevisto'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {this.state.error?.message || 'Errore durante il caricamento della vista.'}
              </p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="btn-primary py-2.5 px-4 text-xs font-bold rounded-xl shadow-xs"
              >
                🔄 Riprova / Ricarica
              </button>
              <a
                href="/recipes"
                className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100"
              >
                🍽️ Torna alle Ricette
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
