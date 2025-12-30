declare module 'react-native-geocoder' {
    export interface GeocodingObject {
        position: { lat: number; lng: number };
        formattedAddress: string;
        feature: string | null;
        streetNumber: string | null;
        streetName: string | null;
        postalCode: string | null;
        locality: string | null;     // City
        subLocality: string | null;  // District/Neighborhood
        country: string;
        countryCode: string;
        adminArea: string | null;    // State/Province
        subAdminArea: string | null; // County
    }

    const Geocoder: {
        geocodePosition(position: { lat: number; lng: number }): Promise<GeocodingObject[]>;
        geocodeAddress(address: string): Promise<GeocodingObject[]>;
        fallbackToGoogle(key: string): void;
    };

    export default Geocoder;
}