
import bacnet from 'node-bacnet';
import PQueue from 'p-queue';

export class BacnetClient {
    private client: bacnet;

    // Rate limiter queue: 20 requests concurrent, max 20 per 50ms interval to prevent congestion
    private queue = new PQueue({
        concurrency: 20,
        interval: 50,
        intervalCap: 10
    });

    private apduSizeEnum: number = 5; // Default to 1476 (OCTETS_1476 = 5)

    constructor(options: { port?: number; interface?: string; apduTimeout?: number; apduSize?: number } = {}) {
        this.client = new bacnet({
            port: options.port || 47808,
            interface: options.interface || '0.0.0.0',
            apduTimeout: options.apduTimeout || 6000
        });

        // Map apduSize (bytes) to Enum Value (0-5)
        // 50=0, 128=1, 206=2, 480=3, 1024=4, 1476=5
        const size = options.apduSize || 1476;
        if (size <= 50) this.apduSizeEnum = 0;
        else if (size <= 128) this.apduSizeEnum = 1;
        else if (size <= 206) this.apduSizeEnum = 2;
        else if (size <= 480) this.apduSizeEnum = 3;
        else if (size <= 1024) this.apduSizeEnum = 4;
        else this.apduSizeEnum = 5;

        // Setup Event Listeners
        this.client.on('iAm', (device) => this.handleIAm(device));
        this.client.on('covNotification', (data) => this.handleCOV(data));
        this.client.on('error', (err) => {
            console.error('BACnet Client Error:', err);
        });
    }

    public getClient(): bacnet {
        return this.client;
    }

    /**
     * Trigger discovery (WhoIs)
     */
    public whoIs(options?: { lowLimit?: number; highLimit?: number; address?: string }): void {
        this.client.whoIs(options?.lowLimit, options?.highLimit, options?.address);
    }

    /**
     * Read Property with Queue
     */
    public readProperty(
        ip: string,
        type: number,
        instance: number,
        propertyId: number = 85
    ): Promise<any> {
        return this.queue.add(() => {
            return new Promise((resolve, reject) => {
                const options = {
                    maxApdu: this.apduSizeEnum,
                    // safe default: no segmentation
                    maxSegments: 0 // SEGMENTS_0
                };
                this.client.readProperty(ip, { type, instance }, propertyId, options, (err: Error | null, value: any) => {
                    if (err) reject(err);
                    else resolve(value);
                });
            });
        });
    }

    /**
     * Write Property with Queue
     */
    public writeProperty(
        ip: string,
        type: number,
        instance: number,
        propertyId: number,
        value: any,
        priority?: number // Optional, defaults to undefined (No Priority) usually, but we handle it
    ): Promise<any> {
        return this.queue.add(() => {
            return new Promise((resolve, reject) => {
                // Prepare payload based on value type
                // Note: node-bacnet expects an array of values for writeProperty
                // Use passed value if it is already an array (pre-formatted), otherwise wrap it as Real (4) default
                const payload = Array.isArray(value) ? value : [{ type: 4, value: value }];

                const options: any = {
                    maxApdu: this.apduSizeEnum,
                    maxSegments: 0 // SEGMENTS_0
                };

                // Only add priority if it is defined and valid (1-16)
                // 0 or undefined = No Priority
                if (priority && priority >= 1 && priority <= 16) {
                    options.priority = priority;
                }

                this.client.writeProperty(ip, { type, instance }, propertyId, payload, options, (err: Error | null, value: any) => {
                    if (err) reject(err);
                    else resolve(value);
                });
            });
        });
    }

    /**
     * Subscribe COV with Queue
     */
    public subscribeCOV(
        ip: string,
        type: number,
        instance: number,
        propertyId: number = 85,
        lifetime: number = 0
    ): Promise<any> {
        return this.queue.add(() => {
            return new Promise((resolve, reject) => {
                this.client.subscribeCov(ip, { type, instance }, propertyId, false, false, lifetime, (err: Error | null) => {
                    if (err) reject(err);
                    else resolve(true);
                });
            });
        });
    }

    // --- Handlers ---

    private handleIAm(device: any) {
        // We can emit this event or handle it here
        // For now logging it, but in real generic service we might use an EventEmitter
        // console.log('Device Found (iAm):', device);
    }

    private handleCOV(data: any) {
        console.log('COV Notification Received:', data);
    }

    public close() {
        this.client.close();
    }
}

// Singleton-like export, but can be instantiated differently if needed
export const defaultBacnetClient = new BacnetClient();
