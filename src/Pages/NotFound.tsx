import React, { useState, useEffect } from 'react';
import { Typography, Button, Space } from 'antd';
import { HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Page } from '../Components/Page';

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
              color: '#ff4d4f',
              fontFamily: 'monospace',
              fontSize: '24px',
              fontWeight: 'bold',
              textShadow: '0 0 15px #ff4d4f',
              display: 'block',
              marginBottom: '10px'
            }}
          >
            ► SYSTEM ALERT ◄
          </Text>

          <Text
            style={{
              color: '#00ff41',
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
            backgroundColor: '#0a0a0a',
            border: '2px solid #333',
            padding: '20px',
            marginBottom: '20px',
            maxWidth: '600px',
            width: '100%'
          }}
        >
          <pre
            style={{
              color: '#00ff41',
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
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
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
              color: '#ff6b6b',
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
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            padding: '12px',
            textAlign: 'center'
          }}>
            <Text style={{ color: '#666', fontSize: '10px', display: 'block' }}>STATUS</Text>
            <Text style={{ color: '#ff4d4f', fontFamily: 'monospace', fontSize: '14px' }}>LOST</Text>
          </div>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            padding: '12px',
            textAlign: 'center'
          }}>
            <Text style={{ color: '#666', fontSize: '10px', display: 'block' }}>CODE</Text>
            <Text style={{ color: '#ff4d4f', fontFamily: 'monospace', fontSize: '14px' }}>404</Text>
          </div>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #444',
            padding: '12px',
            textAlign: 'center'
          }}>
            <Text style={{ color: '#666', fontSize: '10px', display: 'block' }}>HOPE</Text>
            <Text style={{ color: '#00ff41', fontFamily: 'monospace', fontSize: '14px' }}>HIGH</Text>
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
              backgroundColor: '#00ff41',
              borderColor: '#00ff41',
              color: '#000',
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
              backgroundColor: 'transparent',
              borderColor: '#444',
              color: '#fff',
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
              color: '#666',
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
            <span style={{ color: '#00ff41' }}>
              ► Press RETURN HOME to get back on track ◄
            </span>
          </Text>
        </div>

      </Page>
  );
};
