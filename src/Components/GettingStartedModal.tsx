import React, { useEffect, useMemo, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import {
    UI_ACCENT_GREEN,
    UI_BORDER_MUTED,
    UI_BORDER_SOFT,
    UI_CHROME_SURFACE,
    UI_COLOR_TRANSPARENT,
    UI_PANEL_BG,
    UI_TEXT_ON_ACCENT,
    UI_TEXT_PRIMARY_ON_DARK,
    UI_TEXT_SUBTLE,
} from '../Constants/uiTheme.ts';
import { useRosConnection } from '../hooks/useRosConnection.hook';
import { MovableModal } from './MovableModal.tsx';
import gettingStartedMarkdown from '../../docs/getting_started.md?raw';

const { Paragraph, Text, Title } = Typography;

export const GETTING_STARTED_COMPLETED_KEY = 'gettingStartedCompleted';
export const REDO_GETTING_STARTED_EVENT = 'redoGettingStarted';

export interface GettingStartedSection {
    name: string;
    content: string;
}

export function parseGettingStartedSections(markdown: string): GettingStartedSection[] {
    const sections: GettingStartedSection[] = [];
    let currentSection: GettingStartedSection | null = null;

    for (const line of markdown.split(/\r?\n/)) {
        const marker = line.match(/^<--\s*(.*?)\s*-->$/);
        if (marker) {
            if (currentSection) sections.push({ ...currentSection, content: currentSection.content.trim() });
            currentSection = { name: marker[1].trim(), content: '' };
        } else if (currentSection) {
            currentSection.content += `${line}\n`;
        }
    }

    if (currentSection) sections.push({ ...currentSection, content: currentSection.content.trim() });
    return sections.filter(section => section.name.length > 0);
}

function renderInline(text: string): React.ReactNode[] {
    return text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean).map((part, index) => {
        if (part.startsWith('`') && part.endsWith('`')) {
            return <Text code key={index}>{part.slice(1, -1)}</Text>;
        }
        if (part.startsWith('**') && part.endsWith('**')) {
            return <Text strong key={index}>{part.slice(2, -2)}</Text>;
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
    });
}

function MarkdownContent({ content }: { content: string }) {
    const lines = content.split(/\r?\n/);
    const blocks: React.ReactNode[] = [];
    let paragraphLines: string[] = [];
    let listItems: string[] = [];

    const flushParagraph = () => {
        if (paragraphLines.length > 0) {
            blocks.push(<Paragraph key={`paragraph-${blocks.length}`}>{renderInline(paragraphLines.join(' '))}</Paragraph>);
            paragraphLines = [];
        }
    };
    const flushList = () => {
        if (listItems.length > 0) {
            blocks.push(
                <ul key={`list-${blocks.length}`} style={{ paddingLeft: 24, marginTop: 0 }}>
                    {listItems.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
                </ul>,
            );
            listItems = [];
        }
    };

    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
            flushParagraph();
            flushList();
        } else if (trimmed.startsWith('- ')) {
            flushParagraph();
            listItems.push(trimmed.slice(2));
        } else if (trimmed.startsWith('> ')) {
            flushParagraph();
            flushList();
            blocks.push(
                <blockquote
                    key={`quote-${index}`}
                    style={{
                        borderLeft: `3px solid ${UI_ACCENT_GREEN}`,
                        color: UI_TEXT_SUBTLE,
                        margin: '0 0 16px',
                        paddingLeft: 16,
                    }}
                >
                    {renderInline(trimmed.slice(2))}
                </blockquote>,
            );
        } else if (trimmed.startsWith('### ')) {
            flushParagraph();
            flushList();
            blocks.push(<Title level={4} key={`heading-${index}`}>{renderInline(trimmed.slice(4))}</Title>);
        } else if (trimmed.startsWith('## ')) {
            flushParagraph();
            flushList();
            blocks.push(<Title level={3} key={`heading-${index}`}>{renderInline(trimmed.slice(3))}</Title>);
        } else {
            flushList();
            paragraphLines.push(trimmed);
        }
    });

    flushParagraph();
    flushList();
    return <>{blocks}</>;
}

export const isGettingStartedCompleted = () =>
    localStorage.getItem(GETTING_STARTED_COMPLETED_KEY) === 'true';

export const GettingStartedModal: React.FC = () => {
    const sections = useMemo(() => parseGettingStartedSections(gettingStartedMarkdown), []);
    const { isConnected } = useRosConnection();
    const [visible, setVisible] = useState(false);
    const [sectionIndex, setSectionIndex] = useState(0);

    useEffect(() => {
        if (isConnected && !isGettingStartedCompleted()) setVisible(true);
    }, [isConnected]);

    useEffect(() => {
        const redo = () => {
            localStorage.removeItem(GETTING_STARTED_COMPLETED_KEY);
            setSectionIndex(0);
            if (isConnected) setVisible(true);
        };
        window.addEventListener(REDO_GETTING_STARTED_EVENT, redo);
        return () => window.removeEventListener(REDO_GETTING_STARTED_EVENT, redo);
    }, [isConnected]);

    const complete = () => {
        localStorage.setItem(GETTING_STARTED_COMPLETED_KEY, 'true');
        setVisible(false);
    };
    const section = sections[sectionIndex];
    if (!section) return null;

    return (
        <MovableModal
            modalName="GETTING STARTED"
            isVisible={visible}
            onClose={complete}
            initialPosition={{ x: 120, y: 80 }}
            initialSize={{ w: 720, h: 520 }}
            contentPadding={0}
            header={
                <Text style={{ color: UI_TEXT_SUBTLE, fontFamily: 'monospace', fontSize: 11 }}>
                    SECTION {sectionIndex + 1}/{sections.length}
                </Text>
            }
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    backgroundColor: UI_PANEL_BG,
                }}
            >
                <article
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        overscrollBehavior: 'contain',
                        padding: '24px 28px 12px',
                        color: UI_TEXT_PRIMARY_ON_DARK,
                        fontFamily: 'monospace',
                        lineHeight: 1.5,
                    }}
                    onWheel={(event) => event.stopPropagation()}
                >
                    <Title
                        level={1}
                        style={{
                            color: UI_ACCENT_GREEN,
                            fontFamily: 'monospace',
                            fontSize: 24,
                            margin: '0 0 24px',
                            textShadow: '0 0 10px rgba(0, 255, 65, 0.6)',
                        }}
                    >
                        {section.name}
                    </Title>
                    <MarkdownContent content={section.content} />
                </article>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 16,
                        padding: '12px 16px',
                        borderTop: `1px solid ${UI_BORDER_MUTED}`,
                        backgroundColor: UI_CHROME_SURFACE,
                    }}
                >
                    <Button
                        onClick={complete}
                        style={{
                            backgroundColor: UI_COLOR_TRANSPARENT,
                            borderColor: UI_BORDER_SOFT,
                            color: UI_TEXT_PRIMARY_ON_DARK,
                        }}
                    >
                        SKIP
                    </Button>
                    <Space>
                        <Button
                            disabled={sectionIndex === 0}
                            onClick={() => setSectionIndex(index => index - 1)}
                        >
                            BACK
                        </Button>
                        {sectionIndex === sections.length - 1 ? (
                            <Button
                                type="primary"
                                onClick={complete}
                                style={{ backgroundColor: UI_ACCENT_GREEN, borderColor: UI_ACCENT_GREEN, color: UI_TEXT_ON_ACCENT }}
                            >
                                FINISH
                            </Button>
                        ) : (
                            <Button
                                type="primary"
                                onClick={() => setSectionIndex(index => index + 1)}
                                style={{ backgroundColor: UI_ACCENT_GREEN, borderColor: UI_ACCENT_GREEN, color: UI_TEXT_ON_ACCENT }}
                            >
                                NEXT
                            </Button>
                        )}
                    </Space>
                </div>
            </div>
        </MovableModal>
    );
};
