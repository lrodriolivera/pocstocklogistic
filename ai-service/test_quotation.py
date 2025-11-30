#!/usr/bin/env python3
"""
Test directo de la funcionalidad de cotización
"""

import sys
import os

# Agregar el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from logistics_data import (
    calculate_base_cost,
    get_route_info,
    calculate_additional_costs,
    TRANSPORT_RATES,
    MAIN_ROUTES,
    DELIVERY_TIMES
)

def test_quote_detection():
    """Probar detección y extracción de datos de cotización"""
    print("🤖 Probando funcionalidad de cotización...")

    # Simulación de datos extraídos de: "Necesito cotización para enviar 100kg de productos electrónicos desde Colombia hasta España por vía aérea"
    quote_data = {
        'weight_kg': 100,
        'cargo_type': 'electronica',
        'transport_type': 'aereo',
        'origin': 'Colombia',
        'destination': 'España',
        'declared_value': 5000,
        'volume_m3': 0.5
    }

    print(f"📋 Datos de cotización: {quote_data}")

    # Obtener información de ruta
    route_info = get_route_info(quote_data['origin'], quote_data['destination'])
    print(f"🗺️ Información de ruta: {route_info}")

    if route_info:
        # Obtener distancia para transporte aéreo
        distance_km = route_info.get(quote_data['transport_type'])
        print(f"✈️ Distancia aérea: {distance_km} km")

        # Calcular costo base
        base_cost = calculate_base_cost(
            quote_data['weight_kg'],
            distance_km,
            quote_data['transport_type'],
            quote_data['cargo_type']
        )
        print(f"💰 Costo base: ${base_cost} USD")

        # Calcular costos adicionales
        services = {
            'seguro': 'basico',
            'documentacion': 'internacional',
            'embalaje': 'estandar',
            'manipulacion': 'normal'
        }

        additional_cost, breakdown = calculate_additional_costs(
            quote_data['declared_value'],
            quote_data['weight_kg'],
            quote_data['volume_m3'],
            services
        )
        print(f"📋 Costos adicionales: ${additional_cost} USD")
        print(f"📝 Desglose: {breakdown}")

        # Calcular total
        total_cost = base_cost + additional_cost
        print(f"💵 TOTAL: ${total_cost} USD")

        # Obtener tiempos de entrega
        delivery_scope = 'internacional'
        delivery_time = DELIVERY_TIMES.get(quote_data['transport_type'], {}).get(delivery_scope, {"min": 5, "max": 10})
        print(f"⏰ Tiempo estimado: {delivery_time['min']}-{delivery_time['max']} días")

        print("\n✅ Funcionalidad de cotización probada exitosamente!")
        return True
    else:
        print("❌ No se encontró información de ruta")
        return False

if __name__ == "__main__":
    test_quote_detection()