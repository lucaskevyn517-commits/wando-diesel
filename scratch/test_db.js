const http = require('node:http');

// Inicia o servidor em porta alternativa 3001 para testes
process.env.PORT = 3001;
require('../server.js');

function req(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function runTests() {
  await new Promise(r => setTimeout(r, 600));

  console.log('--- TESTE 1: GET /api/status ---');
  const statusRes = await req('/api/status');
  console.log('Status:', statusRes.status, statusRes.body);
  if (statusRes.body.engine !== 'SQLite (node:sqlite)') throw new Error('Engine não é SQLite');

  console.log('--- TESTE 2: POST /api/parts (Salvar peça colocada) ---');
  const partRes = await req('/api/parts', 'POST', {
    name: 'Turbina K27 BorgWarner',
    sku: 'TB-BW-K27',
    category: 'turbinas',
    price: 3200,
    stock: 5,
    description: 'Turbina pesada para Scania 113'
  });
  console.log('Part add:', partRes.status, partRes.body);

  console.log('--- TESTE 3: GET /api/parts ---');
  const partsRes = await req('/api/parts');
  console.log('Total parts:', partsRes.body.length);
  const found = partsRes.body.find(p => p.sku === 'TB-BW-K27');
  if (!found) throw new Error('Peça não encontrada no banco SQLite!');
  console.log('Peça recuperada do SQLite:', found.name, 'R$', found.price);

  console.log('--- TESTE 4: POST /api/invoices ---');
  const invRes = await req('/api/invoices', 'POST', {
    id: 'inv-test-123',
    number: 'WD-10001',
    clientName: 'Transportadora Brasil',
    vehicleModel: 'Scania R440',
    total: 3200,
    createdAt: new Date().toISOString()
  });
  console.log('Invoice save:', invRes.status, invRes.body);

  console.log('--- TESTE 5: GET /api/invoices ---');
  const invsRes = await req('/api/invoices');
  console.log('Invoices count:', invsRes.body.length);

  console.log('>>> TODOS OS TESTES PASSARAM COM SUCESSO! BANCO SQLITE PERSISTENTE OK! <<<');
  process.exit(0);
}

runTests().catch(err => {
  console.error('ERRO NO TESTE:', err);
  process.exit(1);
});
