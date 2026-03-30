import React from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Calculator, Globe, Users, Zap, Shield,
  ArrowRight, CheckCircle, BarChart3, Clock, MapPin, Send
} from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header / Navbar */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Truck className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold text-gray-900">AXEL</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 transition-colors"
              >
                Iniciar Sesion
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Empezar Gratis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDE3djI2SDI0VjE3aDEyem0xMi0xN3Y2MEgxMlYwaDM2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              AXEL - Cotizaciones de Transporte{' '}
              <span className="text-blue-300">Inteligentes</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">
              Genera cotizaciones de transporte precisas en segundos con inteligencia artificial.
              Rutas optimizadas, peajes calculados, restricciones analizadas y precios competitivos
              para toda Europa.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-blue-900 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
              >
                Empezar Gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all"
              >
                Iniciar Sesion
              </Link>
            </div>
          </div>
        </div>
        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80L60 68C120 56 240 32 360 24C480 16 600 24 720 32C840 40 960 48 1080 48C1200 48 1320 40 1380 36L1440 32V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Todo lo que necesitas para cotizar transporte
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Herramientas potenciadas por IA para automatizar y optimizar tus cotizaciones de transporte terrestre.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Cotizaciones en Segundos</h3>
              <p className="text-gray-600 leading-relaxed">
                La IA genera cotizaciones al instante con calculo de ruta, peajes, restricciones
                de circulacion y costes desglosados. Sin esperas, sin hojas de calculo.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Analisis de Mercado</h3>
              <p className="text-gray-600 leading-relaxed">
                Compara precios de transportistas, consulta bolsas de carga y analiza tarifas
                del mercado para ofrecer siempre el mejor precio.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Portal de Clientes</h3>
              <p className="text-gray-600 leading-relaxed">
                Comparte cotizaciones con tus clientes, permite negociacion online y haz
                seguimiento de aceptaciones en tiempo real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Como funciona
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Tres pasos simples para generar cotizaciones profesionales.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold shadow-lg shadow-blue-600/30">
                1
              </div>
              <div className="flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-xl font-bold text-gray-900">Define tu ruta</h3>
              </div>
              <p className="text-gray-600">
                Introduce origen, destino, tipo de carga y peso. AXEL se encarga del resto.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold shadow-lg shadow-blue-600/30">
                2
              </div>
              <div className="flex items-center justify-center mb-4">
                <Calculator className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-xl font-bold text-gray-900">La IA calcula costes</h3>
              </div>
              <p className="text-gray-600">
                Calculo automatico de distancia, peajes, combustible, restricciones y margen comercial.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 text-white text-2xl font-bold shadow-lg shadow-blue-600/30">
                3
              </div>
              <div className="flex items-center justify-center mb-4">
                <Send className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-xl font-bold text-gray-900">Envia al cliente</h3>
              </div>
              <p className="text-gray-600">
                Genera PDF profesional, envia por email o comparte via portal de cliente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center mb-3">
                <Globe className="h-8 w-8 text-blue-300" />
              </div>
              <div className="text-4xl font-extrabold text-white">500+</div>
              <div className="text-blue-200 mt-1">Rutas europeas</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-3">
                <MapPin className="h-8 w-8 text-blue-300" />
              </div>
              <div className="text-4xl font-extrabold text-white">15</div>
              <div className="text-blue-200 mt-1">Paises</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-3">
                <Shield className="h-8 w-8 text-blue-300" />
              </div>
              <div className="text-4xl font-extrabold text-white">95%</div>
              <div className="text-blue-200 mt-1">Precision</div>
            </div>
            <div>
              <div className="flex items-center justify-center mb-3">
                <Clock className="h-8 w-8 text-blue-300" />
              </div>
              <div className="text-4xl font-extrabold text-white">30%</div>
              <div className="text-blue-200 mt-1">Ahorro de tiempo</div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Potenciado por inteligencia artificial
              </h2>
              <div className="space-y-4">
                {[
                  'Calculo automatico de peajes por pais y tipo de vehiculo',
                  'Deteccion de restricciones de circulacion en ruta',
                  'Estimacion precisa de tiempos de transito',
                  'Analisis de mercado con datos de bolsas de carga',
                  'Generacion automatica de PDF profesional',
                  'Chat IA integrado para consultas rapidas'
                ].map((feature, i) => (
                  <div key={i} className="flex items-start">
                    <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="ml-3 text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200">
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Origen</div>
                  <div className="font-semibold text-gray-900">Madrid, ES</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Destino</div>
                  <div className="font-semibold text-gray-900">Paris, FR</div>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500 mb-1">Coste total estimado</div>
                  <div className="text-2xl font-bold text-blue-600">1.847,50 EUR</div>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>1.275 km</span>
                  <span>2 dias transito</span>
                  <span>3 paises</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-blue-900 to-blue-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Empieza a cotizar hoy
          </h2>
          <p className="text-lg text-blue-100 mb-10 max-w-2xl mx-auto">
            Unete a las empresas de transporte que ya optimizan sus cotizaciones con AXEL.
            Registro gratuito, sin tarjeta de credito.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center px-10 py-4 text-lg font-semibold text-blue-900 bg-white rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
          >
            Crear cuenta gratis
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Truck className="h-6 w-6 text-blue-400" />
                <span className="text-xl font-bold text-white">AXEL</span>
              </div>
              <p className="text-sm leading-relaxed">
                Cotizaciones de transporte inteligentes potenciadas por inteligencia artificial.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="hover:text-white cursor-pointer transition-colors">Cotizaciones</span></li>
                <li><span className="hover:text-white cursor-pointer transition-colors">Bolsas de Carga</span></li>
                <li><span className="hover:text-white cursor-pointer transition-colors">Portal de Clientes</span></li>
                <li><span className="hover:text-white cursor-pointer transition-colors">Reportes</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="hover:text-white cursor-pointer transition-colors">Sobre nosotros</span></li>
                <li><span className="hover:text-white cursor-pointer transition-colors">Contacto</span></li>
                <li><span className="hover:text-white cursor-pointer transition-colors">Blog</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="hover:text-white cursor-pointer transition-colors">Politica de privacidad</span></li>
                <li><span className="hover:text-white cursor-pointer transition-colors">Terminos de uso</span></li>
                <li><span className="hover:text-white cursor-pointer transition-colors">Cookies</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-8 text-center text-sm">
            <p>&copy; 2026 AXEL. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
