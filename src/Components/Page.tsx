import React, { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Layout, Typography, Grid } from 'antd';
import {
  UI_ACCENT_GREEN,
  UI_ACCENT_TEXT_SHADOW,
  UI_BG_BLACK,
  UI_BORDER_MUTED,
  UI_BORDER_SOFT,
  UI_ERROR,
  UI_INPUT_SURFACE,
  UI_PANEL_BG,
  UI_PAGE_HEADER_BORDER_BOTTOM,
  UI_TEXT_ON_ACCENT,
  UI_TEXT_PRIMARY_ON_DARK,
  UI_TEXT_SECONDARY_MUTED,
  uiAccentRgba,
} from '../Constants/uiTheme.ts';
import { AppHeader } from './AppHeader.tsx';
import { HeaderHeightContext } from '../contexts/HeaderHeightContext.ts';

const { Header, Content } = Layout;
const { Title } = Typography;
const { useBreakpoint } = Grid;

interface PageProps {
  children: ReactNode;
  title?: boolean;
  showHeader?: boolean;
  contentStyle?: React.CSSProperties;
  removeScrollbars?: boolean;
  className?: string;
}

export const Page: React.FC<PageProps> = ({
  children,
  title,
  showHeader = false,
  contentStyle = {},
  removeScrollbars = false,
  className = '',
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.lg;

  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) { return; }
    const update = () => setHeaderHeight(el.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [showHeader]);

  const defaultContentStyle: React.CSSProperties = {
    backgroundColor: UI_BG_BLACK,
    minHeight: showHeader ? 'calc(100vh - 70px)' : '100vh',
    padding: isMobile ? '12px' : '24px',
    ...contentStyle,
  };

  const tuiGlobalCss = `
        /*
          Prevent horizontal jump when Ant Design modals lock body scroll (scrollbar disappears).
          Keeps space for the vertical scrollbar so flex rows / right-aligned content stay put.
        */
        html {
          scrollbar-gutter: stable;
        }

        ${removeScrollbars ? `
        html, body {
          overflow: hidden !important;
        }
        ` : ''}

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

        .ant-btn {
          transition: all 0.3s ease !important;
          position: relative !important;
        }

        .ant-btn-primary {
          background-color: ${UI_ACCENT_GREEN} !important;
          border-color: ${UI_ACCENT_GREEN} !important;
          box-shadow: 0 0 8px ${uiAccentRgba(0.3)} !important;
        }

        .ant-btn-primary:hover {
          background-color: ${UI_ACCENT_GREEN} !important;
          border-color: ${UI_ACCENT_GREEN} !important;
          box-shadow: 0 0 15px ${uiAccentRgba(0.6)} !important;
          transform: translateY(-1px) !important;
        }

        .ant-btn-primary:active {
          transform: translateY(0) !important;
          box-shadow: 0 0 8px ${uiAccentRgba(0.4)} !important;
        }

        .ant-btn-default {
          background-color: transparent !important;
          border-color: ${UI_BORDER_SOFT} !important;
          color: ${UI_TEXT_PRIMARY_ON_DARK} !important;
        }

        .ant-btn-default:hover {
          background-color: ${uiAccentRgba(0.1)} !important;
          border-color: ${UI_ACCENT_GREEN} !important;
          color: ${UI_ACCENT_GREEN} !important;
          box-shadow: 0 0 12px ${uiAccentRgba(0.3)} !important;
          transform: translateY(-1px) !important;
        }

        .ant-btn-default:active {
          transform: translateY(0) !important;
        }

        .ant-slider-track {
          background-color: ${UI_ACCENT_GREEN} !important;
        }

        .ant-slider-handle {
          border-color: ${UI_ACCENT_GREEN} !important;
        }

        .ant-slider-handle:focus {
          border-color: ${UI_ACCENT_GREEN} !important;
          box-shadow: 0 0 0 5px ${uiAccentRgba(0.2)} !important;
        }

        .ant-input-number {
          background-color: ${UI_INPUT_SURFACE} !important;
          border-color: ${UI_BORDER_SOFT} !important;
          color: ${UI_TEXT_PRIMARY_ON_DARK} !important;
          transition: all 0.3s ease !important;
        }

        .ant-input-number:hover {
          border-color: ${UI_ACCENT_GREEN} !important;
          box-shadow: 0 0 15px ${uiAccentRgba(0.3)} !important;
        }

        .ant-input-number:focus-within {
          border-color: ${UI_ACCENT_GREEN} !important;
          box-shadow: 0 0 20px ${uiAccentRgba(0.5)} !important;
        }

        .ant-input-number-input {
          background-color: transparent !important;
          color: ${UI_TEXT_PRIMARY_ON_DARK} !important;
        }

        .ant-input-number-handler-wrap {
          background-color: ${UI_BORDER_MUTED} !important;
          transition: all 0.3s ease !important;
        }

        .ant-input-number-handler {
          border-color: ${UI_BORDER_SOFT} !important;
          color: ${UI_TEXT_PRIMARY_ON_DARK} !important;
          transition: all 0.2s ease !important;
        }

        .ant-input-number-handler:hover {
          color: ${UI_ACCENT_GREEN} !important;
          background-color: ${uiAccentRgba(0.1)} !import;
          box-shadow: inset 0 0 10px ${uiAccentRgba(0.2)} !important;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: ${UI_BORDER_MUTED};
          cursor: pointer;
          border-radius: 0;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 16px;
          width: 16px;
          background: ${UI_ACCENT_GREEN};
          cursor: pointer;
          border: none;
          border-radius: 0;
        }

        input[type="range"]::-moz-range-thumb {
          height: 16px;
          width: 16px;
          background: ${UI_ACCENT_GREEN};
          cursor: pointer;
          border: none;
          border-radius: 0;
        }

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

        .tui-title {
          color: ${UI_ACCENT_GREEN};
          font-family: 'monospace';
          text-shadow: ${UI_ACCENT_TEXT_SHADOW};
          font-weight: bold;
        }

        .tui-text {
          color: ${UI_TEXT_PRIMARY_ON_DARK};
          font-family: 'monospace';
        }

        .tui-text-muted {
          color: ${UI_TEXT_SECONDARY_MUTED};
          font-family: 'monospace';
        }

        .tui-text-danger {
          color: ${UI_ERROR};
          font-family: 'monospace';
        }

        .tui-text-success {
          color: ${UI_ACCENT_GREEN};
          font-family: 'monospace';
        }

        .tui-container {
          background-color: ${UI_INPUT_SURFACE};
          border: 1px solid ${UI_BORDER_SOFT};
          padding: 16px;
        }

        .tui-container-dark {
          background-color: ${UI_PANEL_BG};
          border: 2px solid ${UI_BORDER_MUTED};
          padding: 20px;
        }

        .tui-toggle {
          display: inline-flex;
          border: 1px solid ${UI_BORDER_SOFT};
          background-color: ${UI_INPUT_SURFACE};
          font-family: 'monospace';
          font-size: 12px;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .tui-toggle:hover {
          border-color: ${UI_ACCENT_GREEN};
          box-shadow: 0 0 15px ${uiAccentRgba(0.3)};
        }

        .tui-toggle-button {
          padding: 4px 12px;
          border: none;
          background-color: transparent;
          color: ${UI_TEXT_SECONDARY_MUTED};
          font-family: 'monospace';
          font-size: 12px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          z-index: 2;
        }

        .tui-toggle-button:hover {
          color: ${UI_ACCENT_GREEN};
          text-shadow: 0 0 8px ${uiAccentRgba(0.6)};
        }

        .tui-toggle-button.active {
          background-color: ${UI_ACCENT_GREEN};
          color: ${UI_TEXT_ON_ACCENT};
          box-shadow: 0 0 15px ${uiAccentRgba(0.6)};
          animation: buttonPulse 2s infinite;
        }

        .tui-toggle-divider {
          width: 1px;
          background-color: ${UI_BORDER_SOFT};
        }

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
            box-shadow: 0 0 15px ${uiAccentRgba(0.6)};
          }
          50% {
            box-shadow: 0 0 25px ${uiAccentRgba(0.9)}, 0 0 35px ${uiAccentRgba(0.5)};
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
    `;

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: UI_BG_BLACK }} className={className}>
      {showHeader && (
        <Header
          ref={headerRef}
          style={{
            backgroundColor: UI_PANEL_BG,
            borderBottom: UI_PAGE_HEADER_BORDER_BOTTOM,
            padding: isMobile ? '8px 12px' : '0 24px',
            height: 'auto',
            lineHeight: 'normal',
            paddingTop: 8,
            paddingBottom: 8,
            position: 'sticky',
            top: 0,
            zIndex: 2,
          }}
        >
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isMobile ? 'flex-start' : 'center',
            gap: isMobile ? 8 : 0,
          }}>
            {title && (
              <Title
                level={2}
                style={{
                  margin: 0,
                  color: UI_ACCENT_GREEN,
                  fontFamily: 'monospace',
                  textShadow: UI_ACCENT_TEXT_SHADOW,
                  fontSize: isMobile ? '16px' : '18px',
                  whiteSpace: 'nowrap',
                }}
              >
                ▲ LUCY CONTROL PANEL
              </Title>
            )}
            <div style={{ width: '100%' }}><AppHeader /></div>
          </div>
        </Header>
      )}

      <Content style={defaultContentStyle}>
        <HeaderHeightContext.Provider value={headerHeight}>
          {children}
        </HeaderHeightContext.Provider>
      </Content>

      <style>{tuiGlobalCss}</style>
    </Layout>
  );
};
