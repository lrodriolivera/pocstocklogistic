/**
 * Script de prueba para verificar integración LUC1 con Claude AI Service
 */

const axios = require('axios');

async function testLUC1Integration() {
  console.log('🧪 Iniciando prueba de integración LUC1...\n');

  try {
    // 1. Verificar health del Claude AI Service
    console.log('1️⃣ Verificando Claude AI Service...');
    const healthResponse = await axios.get('http://localhost:8002/health');
    console.log('   ✅ Claude AI Service:', healthResponse.data);
    console.log('');

    // 2. Verificar backend está corriendo
    console.log('2️⃣ Verificando Backend...');
    const backendHealth = await axios.get('http://localhost:5000/health');
    console.log('   ✅ Backend:', backendHealth.data);
    console.log('');

    // 3. Generar cotización usando el endpoint del backend
    console.log('3️⃣ Generando cotización de prueba...');
    const quoteRequest = {
      route: {
        origin: 'Barcelona, Spain',
        destination: 'Berlin, Germany'
      },
      cargo: {
        type: 'forest_products',
        weight: 15, // toneladas
        volume: 30, // m³
        value: 50000,
        description: 'Madera contrachapada'
      },
      service: {
        deliveryDate: '2025-10-15',
        pickupDate: '2025-10-10'
      },
      client: {
        email: 'test@cliente.com',
        company: 'Maderas Test SL'
      },
      preferences: {
        profitMargin: 20,
        serviceType: 'estandar'
      }
    };

    console.log('   Datos de cotización:', JSON.stringify(quoteRequest, null, 2));
    console.log('   Llamando a /api/quotes/generate...\n');

    const quoteResponse = await axios.post(
      'http://localhost:5000/api/quotes/generate',
      quoteRequest,
      {
        timeout: 60000, // 60 segundos
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('   ✅ Cotización generada exitosamente!');
    console.log('   📋 ID de Cotización:', quoteResponse.data.quoteId);
    console.log('   💰 Precio Total:', quoteResponse.data.costBreakdown.total, 'EUR');
    console.log('   🧠 LUC1 Analysis:');
    console.log('      - Transportista recomendado:', quoteResponse.data.intelligence.recommendedTransportist);
    console.log('      - IA usada:', quoteResponse.data.intelligence.usedAI ? 'SÍ ✅' : 'NO (Fallback) ⚠️');
    console.log('      - Confianza:', quoteResponse.data.confidence + '%');
    console.log('      - Tiempo procesamiento:', quoteResponse.data.intelligence.processingTime + 'ms');
    console.log('');

    // 4. Mostrar resumen
    console.log('📊 RESUMEN DE PRUEBA:');
    console.log('   ✅ Claude AI Service: CONECTADO');
    console.log('   ✅ Backend: CONECTADO');
    console.log('   ✅ Cotización generada: SÍ');
    console.log('   ✅ LUC1 integrado:', quoteResponse.data.intelligence.usedAI ? 'SÍ' : 'MODO FALLBACK');
    console.log('');

    if (!quoteResponse.data.intelligence.usedAI) {
      console.log('⚠️ ADVERTENCIA: LUC1 no se utilizó para el análisis.');
      console.log('   Revisa los logs del backend para más detalles.');
    } else {
      console.log('🎉 ¡INTEGRACIÓN EXITOSA! LUC1 con Claude Sonnet 4 está funcionando.');
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Ejecutar prueba
testLUC1Integration();