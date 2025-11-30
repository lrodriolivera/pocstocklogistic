#!/usr/bin/env python3
"""
Generador de cotización para transporte terrestre europeo
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append('./ai-service')

from european_logistics import EuropeanLogisticsService
import json

def generate_quotation():
    # Crear instancia del servicio
    service = EuropeanLogisticsService()

    # Datos de cotización
    quote_data = {
        'origin': 'Sevilla',
        'destination': 'Lyon',
        'weight_kg': 300,
        'cargo_type': 'carga_general',
        'pickup_date': '2025-10-01'
    }

    # Generar cotización
    quote = service.generate_european_quote(quote_data)

    if quote:
        print(f'✅ Cotización generada exitosamente')
        quote_id = f'SL-{quote["fecha_recogida"].replace("-", "")}-{quote["peso_kg"]}'
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
    generate_quotation()