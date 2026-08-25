import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('TopBrains Uncaught Error Boundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FAFBFC',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '560px',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #DFE1E6',
              boxShadow: '0 8px 30px rgba(9, 30, 66, 0.08)',
              padding: '36px 32px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#FFEBE6',
                color: '#DE350B',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={28} />
            </div>

            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#172B4D',
                margin: '0 0 8px 0',
              }}
            >
              Something went wrong
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: '#5E6C84',
                lineHeight: 1.5,
                margin: '0 0 24px 0',
              }}
            >
              An unexpected error occurred in the application view. You can reload the page or return to the main dashboard.
            </p>

            {this.state.error && (
              <div
                style={{
                  textAlign: 'left',
                  backgroundColor: '#F4F5F7',
                  border: '1px solid #EBECF0',
                  borderRadius: 6,
                  padding: '12px 16px',
                  marginBottom: 24,
                  fontSize: '12px',
                  color: '#DE350B',
                  fontFamily: 'monospace',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.toString()}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#0052CC',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
              >
                <RefreshCw size={14} />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: '#FFFFFF',
                  color: '#42526E',
                  border: '1px solid #DFE1E6',
                  borderRadius: 6,
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Home size={14} />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
