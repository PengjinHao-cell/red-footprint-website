import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
  onReset?: () => void;
};

type AppErrorBoundaryState = {
  hasError: boolean;
  recoveryKey: number;
};

export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    recoveryKey: 0,
  };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  private reset = () => {
    this.props.onReset?.();
    this.setState(({ recoveryKey }) => ({
      hasError: false,
      recoveryKey: recoveryKey + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          style={{
            display: 'grid',
            minHeight: '100vh',
            placeItems: 'center',
            padding: '2rem',
            background: '#fbf7ee',
            color: '#3f2925',
            textAlign: 'center',
          }}
        >
          <div>
            <h1>地图体验暂时无法显示</h1>
            <p>应用遇到了意外问题。可以重新尝试载入安全地图或景点列表。</p>
            <button onClick={this.reset} type="button">
              重新尝试
            </button>
          </div>
        </main>
      );
    }

    return (
      <Fragment key={this.state.recoveryKey}>{this.props.children}</Fragment>
    );
  }
}
