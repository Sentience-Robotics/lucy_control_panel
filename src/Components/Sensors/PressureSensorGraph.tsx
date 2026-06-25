import React from 'react';
import type { SensorSource } from '../../Constants/rosConfig';
import { useSensorStream } from '../../hooks/useSensorStream';
import { FloatGraph } from './FloatGraph';

interface PressureSensorGraphProps {
    source: SensorSource;
}

export const PressureSensorGraph: React.FC<PressureSensorGraphProps> = ({ source }) => {
    const {
        displaySamples,
        currentValue,
        historicalMin,
        historicalMax,
        isPaused,
        setPaused,
    } = useSensorStream(source);

    return (
        <FloatGraph
            sourceName={source.name}
            topic={source.topic}
            samples={displaySamples}
            currentValue={currentValue}
            yAxisMin={historicalMin}
            yAxisMax={historicalMax}
            isPaused={isPaused}
            onPausedChange={setPaused}
        />
    );
};
