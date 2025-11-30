#!/bin/bash
# Test complete conversation flow with Claude AI Agent

echo "🤖 Testing Claude AI Agent - Complete Conversation Flow"
echo "========================================================="
echo ""

SESSION_ID="test-$(date +%s)"
CLAUDE_URL="http://localhost:8002/chat/message"

# Function to send message and display response
send_message() {
    local message="$1"
    echo "👤 USER: $message"
    echo ""

    response=$(curl -s -X POST $CLAUDE_URL \
      -H "Content-Type: application/json" \
      -d "{\"message\": \"$message\", \"sessionId\": \"$SESSION_ID\"}")

    echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    print('🤖 LUC1:', data.get('response', ''))
    print()
    print('📊 Datos recopilados:', json.dumps(data.get('sessionData', {}).get('quotation_data', {}), indent=2, ensure_ascii=False))
else:
    print('❌ Error:', data.get('error'))
"
    echo ""
    echo "----------------------------------------"
    echo ""
    sleep 2
}

# Conversation flow
send_message "Hola, necesito cotizar un envío"
send_message "Desde Barcelona"
send_message "A Berlín, Alemania"
send_message "Son 15 toneladas"
send_message "El volumen es de 30 metros cúbicos"
send_message "Carga general, productos forestales"
send_message "Para el próximo 5 de octubre de 2025"
send_message "El email es cliente@empresa.com"
send_message "La empresa es Maderas Europa SL"

echo ""
echo "✅ Conversación completa!"
echo "📋 Verificando que se haya generado la cotización en MongoDB..."
echo ""