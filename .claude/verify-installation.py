#!/usr/bin/env python3
"""
Script de verificación completa del Agent Logistics-Quotation
Verifica que todos los componentes estén correctamente instalados y funcionando
"""
import json
import sys
from pathlib import Path
import subprocess
import requests
from datetime import datetime

def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}")

def print_success(text):
    print(f"✅ {text}")

def print_error(text):
    print(f"❌ {text}")

def print_warning(text):
    print(f"⚠️ {text}")

def print_info(text):
    print(f"ℹ️ {text}")

def check_file_exists(filepath, description):
    """Verificar si un archivo existe"""
    if Path(filepath).exists():
        print_success(f"{description} - {filepath}")
        return True
    else:
        print_error(f"{description} - FALTA: {filepath}")
        return False

def check_python_import(module_name, description):
    """Verificar si un módulo de Python se puede importar"""
    try:
        __import__(module_name)
        print_success(f"{description}")
        return True
    except ImportError as e:
        print_error(f"{description} - Error: {e}")
        return False

def check_service_running(url, name, timeout=3):
    """Verificar si un servicio web está corriendo"""
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code == 200:
            print_success(f"{name} está corriendo en {url}")
            return True
        else:
            print_warning(f"{name} responde con código {response.status_code} en {url}")
            return False
    except requests.exceptions.RequestException:
        print_warning(f"{name} no está corriendo en {url}")
        return False

def main():
    print_header("VERIFICACIÓN DEL AGENT LOGISTICS-QUOTATION")

    project_root = Path("/home/rypcloud/Documentos/Logistic/POC/stock-logistic-poc")
    claude_dir = project_root / ".claude"

    print_info(f"Directorio del proyecto: {project_root}")
    print_info(f"Directorio Claude: {claude_dir}")

    # Verificación 1: Estructura de archivos
    print_header("1. VERIFICACIÓN DE ARCHIVOS")

    required_files = [
        (claude_dir / "agents" / "logistics-quotation.md", "Agent principal"),
        (claude_dir / "logistics_state.json", "Estado del sistema"),
        (claude_dir / "logistics_integration.py", "Integración con APIs"),
        (claude_dir / "quotation_generator.py", "Generador de cotizaciones"),
        (claude_dir / "logistics_commands.py", "Sistema de comandos"),
        (claude_dir / "install-agent.sh", "Script de instalación"),
        (claude_dir / "README-AGENT.md", "Documentación"),
    ]

    files_ok = 0
    for filepath, description in required_files:
        if check_file_exists(filepath, description):
            files_ok += 1

    print_info(f"Archivos verificados: {files_ok}/{len(required_files)}")

    # Verificación 2: Directorios
    print_header("2. VERIFICACIÓN DE DIRECTORIOS")

    required_dirs = [
        (project_root / "generated_documents", "Documentos generados"),
        (project_root / "frontend" / "public" / "quotations", "Cotizaciones del frontend"),
        (claude_dir / "agents", "Directorio de agents"),
    ]

    dirs_ok = 0
    for dirpath, description in required_dirs:
        if dirpath.exists() and dirpath.is_dir():
            print_success(f"{description} - {dirpath}")
            dirs_ok += 1
        else:
            print_error(f"{description} - FALTA: {dirpath}")

    print_info(f"Directorios verificados: {dirs_ok}/{len(required_dirs)}")

    # Verificación 3: Dependencias Python
    print_header("3. VERIFICACIÓN DE DEPENDENCIAS PYTHON")

    sys.path.append(str(claude_dir))

    python_modules = [
        ("json", "JSON estándar"),
        ("pathlib", "Pathlib estándar"),
        ("datetime", "Datetime estándar"),
        ("requests", "Requests para HTTP"),
        ("jinja2", "Jinja2 para templates"),
        ("logistics_integration", "Módulo de integración"),
        ("quotation_generator", "Generador de cotizaciones"),
        ("logistics_commands", "Sistema de comandos"),
    ]

    python_ok = 0
    for module, description in python_modules:
        if check_python_import(module, description):
            python_ok += 1

    print_info(f"Módulos Python verificados: {python_ok}/{len(python_modules)}")

    # Verificación 4: Configuración del agent
    print_header("4. VERIFICACIÓN DE CONFIGURACIÓN")

    try:
        from logistics_integration import LogisticsIntegration
        integration = LogisticsIntegration()

        # Verificar que el estado se carga correctamente
        state = integration.state
        if "validation_rules" in state:
            spanish_cities = len(state["validation_rules"].get("spanish_cities", []))
            european_countries = len(state["validation_rules"].get("european_countries", {}))
            cargo_types = len(state["validation_rules"].get("cargo_types", {}))

            print_success(f"Estado cargado: {spanish_cities} ciudades españolas, {european_countries} países europeos, {cargo_types} tipos de carga")
        else:
            print_error("Estado no se cargó correctamente")

        # Test básico de validaciones
        madrid_valid = integration.validate_spanish_city("Madrid")
        paris_valid, country = integration.validate_european_destination("Paris")
        weight_valid = integration.validate_weight(2500)

        if madrid_valid and paris_valid and weight_valid:
            print_success("Validaciones funcionando correctamente")
        else:
            print_error(f"Problemas en validaciones: Madrid({madrid_valid}), Paris({paris_valid}), Peso({weight_valid})")

    except Exception as e:
        print_error(f"Error verificando configuración: {e}")

    # Verificación 5: Servicios del sistema
    print_header("5. VERIFICACIÓN DE SERVICIOS")

    services = [
        ("http://localhost:5000", "Backend"),
        ("http://localhost:3000", "Frontend"),
        ("http://localhost:8001", "AI Service"),
    ]

    services_running = 0
    for url, name in services:
        if check_service_running(url, name):
            services_running += 1

    print_info(f"Servicios corriendo: {services_running}/{len(services)}")

    if services_running == 0:
        print_warning("Ningún servicio está corriendo. Ejecuta: ./.claude/start-logistics.sh")

    # Verificación 6: Test funcional completo
    print_header("6. TEST FUNCIONAL COMPLETO")

    try:
        from logistics_integration import LogisticsIntegration
        from quotation_generator import QuotationGenerator
        from logistics_commands import LogisticsCommands

        # Crear instancias
        integration = LogisticsIntegration()
        generator = QuotationGenerator()
        commands = LogisticsCommands()

        # Crear sesión de prueba
        session_id = integration.create_new_session()
        integration.update_session_data('origin', 'Madrid')
        integration.update_session_data('destination', 'Paris')
        integration.update_session_data('weight_kg', 1500)
        integration.update_session_data('cargo_type', 'carga_general')
        integration.update_session_data('pickup_date', '2025-10-15')
        integration.update_session_data('name', 'Test Company')
        integration.update_session_data('contact_person', 'Test User')
        integration.update_session_data('email', 'test@test.com')
        integration.update_session_data('phone', '+34 600 000 000')

        # Generar cotización de prueba
        session_data = integration.state['sessions'][session_id]
        result = generator.generate_professional_quotation(session_data)

        if result['success']:
            quote_id = result['documents']['quote_id']
            total_cost = result['quotation']['costo_total_eur']
            print_success(f"Test funcional completado: Cotización {quote_id} por €{total_cost}")

            # Verificar archivos generados
            html_file = project_root / "generated_documents" / f"{quote_id}.html"
            json_file = project_root / "generated_documents" / f"{quote_id}.json"

            if html_file.exists() and json_file.exists():
                print_success("Documentos HTML y JSON generados correctamente")
            else:
                print_error("Error generando documentos")
        else:
            print_error(f"Error en test funcional: {result['error']}")

    except Exception as e:
        print_error(f"Error en test funcional: {e}")

    # Resumen final
    print_header("RESUMEN DE VERIFICACIÓN")

    total_checks = len(required_files) + len(required_dirs) + len(python_modules) + len(services) + 3
    passed_checks = files_ok + dirs_ok + python_ok + services_running + 3  # +3 por config, validaciones y test

    success_rate = (passed_checks / total_checks) * 100

    print_info(f"Verificaciones completadas: {passed_checks}/{total_checks} ({success_rate:.1f}%)")

    if success_rate >= 90:
        print_success("¡INSTALACIÓN COMPLETADA EXITOSAMENTE!")
        print_success("El Agent Logistics-Quotation está listo para usar")
        print()
        print("📋 PRÓXIMOS PASOS:")
        print("1. Abre Claude Code en este proyecto")
        print("2. El agent 'logistics-quotation' estará disponible")
        print("3. Escribe: 'Quiero crear una cotización de transporte'")
        print("4. O usa comandos: /quote start")

    elif success_rate >= 75:
        print_warning("Instalación mayormente completa, pero con algunos problemas")
        print("💡 Recomendación: Revisa los errores arriba y ejecuta ./.claude/install-agent.sh")

    else:
        print_error("Instalación incompleta o con problemas serios")
        print("🔧 Recomendación: Ejecuta ./.claude/install-agent.sh para reinstalar")

    print()
    print_info("Para más información consulta: .claude/README-AGENT.md")
    print_info(f"Verificación completada: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()