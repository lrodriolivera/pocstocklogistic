import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Package, Truck, AlertCircle, Info, Edit3 } from 'lucide-react';
import axios from 'axios';
import TruckVisualization from './TruckVisualization';
import { API_CONFIG } from '../../config/api';

const LoadCalculator = ({ onCalculationComplete }) => {
  const [items, setItems] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [distance, setDistance] = useState('');
  const [urgency, setUrgency] = useState('standard');
  const [additionalServices, setAdditionalServices] = useState([]);
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('calculator');
  // Estado para entrada manual de metros lineales
  const [manualLinearMeters, setManualLinearMeters] = useState('');
  const [manualWeight, setManualWeight] = useState('');

  useEffect(() => {
    fetchEquipmentTypes();
  }, []);

  const fetchEquipmentTypes = async () => {
    try {
      const response = await axios.get(`${API_CONFIG.endpoints.loadCalculator}/equipment-types`);
      setEquipmentTypes(response.data.equipmentTypes);
    } catch (error) {
      console.error('Error fetching equipment types:', error);
    }
  };

  const addItem = () => {
    setItems([...items, {
      id: Date.now(),
      type: 'europallet',
      quantity: 1,
      weight: 0,
      height: null,
      dimensions: null,
      stackable: true // Por defecto remontable
    }]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateLoad = async () => {
    if (items.length === 0) {
      alert('Añade al menos un item de carga');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_CONFIG.endpoints.loadCalculator}/calculate`, {
        items: items.map(item => ({
          type: item.type,
          quantity: parseInt(item.quantity),
          weight: parseFloat(item.weight) || 0,
          height: item.height ? parseFloat(item.height) : null,
          dimensions: item.dimensions,
          stackable: item.stackable // Enviar si es remontable o no
        })),
        distance: distance ? parseFloat(distance) : null,
        urgency,
        additionalServices
      });

      setCalculation(response.data);
      if (onCalculationComplete) {
        onCalculationComplete(response.data);
      }
    } catch (error) {
      console.error('Error calculating load:', error);
      alert('Error al calcular la carga');
    } finally {
      setLoading(false);
    }
  };

  // Calcular usando entrada manual de metros lineales
  const calculateManualLoad = async () => {
    if (!manualLinearMeters || parseFloat(manualLinearMeters) <= 0) {
      alert('Introduce los metros lineales');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_CONFIG.endpoints.loadCalculator}/calculate-manual`, {
        linearMeters: parseFloat(manualLinearMeters),
        weight: parseFloat(manualWeight) || 0,
        distance: distance ? parseFloat(distance) : null,
        urgency,
        additionalServices
      });

      setCalculation(response.data);
      if (onCalculationComplete) {
        onCalculationComplete(response.data);
      }
    } catch (error) {
      console.error('Error calculating manual load:', error);
      alert('Error al calcular la carga');
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (service) => {
    setAdditionalServices(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calculator className="text-blue-600" />
          Calculador de Carga y Metro Lineal
        </h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calculator'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Calculador
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'manual'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <span className="flex items-center gap-1">
              <Edit3 size={14} />
              Entrada Manual
            </span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'info'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Información
          </button>
        </nav>
      </div>

      {activeTab === 'info' && (
        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Info size={20} />
              ¿Qué es el Metro Lineal?
            </h3>
            <p className="text-sm text-blue-800">
              El metro lineal es la unidad de medida utilizada en el transporte para calcular
              el espacio que ocupa la carga en el suelo del camión, independientemente de la altura.
              Un europallet estándar (1.2m x 0.8m) equivale a 0.4 metros lineales.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-2">LTL (Grupaje)</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Carga parcial del camión</li>
                <li>• Se comparte espacio con otros envíos</li>
                <li>• Más económico para cargas pequeñas</li>
                <li>• Ideal para &lt; 8.5 metros lineales</li>
              </ul>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 mb-2">FTL (Completo)</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Camión dedicado completo</li>
                <li>• Sin paradas intermedias</li>
                <li>• Más rápido y directo</li>
                <li>• Ideal para &gt; 8.5 metros lineales</li>
              </ul>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">Remontable vs No Remontable</h4>
            <ul className="text-sm text-orange-800 space-y-1">
              <li>• <strong>Remontable:</strong> Los pallets pueden apilarse uno encima de otro, optimizando el espacio vertical</li>
              <li>• <strong>No Remontable:</strong> Cada pallet debe ocupar su propio espacio en el suelo (mercancía frágil, sobresale, etc.)</li>
              <li>• 32 pallets remontables ≈ 6-7 metros lineales (según altura)</li>
              <li>• 32 pallets NO remontables ≈ 13.2 metros lineales (trailer completo)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Pestaña de Entrada Manual */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <Edit3 size={18} />
              Entrada Manual de Metros Lineales
            </h4>
            <p className="text-sm text-amber-800">
              Usa esta opción cuando conoces directamente los metros lineales que necesitas contratar.
              Útil para casos especiales donde la mercancía sobresale del pallet o tienes medidas no estándar.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metros Lineales *
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                max="13.6"
                value={manualLinearMeters}
                onChange={(e) => setManualLinearMeters(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
                placeholder="Ej: 6.5"
              />
              <p className="text-xs text-gray-500 mt-1">Máximo 13.6m (trailer estándar)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso Total (kg)
              </label>
              <input
                type="number"
                min="0"
                value={manualWeight}
                onChange={(e) => setManualWeight(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg"
                placeholder="Opcional"
              />
              <p className="text-xs text-gray-500 mt-1">Máximo 24.000 kg</p>
            </div>
          </div>

          {/* Opciones Adicionales para modo manual */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distancia (km)
              </label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Opcional para precio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgencia
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="standard">Estándar</option>
                <option value="express">Express (+30%)</option>
                <option value="urgent">Urgente (+50%)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Servicios Adicionales
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={additionalServices.includes('tailgate')}
                    onChange={() => toggleService('tailgate')}
                    className="mr-2"
                  />
                  <span className="text-sm">Plataforma elevadora</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={additionalServices.includes('tempControlled')}
                    onChange={() => toggleService('tempControlled')}
                    className="mr-2"
                  />
                  <span className="text-sm">Temperatura controlada</span>
                </label>
              </div>
            </div>
          </div>

          {/* Botón Calcular Manual */}
          <button
            onClick={calculateManualLoad}
            disabled={loading || !manualLinearMeters}
            className="w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>Calculando...</>
            ) : (
              <>
                <Calculator size={20} />
                Calcular con Metros Manuales
              </>
            )}
          </button>
        </div>
      )}

      {activeTab === 'calculator' && (
        <>
          {/* Items de Carga */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-700">Items de Carga</h3>
              <button
                onClick={addItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={20} />
                Añadir Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Package size={48} className="mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600">No hay items añadidos</p>
                <p className="text-sm text-gray-500">Haz clic en "Añadir Item" para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Item #{index + 1}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Tipo de Equipamiento
                        </label>
                        <select
                          value={item.type}
                          onChange={(e) => updateItem(item.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          {equipmentTypes.map(type => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Cantidad
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Peso Total (kg)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.weight}
                          onChange={(e) => updateItem(item.id, 'weight', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Altura (m) <span className="text-gray-400">Opcional</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={item.height || ''}
                          onChange={(e) => updateItem(item.id, 'height', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="Auto"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Apilable
                        </label>
                        <div className="flex items-center h-[38px]">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.stackable !== false}
                              onChange={(e) => updateItem(item.id, 'stackable', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            <span className={`ml-2 text-xs font-medium ${item.stackable !== false ? 'text-green-600' : 'text-red-600'}`}>
                              {item.stackable !== false ? 'Sí' : 'No'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opciones Adicionales */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distancia (km)
              </label>
              <input
                type="number"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Opcional para precio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urgencia
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="standard">Estándar</option>
                <option value="express">Express (+30%)</option>
                <option value="urgent">Urgente (+50%)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Servicios Adicionales
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={additionalServices.includes('tailgate')}
                    onChange={() => toggleService('tailgate')}
                    className="mr-2"
                  />
                  <span className="text-sm">Plataforma elevadora</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={additionalServices.includes('tempControlled')}
                    onChange={() => toggleService('tempControlled')}
                    className="mr-2"
                  />
                  <span className="text-sm">Temperatura controlada</span>
                </label>
              </div>
            </div>
          </div>

          {/* Botón Calcular */}
          <button
            onClick={calculateLoad}
            disabled={loading || items.length === 0}
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>Calculando...</>
            ) : (
              <>
                <Calculator size={20} />
                Calcular Carga
              </>
            )}
          </button>
        </>
      )}

      {/* Resultados */}
      {calculation && (
        <div className="mt-8 space-y-6">
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Resultados del Cálculo</h3>

            {/* Resumen Principal */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-4">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Metros Lineales</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {calculation.summary.totalLinearMeters}m
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Peso Total</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {calculation.summary.totalWeight}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Volumen</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {calculation.summary.totalVolume}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Utilización</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {calculation.summary.utilization}
                  </p>
                </div>
              </div>

              {/* Recomendación de Transporte */}
              <div className={`rounded-lg p-4 ${
                calculation.transportRecommendation.type === 'FTL'
                  ? 'bg-purple-100 border border-purple-300'
                  : 'bg-green-100 border border-green-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className={
                      calculation.transportRecommendation.type === 'FTL'
                        ? 'text-purple-600'
                        : 'text-green-600'
                    } size={24} />
                    <div>
                      <p className="font-semibold text-gray-800">
                        Transporte Recomendado: {calculation.transportRecommendation.type}
                      </p>
                      <p className="text-sm text-gray-600">
                        {calculation.transportRecommendation.recommendation}
                      </p>
                    </div>
                  </div>
                  {calculation.summary.estimatedPrice && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Precio Estimado</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {calculation.summary.estimatedPrice}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Validación */}
            {calculation.validation && (
              <div className="mb-4">
                {calculation.validation.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2">
                    <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                      <AlertCircle size={20} />
                      Errores de Validación
                    </h4>
                    <ul className="list-disc list-inside text-sm text-red-800">
                      {calculation.validation.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {calculation.validation.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">Advertencias</h4>
                    <ul className="list-disc list-inside text-sm text-yellow-800">
                      {calculation.validation.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Detalles de Carga */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h4 className="font-semibold text-gray-700">Detalles de la Carga</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tipo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Cantidad</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Metros Lineales</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Peso</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Volumen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculation.loadMetrics.loadDetails.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="px-4 py-3 text-sm">{item.description}</td>
                        <td className="px-4 py-3 text-sm">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm">{item.linearMeters}m</td>
                        <td className="px-4 py-3 text-sm">{item.weight}kg</td>
                        <td className="px-4 py-3 text-sm">{item.volume.toFixed(2)}m³</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visualización de Utilización */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Utilización del Camión</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Metros Lineales</span>
                    <span>{calculation.transportRecommendation.utilization.linear}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${calculation.transportRecommendation.utilization.linear}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Peso</span>
                    <span>{calculation.transportRecommendation.utilization.weight}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${calculation.transportRecommendation.utilization.weight}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Volumen</span>
                    <span>{calculation.transportRecommendation.utilization.volume}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${calculation.transportRecommendation.utilization.volume}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Visualización 3D del Camión */}
            <TruckVisualization
              loadDetails={calculation.loadMetrics}
              truckDimensions={calculation.transportRecommendation.details}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadCalculator;