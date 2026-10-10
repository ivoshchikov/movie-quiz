import { Component } from "react";
import type { ReactNode } from "react";
import ErrorScreen from "./ErrorScreen";

// Catch rendering failures without displaying error payloads or account data.
export default class PageErrorBoundary extends Component<{ children: ReactNode; resetKey?: string; standalone?: boolean }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidUpdate(previous: Readonly<{ resetKey?: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }
  render() { return this.state.failed ? <ErrorScreen standalone={this.props.standalone} /> : this.props.children; }
}
