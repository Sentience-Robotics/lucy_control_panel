import React, { useState, useEffect } from 'react';
import { Typography, Button, Space } from 'antd';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Page } from '../Components/Page';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_COLOR_TRANSPARENT,
    UI_DECORATIVE_CORAL,
    UI_ERROR_RED,
    UI_INPUT_SURFACE,
    UI_PANEL_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SECONDARY_MUTED,
} from '../Constants/uiTheme.ts';

const { Text } = Typography;

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const [blinkState, setBlinkState] = useState(true);
  const [typingText, setTypingText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  const errorMessage = "ERROR: PAGE NOT FOUND IN SYSTEM DATABASE";

    const asciiRobot = `
╔══════════════════════════════════════════════════════╗
║                     404 ERROR                        ║
║                 SYSTEM MALFUNCTION                   ║
╚══════════════════════════════════════════════════════╝

██╗  ██╗ ██████╗ ██╗  ██╗    ███████╗██████╗ ██████╗
 ██║  ██║██╔═████╗██║  ██║    ██╔════╝██╔══██╗██╔══██╗
 ███████║██║██╔██║███████║    █████╗  ██████╔╝██████╔╝
 ╚════██║████╔╝██║╚════██║    ██╔══╝  ██╔══██╗██╔══██╗
      ██║╚██████╔╝     ██║    ███████╗██║  ██║██║  ██║
      ╚═╝ ╚═════╝      ╚═╝    ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝

┌─────────────────────────────────┐
│  ⚠  ROBOT LUCY IS CONFUSED  ⚠   │
│                                 │
│  "I searched through all my     │
│   circuits and databases,       │
│   but I can't find this page.   │
│   Maybe it's hiding behind      │
│   my backup memory banks?"      │
└─────────────────────────────────┘
  `;

  const glitchTexts = [
    "PAGE_NOT_FOUND.exe has stopped working",
    "Segmentation fault (core dumped)",
    "LUCY.exe is not responding",
    "Critical system error detected",
    "Memory allocation failed",
    "404: File not found in quantum database"
  ];

  const [currentGlitch, setCurrentGlitch] = useState(0);

  useEffect(() => {
    const blinkTimer = setInterval(() => {
      setBlinkState(prev => !prev);
    }, 500);

    return () => clearInterval(blinkTimer);
  }, []);

  useEffect(() => {
    if (currentIndex < errorMessage.length) {
      const typingTimer = setTimeout(() => {
        setTypingText(errorMessage.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 100);

      return () => clearTimeout(typingTimer);
    }
  }, [currentIndex, errorMessage]);

  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setCurrentGlitch(prev => (prev + 1) % glitchTexts.length);
    }, 2000);

    return () => clearInterval(glitchTimer);
  }, [glitchTexts.length]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <Page
      contentStyle={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center'
      }}
    >
        {/* Header */}
        <div style={{ marginBottom: '20px' }}>
          <Text
            style={{
              color: UI_ERROR_RED,
              fontFamily: 'monospace',
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: `0 0 15px ${UI_ERROR_RED}`,
              display: 'block',
              marginBottom: '10px'
            }}
          >
            ► SYSTEM ALERT ◄
          </Text>

          <Text
            style={{
              color: UI_ACCENT_GREEN,
              fontFamily: 'monospace',
              fontSize: '14px',
              display: 'block'
            }}
          >
            {typingText}
            <span style={{
              opacity: blinkState ? 1 : 0,
              transition: 'opacity 0.1s'
            }}>
              █
            </span>
          </Text>
        </div>

        {/* ASCII Art */}
        <div
          style={{
            backgroundColor: UI_PANEL_BG,
            border: `2px solid ${UI_BORDER_MUTED}`,
            padding: '20px',
            marginBottom: '20px',
            maxWidth: '600px',
            width: '100%'
          }}
        >
          <pre
            style={{
              color: UI_ACCENT_GREEN,
              fontFamily: 'monospace',
              fontSize: '12px',
              lineHeight: '1.2',
              margin: 0,
              textAlign: 'center',
              whiteSpace: 'pre-wrap'
            }}
          >
            {asciiRobot}
          </pre>
        </div>

        {/* Glitch Effect Error Messages */}
        <div
          style={{
            backgroundColor: UI_INPUT_SURFACE,
            border: `1px solid ${UI_BORDER_SOFT}`,
            padding: '16px',
            marginBottom: '20px',
            minHeight: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '500px',
            width: '100%'
          }}
        >
          <Text
            style={{
              color: UI_DECORATIVE_CORAL,
              fontFamily: 'monospace',
              fontSize: '13px',
              fontStyle: 'italic',
              opacity: 0.8
            }}
          >
            {glitchTexts[currentGlitch]}
          </Text>
        </div>

        {/* Status Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px',
            marginBottom: '30px',
            maxWidth: '400px',
            width: '100%'
          }}
        >
          <div style={{
            backgroundColor: UI_INPUT_SURFACE,
            border: `1px solid ${UI_BORDER_SOFT}`,
            padding: '12px',
            textAlign: 'center'
          }}>
            <Text style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: '10px', display: 'block' }}>STATUS</Text>
            <Text style={{ color: UI_ERROR_RED, fontFamily: 'monospace', fontSize: '14px' }}>LOST</Text>
          </div>
          <div style={{
            backgroundColor: UI_INPUT_SURFACE,
            border: `1px solid ${UI_BORDER_SOFT}`,
            padding: '12px',
            textAlign: 'center'
          }}>
            <Text style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: '10px', display: 'block' }}>CODE</Text>
            <Text style={{ color: UI_ERROR_RED, fontFamily: 'monospace', fontSize: '14px' }}>404</Text>
          </div>
          <div style={{
            backgroundColor: UI_INPUT_SURFACE,
            border: `1px solid ${UI_BORDER_SOFT}`,
            padding: '12px',
            textAlign: 'center'
          }}>
            <Text style={{ color: UI_TEXT_SECONDARY_MUTED, fontSize: '10px', display: 'block' }}>HOPE</Text>
            <Text style={{ color: UI_ACCENT_GREEN, fontFamily: 'monospace', fontSize: '14px' }}>HIGH</Text>
          </div>
        </div>

        {/* Action Buttons */}
        <Space size="large">
          <Button
            type="primary"
            icon={<HomeOutlined />}
            onClick={handleGoHome}
            size="large"
            style={{
              backgroundColor: UI_ACCENT_GREEN,
              borderColor: UI_ACCENT_GREEN,
              color: UI_TEXT_ON_ACCENT,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              padding: '8px 24px',
              height: 'auto'
            }}
          >
            RETURN HOME
          </Button>

          <Button
            icon={<ReloadOutlined />}
            onClick={handleReload}
            size="large"
            style={{
              backgroundColor: UI_COLOR_TRANSPARENT,
              borderColor: UI_BORDER_SOFT,
              color: UI_TEXT_PRIMARY_ON_DARK,
              fontFamily: 'monospace',
              padding: '8px 24px',
              height: 'auto'
            }}
          >
            RETRY
          </Button>
        </Space>

        {/* Footer message */}
        <div style={{ marginTop: '30px', maxWidth: '500px' }}>
          <Text
            style={{
              color: UI_TEXT_SECONDARY_MUTED,
              fontFamily: 'monospace',
              fontSize: '11px',
              lineHeight: '1.5',
              display: 'block'
            }}
          >
            Don't worry, even the most advanced robots get lost sometimes.
            <br />
            Lucy is probably just recalibrating its navigation systems.
            <br />
            <span style={{ color: UI_ACCENT_GREEN }}>
              ► Press RETURN HOME to get back on track ◄
            </span>
          </Text>
        </div>

      </Page>
  );
};
