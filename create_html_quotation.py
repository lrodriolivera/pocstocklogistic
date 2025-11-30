#!/usr/bin/env python3
"""
Generador de cotización HTML profesional
"""
import json
import os
from datetime import datetime

def create_html_quotation():
    """Crear documento HTML profesional de la cotización"""

    # Cargar datos de la cotización
    json_path = './generated_documents/SL-20251001-300.json'

    with open(json_path, 'r', encoding='utf-8') as f:
        quote = json.load(f)

    # Template HTML profesional
    html_template = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cotización de Transporte - {quote_id}</title>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 900px;
            margin: 20px auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #2c3e50, #3498db);
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }}
        .header p {{
            margin: 10px 0 0 0;
            opacity: 0.9;
            font-size: 1.1em;
        }}
        .content {{
            padding: 40px;
        }}
        .quote-info {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }}
        .info-section {{
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }}
        .info-section h3 {{
            margin-top: 0;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        .route-section {{
            background: linear-gradient(135deg, #e8f4fd, #f0f8ff);
            padding: 25px;
            border-radius: 10px;
            margin: 30px 0;
            border: 2px solid #3498db;
        }}
        .route-visual {{
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            margin: 20px 0;
        }}
        .city {{
            background: #3498db;
            color: white;
            padding: 15px 25px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 1.1em;
        }}
        .arrow {{
            font-size: 2em;
            color: #3498db;
        }}
        .costs-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .costs-table th, .costs-table td {{
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }}
        .costs-table th {{
            background: #34495e;
            color: white;
            font-weight: 600;
        }}
        .costs-table tr:hover {{
            background: #f8f9fa;
        }}
        .total-row {{
            background: #e8f4fd !important;
            font-weight: bold;
            font-size: 1.2em;
        }}
        .vehicle-info {{
            background: #fff8e1;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #ff9800;
            margin: 20px 0;
        }}
        .footer {{
            background: #34495e;
            color: white;
            padding: 30px;
            text-align: center;
        }}
        .validity {{
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #c3e6cb;
            margin: 20px 0;
            text-align: center;
            font-weight: bold;
        }}
        .icon {{
            width: 20px;
            height: 20px;
            display: inline-block;
        }}
        @media (max-width: 768px) {{
            .quote-info {{
                grid-template-columns: 1fr;
            }}
            .route-visual {{
                flex-direction: column;
            }}
            .container {{
                margin: 10px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚚 COTIZACIÓN DE TRANSPORTE</h1>
            <p>Transporte Terrestre Europeo • ID: {quote_id}</p>
        </div>

        <div class="content">
            <div class="quote-info">
                <div class="info-section">
                    <h3>📋 Detalles del Envío</h3>
                    <p><strong>Peso:</strong> {peso_kg} kg</p>
                    <p><strong>Tipo de carga:</strong> {tipo_carga_display}</p>
                    <p><strong>Fecha de recogida:</strong> {fecha_recogida}</p>
                    <p><strong>Transporte:</strong> {tipo_transporte}</p>
                </div>

                <div class="info-section">
                    <h3>⏱️ Tiempos Estimados</h3>
                    <p><strong>Distancia:</strong> {distancia_km} km</p>
                    <p><strong>Tiempo estimado:</strong> {tiempo_estimado_dias} días</p>
                    <p><strong>Horas de conducción:</strong> {horas_conduccion} h</p>
                    <p><strong>Países de tránsito:</strong> {paises_transito}</p>
                </div>
            </div>

            <div class="route-section">
                <h3 style="text-align: center; color: #2c3e50; margin-bottom: 20px;">🗺️ RUTA DE TRANSPORTE</h3>
                <div class="route-visual">
                    <div class="city">{origen}</div>
                    <div class="arrow">→</div>
                    <div class="city">{destino}</div>
                </div>
                <p style="text-align: center; font-size: 1.1em; color: #5a6c7d;">
                    <strong>Ruta terrestre por carretera</strong><br>
                    Atravesando: {paises_transito}
                </p>
            </div>

            <h3 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">💰 DESGLOSE DE COSTOS</h3>
            <table class="costs-table">
                <thead>
                    <tr>
                        <th>Concepto</th>
                        <th>Detalle</th>
                        <th>Importe (EUR)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>🚛 Costo de transporte</td>
                        <td>Tarifa base por kg/km</td>
                        <td>{costo_transporte_eur} €</td>
                    </tr>
                    <tr>
                        <td>⛽ Combustible</td>
                        <td>Consumo estimado para {distancia_km} km</td>
                        <td>{costo_combustible_eur} €</td>
                    </tr>
                    <tr>
                        <td>🛣️ Peajes</td>
                        <td>Autopistas España-Francia</td>
                        <td>{costo_peajes_eur} €</td>
                    </tr>
                    <tr>
                        <td>🛡️ Seguro</td>
                        <td>Cobertura durante el transporte</td>
                        <td>{costo_seguro_eur} €</td>
                    </tr>
                    <tr class="total-row">
                        <td><strong>TOTAL</strong></td>
                        <td><strong>Precio final del transporte</strong></td>
                        <td><strong>{costo_total_eur} €</strong></td>
                    </tr>
                </tbody>
            </table>

            <div class="vehicle-info">
                <h3 style="margin-top: 0; color: #e65100;">🚚 Información del Vehículo</h3>
                <p><strong>Tipo:</strong> {vehiculo_tipo}</p>
                <p><strong>Capacidad de peso:</strong> {vehiculo_peso} toneladas</p>
                <p><strong>Dimensiones:</strong> {vehiculo_dimensiones}</p>
                <p><strong>Número de ejes:</strong> {vehiculo_ejes}</p>
            </div>

            <div class="validity">
                ⏰ Esta cotización es válida por {validez_dias} días desde la fecha de emisión
            </div>
        </div>

        <div class="footer">
            <p><strong>Cotización generada el:</strong> {fecha_generacion}</p>
            <p>🌍 Transporte Logístico Europeo • ✉️ Contacto: logistics@empresa.com • 📞 +34 900 000 000</p>
        </div>
    </div>
</body>
</html>
    """

    # Preparar datos para el template
    template_data = {
        'quote_id': quote['quote_id'],
        'peso_kg': quote['peso_kg'],
        'tipo_carga_display': quote['tipo_carga'].replace('_', ' ').title(),
        'fecha_recogida': quote['fecha_recogida'],
        'tipo_transporte': quote['tipo_transporte'].title(),
        'distancia_km': quote['distancia_km'],
        'tiempo_estimado_dias': quote['tiempo_estimado_dias'],
        'horas_conduccion': quote['horas_conduccion'],
        'paises_transito': ' → '.join(quote['paises_transito']),
        'origen': quote['origen'],
        'destino': quote['destino'],
        'costo_transporte_eur': quote['costo_transporte_eur'],
        'costo_combustible_eur': quote['costo_combustible_eur'],
        'costo_peajes_eur': quote['costo_peajes_eur'],
        'costo_seguro_eur': quote['costo_seguro_eur'],
        'costo_total_eur': quote['costo_total_eur'],
        'vehiculo_tipo': quote['vehiculo']['type'].title(),
        'vehiculo_peso': quote['vehiculo']['weight'],
        'vehiculo_dimensiones': f"{quote['vehiculo']['length']}m x {quote['vehiculo']['width']}m x {quote['vehiculo']['height']}m",
        'vehiculo_ejes': quote['vehiculo']['axles'],
        'validez_dias': quote['validez_dias'],
        'fecha_generacion': quote['fecha_generacion']
    }

    # Generar HTML
    html_content = html_template.format(**template_data)

    # Guardar archivo HTML
    html_path = f'./generated_documents/{quote["quote_id"]}.html'
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    # También copiar a la carpeta del frontend
    frontend_path = f'./frontend/public/quotations/{quote["quote_id"]}.html'
    os.makedirs('./frontend/public/quotations', exist_ok=True)
    with open(frontend_path, 'w', encoding='utf-8') as f:
        f.write(html_content)

    return html_path, frontend_path

def main():
    """Función principal"""
    print("📄 Generando documento HTML de cotización...")

    html_path, frontend_path = create_html_quotation()

    print(f"✅ Documento HTML generado exitosamente")
    print(f"📁 Ubicación principal: {html_path}")
    print(f"🌐 Ubicación frontend: {frontend_path}")

    return html_path, frontend_path

if __name__ == "__main__":
    main()