import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary — prevents a crash in one studio section from taking
 * down the whole app. Renders a recoverable fallback.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      JSON.stringify({
        level: 'error',
        module: 'ErrorBoundary',
        section: this.props.section ?? 'unknown',
        message: error.message,
        componentStack: info.componentStack,
        timestamp: new Date().toISOString(),
      })
    );
  }

  private reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 40,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            background: 'rgba(255,107,74,0.14)',
            color: '#ff6b4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          !
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700 }}>
          This section hit an error
        </div>
        <div style={{ color: '#8b93a7', fontSize: 13, maxWidth: 420 }}>
          {this.props.section ? `${this.props.section} — ` : ''}
          {this.state.error?.message ?? 'Something unexpected happened.'} The rest of the studio is still running.
        </div>
        <button
          onClick={this.reset}
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            fontSize: 13,
            padding: '9px 20px',
            borderRadius: 8,
            border: 'none',
            background: '#ff6b4a',
            color: '#1a0d08',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}