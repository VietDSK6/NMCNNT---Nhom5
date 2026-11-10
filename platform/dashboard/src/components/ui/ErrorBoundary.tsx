import { Component, type ReactNode } from "react";
import { AlertIcon } from "../../icons";

interface Props {
  readonly children: ReactNode;
  readonly message: string;
}

export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="inline-state inline-state--error" role="alert">
        <AlertIcon /><span><strong>{this.props.message}</strong></span>
        <button className="button button--secondary" onClick={() => this.setState({ failed: false })}>Thử lại</button>
      </div>
    );
  }
}
