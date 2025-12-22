import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { signUrl } from '../utils/aws-sigv4';
import { AWS_CONFIG } from '../config/aws-config';
import { getNextDemoPositions } from '../utils/demo-data'; 

// --- CONFIGURATION ---
const USE_DEMO_MODE = true; // Set to FALSE for Real AWS Data
// ---------------------

interface VehicleData {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
}

interface VehicleContextType {
  vehicles: Record<string, VehicleData>;
  isConnected: boolean;
  connectionError: string | null;
}

const VehicleContext = createContext<VehicleContextType>({} as VehicleContextType);

export const VehicleProvider = ({ children }: { children: React.ReactNode }) => {
  const [vehicles, setVehicles] = useState<Record<string, VehicleData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    setVehicles({}); 
    
    if (USE_DEMO_MODE) {
      console.log("STARTING IN DEMO MODE");
      setIsConnected(true); 

      const intervalId = setInterval(() => {
        const demoData = getNextDemoPositions();
        
        setVehicles(prev => {
          const nextState = { ...prev };
          demoData.forEach(v => {
            nextState[v.id] = v;
          });
          return nextState;
        });
      }, 1000); 

      return () => clearInterval(intervalId);
    } 
    
    else {
      console.log("Connecting to AWS IoT...");
      
      const url = signUrl({
        host: AWS_CONFIG.IOT_ENDPOINT,
        region: AWS_CONFIG.REGION,
        accessKey: AWS_CONFIG.ACCESS_KEY_ID,
        secretKey: AWS_CONFIG.SECRET_ACCESS_KEY,
      });

      const client = mqtt.connect(url, {
        protocol: 'wss',
        clientId: 'VeloApp-' + Math.random().toString(16).substr(2, 8),
        reconnectPeriod: 2000,
      });

      clientRef.current = client;

      client.on('connect', () => {
        console.log('Connected to AWS IoT Core');
        setIsConnected(true);
        setConnectionError(null);
        client.subscribe(AWS_CONFIG.TOPIC_ALL);
      });

      client.on('error', (err) => {
        console.error('MQTT Error:', err);
        setConnectionError(err.message);
        setIsConnected(false);
      });

      client.on('message', (topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          const topicParts = topic.split('/');
          const vehicleId = topicParts[1]; 

          if (vehicleId) {
            setVehicles((prev) => ({
                ...prev,
                [vehicleId]: { id: vehicleId, ...payload },
            }));
          }
        } catch (e) {
          console.error("Failed to parse message", e);
        }
      });

      return () => {
        if (clientRef.current) clientRef.current.end();
      };
    }
  }, []);

  return (
    <VehicleContext.Provider value={{ vehicles, isConnected, connectionError }}>
      {children}
    </VehicleContext.Provider>
  );
};

export const useVehicles = () => useContext(VehicleContext);