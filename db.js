// ==========================================================================
// WANDO DIESEL - GERENCIADOR DE BANCO DE DADOS CLIENTE (db.js)
// Conecta ao backend SQLite (API REST) e faz fallback transparente no IndexedDB
// ==========================================================================

import { DEFAULT_DIESEL_PARTS } from "./database.js";

const IDB_NAME = "WandoDieselDB";
const IDB_VERSION = 1;
const STORE_PARTS = "parts";
const STORE_INVOICES = "invoices";

class DatabaseManager {
  constructor() {
    this.isServerActive = false;
    this.dbEngine = "local"; // 'sqlite' ou 'indexeddb' / 'localstorage'
    this.listeners = [];
    this.idb = null;
  }

  // Registra ouvintes para mudanças no status do banco
  onStatusChange(callback) {
    this.listeners.push(callback);
  }

  notifyStatus(status) {
    this.listeners.forEach(cb => {
      try { cb(status); } catch (e) { console.error(e); }
    });
  }

  // Inicialização do IndexedDB no navegador
  async openIndexedDB() {
    if (!window.indexedDB) return null;

    return new Promise((resolve) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_PARTS)) {
          db.createObjectStore(STORE_PARTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(STORE_INVOICES)) {
          db.createObjectStore(STORE_INVOICES, { keyPath: "id" });
        }
      };

      req.onsuccess = (e) => {
        this.idb = e.target.result;
        resolve(this.idb);
      };

      req.onerror = () => {
        console.warn("[DB] Erro ao abrir IndexedDB, usando localStorage como fallback.");
        resolve(null);
      };
    });
  }

  // Inicialização e detecção do servidor
  async init() {
    await this.openIndexedDB();

    try {
      const res = await fetch("/api/status", { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "ok") {
          this.isServerActive = true;
          this.dbEngine = "sqlite";
          this.notifyStatus({
            connected: true,
            engine: "SQLite (Node.js)",
            message: "Banco de dados SQLite Conectado",
            partsCount: data.totalParts
          });
          return;
        }
      }
    } catch (e) {
      // Servidor backend não está rodando nesta porta ou ambiente estático
    }

    this.isServerActive = false;
    this.dbEngine = this.idb ? "indexeddb" : "localstorage";
    this.notifyStatus({
      connected: false,
      engine: this.idb ? "IndexedDB (Navegador)" : "LocalStorage (Navegador)",
      message: "Armazenamento Persistente Local Ativo",
      partsCount: 0
    });
  }

  // ========================================================================
  // PEÇAS (PARTS)
  // ========================================================================

  // Carrega todas as peças cadastradas (inicia vazio para adição manual)
  async getParts() {
    // 1. Tentar via servidor SQLite
    if (this.isServerActive) {
      try {
        const res = await fetch("/api/parts", { cache: "no-cache" });
        if (res.ok) {
          const parts = await res.json();
          this.saveLocalParts(parts);
          return parts;
        }
      } catch (err) {
        console.warn("[DB] Erro na API SQLite, caindo para local:", err);
      }
    }

    // 2. Fallback: IndexedDB / LocalStorage
    let localParts = await this.getIdbParts();
    if (!localParts || localParts.length === 0) {
      localParts = this.getLocalParts();
    }

    return localParts || [];
  }

  // Salva uma peça (adiciona ou atualiza)
  async savePart(part) {
    if (!part.id) {
      part.id = `part-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    }
    if (!part.specs) part.specs = {};

    // 1. Servidor SQLite
    if (this.isServerActive) {
      try {
        const res = await fetch("/api/parts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(part)
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Erro ao salvar peça no SQLite");
        }
      } catch (err) {
        console.error("[DB] Falha ao enviar para servidor:", err);
      }
    }

    // 2. Cache Local & IndexedDB
    await this.saveIdbPart(part);
    const local = this.getLocalParts();
    const idx = local.findIndex(p => p.id === part.id);
    if (idx !== -1) {
      local[idx] = part;
    } else {
      local.push(part);
    }
    this.saveLocalParts(local);

    return part;
  }

  // Exclui uma peça
  async deletePart(id) {
    if (this.isServerActive) {
      try {
        await fetch(`/api/parts/${encodeURIComponent(id)}`, { method: "DELETE" });
      } catch (err) {
        console.error("[DB] Falha ao excluir no servidor:", err);
      }
    }

    await this.deleteIdbPart(id);
    const local = this.getLocalParts().filter(p => p.id !== id);
    this.saveLocalParts(local);
  }

  // Limpa todas as peças
  async clearParts() {
    if (this.isServerActive) {
      try {
        await fetch("/api/parts", { method: "DELETE" });
      } catch (err) {
        console.error("[DB] Falha ao limpar no servidor:", err);
      }
    }

    await this.clearIdbParts();
    this.saveLocalParts([]);
  }

  // Salva em lote (Importação ou Restauração)
  async bulkSaveParts(parts, clearFirst = false) {
    if (this.isServerActive) {
      try {
        await fetch("/api/parts/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parts, clear: clearFirst })
        });
      } catch (err) {
        console.error("[DB] Falha no bulk do servidor:", err);
      }
    }

    if (clearFirst) {
      await this.clearIdbParts();
      this.saveLocalParts(parts);
    } else {
      const local = this.getLocalParts();
      parts.forEach(p => {
        const idx = local.findIndex(x => x.id === p.id || x.sku === p.sku);
        if (idx !== -1) local[idx] = p;
        else local.push(p);
      });
      this.saveLocalParts(local);
    }

    await this.saveIdbParts(parts);
  }

  // ========================================================================
  // HISTÓRICO DE ORDENS / NOTAS (INVOICES)
  // ========================================================================

  async getInvoices() {
    if (this.isServerActive) {
      try {
        const res = await fetch("/api/invoices", { cache: "no-cache" });
        if (res.ok) {
          const invs = await res.json();
          localStorage.setItem("wd_invoice_history", JSON.stringify(invs));
          return invs;
        }
      } catch (err) {
        console.warn("[DB] Erro ao carregar invoices da API:", err);
      }
    }
    return JSON.parse(localStorage.getItem("wd_invoice_history")) || [];
  }

  async saveInvoice(invoice) {
    if (this.isServerActive) {
      try {
        await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoice)
        });
      } catch (err) {
        console.error("[DB] Erro ao salvar invoice na API:", err);
      }
    }

    // Cache local
    const history = JSON.parse(localStorage.getItem("wd_invoice_history")) || [];
    const idx = history.findIndex(i => i.id === invoice.id);
    if (idx !== -1) history[idx] = invoice;
    else history.push(invoice);
    localStorage.setItem("wd_invoice_history", JSON.stringify(history));
  }

  async clearInvoices() {
    if (this.isServerActive) {
      try {
        await fetch("/api/invoices", { method: "DELETE" });
      } catch (err) {
        console.error("[DB] Erro ao limpar invoices na API:", err);
      }
    }
    localStorage.removeItem("wd_invoice_history");
  }

  // ========================================================================
  // BACKUP E RESTAURAÇÃO (.JSON)
  // ========================================================================

  async exportBackup() {
    const parts = await this.getParts();
    const invoices = await this.getInvoices();

    const backupData = {
      app: "Wando Diesel",
      version: "2.0",
      exportDate: new Date().toISOString(),
      engine: this.dbEngine,
      totalParts: parts.length,
      totalInvoices: invoices.length,
      parts: parts,
      invoices: invoices
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `backup_wando_diesel_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importBackup(jsonString) {
    const data = JSON.parse(jsonString);
    if (!data.parts || !Array.isArray(data.parts)) {
      throw new Error("Arquivo de backup inválido: não contém a lista de peças.");
    }

    await this.bulkSaveParts(data.parts, true);

    if (data.invoices && Array.isArray(data.invoices)) {
      for (const inv of data.invoices) {
        await this.saveInvoice(inv);
      }
    }

    return {
      partsCount: data.parts.length,
      invoicesCount: data.invoices ? data.invoices.length : 0
    };
  }

  // ========================================================================
  // AUXILIARES DE LOCALSTORAGE & INDEXEDDB
  // ========================================================================

  getLocalParts() {
    try {
      return JSON.parse(localStorage.getItem("wd_catalog")) || [];
    } catch {
      return [];
    }
  }

  saveLocalParts(parts) {
    try {
      localStorage.setItem("wd_catalog", JSON.stringify(parts));
    } catch (e) {
      console.warn("[DB] Erro ao salvar no localStorage:", e);
    }
  }

  async getIdbParts() {
    if (!this.idb) return null;
    return new Promise(resolve => {
      try {
        const tx = this.idb.transaction(STORE_PARTS, "readonly");
        const store = tx.objectStore(STORE_PARTS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  async saveIdbPart(part) {
    if (!this.idb) return;
    return new Promise(resolve => {
      try {
        const tx = this.idb.transaction(STORE_PARTS, "readwrite");
        const store = tx.objectStore(STORE_PARTS);
        store.put(part);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async saveIdbParts(parts) {
    if (!this.idb) return;
    return new Promise(resolve => {
      try {
        const tx = this.idb.transaction(STORE_PARTS, "readwrite");
        const store = tx.objectStore(STORE_PARTS);
        parts.forEach(p => store.put(p));
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async deleteIdbPart(id) {
    if (!this.idb) return;
    return new Promise(resolve => {
      try {
        const tx = this.idb.transaction(STORE_PARTS, "readwrite");
        const store = tx.objectStore(STORE_PARTS);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async clearIdbParts() {
    if (!this.idb) return;
    return new Promise(resolve => {
      try {
        const tx = this.idb.transaction(STORE_PARTS, "readwrite");
        const store = tx.objectStore(STORE_PARTS);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}

export const PartsDB = new DatabaseManager();
