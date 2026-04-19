import mqtt from 'mqtt';
import automationEngine from './automationEngine';

/**
 * IoT Connector Utility
 * Handles MQTT connections and simulates Industrial Protocols (OPC-UA, Modbus).
 */
class IOTConnector {
    constructor() {
        this.client = null;
        this.subscriptions = new Map();
        this.status = 'disconnected';
        this.statusListeners = new Set();
        this.messageListeners = new Set();
        
        // Simulation Data
        this.simulatedValues = new Map();
        this.simInterval = null;
        this.startSimulation();
    }

    startSimulation() {
        if (this.simInterval) clearInterval(this.simInterval);
        this.simInterval = setInterval(() => {
            // Simulate changing values for common industrial tags
            const now = Date.now();
            
            // OPC-UA Simulation (NodeIDs)
            this.setSimValue('ns=2;s=SpindleSpeed', 1200 + Math.sin(now / 5000) * 100);
            this.setSimValue('ns=2;s=Temperature', 45 + Math.random() * 5);
            this.setSimValue('ns=2;s=Status', Math.random() > 0.9 ? 'IDLE' : 'RUNNING');
            
            // Modbus Simulation (Registers)
            this.setSimValue('40001', 50 + Math.sin(now / 2000) * 10); // Holding Register
            this.setSimValue('10001', Math.random() > 0.5); // Discrete Input
            
            // Trigger value change listeners if any (placeholder for more advanced reactive logic)
        }, 2000);
    }

    setSimValue(tag, value) {
        this.simulatedValues.set(tag, value);
        // We could also emit a message to simulate a "live" event
        this.messageListeners.forEach(fn => fn({ 
            topic: tag, 
            payload: String(value), 
            parsedPayload: value, 
            protocol: tag.includes('=') ? 'OPC_UA' : 'MODBUS',
            ts: new Date().toISOString() 
        }));
        
        // Also trigger automation engine for these simulated tags
        automationEngine.trigger('MACHINE_TRIGGER', { topic: tag, payload: value });
    }

    getLiveValue(tag, connectorType) {
        // In this browser-only version, we always fallback to simulation
        if (this.simulatedValues.has(tag)) {
            return this.simulatedValues.get(tag);
        }
        
        // MQTT fallback (return last known if subscribed)
        // ... (existing MQTT logic could be expanded here)
        
        return "N/A";
    }

    connect(brokerUrl = 'wss://broker.emqx.io:8084/mqtt') {
        if (this.client) return;

        if (brokerUrl.startsWith('ws://')) {
            const oldUrl = brokerUrl;
            if (brokerUrl.includes('broker.emqx.io')) {
                brokerUrl = brokerUrl.replace('ws://', 'wss://').replace(':8083', ':8084');
            } else {
                brokerUrl = brokerUrl.replace('ws://', 'wss://');
            }
            console.warn(`[IoT] Mixed Content protection: Upgraded ${oldUrl} to ${brokerUrl}`);
        }

        console.log(`Connecting to MQTT broker: ${brokerUrl}`);
        this.client = mqtt.connect(brokerUrl);

        this.client.on('connect', () => {
            this.status = 'connected';
            console.log('Successfully connected to MQTT broker');
            this.statusListeners.forEach(fn => fn({ status: 'connected', brokerUrl }));
            this.subscriptions.forEach((callback, topic) => {
                this.client.subscribe(topic);
            });
        });

        this.client.on('message', (topic, message) => {
            const payload = message.toString();
            console.log(`MQTT Received [${topic}]: ${payload}`);

            if (this.subscriptions.has(topic)) {
                this.subscriptions.get(topic)(payload);
            }

            let parsedPayload = payload;
            try {
                parsedPayload = JSON.parse(payload);
            } catch (e) {}

            this.messageListeners.forEach(fn => fn({ topic, payload, parsedPayload, protocol: 'MQTT', ts: new Date().toISOString() }));
            automationEngine.trigger('MACHINE_TRIGGER', { topic, payload: parsedPayload });
        });

        this.client.on('error', (err) => {
            this.status = 'error';
            console.error('MQTT Connection Error:', err);
            this.statusListeners.forEach(fn => fn({ status: 'error', error: err }));
        });

        this.client.on('close', () => {
            this.status = 'disconnected';
            console.log('MQTT Connection Closed');
            this.statusListeners.forEach(fn => fn({ status: 'disconnected' }));
        });
    }

    subscribe(topic, callback) {
        this.subscriptions.set(topic, callback);
        if (this.client && this.client.connected) {
            this.client.subscribe(topic);
        }
    }

    unsubscribe(topic) {
        this.subscriptions.delete(topic);
        if (this.client && this.client.connected) {
            this.client.unsubscribe(topic);
        }
    }

    publish(topic, message) {
        if (this.client && this.client.connected) {
            this.client.publish(topic, message);
        }
    }

    subscribeStatus(cb) {
        this.statusListeners.add(cb);
        cb({ status: this.status });
        return () => this.statusListeners.delete(cb);
    }

    subscribeMessage(cb) {
        this.messageListeners.add(cb);
        return () => this.messageListeners.delete(cb);
    }
}

const iotConnector = new IOTConnector();
export default iotConnector;
