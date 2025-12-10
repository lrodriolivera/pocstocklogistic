import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  Search,
  Truck,
  Package,
  MapPin,
  Calendar,
  Euro,
  RefreshCw,
  Filter,
  ExternalLink,
  Building2,
  Phone,
  Mail,
  TrendingUp,
  Loader2,
  ChevronDown,
  ChevronUp,
  Globe,
  Info
} from 'lucide-react';
import LoadingSpinner from '../UI/LoadingSpinner';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const FreightExchange = () => {
  const { authFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [platforms, setPlatforms] = useState(null);
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'vehicles', 'publish'
  const [expandedOffer, setExpandedOffer] = useState(null);

  // Search form state
  const [searchParams, setSearchParams] = useState({
    originCountry: 'ES',
    originCity: '',
    destinationCountry: '',
    destinationCity: '',
    radiusKm: 50,
    fromDate: new Date().toISOString().split('T')[0],
    toDate: '',
    platforms: ['all']
  });

  // Publish form state
  const [publishForm, setPublishForm] = useState({
    platforms: ['timocom'],
    origin: { country: 'ES', city: '', postalCode: '' },
    destination: { country: '', city: '', postalCode: '' },
    loadingDate: '',
    deliveryDate: '',
    weight: '',
    loadingMeters: '',
    description: '',
    vehicleType: 'TAUTLINER',
    price: ''
  });

  const countries = [
    { code: 'ES', name: 'Espana' },
    { code: 'FR', name: 'Francia' },
    { code: 'DE', name: 'Alemania' },
    { code: 'IT', name: 'Italia' },
    { code: 'PT', name: 'Portugal' },
    { code: 'PL', name: 'Polonia' },
    { code: 'NL', name: 'Holanda' },
    { code: 'BE', name: 'Belgica' },
    { code: 'AT', name: 'Austria' },
    { code: 'CH', name: 'Suiza' },
    { code: 'CZ', name: 'Rep. Checa' },
    { code: 'MA', name: 'Marruecos' }
  ];

  const vehicleTypes = [
    { value: 'TAUTLINER', label: 'Tautliner / Lona' },
    { value: 'MEGA_TRAILER', label: 'Mega Trailer' },
    { value: 'FRIGORIFICO', label: 'Frigorifico' },
    { value: 'CISTERNA', label: 'Cisterna' },
    { value: 'PORTACOCHES', label: 'Portacoches' }
  ];

  // Fetch platforms info on mount
  useEffect(() => {
    fetchPlatformsInfo();
  }, []);

  const fetchPlatformsInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/freight-exchange/platforms`);
      const data = await response.json();
      if (data.success) {
        setPlatforms(data.data.platforms);
      }
    } catch (error) {
      console.error('Error fetching platforms:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const queryParams = new URLSearchParams({
        platforms: searchParams.platforms.join(','),
        originCountry: searchParams.originCountry,
        originCity: searchParams.originCity,
        destinationCountry: searchParams.destinationCountry,
        destinationCity: searchParams.destinationCity,
        radiusKm: searchParams.radiusKm,
        fromDate: searchParams.fromDate
      });

      if (searchParams.toDate) {
        queryParams.append('toDate', searchParams.toDate);
      }

      const response = await fetch(`${API_URL}/api/freight-exchange/search?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data);
        toast.success(`Se encontraron ${data.data.metadata.totalOffers} ofertas`);
      } else {
        toast.error(data.error || 'Error en la busqueda');
      }
    } catch (error) {
      toast.error('Error conectando con el servidor');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchVehicles = async () => {
    setLoading(true);

    try {
      const queryParams = new URLSearchParams({
        country: searchParams.originCountry,
        city: searchParams.originCity
      });

      const response = await fetch(`${API_URL}/api/freight-exchange/vehicles?${queryParams}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults({ ...data.data, type: 'vehicles' });
        toast.success(`Se encontraron ${data.data.metadata.totalVehicles} vehiculos`);
      }
    } catch (error) {
      toast.error('Error en la busqueda de vehiculos');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/freight-exchange/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: publishForm.platforms,
          offer: {
            origin: publishForm.origin,
            destination: publishForm.destination,
            loadingDate: publishForm.loadingDate,
            deliveryDate: publishForm.deliveryDate,
            weight: parseFloat(publishForm.weight) || 0,
            loadingMeters: parseFloat(publishForm.loadingMeters) || 0,
            description: publishForm.description,
            vehicleType: publishForm.vehicleType,
            price: parseFloat(publishForm.price) || 0
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        // Reset form
        setPublishForm({
          ...publishForm,
          origin: { country: 'ES', city: '', postalCode: '' },
          destination: { country: '', city: '', postalCode: '' },
          weight: '',
          loadingMeters: '',
          description: '',
          price: ''
        });
      } else {
        toast.error(data.error || 'Error publicando oferta');
      }
    } catch (error) {
      toast.error('Error conectando con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const OfferCard = ({ offer, index }) => {
    const isExpanded = expandedOffer === index;

    return (
      <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
        <div
          className="p-4 cursor-pointer"
          onClick={() => setExpandedOffer(isExpanded ? null : index)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  offer.source === 'timocom'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {offer.source === 'timocom' ? 'Timocom' : 'Wtransnet'}
                </span>
                <span className="text-gray-400 text-xs">{offer.id}</span>
              </div>

              <div className="flex items-center gap-2 text-sm mb-2">
                <MapPin className="w-4 h-4 text-green-500" />
                <span className="font-medium">{offer.origin.city}, {offer.origin.country}</span>
                <span className="text-gray-400">→</span>
                <MapPin className="w-4 h-4 text-red-500" />
                <span className="font-medium">{offer.destination.city}, {offer.destination.country}</span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {offer.origin.date}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  {offer.cargo?.weight?.toLocaleString()} kg
                </span>
                <span className="flex items-center gap-1">
                  <Truck className="w-3 h-3" />
                  {offer.cargo?.loadingMeters} m
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xl font-bold text-blue-600">
                {offer.price?.amount?.toLocaleString()} {offer.price?.currency || 'EUR'}
              </div>
              {offer.pricePerKm && (
                <div className="text-xs text-gray-500">
                  {offer.pricePerKm.toFixed(2)} EUR/km
                </div>
              )}
              {offer.distance && (
                <div className="text-xs text-gray-500">
                  {offer.distance} km
                </div>
              )}
              <div className="mt-2">
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="border-t border-gray-100 p-4 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Detalles de carga</h4>
                <p className="text-sm text-gray-600">{offer.cargo?.description || 'Sin descripcion'}</p>
                <p className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">Vehiculo:</span> {offer.vehicleType}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Contacto</h4>
                {offer.contact && (
                  <div className="text-sm text-gray-600 space-y-1">
                    <p className="flex items-center gap-2">
                      <Building2 className="w-3 h-3" />
                      {offer.contact.company}
                    </p>
                    {offer.contact.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        {offer.contact.email}
                      </p>
                    )}
                    {offer.contact.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {offer.contact.phone}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const VehicleCard = ({ vehicle }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5 text-blue-500" />
            <span className="font-medium">{vehicle.vehicle?.type}</span>
            <span className={`px-2 py-1 text-xs rounded ${
              vehicle.source === 'timocom' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
              {vehicle.source === 'timocom' ? 'Timocom' : 'Wtransnet'}
            </span>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="flex items-center gap-2">
              <MapPin className="w-3 h-3" />
              {vehicle.location?.city}, {vehicle.location?.country}
            </p>
            <p className="flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              {vehicle.availableFrom} - {vehicle.availableTo}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">{vehicle.vehicle?.capacity?.toLocaleString()} kg</p>
          <p className="text-gray-500">{vehicle.vehicle?.loadingMeters} m</p>
        </div>
      </div>
      {vehicle.contact && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <Building2 className="w-3 h-3 inline mr-1" />
          {vehicle.contact.company}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bolsas de Carga</h1>
          <p className="text-gray-600">Busca ofertas en Timocom y Wtransnet</p>
        </div>
        <div className="flex items-center gap-2">
          {platforms && (
            <div className="flex gap-2">
              {platforms.map(p => (
                <span
                  key={p.id}
                  className={`px-3 py-1 text-xs rounded-full ${
                    p.apiStatus === 'configured' || p.apiStatus === 'credentials_ready'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {p.name}: {p.apiStatus === 'demo_mode' ? 'Demo' : 'Activo'}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('search')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'search'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Buscar Cargas
          </button>
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'vehicles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            Vehiculos Disponibles
          </button>
          <button
            onClick={() => setActiveTab('publish')}
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'publish'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Publicar Oferta
          </button>
        </nav>
      </div>

      {/* Search Tab */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pais Origen
                </label>
                <select
                  value={searchParams.originCountry}
                  onChange={(e) => setSearchParams({...searchParams, originCountry: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad Origen
                </label>
                <input
                  type="text"
                  value={searchParams.originCity}
                  onChange={(e) => setSearchParams({...searchParams, originCity: e.target.value})}
                  placeholder="ej: Madrid"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pais Destino
                </label>
                <select
                  value={searchParams.destinationCountry}
                  onChange={(e) => setSearchParams({...searchParams, destinationCountry: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Cualquiera</option>
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad Destino
                </label>
                <input
                  type="text"
                  value={searchParams.destinationCity}
                  onChange={(e) => setSearchParams({...searchParams, destinationCity: e.target.value})}
                  placeholder="ej: Paris"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={searchParams.fromDate}
                  onChange={(e) => setSearchParams({...searchParams, fromDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={searchParams.toDate}
                  onChange={(e) => setSearchParams({...searchParams, toDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Radio (km)
                </label>
                <input
                  type="number"
                  value={searchParams.radiusKm}
                  onChange={(e) => setSearchParams({...searchParams, radiusKm: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plataformas
                </label>
                <select
                  value={searchParams.platforms[0]}
                  onChange={(e) => setSearchParams({...searchParams, platforms: [e.target.value]})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas</option>
                  <option value="timocom">Timocom</option>
                  <option value="wtransnet">Wtransnet</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </button>
            </div>
          </form>

          {/* Results */}
          {searchResults && searchResults.type !== 'vehicles' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Resultados ({searchResults.metadata?.totalOffers || 0} ofertas)
                </h3>
                <div className="flex gap-4 text-sm text-gray-500">
                  <span>Timocom: {searchResults.metadata?.byPlatform?.timocom || 0}</span>
                  <span>Wtransnet: {searchResults.metadata?.byPlatform?.wtransnet || 0}</span>
                </div>
              </div>

              <div className="space-y-3">
                {searchResults.aggregated?.length > 0 ? (
                  searchResults.aggregated.map((offer, index) => (
                    <OfferCard key={offer.id || index} offer={offer} index={index} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No se encontraron ofertas con los criterios especificados</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pais
                </label>
                <select
                  value={searchParams.originCountry}
                  onChange={(e) => setSearchParams({...searchParams, originCountry: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={searchParams.originCity}
                  onChange={(e) => setSearchParams({...searchParams, originCity: e.target.value})}
                  placeholder="ej: Madrid"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSearchVehicles}
                  disabled={loading}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                  Buscar Vehiculos
                </button>
              </div>
            </div>
          </div>

          {searchResults?.type === 'vehicles' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Vehiculos Disponibles ({searchResults.metadata?.totalVehicles || 0})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.aggregated?.map((vehicle, index) => (
                  <VehicleCard key={vehicle.id || index} vehicle={vehicle} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Publish Tab */}
      {activeTab === 'publish' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-4 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">Publicar oferta de carga</p>
              <p>Las ofertas se publicaran en las plataformas seleccionadas. Para Wtransnet, deberas completar la publicacion manualmente en su portal web.</p>
            </div>
          </div>

          <form onSubmit={handlePublish} className="space-y-6">
            {/* Platform selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Publicar en
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publishForm.platforms.includes('timocom')}
                    onChange={(e) => {
                      const newPlatforms = e.target.checked
                        ? [...publishForm.platforms, 'timocom']
                        : publishForm.platforms.filter(p => p !== 'timocom');
                      setPublishForm({...publishForm, platforms: newPlatforms});
                    }}
                    className="rounded border-gray-300"
                  />
                  <span>Timocom</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={publishForm.platforms.includes('wtransnet')}
                    onChange={(e) => {
                      const newPlatforms = e.target.checked
                        ? [...publishForm.platforms, 'wtransnet']
                        : publishForm.platforms.filter(p => p !== 'wtransnet');
                      setPublishForm({...publishForm, platforms: newPlatforms});
                    }}
                    className="rounded border-gray-300"
                  />
                  <span>Wtransnet</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Origin */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  Origen
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={publishForm.origin.country}
                    onChange={(e) => setPublishForm({
                      ...publishForm,
                      origin: {...publishForm.origin, country: e.target.value}
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={publishForm.origin.city}
                    onChange={(e) => setPublishForm({
                      ...publishForm,
                      origin: {...publishForm.origin, city: e.target.value}
                    })}
                    placeholder="Ciudad"
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <input
                  type="date"
                  value={publishForm.loadingDate}
                  onChange={(e) => setPublishForm({...publishForm, loadingDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>

              {/* Destination */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  Destino
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={publishForm.destination.country}
                    onChange={(e) => setPublishForm({
                      ...publishForm,
                      destination: {...publishForm.destination, country: e.target.value}
                    })}
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Pais</option>
                    {countries.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={publishForm.destination.city}
                    onChange={(e) => setPublishForm({
                      ...publishForm,
                      destination: {...publishForm.destination, city: e.target.value}
                    })}
                    placeholder="Ciudad"
                    className="border border-gray-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <input
                  type="date"
                  value={publishForm.deliveryDate}
                  onChange={(e) => setPublishForm({...publishForm, deliveryDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
            </div>

            {/* Cargo details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  value={publishForm.weight}
                  onChange={(e) => setPublishForm({...publishForm, weight: e.target.value})}
                  placeholder="24000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metros Lineales
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={publishForm.loadingMeters}
                  onChange={(e) => setPublishForm({...publishForm, loadingMeters: e.target.value})}
                  placeholder="13.6"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Vehiculo
                </label>
                <select
                  value={publishForm.vehicleType}
                  onChange={(e) => setPublishForm({...publishForm, vehicleType: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {vehicleTypes.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio (EUR)
                </label>
                <input
                  type="number"
                  value={publishForm.price}
                  onChange={(e) => setPublishForm({...publishForm, price: e.target.value})}
                  placeholder="1500"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripcion de la carga
              </label>
              <textarea
                value={publishForm.description}
                onChange={(e) => setPublishForm({...publishForm, description: e.target.value})}
                placeholder="Descripcion de la mercancia..."
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || publishForm.platforms.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Publicar Oferta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Platform Info */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4" />
          <span className="font-medium">Plataformas integradas</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="font-medium text-blue-700">Timocom</span> - Bolsa de cargas europea con cobertura en DE, FR, ES, IT, PL, NL, BE, AT, CH, CZ
            <a href="https://www.timocom.com" target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline inline-flex items-center">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div>
            <span className="font-medium text-green-700">Wtransnet</span> - Especializada en sur de Europa: ES, PT, FR, IT, MA
            <a href="https://www.wtransnet.com" target="_blank" rel="noopener noreferrer" className="ml-2 text-blue-500 hover:underline inline-flex items-center">
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreightExchange;
