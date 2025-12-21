const MOCK_VEHICLES = [
  { id: 'Demo-Tesla', lat: 27.7172, lng: 85.3240, direction: 1 }, 
  { id: 'Demo-Truck', lat: 27.7000, lng: 85.3300, direction: -1 }, 
  { id: 'Demo-Bus',   lat: 27.7100, lng: 85.3100, direction: 1 }, 
];

export const getNextDemoPositions = () => {
  MOCK_VEHICLES.forEach(v => {
    v.lat += 0.0001 * v.direction;
    v.lng += 0.0001 * v.direction;
    
    
    if (v.lat > 27.7300 || v.lat < 27.6800) {
        v.direction *= -1;
    }
  });

  return MOCK_VEHICLES.map(v => ({
    id: v.id,
    latitude: v.lat,
    longitude: v.lng,
    speed: Math.floor(Math.random() * 60) + 20, 
    timestamp: new Date().toISOString(),
  }));
};