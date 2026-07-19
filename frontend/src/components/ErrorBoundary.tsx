import React from 'react';
import { analyticsService } from '../services/analytics.service';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    analyticsService.trackEvent('client_render_error', {
      message: error.message.slice(0, 240),
      componentStack: info.componentStack?.slice(0, 500),
    });
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="min-h-screen bg-background px-gutter py-16 text-on-background">
        <section className="mx-auto flex max-w-xl flex-col gap-md rounded-lg border border-error/20 bg-surface p-lg shadow-[0px_10px_30px_rgba(8,8,8,0.06)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-error/20 bg-error-container text-error">
            <span className="material-symbols-outlined">error</span>
          </div>
          <div>
            <p className="font-label-sm text-label-sm uppercase text-on-surface-variant">
              Runtime error
            </p>
            <h1 className="mt-1 font-headline-lg text-headline-lg font-black text-primary">
              Lumora Pay could not render this screen.
            </h1>
            <p className="mt-sm text-sm text-on-surface-variant">
              The issue was recorded for review. You can retry the current view
              or return to the dashboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-sm">
            <button
              type="button"
              onClick={this.reset}
              className="rounded bg-primary px-md py-2.5 font-label-sm text-sm font-bold text-on-primary"
            >
              Retry
            </button>
            <a
              href="/app"
              className="rounded border border-outline px-md py-2.5 font-label-sm text-sm font-bold text-primary"
            >
              Dashboard
            </a>
          </div>
        </section>
      </main>
    );
  }
}
