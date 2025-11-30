#!/usr/bin/env python3
"""
Test de extracción de datos de cotización
"""

import sys
import os
import re

# Agregar el directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def extract_quote_data(text):
    """Función de prueba para extracción de datos"""
    data = {}

    # Detectar peso
    weight_patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:kg|kilos?|kilogramos?)',
        r'(\d+(?:\.\d+)?)\s*(?:ton|toneladas?)',
        r'peso[:\s]*(\d+(?:\.\d+)?)',
    ]

    for pattern in weight_patterns:
        match = re.search(pattern, text.lower())
        if match:
            weight = float(match.group(1))
            if 'ton' in pattern:
                weight *= 1000  # Convertir a kg
            data['weight_kg'] = weight
            break

    # Detectar origen y destino
    countries = ['colombia', 'españa', 'mexico', 'usa', 'estados unidos', 'ecuador', 'perú', 'venezuela']

    # Detectar patrones "desde X hasta Y"
    desde_hasta_pattern = r'desde\s+(\w+).*?hasta\s+(\w+)'
    match = re.search(desde_hasta_pattern, text.lower())
    if match:
        origin_word = match.group(1)
        destination_word = match.group(2)

        for country in countries:
            if country in origin_word:
                data['origin'] = country.title()
            if country in destination_word:
                data['destination'] = country.title()

    # Detectar tipo de carga
    cargo_types = {
        'electrónicos': 'electronica',
        'electrónica': 'electronica',
        'productos electrónicos': 'electronica',
    }

    for key, value in cargo_types.items():
        if key in text.lower():
            data['cargo_type'] = value
            break

    # Detectar tipo de transporte
    transport_types = {
        'aéreo': 'aereo',
        'avión': 'aereo',
        'aire': 'aereo',
    }

    for key, value in transport_types.items():
        if key in text.lower():
            data['transport_type'] = value
            break

    return data

def test_extractions():
    """Probar varias frases de cotización"""
    test_cases = [
        "Necesito cotización para enviar 10kg de productos electrónicos desde Colombia hasta España por vía aérea",
        "cuanto cuesta enviar 100kg desde colombia a españa",
        "precio para mandar 50kg de electronica de colombia a mexico por avion"
    ]

    for i, text in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}: {text}")
        result = extract_quote_data(text)
        print(f"📋 Datos extraídos: {result}")

if __name__ == "__main__":
    test_extractions()