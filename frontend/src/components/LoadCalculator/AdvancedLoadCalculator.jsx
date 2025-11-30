import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calculator, Package, Truck, AlertCircle, Info, RotateCw, Archive, Eye } from 'lucide-react';
import axios from 'axios';
import { API_CONFIG } from '../../config/api';

const AdvancedLoadCalculator = ({ onCalculationComplete }) => {
  const [items, setItems] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [distance, setDistance] = useState('');
  const [urgency, setUrgency] = useState('standard');
  const [additionalServices, setAdditionalServices] = useState([]);
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [unitSystem, setUnitSystem] = useState('metric'); // metric or imperial

  // Colores disponibles para visualización
  const availableColors = [
    { name: 'Blue', value: '#0000FF' },
    { name: 'Green', value: '#008000' },
    { name: 'Red', value: '#FF0000' },
    { name: 'Orange', value: '#FFA500' },
    { name: 'Purple', value: '#8A2BE2' },
    { name: 'Brown', value: '#A52A2A' },
    { name: 'Yellow', value: '#FFD700' },
    { name: 'Pink', value: '#FF69B4' },
  ];

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

  const addItem = (type = 'box') => {
    const newItem = {
      id: Date.now(),
      type: type === 'box' ? 'customBox' : 'customCylinder',
      name: `${type === 'box' ? 'Caja' : 'Cilindro'} ${items.length + 1}`,
      quantity: 1,
      weightPerPiece: 0,
      color: availableColors[items.length % availableColors.length].value,
      allowRotation: true,
      stackingOptions: {
        allowStackingOn: true,
        allowStackingUnder: true
      },
      includeInLoad: true,
      dimensions: type === 'box'
        ? { length: 100, width: 80, height: 120 } // cm
        : { diameter: 60, height: 150 } // cm
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const updateItemDimensions = (id, dimField, value) => {
    setItems(items.map(item =>
      item.id === id
        ? { ...item, dimensions: { ...item.dimensions, [dimField]: parseFloat(value) || 0 } }
        : item
    ));
  };

  const updateStackingOption = (id, option, value) => {
    setItems(items.map(item =>
      item.id === id
        ? {
            ...item,
            stackingOptions: {
              ...item.stackingOptions,
              [option]: value
            }
          }
        : item
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
      const payload = {
        items: items.map(item => ({
          type: item.type,
          name: item.name,
          quantity: parseInt(item.quantity) || 1,
          weightPerPiece: parseFloat(item.weightPerPiece) || 0,
          dimensions: item.dimensions,
          color: item.color,
          allowRotation: item.allowRotation,
          stackingOptions: item.stackingOptions,
          includeInLoad: item.includeInLoad
        })),
        distance: distance ? parseFloat(distance) : null,
        urgency,
        additionalServices
      };

      console.log('Sending payload:', payload);

      const response = await axios.post(`${API_CONFIG.endpoints.loadCalculator}/calculate-advanced`, payload);

      setCalculation(response.data);
      if (onCalculationComplete) {
        onCalculationComplete(response.data);
      }
    } catch (error) {
      console.error('Error calculating load:', error);
      alert('Error al calcular la carga: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdateRotation = (enable) => {
    setItems(items.map(item => ({ ...item, allowRotation: enable })));
  };

  const bulkUpdateInclude = (enable) => {
    setItems(items.map(item => ({ ...item, includeInLoad: enable })));
  };

  const deleteAllItems = () => {
    if (confirm('¿Estás seguro de eliminar todos los items? Esta acción es irreversible.')) {
      setItems([]);
      setCalculation(null);
    }
  };

  const isBoxType = (item) => {
    return item.type === 'customBox' || equipmentTypes.find(et => et.id === item.type)?.type === 'box';
  };

  const isCylinderType = (item) => {
    return item.type === 'customCylinder' || equipmentTypes.find(et => et.id === item.type)?.type === 'cylinder';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Calculator className="text-blue-600" />
          Calculador Avanzado de Carga (estilo Pier2Pier)
        </h2>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUnitSystem(unitSystem === 'metric' ? 'imperial' : 'metric')}
            className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
          >
            {unitSystem === 'metric' ? 'Cambiar a Imperiales' : 'Cambiar a Métricas'}
          </button>
        </div>
      </div>

      {/* Botones para añadir carga */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <button
            onClick={() => addItem('box')}
            className="flex-1 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Package className="w-5 h-5" />
            Agregar Carga Tipo CAJA
          </button>
          <button
            onClick={() => addItem('cylinder')}
            className="flex-1 p-4 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Archive className="w-5 h-5" />
            Agregar Carga Tipo CILÍNDRICA
          </button>
        </div>

        {/* Acciones en bloque */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2 text-sm">
            <button onClick={() => bulkUpdateRotation(true)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
              <RotateCw className="w-4 h-4 inline mr-1" />
              Rotación: Marcar todo
            </button>
            <button onClick={() => bulkUpdateRotation(false)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
              <RotateCw className="w-4 h-4 inline mr-1" />
              Rotación: Desmarcar todo
            </button>
            <button onClick={() => bulkUpdateInclude(true)} className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
              Incluir: Marcar todo
            </button>
            <button onClick={() => bulkUpdateInclude(false)} className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
              Incluir: Desmarcar todo
            </button>
            <button onClick={deleteAllItems} className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
              <Trash2 className="w-4 h-4 inline mr-1" />
              Borrar todo
            </button>
          </div>
        )}
      </div>

      {/* Lista de items */}
      {items.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
          <Package size={48} className="mx-auto text-gray-400 mb-2" />
          <p className="text-gray-600">No hay items añadidos</p>
          <p className="text-sm text-gray-500">Haz clic en "Agregar Carga" para comenzar</p>
        </div>
      ) : (
        <div className="overflow-x-auto mb-6">
          <table className="w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Nombre</th>
                {/* Dimensiones dinámicas según tipo */}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {unitSystem === 'metric' ? 'Largo (cm)' : 'Length (in)'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {unitSystem === 'metric' ? 'Ancho (cm)' : 'Width (in)'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  {unitSystem === 'metric' ? 'Alto (cm)' : 'Height (in)'}
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Cantidad</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                  Peso/pieza ({unitSystem === 'metric' ? 'kg' : 'lbs'})
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Peso Total</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Volumen</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Color</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Rotación</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Apilado</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Incluir</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const totalWeight = item.quantity * (item.weightPerPiece || 0);
                let volume = 0;

                if (isBoxType(item)) {
                  volume = (item.dimensions.length * item.dimensions.width * item.dimensions.height) / 1000000; // cm³ a m³
                } else if (isCylinderType(item)) {
                  const r = item.dimensions.diameter / 200; // cm a metros, /2 para radio
                  const h = item.dimensions.height / 100; // cm a metros
                  volume = Math.PI * Math.pow(r, 2) * h;
                }

                return (
                  <tr key={item.id} className={`border-t ${item.includeInLoad ? '' : 'bg-gray-50 opacity-60'}`}>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder={isBoxType(item) ? 'Nombre de la caja' : 'Nombre del cilindro'}
                      />
                    </td>

                    {/* Dimensiones */}
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={isBoxType(item) ? item.dimensions.length : item.dimensions.diameter}
                        onChange={(e) => updateItemDimensions(
                          item.id,
                          isBoxType(item) ? 'length' : 'diameter',
                          e.target.value
                        )}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="0"
                      />
                    </td>

                    <td className="px-4 py-3">
                      {isBoxType(item) ? (
                        <input
                          type="number"
                          value={item.dimensions.width}
                          onChange={(e) => updateItemDimensions(item.id, 'width', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0"
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={item.dimensions.height}
                        onChange={(e) => updateItemDimensions(item.id, 'height', e.target.value)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="0"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>

                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.1"
                        value={item.weightPerPiece}
                        onChange={(e) => updateItem(item.id, 'weightPerPiece', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="0"
                      />
                    </td>

                    <td className="px-4 py-3 text-sm">{totalWeight.toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm">{(volume * item.quantity).toFixed(3)}m³</td>

                    {/* Selector de color */}
                    <td className="px-4 py-3">
                      <select
                        value={item.color}
                        onChange={(e) => updateItem(item.id, 'color', e.target.value)}
                        className="w-16 px-1 py-1 border border-gray-300 rounded text-sm"
                        style={{ backgroundColor: item.color, color: 'white' }}
                      >
                        {availableColors.map(color => (
                          <option key={color.value} value={color.value} style={{ backgroundColor: color.value }}>
                            {color.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Control de rotación */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.allowRotation}
                        onChange={(e) => updateItem(item.id, 'allowRotation', e.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>

                    {/* Controles de apilado */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <label className="flex items-center text-xs">
                          <input
                            type="checkbox"
                            checked={item.stackingOptions.allowStackingOn}
                            onChange={(e) => updateStackingOption(item.id, 'allowStackingOn', e.target.checked)}
                            className="w-3 h-3 mr-1"
                          />
                          Encima
                        </label>
                        <label className="flex items-center text-xs">
                          <input
                            type="checkbox"
                            checked={item.stackingOptions.allowStackingUnder}
                            onChange={(e) => updateStackingOption(item.id, 'allowStackingUnder', e.target.checked)}
                            className="w-3 h-3 mr-1"
                          />
                          Debajo
                        </label>
                      </div>
                    </td>

                    {/* Incluir in carga */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={item.includeInLoad}
                        onChange={(e) => updateItem(item.id, 'includeInLoad', e.target.checked)}
                        className="w-4 h-4"
                      />
                    </td>

                    {/* Eliminar */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
                onChange={(e) => {
                  if (e.target.checked) {
                    setAdditionalServices([...additionalServices, 'tailgate']);
                  } else {
                    setAdditionalServices(additionalServices.filter(s => s !== 'tailgate'));
                  }
                }}
                className="mr-2"
              />
              <span className="text-sm">Plataforma elevadora</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={additionalServices.includes('tempControlled')}
                onChange={(e) => {
                  if (e.target.checked) {
                    setAdditionalServices([...additionalServices, 'tempControlled']);
                  } else {
                    setAdditionalServices(additionalServices.filter(s => s !== 'tempControlled'));
                  }
                }}
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
        disabled={loading || items.filter(item => item.includeInLoad).length === 0}
        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2 font-medium"
      >
        {loading ? (
          <>Calculando...</>
        ) : (
          <>
            <Calculator size={20} />
            Calcular Carga Avanzada
          </>
        )}
      </button>

      {/* Resultados */}
      {calculation && (
        <div className="mt-8 space-y-6">
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Resultados del Cálculo Avanzado</h3>

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
                  <p className="text-sm text-gray-600">Items Incluidos</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {calculation.loadMetrics.totalItems || items.filter(i => i.includeInLoad).length}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedLoadCalculator;