// ==========================================================================
// WANDO DIESEL - SERVIDOR E BANCO DE DADOS PERSISTENTE (Node.js + SQLite)
// ==========================================================================
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'wando_diesel.db');

// Garante que o diretório de dados existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Inicializa o banco de dados SQLite nativo
const db = new DatabaseSync(DB_PATH);

// Cria as tabelas se não existirem
db.exec(`
  CREATE TABLE IF NOT EXISTS parts (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'all',
    price REAL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    specs TEXT DEFAULT '{}',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    number TEXT NOT NULL,
    client_name TEXT,
    vehicle_model TEXT,
    total REAL DEFAULT 0,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log(`[OK] Banco de dados SQLite conectado em: ${DB_PATH}`);

// MIME Types para servir os arquivos da aplicação web
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// Helper para ler o corpo de requisições JSON
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) { // Limite de 5MB
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Helper para responder em JSON com CORS
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// Criar o servidor HTTP
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Lidar com CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // ========================================================================
  // ROTAS DA API REST
  // ========================================================================

  // 1. Status do banco e sistema
  if (pathname === '/api/status' && method === 'GET') {
    try {
      const partsCount = db.prepare('SELECT COUNT(*) as count FROM parts').get().count;
      const invoicesCount = db.prepare('SELECT COUNT(*) as count FROM invoices').get().count;
      sendJson(res, 200, {
        status: 'ok',
        engine: 'SQLite (node:sqlite)',
        dbPath: DB_PATH,
        totalParts: partsCount,
        totalInvoices: invoicesCount
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 2. Listar todas as peças
  if (pathname === '/api/parts' && method === 'GET') {
    try {
      const rows = db.prepare('SELECT * FROM parts ORDER BY name ASC').all();
      const parts = rows.map(r => ({
        id: r.id,
        sku: r.sku,
        name: r.name,
        category: r.category,
        price: r.price,
        stock: r.stock,
        description: r.description,
        specs: r.specs ? JSON.parse(r.specs) : {},
        created_at: r.created_at,
        updated_at: r.updated_at
      }));
      sendJson(res, 200, parts);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 3. Adicionar ou atualizar peça (Upsert)
  if (pathname === '/api/parts' && method === 'POST') {
    try {
      const body = await parseBody(req);
      if (!body.name) {
        sendJson(res, 400, { error: 'O nome da peça é obrigatório.' });
        return;
      }

      const id = body.id || `part-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const sku = (body.sku || `SKU-${Date.now()}`).trim().toUpperCase();
      const name = body.name.trim();
      const category = body.category || 'all';
      const price = parseFloat(body.price) || 0;
      const stock = parseInt(body.stock, 10) >= 0 ? parseInt(body.stock, 10) : 10;
      const description = body.description || '';
      const specs = JSON.stringify(body.specs || {});
      const now = new Date().toISOString();

      const stmt = db.prepare(`
        INSERT INTO parts (id, sku, name, category, price, stock, description, specs, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          sku = excluded.sku,
          name = excluded.name,
          category = excluded.category,
          price = excluded.price,
          stock = excluded.stock,
          description = excluded.description,
          specs = excluded.specs,
          updated_at = excluded.updated_at
      `);

      stmt.run(id, sku, name, category, price, stock, description, specs, now, now);

      sendJson(res, 201, {
        success: true,
        part: { id, sku, name, category, price, stock, description, specs: body.specs || {} }
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 4. Atualizar peça por ID
  if (pathname.startsWith('/api/parts/') && method === 'PUT') {
    const id = pathname.replace('/api/parts/', '');
    try {
      const body = await parseBody(req);
      const sku = body.sku ? body.sku.trim().toUpperCase() : undefined;
      const name = body.name ? body.name.trim() : undefined;
      const category = body.category;
      const price = parseFloat(body.price);
      const stock = parseInt(body.stock, 10);
      const description = body.description;
      const specs = body.specs ? JSON.stringify(body.specs) : undefined;
      const now = new Date().toISOString();

      const existing = db.prepare('SELECT * FROM parts WHERE id = ?').get(id);
      if (!existing) {
        sendJson(res, 404, { error: 'Peça não encontrada.' });
        return;
      }

      const stmt = db.prepare(`
        UPDATE parts SET
          sku = COALESCE(?, sku),
          name = COALESCE(?, name),
          category = COALESCE(?, category),
          price = COALESCE(?, price),
          stock = COALESCE(?, stock),
          description = COALESCE(?, description),
          specs = COALESCE(?, specs),
          updated_at = ?
        WHERE id = ?
      `);

      stmt.run(sku, name, category, isNaN(price) ? null : price, isNaN(stock) ? null : stock, description, specs, now, id);

      sendJson(res, 200, { success: true, id });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 5. Excluir peça por ID
  if (pathname.startsWith('/api/parts/') && method === 'DELETE') {
    const id = pathname.replace('/api/parts/', '');
    try {
      const stmt = db.prepare('DELETE FROM parts WHERE id = ?');
      stmt.run(id);
      sendJson(res, 200, { success: true, id });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 6. Importação / Semeamento em massa de peças
  if (pathname === '/api/parts/bulk' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const parts = Array.isArray(body) ? body : (body.parts || []);
      const clearExisting = body.clear === true;

      if (clearExisting) {
        db.prepare('DELETE FROM parts').run();
      }

      const stmt = db.prepare(`
        INSERT INTO parts (id, sku, name, category, price, stock, description, specs, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          sku = excluded.sku,
          name = excluded.name,
          category = excluded.category,
          price = excluded.price,
          stock = excluded.stock,
          description = excluded.description,
          specs = excluded.specs,
          updated_at = excluded.updated_at
      `);

      let inserted = 0;
      for (const p of parts) {
        if (!p.name) continue;
        const id = p.id || `part-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const sku = (p.sku || `SKU-${Date.now()}`).trim().toUpperCase();
        const name = p.name.trim();
        const category = p.category || 'all';
        const price = parseFloat(p.price) || 0;
        const stock = parseInt(p.stock, 10) >= 0 ? parseInt(p.stock, 10) : 10;
        const description = p.description || '';
        const specs = JSON.stringify(p.specs || {});
        const now = new Date().toISOString();

        stmt.run(id, sku, name, category, price, stock, description, specs, now, now);
        inserted++;
      }

      sendJson(res, 200, { success: true, count: inserted });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 7. Limpar todo o catálogo de peças
  if (pathname === '/api/parts' && method === 'DELETE') {
    try {
      db.prepare('DELETE FROM parts').run();
      sendJson(res, 200, { success: true, message: 'Todas as peças foram removidas.' });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 8. Listar histórico de ordens/notas
  if (pathname === '/api/invoices' && method === 'GET') {
    try {
      const rows = db.prepare('SELECT * FROM invoices ORDER BY created_at ASC').all();
      const invoices = rows.map(r => JSON.parse(r.data));
      sendJson(res, 200, invoices);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 9. Salvar nova nota no histórico
  if (pathname === '/api/invoices' && method === 'POST') {
    try {
      const invoice = await parseBody(req);
      if (!invoice.id || !invoice.number) {
        sendJson(res, 400, { error: 'Dados da nota incompletos.' });
        return;
      }

      const stmt = db.prepare(`
        INSERT INTO invoices (id, number, client_name, vehicle_model, total, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          number = excluded.number,
          client_name = excluded.client_name,
          vehicle_model = excluded.vehicle_model,
          total = excluded.total,
          data = excluded.data
      `);

      stmt.run(
        invoice.id,
        invoice.number,
        invoice.clientName || '',
        invoice.vehicleModel || '',
        parseFloat(invoice.total) || 0,
        JSON.stringify(invoice),
        invoice.createdAt || new Date().toISOString()
      );

      sendJson(res, 201, { success: true, id: invoice.id });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 10. Limpar histórico de notas
  if (pathname === '/api/invoices' && method === 'DELETE') {
    try {
      db.prepare('DELETE FROM invoices').run();
      sendJson(res, 200, { success: true, message: 'Histórico de notas limpo.' });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // ========================================================================
  // ARQUIVOS ESTÁTICOS DO SITE
  // ========================================================================
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Evitar directory traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Acesso proibido');
    return;
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Se não for arquivo, tentar index.html para SPA
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Não Encontrado');
      return;
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    const stream = fs.createReadStream(normalizedPath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`  WANDO DIESEL - SERVIDOR E BANCO DE DADOS ATIVO`);
  console.log(`  Endereço: http://localhost:${PORT}`);
  console.log(`  Banco: SQLite nativo (${DB_PATH})`);
  console.log(`=============================================================`);
});
