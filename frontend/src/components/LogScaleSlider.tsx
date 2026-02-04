import React from 'react';
import { Slider } from 'antd';

interface LogScaleSliderProps {
    value?: number;
    onChange?: (value: number) => void;
}

export const LogScaleSlider: React.FC<LogScaleSliderProps> = ({ value, onChange }) => {
    // Convert linear scale value (0.01, 1, 100) to log value (-2, 0, 2)
    const toLog = (v?: number) => {
        if (!v || v <= 0) return 0; // Default to 1 (log10(1) = 0)
        return Math.log10(v);
    };

    // Convert log value back to linear scale
    const fromLog = (v: number) => {
        const val = Math.pow(10, v);
        // Round to meaningful precision to avoid 0.10000000001
        return Number(Number(val).toPrecision(4));
    };

    const marks = {
        [-2]: '0.01',
        [-1]: '0.1',
        0: '1',
        1: '10',
        2: '100'
    };

    return (
        <Slider
            min={-2}
            max={2}
            step={0.01} // Fine adjustments on log scale
            marks={marks}
            value={toLog(value)}
            onChange={(v) => onChange?.(fromLog(v))}
            tooltip={{ formatter: (v) => fromLog(v || 0) }}
        />
    );
};
