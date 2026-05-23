import { Tag } from 'antd';
import type { CSSProperties } from 'react';
import {
    UI_TAG_ACTIVE_PRESET,
    UI_TAG_FLASHED_PRESET,
    UI_TAG_LOADED_PRESET,
    UI_TAG_TARGET_PRESET,
} from '../Constants/uiTheme.ts';

function headerInner(label: string, value: string) {
    const show = value.trim() || '—';
    return (
        <>
            <span style={{ fontWeight: 600 }}>{label}:</span> {show}
        </>
    );
}

/** Header / toolbar: rounded `Tag` — ACTIVE cyan, TARGET orange, FLASHED purple, LOADED blue. */
export function HardwareConfigPresetHeaderTag(props: {
    variant: 'active' | 'target' | 'flashed' | 'loaded';
    /** Without trailing colon, e.g. ACTIVE or TARGET */
    label: string;
    value: string;
    title?: string;
}) {
    const { variant, label, value, title } = props;
    const inner = headerInner(label, value);
    const color =
        variant === 'active'
            ? UI_TAG_ACTIVE_PRESET
            : variant === 'flashed'
              ? UI_TAG_FLASHED_PRESET
              : variant === 'loaded'
                ? UI_TAG_LOADED_PRESET
                : UI_TAG_TARGET_PRESET;
    return (
        <Tag color={color} title={title}>
            {inner}
        </Tag>
    );
}

/** Compact row pill: ACTIVE / TARGET / FLASHED (load modal list). */
export function HardwareConfigPresetRoleTag(props: {
    variant: 'active' | 'target' | 'flashed';
    style?: CSSProperties;
}) {
    const text =
        props.variant === 'active' ? 'ACTIVE' : props.variant === 'target' ? 'TARGET' : 'FLASHED';
    const color =
        props.variant === 'active'
            ? UI_TAG_ACTIVE_PRESET
            : props.variant === 'flashed'
              ? UI_TAG_FLASHED_PRESET
              : UI_TAG_TARGET_PRESET;
    const merged: CSSProperties = { marginInlineEnd: 0, ...props.style };
    return (
        <Tag color={color} style={merged}>
            {text}
        </Tag>
    );
}
