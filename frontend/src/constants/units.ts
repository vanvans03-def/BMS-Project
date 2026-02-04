export interface UnitDefinition {
    value: string;
    label: string;
}

export interface UnitCategory {
    category: string;
    units: UnitDefinition[];
}

export const UNIT_CATEGORIES: UnitCategory[] = [
    {
        category: 'Temperature',
        units: [
            { value: '°C', label: 'Degrees Celsius (°C)' },
            { value: '°F', label: 'Degrees Fahrenheit (°F)' },
            { value: 'K', label: 'Kelvin (K)' },
        ]
    },
    {
        category: 'Electricity (Voltage/Current)',
        units: [
            { value: 'V', label: 'Volts (V)' },
            { value: 'mV', label: 'Millivolts (mV)' },
            { value: 'kV', label: 'Kilovolts (kV)' },
            { value: 'A', label: 'Amperes (A)' },
            { value: 'mA', label: 'Milliamperes (mA)' },
            { value: 'kA', label: 'Kiloamperes (kA)' },
        ]
    },
    {
        category: 'Electricity (Power/Energy)',
        units: [
            { value: 'W', label: 'Watts (W)' },
            { value: 'kW', label: 'Kilowatts (kW)' },
            { value: 'MW', label: 'Megawatts (MW)' },
            { value: 'Wh', label: 'Watt-hours (Wh)' },
            { value: 'kWh', label: 'Kilowatt-hours (kWh)' },
            { value: 'MWh', label: 'Megawatt-hours (MWh)' },
            { value: 'Hz', label: 'Hertz (Hz)' },
            { value: 'PF', label: 'Power Factor' },
        ]
    },
    {
        category: 'Pressure',
        units: [
            { value: 'Pa', label: 'Pascals (Pa)' },
            { value: 'kPa', label: 'Kilopascals (kPa)' },
            { value: 'bar', label: 'Bar' },
            { value: 'psi', label: 'PSI' },
            { value: 'atm', label: 'Atmosphere' },
        ]
    },
    {
        category: 'Flow',
        units: [
            { value: 'm³/h', label: 'Cubic meters per hour' },
            { value: 'l/s', label: 'Liters per second' },
            { value: 'l/min', label: 'Liters per minute' },
            { value: 'GPM', label: 'Gallons per minute' },
        ]
    },
    {
        category: 'Air Quality',
        units: [
            { value: '%RH', label: 'Relative Humidity (%RH)' },
            { value: 'ppm', label: 'Parts per million (ppm)' },
            { value: 'ppb', label: 'Parts per billion (ppb)' },
            { value: 'µg/m³', label: 'Micrograms per cubic meter' },
        ]
    },
    {
        category: 'Time',
        units: [
            { value: 's', label: 'Seconds (s)' },
            { value: 'min', label: 'Minutes (min)' },
            { value: 'h', label: 'Hours (h)' },
            { value: 'ms', label: 'Milliseconds (ms)' },
        ]
    },
    {
        category: 'Others',
        units: [
            { value: '%', label: 'Percent (%)' },
            { value: 'RPM', label: 'Revolutions per minute' },
            { value: 'lx', label: 'Lux (lx)' },
            { value: 'dB', label: 'Decibels (dB)' },
        ]
    }
];

// Helper to flatten units for search/validation if needed
export const ALL_UNITS = UNIT_CATEGORIES.flatMap(c => c.units);
