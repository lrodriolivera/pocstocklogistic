import React from 'react';
import { Heart, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Información de la Empresa */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Logistic</h3>
            <p className="text-gray-600 mb-4 max-w-md">
              Sistema de Cotizaciones Inteligente powered by LUC1-COMEX AI.
              Especializado en transporte terrestre por Europa con la más alta
              precisión y eficiencia.
            </p>
            <div className="flex items-center text-sm text-gray-500">
              <span>Desarrollado con</span>
              <Heart className="w-4 h-4 text-red-500 mx-1" />
              <span>para optimizar tu logística</span>
            </div>
          </div>

          {/* Enlaces Rápidos */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Enlaces Rápidos
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Nueva Cotización
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Historial
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Clientes
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Configuración
                </a>
              </li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
              Soporte
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Documentación
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  API Reference
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Centro de Ayuda
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-600 hover:text-blue-600 transition-colors flex items-center"
                >
                  Estado del Sistema
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Información Técnica */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Estado del Sistema</h5>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">API: Operacional</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">LUC1-COMEX: Online</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-gray-600">DB: Conectada</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">
                <p>Versión: 1.0.0</p>
                <p>Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
                <p>Tiempo de actividad: 99.9%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            © 2025 Stock Logistic. Todos los derechos reservados.
          </p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <a href="#" className="hover:text-blue-600 transition-colors">
              Términos de Servicio
            </a>
            <a href="#" className="hover:text-blue-600 transition-colors">
              Política de Privacidad
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;