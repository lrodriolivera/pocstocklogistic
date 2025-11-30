#!/bin/bash
# Test que el contexto se mantiene correctamente en Claude

echo "🧪 Testing Context Preservation in Claude AI"
echo "============================================"
echo ""

SESSION_ID="context-test-$(date +%s)"
CLAUDE_URL="http://localhost:8002/chat/message"

# Function to send message and display response
send_message() {
    local msg="$1"
    echo "👤 USER: $msg"
    echo ""

    response=$(curl -s -X POST $CLAUDE_URL \
      -H "Content-Type: application/json" \
      -d "{\"message\": \"$msg\", \"sessionId\": \"$SESSION_ID\"}")

    echo "$response" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        resp = data.get('response', '')
        print('🤖 CLAUDE:', resp[:200] + ('...' if len(resp) > 200 else ''))
        print()

        # Check collected data
        quota_data = data.get('sessionData', {}).get('quotation_data', {})
        if quota_data:
            print('📊 Datos recopilados hasta ahora:')
            for key, value in quota_data.items():
                print(f'   ✓ {key}: {value}')
    else:
        print('❌ Error:', data.get('error'))
except Exception as e:
    print('❌ Parse error:', str(e))
"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    sleep 2
}

echo "🔄 Starting conversation flow..."
echo ""

send_message "Hola, necesito cotizar un envío"
send_message "Desde Barcelona"
send_message "A Berlín"

echo ""
echo "⚠️  CRITICAL TEST: Claude should NOT ask again for origin or destination"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

send_message "15 toneladas"

echo ""
echo "✅ Test complete!"
echo ""
echo "Expected behavior:"
echo "  - Claude remembers origin: Barcelona"
echo "  - Claude remembers destination: Berlín"
echo "  - Claude does NOT ask for them again"
echo "  - Claude continues with next field (volume)"
echo ""