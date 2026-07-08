import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SK Central boundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-aurora-field p-6">
          <section className="glass max-w-xl rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-aqua">System notice</p>
            <h1 className="mt-3 text-3xl font-bold text-white">Something needs attention.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              The workspace recovered into a protected state. Refresh the page or open another area from the
              navigation.
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
