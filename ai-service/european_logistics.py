#!/usr/bin/env python3
"""
Sistema de Logística Europea para LUC1
Transporte terrestre desde España hacia destinos europeos
"""

import requests
import json
from typing import Optional, Dict, List
from loguru import logger
import os
from datetime import datetime, timedelta

class EuropeanLogisticsService:
    def __init__(self):
        """
        Servicio integrado para cotizaciones de transporte terrestre europeo
        """
        # URLs de los servicios del backend
        self.backend_url = os.getenv('BACKEND_URL', 'http://localhost:5000')

        # Endpoints de servicios
        self.endpoints = {
            'openroute': f"{self.backend_url}/api/routes",
            'tollguru': f"{self.backend_url}/api/tolls",
            'restrictions': f"{self.backend_url}/api/restrictions",
            'holidays': f"{self.backend_url}/api/holidays"
        }

        # Ciudades europeas principales desde España
        self.european_cities = {
            'francia': ['parís', 'lyon', 'marsella', 'toulouse', 'niza', 'burdeos'],
            'alemania': ['berlín', 'múnich', 'hamburgo', 'frankfurt', 'colonia', 'stuttgart'],
            'italia': ['roma', 'milán', 'nápoles', 'turín', 'florencia', 'venecia'],
            'países bajos': ['ámsterdam', 'róterdam', 'la haya', 'utrecht'],
            'bélgica': ['bruselas', 'amberes', 'gante', 'brujas'],
            'suiza': ['zurich', 'ginebra', 'berna', 'basilea'],
            'austria': ['viena', 'salzburgo', 'innsbruck', 'graz'],
            'portugal': ['lisboa', 'oporto', 'braga', 'coimbra'],
            'república checa': ['praga', 'brno', 'ostrava'],
            'polonia': ['varsovia', 'cracovia', 'gdansk', 'wrocław']
        }

        # Tarifas base por km para transporte terrestre europeo
        self.base_rates = {
            'carga_general': 1.20,     # EUR por kg por 100km
            'carga_fragil': 1.80,      # EUR por kg por 100km
            'electronica': 2.10,       # EUR por kg por 100km
            'quimicos': 2.50,          # EUR por kg por 100km
            'alimentarios': 1.60,      # EUR por kg por 100km
            'refrigerado': 2.20,       # EUR por kg por 100km
            'peligrosa': 3.00          # EUR por kg por 100km
        }

        logger.info("🚚 EuropeanLogisticsService inicializado para transporte terrestre")

    async def get_route_calculation(self, origin: str, destination: str, vehicle_specs: Dict = None):
        """
        Obtener cálculo de ruta usando OpenRouteService a través del backend
        """
        try:
            if not vehicle_specs:
                vehicle_specs = {
                    'weight': 20,  # toneladas
                    'height': 4,   # metros
                    'width': 2.5,  # metros
                    'length': 16.5 # metros
                }

            payload = {
                'origin': origin,
                'destination': destination,
                'vehicle': vehicle_specs,
                'profile': 'driving-hgv'  # Heavy Goods Vehicle
            }

            response = requests.post(self.endpoints['openroute'], json=payload, timeout=15)

            if response.status_code == 200:
                route_data = response.json()
                return {
                    'distance_km': route_data.get('distance', 0) / 1000,
                    'duration_hours': route_data.get('duration', 0) / 3600,
                    'polyline': route_data.get('geometry'),
                    'countries': route_data.get('countries', []),
                    'success': True
                }
            else:
                logger.warning(f"OpenRoute error: {response.status_code}")
                return self._fallback_route_calculation(origin, destination)

        except Exception as e:
            logger.error(f"Error calling OpenRoute: {e}")
            return self._fallback_route_calculation(origin, destination)

    async def get_toll_calculation(self, polyline: str, vehicle_specs: Dict):
        """
        Calcular peajes usando TollGuru a través del backend
        """
        try:
            payload = {
                'polyline': polyline,
                'vehicle': {
                    'type': 'truck',
                    'weight': vehicle_specs.get('weight', 20),
                    'axles': 3,
                    'height': vehicle_specs.get('height', 4),
                    'emissionClass': 'euro6'
                }
            }

            response = requests.post(self.endpoints['tollguru'], json=payload, timeout=15)

            if response.status_code == 200:
                toll_data = response.json()
                return {
                    'total_cost': toll_data.get('totalCost', 0),
                    'currency': toll_data.get('currency', 'EUR'),
                    'breakdown': toll_data.get('breakdown', []),
                    'countries': toll_data.get('countries', []),
                    'success': True
                }
            else:
                logger.warning(f"TollGuru error: {response.status_code}")
                return {'total_cost': 0, 'currency': 'EUR', 'success': False}

        except Exception as e:
            logger.error(f"Error calling TollGuru: {e}")
            return {'total_cost': 0, 'currency': 'EUR', 'success': False}

    async def get_restrictions_and_holidays(self, countries: List[str], pickup_date: str, vehicle_specs: Dict):
        """
        Obtener restricciones de tráfico y festivos
        """
        try:
            payload = {
                'countries': countries,
                'date': pickup_date,
                'vehicle': vehicle_specs
            }

            response = requests.post(self.endpoints['restrictions'], json=payload, timeout=10)

            if response.status_code == 200:
                restrictions_data = response.json()
                return {
                    'restrictions': restrictions_data.get('alerts', []),
                    'holidays': restrictions_data.get('holidays', []),
                    'critical_alerts': restrictions_data.get('summary', {}).get('critical', 0),
                    'success': True
                }
            else:
                logger.warning(f"Restrictions API error: {response.status_code}")
                return self._fallback_restrictions(countries, pickup_date)

        except Exception as e:
            logger.error(f"Error getting restrictions: {e}")
            return self._fallback_restrictions(countries, pickup_date)

    def generate_european_quote(self, quote_data: Dict):
        """
        Generar cotización completa para transporte terrestre europeo
        """
        try:
            # Datos extraídos
            weight_kg = quote_data.get('weight_kg', 1000)  # Default 1 tonelada
            origin = quote_data.get('origin', 'Madrid')
            destination = quote_data.get('destination')
            cargo_type = quote_data.get('cargo_type', 'carga_general')
            pickup_date = quote_data.get('pickup_date',
                                       (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'))

            if not destination:
                return None

            # Especificaciones del vehículo basadas en peso
            vehicle_specs = self._get_vehicle_specs(weight_kg)

            # 1. Calcular ruta
            route_data = self._sync_call(self.get_route_calculation(origin, destination, vehicle_specs))

            if not route_data['success']:
                return None

            # 2. Calcular peajes si hay polyline
            toll_data = {'total_cost': 0, 'currency': 'EUR'}
            if route_data.get('polyline'):
                toll_data = self._sync_call(self.get_toll_calculation(route_data['polyline'], vehicle_specs))

            # 3. Verificar restricciones y festivos
            restrictions_data = self._sync_call(
                self.get_restrictions_and_holidays(route_data['countries'], pickup_date, vehicle_specs)
            )

            # 4. Calcular costo base de transporte
            distance_km = route_data['distance_km']
            rate_per_kg_100km = self.base_rates.get(cargo_type, self.base_rates['carga_general'])
            transport_cost = (weight_kg * rate_per_kg_100km * distance_km) / 100

            # 5. Costos adicionales
            fuel_cost = distance_km * 0.35  # EUR por km (combustible)
            insurance_cost = max(weight_kg * 0.05, 50)  # Seguro mínimo 50 EUR

            # 6. Peajes
            toll_cost = toll_data.get('total_cost', 0)

            # 7. Total
            total_cost = transport_cost + fuel_cost + insurance_cost + toll_cost

            # 8. Tiempo estimado
            base_hours = route_data['duration_hours']
            # Agregar tiempo por restricciones y paradas obligatorias
            additional_hours = 2 + (distance_km / 500) * 8  # Descansos obligatorios cada 500km
            total_hours = base_hours + additional_hours
            estimated_days = max(1, round(total_hours / 10))  # 10 horas de conducción por día

            quote = {
                'origen': origin,
                'destino': destination,
                'peso_kg': weight_kg,
                'tipo_carga': cargo_type,
                'tipo_transporte': 'terrestre',
                'distancia_km': round(distance_km, 1),
                'paises_transito': route_data['countries'],
                'fecha_recogida': pickup_date,

                # Costos detallados
                'costo_transporte_eur': round(transport_cost, 2),
                'costo_combustible_eur': round(fuel_cost, 2),
                'costo_peajes_eur': round(toll_cost, 2),
                'costo_seguro_eur': round(insurance_cost, 2),
                'costo_total_eur': round(total_cost, 2),

                # Tiempos
                'tiempo_estimado_dias': estimated_days,
                'horas_conduccion': round(base_hours, 1),

                # Restricciones y alertas
                'restricciones': restrictions_data.get('restrictions', []),
                'alertas_criticas': restrictions_data.get('critical_alerts', 0),
                'festivos_ruta': restrictions_data.get('holidays', []),

                # Vehículo
                'vehiculo': vehicle_specs,

                'validez_dias': 7
            }

            return quote

        except Exception as e:
            logger.error(f"Error generating European quote: {e}")
            return None

    def _get_vehicle_specs(self, weight_kg: float):
        """Obtener especificaciones del vehículo según el peso"""
        if weight_kg <= 3500:  # Furgoneta
            return {
                'type': 'van',
                'weight': weight_kg / 1000,
                'height': 2.5,
                'width': 2.0,
                'length': 6.0,
                'axles': 2
            }
        elif weight_kg <= 12000:  # Camión rígido
            return {
                'type': 'truck',
                'weight': weight_kg / 1000,
                'height': 3.5,
                'width': 2.5,
                'length': 12.0,
                'axles': 3
            }
        else:  # Tráiler
            return {
                'type': 'truck',
                'weight': weight_kg / 1000,
                'height': 4.0,
                'width': 2.5,
                'length': 16.5,
                'axles': 5
            }

    def _sync_call(self, async_func):
        """Convertir llamada async a sync para compatibilidad"""
        import asyncio
        import threading

        try:
            # Verificar si ya hay un event loop en este hilo
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Si hay un loop corriendo, usar threads para evitar conflicto
                result = None
                exception = None

                def run_in_thread():
                    nonlocal result, exception
                    try:
                        new_loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(new_loop)
                        result = new_loop.run_until_complete(async_func)
                        new_loop.close()
                    except Exception as e:
                        exception = e

                thread = threading.Thread(target=run_in_thread)
                thread.start()
                thread.join()

                if exception:
                    raise exception
                return result
            else:
                return loop.run_until_complete(async_func)
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(async_func)
            loop.close()
            return result

    def _fallback_route_calculation(self, origin: str, destination: str):
        """Cálculo de ruta de fallback con distancias aproximadas"""
        # Distancias aproximadas desde España
        fallback_distances = {
            'francia': 800, 'alemania': 1200, 'italia': 1100,
            'países bajos': 1300, 'bélgica': 1000, 'suiza': 1000,
            'austria': 1400, 'portugal': 400, 'república checa': 1600,
            'polonia': 1800
        }

        destination_lower = destination.lower()
        distance = 500  # Default

        for country, dist in fallback_distances.items():
            if country in destination_lower:
                distance = dist
                break

        return {
            'distance_km': distance,
            'duration_hours': distance / 80,  # 80 km/h promedio
            'countries': ['ES', self._get_country_code(destination)],
            'success': True
        }

    def _fallback_restrictions(self, countries: List[str], pickup_date: str):
        """Restricciones de fallback básicas"""
        alerts = []

        # Verificar si es domingo
        pickup_datetime = datetime.strptime(pickup_date, '%Y-%m-%d')
        if pickup_datetime.weekday() == 6:  # Domingo
            for country in countries:
                if country in ['DE', 'AT', 'CH']:
                    alerts.append({
                        'type': 'weekend_ban',
                        'severity': 'critical',
                        'country': country,
                        'message': f'PROHIBIDA circulación camiones domingos en {country}'
                    })

        return {
            'restrictions': alerts,
            'holidays': [],
            'critical_alerts': len([a for a in alerts if a['severity'] == 'critical'])
        }

    def _get_country_code(self, destination: str):
        """Obtener código de país del destino"""
        country_codes = {
            'francia': 'FR', 'alemania': 'DE', 'italia': 'IT',
            'países bajos': 'NL', 'bélgica': 'BE', 'suiza': 'CH',
            'austria': 'AT', 'portugal': 'PT', 'república checa': 'CZ',
            'polonia': 'PL'
        }

        destination_lower = destination.lower()
        for country, code in country_codes.items():
            if country in destination_lower:
                return code

        return 'EU'  # Default