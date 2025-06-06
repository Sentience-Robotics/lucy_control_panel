import React from "react";
import type { ReactNode } from "react";
import { Layout, Typography } from "antd";

const { Header, Content } = Layout;
const { Title } = Typography;

interface PageProps {
  children: ReactNode;
  title?: string;
  headerContent?: ReactNode;
  showHeader?: boolean;
  contentStyle?: React.CSSProperties;
  removeScrollbars?: boolean;
  className?: string;
}

export const Page: React.FC<PageProps> = ({
  children,
  title,
  headerContent,
  showHeader = false,
  contentStyle = {},
  removeScrollbars = true,
  className = ''
}) => {
  const defaultContentStyle: React.CSSProperties = {
    backgroundColor: '#000',
    minHeight: showHeader ? 'calc(100vh - 70px)' : '100vh',
    padding: '24px',
    ...contentStyle
  };

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: '#000', overflow: 'hidden' }} className={className}>
      {showHeader && (
        <Header
          style={{
            backgroundColor: '#0a0a0a',
            borderBottom: '2px solid #333',
            padding: '0 24px',
            height: 'auto',
            lineHeight: 'normal',
            paddingTop: 16,
            paddingBottom: 16
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {title && (
              <Title
                level={2}
                style={{
                  margin: 0,
                  color: '#00ff41',
                  fontFamily: 'monospace',
                  textShadow: '0 0 10px #00ff41',
                  fontSize: '18px'
                }}
              >
                ▲ {title}
              </Title>
            )}
            {headerContent && <div style={{ width: '100%' }}>{headerContent}</div>}
          </div>
        </Header>
      )}

      <Content style={defaultContentStyle}>
        {children}
      </Content>

      <style>{`
        ${removeScrollbars ? `
        /* Remove scrollbars */
        html, body {
          overflow: hidden !important;
        }
        ` : ''}

        /* TUI Theme - Remove all rounded corners */
        .ant-btn,
        .ant-btn-primary,
        .ant-btn-default,
        .ant-switch,
        .ant-slider,
        .ant-slider-rail,
        .ant-slider-track,
        .ant-slider-handle,
        .ant-input-number,
        .ant-card,
        .ant-alert,
        .ant-spin-container,
        .ant-layout-header,
        .ant-layout-content,
        .ant-col,
        .ant-row {
          border-radius: 0 !important;
        }

        /* Clean Button Glow Effects */
        .ant-btn {
          transition: all 0.3s ease !important;
          position: relative !important;
        }

        .ant-btn-primary {
          background-color: #00ff41 !important;
          border-color: #00ff41 !important;
          box-shadow: 0 0 8px rgba(0, 255, 65, 0.3) !important;
        }

        .ant-btn-primary:hover {
          background-color: #00ff41 !important;
          border-color: #00ff41 !important;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.6) !important;
          transform: translateY(-1px) !important;
        }

        .ant-btn-primary:active {
          transform: translateY(0) !important;
          box-shadow: 0 0 8px rgba(0, 255, 65, 0.4) !important;
        }

        .ant-btn-default {
          background-color: transparent !important;
          border-color: #444 !important;
          color: #fff !important;
        }

        .ant-btn-default:hover {
          border-color: #00ff41 !important;
          color: #00ff41 !important;
          box-shadow: 0 0 12px rgba(0, 255, 65, 0.3) !important;
          transform: translateY(-1px) !important;
        }

        .ant-btn-default:active {
          transform: translateY(0) !important;
        }

        /* TUI Color Theme with Glow Effects */
        .ant-slider-track {
          background-color: #00ff41 !important;
        }

        .ant-slider-handle {
          border-color: #00ff41 !important;
        }

        .ant-slider-handle:focus {
          border-color: #00ff41 !important;
          box-shadow: 0 0 0 5px rgba(0, 255, 65, 0.2) !important;
        }

        .ant-input-number {
          background-color: #1a1a1a !important;
          border-color: #444 !important;
          color: #fff !important;
          transition: all 0.3s ease !important;
        }

        .ant-input-number:hover {
          border-color: #00ff41 !important;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.3) !important;
        }

        .ant-input-number:focus-within {
          border-color: #00ff41 !important;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.5) !important;
        }

        .ant-input-number-input {
          background-color: transparent !important;
          color: #fff !important;
        }

        .ant-input-number-handler-wrap {
          background-color: #333 !important;
          transition: all 0.3s ease !important;
        }

        .ant-input-number-handler {
          border-color: #444 !important;
          color: #fff !important;
          transition: all 0.2s ease !important;
        }

        .ant-input-number-handler:hover {
          color: #00ff41 !important;
          background-color: rgba(0, 255, 65, 0.1) !important;
          box-shadow: inset 0 0 10px rgba(0, 255, 65, 0.2) !important;
        }

        /* Custom range slider styling */
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: #333;
          cursor: pointer;
          border-radius: 0;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 16px;
          width: 16px;
          background: #00ff41;
          cursor: pointer;
          border: none;
          border-radius: 0;
        }

        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          background: #00ff41;
          cursor: pointer;
          border: none;
          border-radius: 0;
        }

        /* Common animations */
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }

        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .pulse-animation {
          animation: pulse 2s infinite;
        }

        .glitch-effect {
          animation: glitch 0.3s infinite;
        }

        /* TUI Text Styles */
        .tui-title {
          color: #00ff41;
          font-family: 'monospace';
          text-shadow: 0 0 10px #00ff41;
          font-weight: bold;
        }

        .tui-text {
          color: #fff;
          font-family: 'monospace';
        }

        .tui-text-muted {
          color: #666;
          font-family: 'monospace';
        }

        .tui-text-danger {
          color: #ff4d4f;
          font-family: 'monospace';
        }

        .tui-text-success {
          color: #00ff41;
          font-family: 'monospace';
        }

        /* TUI Container Styles */
        .tui-container {
          background-color: #1a1a1a;
          border: 1px solid #444;
          padding: 16px;
        }

        .tui-container-dark {
          background-color: #0a0a0a;
          border: 2px solid #333;
          padding: 20px;
        }

        /* TUI Button Toggle Styles with Glow */
        .tui-toggle {
          display: inline-flex;
          border: 1px solid #444;
          background-color: #1a1a1a;
          font-family: 'monospace';
          font-size: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .tui-toggle:hover {
          border-color: #00ff41;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.3);
        }

        .tui-toggle-button {
          padding: 4px 12px;
          border: none;
          background-color: transparent;
          color: #666;
          font-family: 'monospace';
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          z-index: 2;
        }

        .tui-toggle-button:hover {
          color: #00ff41;
          text-shadow: 0 0 8px rgba(0, 255, 65, 0.6);
        }

        .tui-toggle-button.active {
          background-color: #00ff41;
          color: #000;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
          animation: buttonPulse 2s infinite;
        }

        .tui-toggle-divider {
          width: 1px;
          background-color: #444;
        }

        /* Animated Robot Status Icons */
        @keyframes robotPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes robotSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes connectionPulse {
          0%, 100% {
            box-shadow: 0 0 8px currentColor;
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 20px currentColor, 0 0 30px currentColor;
            transform: scale(1.2);
          }
        }

        @keyframes dataFlow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes buttonPulse {
          0%, 100% {
            box-shadow: 0 0 15px rgba(0, 255, 65, 0.6);
          }
          50% {
            box-shadow: 0 0 25px rgba(0, 255, 65, 0.9), 0 0 35px rgba(0, 255, 65, 0.5);
          }
        }

        .robot-status-connected {
          animation: connectionPulse 2s infinite ease-in-out;
        }

        .robot-status-disconnected {
          animation: robotPulse 1s infinite ease-in-out;
          filter: brightness(0.7);
        }

        .robot-status-moving {
          animation: robotSpin 1s linear infinite;
        }

        .robot-status-error {
          animation: glitch 0.5s infinite;
          filter: hue-rotate(180deg);
        }
      `}</style>
    </Layout>
  );
};
