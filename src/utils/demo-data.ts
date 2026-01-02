// Define the shape of a coordinate
interface Coord {
  lat: number;
  lng: number;
}

// REAL ROAD PATHS (Kathmandu Context)
// These are simplified arrays of coordinates that follow actual roads.

// Route 1: Durbar Marg -> Tripureshwor (Straight City Road)
const ROUTE_CITY: Coord[] = [
  { lat: 27.7120, lng: 85.3220 }, // Narayanhiti
  { lat: 27.7105, lng: 85.3218 }, // Durbar Marg
  { lat: 27.7080, lng: 85.3215 }, // Jamal
  { lat: 27.7050, lng: 85.3210 }, // Rani Pokhari
  { lat: 27.7020, lng: 85.3200 }, // Sundhara
  { lat: 27.6980, lng: 85.3180 }, // Tripureshwor
];

// Route 2: Ring Road Segment (Koteshwor -> Satdobato)
const ROUTE_RINGROAD: Coord[] = [
  { lat: 27.6750, lng: 85.3450 }, // Koteshwor
  { lat: 27.6720, lng: 85.3400 }, // Balkumari
  { lat: 27.6690, lng: 85.3350 }, // Gwarko
  { lat: 27.6670, lng: 85.3300 }, // Satdobato (Start)
  { lat: 27.6650, lng: 85.3250 }, // Satdobato (End)
];

// Route 3: Thamel Tourist Loop
const ROUTE_THAMEL: Coord[] = [
  { lat: 27.7150, lng: 85.3100 }, // Sorhakhutte
  { lat: 27.7160, lng: 85.3120 }, // Chhetrapati
  { lat: 27.7170, lng: 85.3140 }, // Thamel Marg
  { lat: 27.7180, lng: 85.3150 }, // Tridevi Marg
  { lat: 27.7190, lng: 85.3130 }, // Lainchaur
];

// Helper to interpolate points for smoother animation between waypoints
// This creates intermediate points so the car doesn't "teleport" huge distances
const interpolateRoute = (route: Coord[], steps: number): Coord[] => {
  const smoothRoute: Coord[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const start = route[i];
    const end = route[i + 1];
    for (let j = 0; j < steps; j++) {
      smoothRoute.push({
        lat: start.lat + (end.lat - start.lat) * (j / steps),
        lng: start.lng + (end.lng - start.lng) * (j / steps),
      });
    }
  }
  smoothRoute.push(route[route.length - 1]);
  return smoothRoute;
};

// Generate smooth paths (20 small steps between each major waypoint)
const PATH_TESLA = interpolateRoute(ROUTE_CITY, 20);
const PATH_TRUCK = interpolateRoute(ROUTE_RINGROAD, 20);
const PATH_BUS = interpolateRoute(ROUTE_THAMEL, 20);

// State container for our vehicles
const MOCK_STATE = [
  { id: 'Demo-Tesla', path: PATH_TESLA, index: 0, direction: 1 },
  { id: 'Demo-Truck', path: PATH_TRUCK, index: 0, direction: 1 },
  { id: 'Demo-Bus',   path: PATH_BUS,   index: 0, direction: 1 },
];

export const getNextDemoPositions = () => {
  MOCK_STATE.forEach(v => {
    // Move the index
    v.index += v.direction;

    // Boundary Check: If reached the end or start of the path, reverse direction
    if (v.index >= v.path.length - 1 || v.index <= 0) {
      v.direction *= -1;
    }
  });

  // Map the current path index to the output format
  return MOCK_STATE.map(v => {
    const pos = v.path[v.index];
    return {
      id: v.id,
      latitude: pos.lat,
      longitude: pos.lng,
      speed: Math.floor(Math.random() * 40) + 10, // Random speed 10-50 km/h
      timestamp: new Date().toISOString(),
    };
  });
};