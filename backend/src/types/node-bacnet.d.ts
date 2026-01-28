
declare module 'node-bacnet' {
    import { EventEmitter } from 'events';

    export interface ClientOptions {
        port?: number;
        interface?: string;
        broadcastAddress?: string;
        apduTimeout?: number;
    }

    export interface ReadResult {
        values: Array<{
            objectId: { type: number; instance: number };
            values: Array<{
                property: { id: number; index: number };
                value: any[];
            }>;
        }>;
    }

    export default class Client extends EventEmitter {
        constructor(options?: ClientOptions);

        whoIs(lowLimit?: number, highLimit?: number, address?: string): void;

        readProperty(
            address: string,
            objectId: { type: number; instance: number },
            propertyId: number,
            options?: any,
            next?: (err: Error | null, value: { property: { id: number; index: number }; values: any[] }) => void
        ): void;
        // Overload for when options is omitted
        readProperty(
            address: string,
            objectId: { type: number; instance: number },
            propertyId: number,
            next?: (err: Error | null, value: { property: { id: number; index: number }; values: any[] }) => void
        ): void;

        writeProperty(
            address: string,
            objectId: { type: number; instance: number },
            propertyId: number,
            values: Array<{ type: number; value: any }>,
            options?: any,
            next?: (err: Error | null, value: any) => void
        ): void;

        subscribeCov(
            address: string,
            objectId: { type: number; instance: number },
            propertyId: number,
            cancel: boolean,
            issueConfirmedNotifications: boolean,
            lifetime: number,
            next?: (err: Error | null) => void
        ): void;

        close(): void;
    }

    export const enumIds: {
        objectTypes: Record<string, number>;
        propertyIds: Record<string, number>;
    };
}
