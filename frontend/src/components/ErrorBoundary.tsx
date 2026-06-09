import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Solace ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 16,
            border: '1px solid var(--color-border)',
            background: 'var(--color-bot-bubble)',
            color: 'var(--color-muted)',
            fontSize: 13,
            fontStyle: 'italic',
            lineHeight: 1.6,
            maxWidth: '80%',
          }}
        >
          Something went quiet here. Try refreshing if this persists.
        </div>
      );
    }
    return this.props.children;
  }
}
