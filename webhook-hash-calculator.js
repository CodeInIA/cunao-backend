// Script auxiliar para calcular el hash HMAC-SHA256 para webhooks de Printify
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

function calculatePrintifySignature(body) {
  const secret = process.env.PRINTIFY_WEBHOOK_SECRET;
  
  if (!secret) {
    console.error('❌ Error: PRINTIFY_WEBHOOK_SECRET no está definido en el archivo .env');
    process.exit(1);
  }
  
  // Convertir el cuerpo a string si es un objeto
  const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
  
  // Calcular el hash HMAC-SHA256
  const hash = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');
  const signature = `sha256=${hash}`;
  
  return {
    body: bodyString,
    signature: signature,
    secret: secret
  };
}

// Ejemplo de uso con los eventos de Printify
function main() {
  console.log('🔐 Calculadora de Firmas HMAC para Webhooks de Printify\n');
  
  // Ejemplo 1: order:shipment:created
  const shipmentCreatedBody = {
  "id": "653b6be8-2ff7-4ab5-a7a6-6889a8b3bbf5",
  "type": "order:shipment:created",
  "created_at": "2022-05-17 15:00:00+00:00",
  "resource": {
    "id": "000000000000000000000000",
    "type": "order",
    "data": {
      "shop_id": 23849590,
      "shipped_at": "2022-05-17 15:00:00+00:00",
      "carrier": {
        "code": "UPS",
        "tracking_number": "9400110200828911663274",
        "tracking_url": "https://example.com/track/9400110200828911663274"
      },
      "skus": [
        "6202"
      ]
    }
  }
};
  
  // Ejemplo 2: order:shipment:delivered
  const shipmentDeliveredBody = {
  "id": "653b6be8-2ff7-4ab5-a7a6-6889a8b3bbf5",
  "type": "order:shipment:delivered",
  "created_at": "2022-05-17 15:00:00+00:00",
  "resource": {
    "id": "000000000000000000000000",
    "type": "order",
    "data": {
      "shop_id": 23849590,
      "delivered_at": "2022-05-17 15:00:00+00:00",
      "carrier": {
        "code": "UPS",
        "tracking_number": "9400110200828911663274",
        "tracking_url": "https://example.com/track/9400110200828911663274"
      },
      "skus": [
        "6202"
      ]
    }
  }
};
  
  console.log('📦 EVENTO: order:shipment:created');
  console.log('=' .repeat(50));
  const created = calculatePrintifySignature(shipmentCreatedBody);
  console.log('Body JSON:');
  console.log(created.body);
  console.log('\nCabecera x-pfy-signature:');
  console.log(created.signature);
  console.log('\nPara Postman:');
  console.log(`- URL: http://localhost:3001/api/webhooks/printify`);
  console.log(`- Method: POST`);
  console.log(`- Header: x-pfy-signature = ${created.signature}`);
  console.log(`- Header: Content-Type = application/json`);
  console.log(`- Body: ${created.body}`);
  
  console.log('\n🚚 EVENTO: order:shipment:delivered');
  console.log('=' .repeat(50));
  const delivered = calculatePrintifySignature(shipmentDeliveredBody);
  console.log('Body JSON:');
  console.log(delivered.body);
  console.log('\nCabecera x-pfy-signature:');
  console.log(delivered.signature);
  console.log('\nPara Postman:');
  console.log(`- URL: http://localhost:3001/api/webhooks/printify`);
  console.log(`- Method: POST`);
  console.log(`- Header: x-pfy-signature = ${delivered.signature}`);
  console.log(`- Header: Content-Type = application/json`);
  console.log(`- Body: ${delivered.body}`);
  
  console.log('\n💡 NOTAS IMPORTANTES:');
  console.log('1. Reemplaza "000000000000000000000000" con un ID real de tu base de datos');
  console.log('2. El ID debe existir en el campo "printifyOrderId" de alguna orden');
  console.log('3. Asegúrate de que tu backend esté corriendo en http://localhost:3001');
  console.log(`4. Secret usado: ${created.secret.substring(0, 8)}...`);
  console.log('5. Los order_id ahora son números de 9 dígitos (ej: 123456789)');
  
  console.log('\n🔧 Para usar tu propio JSON:');
  console.log('node webhook-hash-calculator.js \'{"type":"tu-evento","resource":{"id":"tu-id"}}\'');
}

// Permitir usar el script con argumentos de línea de comandos
if (process.argv.length > 2) {
  try {
    const customBody = process.argv[2];
    const result = calculatePrintifySignature(customBody);
    
    console.log('🔐 Hash calculado para tu JSON personalizado:\n');
    console.log('Body:');
    console.log(result.body);
    console.log('\nFirma:');
    console.log(result.signature);
    console.log('\n📋 Para copiar en Postman:');
    console.log(`x-pfy-signature: ${result.signature}`);
    
  } catch (error) {
    console.error('❌ Error al procesar el JSON:', error.message);
    console.log('💡 Asegúrate de que el JSON esté entre comillas simples');
    console.log('Ejemplo: node webhook-hash-calculator.js \'{"type":"test"}\'');
  }
} else {
  main();
}

export { calculatePrintifySignature };
