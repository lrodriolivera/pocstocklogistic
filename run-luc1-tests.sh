#!/bin/bash

echo "🧪 Ejecutando Tests de Integración LUC1..."
echo ""

cd backend
npm test -- tests/integration/luc1Integration.test.js
