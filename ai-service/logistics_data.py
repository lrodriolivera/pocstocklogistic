"""
Base de datos de logística para cotizaciones - LUC1
Contiene datos de precios, rutas y tarifas para generar cotizaciones reales
"""

# Tarifas base por kilómetro según tipo de transporte
TRANSPORT_RATES = {
    "terrestre": {
        "carga_general": 1.2,  # USD por kg por 100km
        "carga_fragil": 1.8,
        "electronica": 2.1,
        "quimicos": 2.5,
        "alimentarios": 1.5
    },
    "aereo": {
        "carga_general": 4.5,
        "carga_fragil": 6.2,
        "electronica": 7.1,
        "quimicos": 8.5,
        "alimentarios": 5.2
    },
    "maritimo": {
        "carga_general": 0.8,
        "carga_fragil": 1.2,
        "electronica": 1.4,
        "quimicos": 1.8,
        "alimentarios": 1.0
    }
}

# Rutas principales y distancias (en km)
MAIN_ROUTES = {
    "Colombia-España": {
        "terrestre": None,  # No aplica
        "aereo": 8500,
        "maritimo": 9200,
        "puertos": ["Cartagena", "Barranquilla", "Buenaventura"],
        "aeropuertos": ["BOG", "CLO", "CTG"],
        "destinos_espana": ["Madrid", "Barcelona", "Valencia", "Sevilla"]
    },
    "Colombia-Mexico": {
        "terrestre": 4200,
        "aereo": 3800,
        "maritimo": 4100,
        "fronteras": ["Maicao"],
        "puertos": ["Cartagena", "Barranquilla"],
        "aeropuertos": ["BOG", "MDE", "CLO"]
    },
    "Colombia-USA": {
        "terrestre": 5800,
        "aereo": 4200,
        "maritimo": 5100,
        "puertos": ["Cartagena", "Barranquilla", "Buenaventura"],
        "aeropuertos": ["BOG", "MDE", "CLO", "CTG"]
    },
    "Colombia-Ecuador": {
        "terrestre": 450,
        "aereo": 400,
        "maritimo": 1200,
        "fronteras": ["Rumichaca", "San Miguel"],
        "puertos": ["Buenaventura"],
        "aeropuertos": ["BOG", "CLO"]
    }
}

# Costos adicionales
ADDITIONAL_COSTS = {
    "seguro": {
        "basico": 0.5,  # % del valor declarado
        "premium": 1.2,
        "total": 2.0
    },
    "documentacion": {
        "nacional": 25,  # USD
        "internacional": 85,
        "export_import": 150
    },
    "embalaje": {
        "estandar": 15,  # USD por m³
        "fragil": 35,
        "especial": 55
    },
    "manipulacion": {
        "normal": 0.8,  # % del peso
        "fragil": 1.5,
        "peligroso": 2.2
    }
}

# Tiempos estimados de entrega (en días)
DELIVERY_TIMES = {
    "terrestre": {
        "nacional": {"min": 1, "max": 3},
        "regional": {"min": 3, "max": 7},
        "internacional": {"min": 7, "max": 15}
    },
    "aereo": {
        "nacional": {"min": 1, "max": 2},
        "regional": {"min": 1, "max": 3},
        "internacional": {"min": 2, "max": 5}
    },
    "maritimo": {
        "regional": {"min": 5, "max": 10},
        "internacional": {"min": 15, "max": 35}
    }
}

def calculate_base_cost(weight_kg, distance_km, transport_type, cargo_type):
    """
    Calcula el costo base de transporte
    """
    if transport_type not in TRANSPORT_RATES:
        return None

    if cargo_type not in TRANSPORT_RATES[transport_type]:
        cargo_type = "carga_general"

    rate = TRANSPORT_RATES[transport_type][cargo_type]

    # Fórmula: (peso * tarifa * distancia) / 100
    base_cost = (weight_kg * rate * distance_km) / 100

    return round(base_cost, 2)

def get_route_info(origin, destination):
    """
    Obtiene información de ruta entre origen y destino
    """
    route_key = f"{origin}-{destination}"
    return MAIN_ROUTES.get(route_key, None)

def calculate_additional_costs(declared_value, weight_kg, volume_m3, services):
    """
    Calcula costos adicionales según servicios solicitados
    """
    total_additional = 0
    breakdown = {}

    # Seguro
    if "seguro" in services:
        insurance_rate = ADDITIONAL_COSTS["seguro"].get(services["seguro"], 0.5)
        insurance_cost = declared_value * (insurance_rate / 100)
        total_additional += insurance_cost
        breakdown["seguro"] = round(insurance_cost, 2)

    # Documentación
    if "documentacion" in services:
        doc_cost = ADDITIONAL_COSTS["documentacion"].get(services["documentacion"], 25)
        total_additional += doc_cost
        breakdown["documentacion"] = doc_cost

    # Embalaje
    if "embalaje" in services:
        packaging_rate = ADDITIONAL_COSTS["embalaje"].get(services["embalaje"], 15)
        packaging_cost = volume_m3 * packaging_rate
        total_additional += packaging_cost
        breakdown["embalaje"] = round(packaging_cost, 2)

    # Manipulación
    if "manipulacion" in services:
        handling_rate = ADDITIONAL_COSTS["manipulacion"].get(services["manipulacion"], 0.8)
        handling_cost = weight_kg * (handling_rate / 100) * 50  # Base de $50 por ton
        total_additional += handling_cost
        breakdown["manipulacion"] = round(handling_cost, 2)

    return round(total_additional, 2), breakdown