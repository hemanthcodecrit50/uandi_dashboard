'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  widgetId: string;
  widgetType: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="widget-error">
          <div className="widget-error-icon">
            <AlertTriangle size={20} />
          </div>
          <p className="widget-error-title">Widget crashed</p>
          <p className="widget-error-type">{this.props.widgetType}</p>
          {this.state.error?.message && (
            <p className="widget-error-msg">
              {this.state.error.message.slice(0, 120)}
            </p>
          )}
          <button className="widget-error-retry" onClick={this.handleRetry}>
            <RefreshCw size={13} />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
