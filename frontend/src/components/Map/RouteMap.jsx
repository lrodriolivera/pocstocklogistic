import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { MapPin, Navigation, Truck, Loader } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RouteMap = ({ route, tollData, serviceType }) => {
  const [routeCoordinates, setRouteCoordinates] = useState(null);
  const [mapCenter, setMapCenter] = useState([40.4168, -3.7038]); // Madrid default
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRouteData = async () => {
      try {
        setLoading(true);

        // Debugging: Log all route data
        console.log('🔍 DEBUG - Route object received:', route);
        console.log('🔍 DEBUG - Route geometry:', route?.geometry);
        console.log('🔍 DEBUG - Route geometry type:', typeof route?.geometry);
        console.log('🔍 DEBUG - Route geometry coordinates:', route?.geometry?.coordinates);
        console.log('🔍 DEBUG - Coordinates length:', route?.geometry?.coordinates?.length);

        // Si ya tenemos la geometría de la ruta, usarla directamente
        if (route?.geometry && route.geometry.coordinates) {
          console.log('✅ Usando geometría de ruta real desde la cotización');
          console.log('🔍 DEBUG - Coordinates sample (first 3):', route.geometry.coordinates.slice(0, 3));
          console.log('🔍 DEBUG - Coordinates sample (last 3):', route.geometry.coordinates.slice(-3));

          // Convertir coordenadas de OpenRouteService [lng, lat] a Leaflet [lat, lng]
          const routePath = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          console.log('🔍 DEBUG - Converted route path sample (first 3):', routePath.slice(0, 3));
          console.log('🔍 DEBUG - Total converted coordinates:', routePath.length);

          // Obtener origen y destino de los extremos de la ruta
          const originCoords = routePath[0];
          const destinationCoords = routePath[routePath.length - 1];

          console.log('🔍 DEBUG - Origin coords:', originCoords);
          console.log('🔍 DEBUG - Destination coords:', destinationCoords);

          setRouteCoordinates({
            path: routePath,
            origin: originCoords,
            destination: destinationCoords
          });

          // Calcular el centro del mapa basado en la ruta completa
          const latitudes = routePath.map(coord => coord[0]);
          const longitudes = routePath.map(coord => coord[1]);
          const centerLat = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
          const centerLng = (Math.min(...longitudes) + Math.max(...longitudes)) / 2;
          console.log('🔍 DEBUG - Map center calculated:', [centerLat, centerLng]);
          setMapCenter([centerLat, centerLng]);

          setLoading(false);
          console.log('✅ Ruta real configurada correctamente');
          return;
        }

        // Fallback: si no hay geometría, geocodificar origen y destino para línea recta
        console.log('❌ No hay geometría disponible, usando geocoding para línea recta');
        console.log('🔍 DEBUG - Fallback reason: route?.geometry =', route?.geometry);
        console.log('🔍 DEBUG - Fallback reason: route.geometry.coordinates =', route?.geometry?.coordinates);

        const originResponse = await fetch(`/api/geocode?location=${encodeURIComponent(route.origin)}`);
        const destinationResponse = await fetch(`/api/geocode?location=${encodeURIComponent(route.destination)}`);

        if (!originResponse.ok || !destinationResponse.ok) {
          throw new Error('Error geocoding locations');
        }

        const originData = await originResponse.json();
        const destinationData = await destinationResponse.json();

        const coordinates = [
          [originData.latitude, originData.longitude],
          [destinationData.latitude, destinationData.longitude]
        ];

        setRouteCoordinates({
          path: coordinates,
          origin: [originData.latitude, originData.longitude],
          destination: [destinationData.latitude, destinationData.longitude]
        });

        // Set center point between origin and destination
        const centerLat = (originData.latitude + destinationData.latitude) / 2;
        const centerLng = (originData.longitude + destinationData.longitude) / 2;
        setMapCenter([centerLat, centerLng]);

      } catch (err) {
        console.error('Error loading route:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (route?.origin && route?.destination) {
      fetchRouteData();
    }
  }, [route]);

  const getTollSummary = () => {
    if (!tollData?.tollBreakdown) return null;

    const totalTolls = tollData.tollBreakdown.reduce((sum, toll) => sum + toll.cost, 0);
    const countries = tollData.tollBreakdown.map(toll => toll.country);

    return {
      total: totalTolls,
      countries: [...new Set(countries)],
      details: tollData.tollBreakdown
    };
  };

  const tollSummary = getTollSummary();

  // Create custom icons
  const originIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  const destinationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header del Mapa */}
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 flex items-center">
            <Navigation className="w-4 h-4 mr-2" />
            Ruta - {serviceType}
          </h4>
          <div className="text-sm text-gray-600">
            {route.distance} km • {route.estimatedTransitDays} días
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="relative" style={{ height: '300px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="flex items-center space-x-2 text-gray-600">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Cargando mapa...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center text-gray-600">
              <div className="text-red-600 mb-2">Error al cargar el mapa</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <MapContainer
            center={mapCenter}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {routeCoordinates && (
              <>
                {/* Origin marker */}
                <Marker position={routeCoordinates.origin} icon={originIcon}>
                  <Popup>
                    <div className="text-center">
                      <strong>Origen</strong><br />
                      {route.origin}
                    </div>
                  </Popup>
                </Marker>

                {/* Destination marker */}
                <Marker position={routeCoordinates.destination} icon={destinationIcon}>
                  <Popup>
                    <div className="text-center">
                      <strong>Destino</strong><br />
                      {route.destination}
                    </div>
                  </Popup>
                </Marker>

                {/* Route polyline */}
                <Polyline
                  positions={routeCoordinates.path}
                  color="#2563eb"
                  weight={4}
                  opacity={0.8}
                />
              </>
            )}
          </MapContainer>
        )}

        {/* Overlay con información de la ruta - solo si no hay error */}
        {!error && (
          <div className="absolute top-2 left-2 bg-white rounded-lg shadow-lg p-3 border border-gray-200 max-w-xs z-10">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <MapPin className="w-3 h-3 text-green-600 mr-1" />
                <span className="font-medium text-gray-900">Origen:</span>
                <span className="ml-1 text-gray-700 truncate">{route.origin}</span>
              </div>
              <div className="flex items-center text-sm">
                <MapPin className="w-3 h-3 text-red-600 mr-1" />
                <span className="font-medium text-gray-900">Destino:</span>
                <span className="ml-1 text-gray-700 truncate">{route.destination}</span>
              </div>
              <div className="flex items-center text-sm">
                <Truck className="w-3 h-3 text-blue-600 mr-1" />
                <span className="font-medium text-gray-900">Servicio:</span>
                <span className="ml-1 text-gray-700">{serviceType}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Información de Peajes */}
      {tollSummary && (
        <div className="p-4 bg-yellow-50 border-t border-gray-200">
          <h5 className="font-medium text-gray-900 mb-2 flex items-center">
            <svg className="w-4 h-4 mr-2 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            Costos de Peajes
          </h5>

          {/* Resumen de peajes */}
          <div className="mb-3 p-2 bg-white rounded border">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Peajes:</span>
              <span className="text-lg font-bold text-yellow-700">
                €{tollSummary.total.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Países: {tollSummary.countries.join(', ')}
            </div>
          </div>

          {/* Desglose por país */}
          <div className="space-y-2">
            {tollSummary.details.map((toll, index) => (
              <div key={index} className="bg-white rounded border p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{toll.country}</span>
                  <span className="font-semibold text-yellow-700">€{toll.cost.toFixed(2)}</span>
                </div>

                {/* Peajes específicos */}
                {toll.segments && toll.segments.length > 0 && (
                  <div className="text-xs text-gray-600">
                    <div className="mb-1">Peajes: {toll.tollPlazas?.join(', ')}</div>
                    <div className="grid grid-cols-1 gap-1">
                      {toll.segments.map((segment, segIndex) => (
                        <div key={segIndex} className="flex justify-between">
                          <span>{segment.name} ({segment.road})</span>
                          <span>€{segment.cost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Notas adicionales */}
          <div className="mt-2 text-xs text-gray-600">
            <p>* Precios aproximados para vehículos comerciales</p>
            <p>* Los costos pueden variar según la hora y temporada</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteMap;