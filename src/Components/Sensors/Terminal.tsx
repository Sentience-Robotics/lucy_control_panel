import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'antd';
import { UI_ACCENT_GREEN, UI_BG_BLACK, UI_BORDER_SOFT } from '../../Constants/uiTheme';

// Simple Lorem Ipsum generator to avoid adding a new dependency
const simpleLoremIpsum = () => {
    const words = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua"];
    const sentenceLength = Math.floor(Math.random() * 10) + 5;
    let sentence = '';
    for (let i = 0; i < sentenceLength; i++) {
        sentence += words[Math.floor(Math.random() * words.length)] + ' ';
    }
    return sentence.charAt(0).toUpperCase() + sentence.slice(1).trim() + '.';
};

interface TerminalProps {
  dataSourceId: string;
  sourceName: string;
}

export const Terminal: React.FC<TerminalProps> = ({ dataSourceId, sourceName }) => {
  const [sourceData, setSourceData] = useState<string[]>([]);
  const [displayData, setDisplayData] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Data source always runs in the background
  useEffect(() => {
    const interval = setInterval(() => {
      setSourceData(prevData => [...prevData, simpleLoremIpsum()].slice(-100));
    }, Math.random() * 1000 + 500);

    return () => clearInterval(interval);
  }, [dataSourceId]);

  // Sync display with source only when not paused
  useEffect(() => {
    if (!isPaused) {
      setDisplayData(sourceData);
    }
  }, [sourceData, isPaused]);

  // Auto-scroll effect on display data change
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [displayData]);

  return (
    <div className="tui-container">
      <div style={{ marginBottom: '8px', borderBottom: `1px solid ${UI_BORDER_SOFT}`, paddingBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="tui-text-success" style={{ fontWeight: 'bold' }}>{sourceName}</span>
          <div>
            <span className="tui-text-muted" style={{ marginRight: '10px' }}>{isPaused ? '[PAUSED]' : '[ACTIVE]'}</span>
            <Button size="small" onClick={() => setIsPaused(!isPaused)}>{isPaused ? 'Resume' : 'Pause'}</Button>
          </div>
      </div>
      <div
        ref={terminalRef}
        style={{
        height: '300px',
        overflowY: 'auto',
        padding: '10px 0',
        fontFamily: 'monospace',
        backgroundColor: UI_BG_BLACK,
        color: UI_ACCENT_GREEN,
      }}>
        {displayData.map((line, index) => (
          <div key={index} className="tui-text" style={{ color: UI_ACCENT_GREEN, fontSize: '12px' }}>{`> ${line}`}</div>
        ))}
      </div>
    </div>
  );
};
