import { create } from 'zustand';
import mqtt, { MqttClient } from 'mqtt';
import { signUrl } from '../utils/aws-sigv4';
import { AWS_CONFIG } from '../config/aws-config';
import { getNextDemoPositions } from '../utils/demo-data';

// --- CONFIGURATION ---
const USE_DEMO_MODE = false; 
// ---------------------

export interface VehicleData {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
}

interface VehicleStoreState {
  vehicles: Record<string, VehicleData>;
  isConnected: boolean;
  connectionError: string | null;
  
  // Actions
  connect: () => void;
  disconnect: () => void;
}

// Global reference for the client so it survives store updates
let mqttClient: MqttClient | null = null;
let demoInterval: NodeJS.Timeout | null = null;

export const useVehicleStore = create<VehicleStoreState>((set, get) => ({
  vehicles: {},
  isConnected: false,
  connectionError: null,

  connect: () => {
    // Prevent multiple connections
    if (get().isConnected || mqttClient || demoInterval) return;

    // 1. DEMO MODE LOGIC
    if (USE_DEMO_MODE) {
      console.log("[Store] Starting Demo Mode");
      set({ isConnected: true, connectionError: null });

      demoInterval = setInterval(() => {
        const demoData = getNextDemoPositions();
        set((state) => {
          const nextVehicles = { ...state.vehicles };
          demoData.forEach((v) => {
            nextVehicles[v.id] = v;
          });
          return { vehicles: nextVehicles };
        });
      }, 2000);
      return;
    }

    // 2. REAL MQTT LOGIC
    console.log("[Store] Connecting to AWS IoT...");
    try {
      const url = signUrl({
        host: AWS_CONFIG.IOT_ENDPOINT,
        region: AWS_CONFIG.REGION,
        accessKey: AWS_CONFIG.ACCESS_KEY_ID,
        secretKey: AWS_CONFIG.SECRET_ACCESS_KEY,
      });

      mqttClient = mqtt.connect(url, {
        protocol: 'wss',
        clientId: 'VeloApp-' + Math.random().toString(16).substr(2, 8),
        reconnectPeriod: 2000,
      });

      mqttClient.on('connect', () => {
        console.log('[Store] Connected to AWS IoT Core');
        set({ isConnected: true, connectionError: null });
        mqttClient?.subscribe(AWS_CONFIG.TOPIC_ALL);
      });

      mqttClient.on('error', (err) => {
        console.error('[Store] MQTT Error:', err);
        set({ isConnected: false, connectionError: err.message });
      });

      mqttClient.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          const topicParts = topic.split('/');
          const vehicleId = topicParts[1];

          if (vehicleId) {
            set((state) => ({
              vehicles: {
                ...state.vehicles,
                [vehicleId]: { id: vehicleId, ...payload },
              },
            }));
          }
        } catch (e) {
          console.error("Failed to parse message", e);
        }
      });

    } catch (err: any) {
      set({ connectionError: err.message });
    }
  },

  disconnect: () => {
    if (demoInterval) {
      clearInterval(demoInterval);
      demoInterval = null;
    }
    if (mqttClient) {
      mqttClient.end();
      mqttClient = null;
    }
    set({ isConnected: false });
    console.log("[Store] Disconnected");
  },
}));