#!/usr/bin/env python3
"""
Generador simple de cotización para transporte terrestre europeo
"""
import json
import os
from datetime import datetime, timedelta

def generate_simple_quotation():
    """Generar cotización sin dependencias externas"""

    # Datos de entrada
    origin = "Sevilla"
    destination = "Lyon"
    weight_kg = 300
    cargo_type = "carga_general"
    pickup_date = "2025-10-01"

    # Calcular distancia aproximada (Sevilla - Lyon)
    distance_km = 900  # Aproximada

    # Tarifas base por tipo de carga (EUR por kg por 100km)
    base_rates = {
        'carga_general': 1.20,
        'carga_fragil': 1.80,
        'electronica': 2.10,
        'quimicos': 2.50,
        'alimentarios': 1.60,
        'refrigerado': 2.20,
        'peligrosa': 3.00
    }

    # Vehículo para 300kg (furgoneta)
    vehicle_specs = {
        'type': 'van',
        'weight': 0.3,  # toneladas
        'height': 2.5,
        'width': 2.0,
        'length': 6.0,
        'axles': 2
    }

    # Cálculos de costos
    rate_per_kg_100km = base_rates.get(cargo_type, base_rates['carga_general'])
    transport_cost = (weight_kg * rate_per_kg_100km * distance_km) / 100

    fuel_cost = distance_km * 0.35  # EUR por km
    insurance_cost = max(weight_kg * 0.05, 50)  # Mínimo 50 EUR
    toll_cost = 85  # Estimado para España-Francia

    total_cost = transport_cost + fuel_cost + insurance_cost + toll_cost

    # Tiempo estimado
    base_hours = distance_km / 80  # 80 km/h promedio
    additional_hours = 2 + (distance_km / 500) * 8  # Descansos
    total_hours = base_hours + additional_hours
    estimated_days = max(1, round(total_hours / 10))  # 10 horas/día

    # ID de cotización
    quote_id = f"SL-{pickup_date.replace('-', '')}-{weight_kg}"

    # Estructura de cotización
    quote = {
        'quote_id': quote_id,
        'origen': origin,
        'destino': destination,
        'peso_kg': weight_kg,
        'tipo_carga': cargo_type,
        'tipo_transporte': 'terrestre',
        'distancia_km': distance_km,
        'paises_transito': ['ES', 'FR'],
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
        'restricciones': [],
        'alertas_criticas': 0,
        'festivos_ruta': [],

        # Vehículo
        'vehiculo': vehicle_specs,

        'validez_dias': 7,
        'fecha_generacion': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'moneda': 'EUR'
    }

    return quote, quote_id

def main():
    """Función principal"""
    print("🚚 Generando cotización de transporte terrestre europeo...")

    quote, quote_id = generate_simple_quotation()

    if quote:
        print(f'✅ Cotización generada exitosamente')
        print(f'📋 ID: {quote_id}')
        print(f'💰 Costo total: {quote["costo_total_eur"]} EUR')
        print(f'📊 Distancia: {quote["distancia_km"]} km')
        print(f'⏱️ Tiempo estimado: {quote["tiempo_estimado_dias"]} días')
        print(f'🚚 Vehículo: {quote["vehiculo"]["type"]}')
        print(f'🗺️ Países de tránsito: {", ".join(quote["paises_transito"])}')

        # Crear directorio para documentos generados
        os.makedirs('./generated_documents', exist_ok=True)

        # Guardar en JSON
        json_path = f'./generated_documents/{quote_id}.json'

        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(quote, f, indent=2, ensure_ascii=False)

        print(f'💾 Guardado en: {json_path}')
        return quote, quote_id, json_path
    else:
        print('❌ Error generando cotización')
        return None, None, None

if __name__ == "__main__":
    main()