import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  fallbackMessage?: string
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null, showDetails: false }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AssistSocial ErrorBoundary interceptou um erro de renderização:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  public handleReload = () => {
    window.location.reload()
  }

  public handleGoHome = () => {
    if (this.props.onReset) {
      this.props.onReset()
      this.setState({ hasError: false, error: null, errorInfo: null })
    } else {
      window.location.href = '/'
    }
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-[#F6E4EC] shadow-[0_10px_30px_rgba(240,68,145,0.1)] text-center space-y-5 animate-fade-in">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-[#FEF1F2] text-[#D93025] flex items-center justify-center shadow-inner">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-[#28232A]">
                {this.props.fallbackTitle || 'Opa, algo inesperado aconteceu'}
              </h3>
              <p className="text-xs text-[#827780] leading-relaxed">
                {this.props.fallbackMessage ||
                  'Encontramos uma instabilidade momentânea nesta tela. Seus dados continuam em total segurança.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#F04491] hover:bg-[#DE3380] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>Tentar Novamente</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#FFF9FB] hover:bg-[#FCE5ED] text-[#28232A] border border-[#F6E4EC] text-xs font-bold transition-all cursor-pointer"
              >
                <Home size={14} />
                <span>Menu Inicial</span>
              </button>
            </div>

            {/* Expansor de detalhes técnicos (opcional) */}
            {this.state.error && (
              <div className="pt-2 text-left">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="w-full flex items-center justify-between text-[11px] font-bold text-[#827780] hover:text-[#28232A] py-1 border-t border-[#F6E4EC] mt-2 cursor-pointer"
                >
                  <span>Detalhes técnicos</span>
                  {this.state.showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {this.state.showDetails && (
                  <pre className="mt-2 p-3 rounded-xl bg-[#28232A] text-[#FFF9FB] text-[10px] overflow-x-auto font-mono max-h-36 whitespace-pre-wrap break-all">
                    {this.state.error.toString()}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
