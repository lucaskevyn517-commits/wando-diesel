import { DIESEL_DATABASE as DIESEL_DATABASE_DEFAULT, CATEGORIES } from "./database.js";

// Banco de dados mutável — carregado do localStorage ou inicializado vazio
let DIESEL_DATABASE = JSON.parse(localStorage.getItem("wd_catalog")) || [...DIESEL_DATABASE_DEFAULT];

function saveCatalog() {
  localStorage.setItem("wd_catalog", JSON.stringify(DIESEL_DATABASE));
}

// ==========================================================================
// ESTADO DO APLICATIVO
// ==========================================================================
let currentInvoice = JSON.parse(localStorage.getItem("wd_current_draft")) || {
  clientName: "",
  clientDoc: "",
  clientPhone: "",
  vehicleModel: "",
  vehiclePlate: "",
  vehicleKm: "",
  vehicleYear: "",
  parts: [],
  services: [],
  discount: 0,
  tax: 0,
  notes: ""
};

let invoiceHistory = JSON.parse(localStorage.getItem("wd_invoice_history")) || [];

// Categoria selecionada no catálogo
let selectedCategory = "all";

// Produto sendo visualizado no modal de detalhes
let activeProductDetail = null;

// Última nota emitida para o modal de ações
let lastEmittedInvoice = null;

// ID da peça sendo editada nos Ajustes
let settingsEditingId = null;

// ==========================================================================
// SELETORES DO DOM
// ==========================================================================
const sidebarItems = document.querySelectorAll(".nav-item");
const viewSections = document.querySelectorAll(".view-section");
const viewTitle = document.getElementById("view-title");
const viewSubtitle = document.getElementById("view-subtitle");
const btnBurger = document.getElementById("btn-burger");
const sidebar = document.getElementById("sidebar");

// Elementos de Estatísticas (Dashboard)
const statTotalItems = document.getElementById("stat-total-items");
const statCurrentInvoice = document.getElementById("stat-current-invoice");
const statBilledCount = document.getElementById("stat-billed-count");

// Catálogo
const catalogSearch = document.getElementById("catalog-search");
const categoryFilterBar = document.getElementById("category-filter-bar");
const catalogGrid = document.getElementById("catalog-grid");

// Formulário da Nota de Serviço
const invoiceClientForm = document.getElementById("invoice-client-form");
const clientNameInput = document.getElementById("client-name");
const clientDocInput = document.getElementById("client-doc");
const clientPhoneInput = document.getElementById("client-phone");
const vehicleModelInput = document.getElementById("vehicle-model");
const vehiclePlateInput = document.getElementById("vehicle-plate");
const vehicleKmInput = document.getElementById("vehicle-km");
const vehicleYearInput = document.getElementById("vehicle-year");

const invoicePartsBody = document.getElementById("invoice-parts-body");
const invoiceServicesBody = document.getElementById("invoice-services-body");

const summaryTotalParts = document.getElementById("summary-total-parts");
const summaryTotalServices = document.getElementById("summary-total-services");
const invoiceDiscountInput = document.getElementById("invoice-discount");
const invoiceTaxInput = document.getElementById("invoice-tax");
const summaryTotalValue = document.getElementById("summary-total-value");
const invoiceNotesInput = document.getElementById("invoice-notes");

const btnAddManualPart = document.getElementById("btn-add-manual-part");
const btnAddService = document.getElementById("btn-add-service");
const btnSaveInvoice = document.getElementById("btn-save-invoice");
const btnClearInvoice = document.getElementById("btn-clear-invoice");

// Histórico de Notas
const historyTotalRevenue = document.getElementById("history-total-revenue");
const historyPartsRevenue = document.getElementById("history-parts-revenue");
const historyServicesRevenue = document.getElementById("history-services-revenue");
const historyTableBody = document.getElementById("history-table-body");
const btnClearHistory = document.getElementById("btn-clear-history");


// Modais
const productModalOverlay = document.getElementById("product-modal-overlay");
const modalProductTitle = document.getElementById("modal-product-title");
const modalProductClose = document.getElementById("modal-product-close");
const modalProductDesc = document.getElementById("modal-product-desc");
const modalProductSpecs = document.getElementById("modal-product-specs");
const modalProductPrice = document.getElementById("modal-product-price");
const modalProductStockBadge = document.getElementById("modal-product-stock-badge");
const modalProductCancel = document.getElementById("modal-product-cancel");
const modalProductAddCart = document.getElementById("modal-product-add-cart");

const manualPartModalOverlay = document.getElementById("manual-part-modal-overlay");
const modalManualClose = document.getElementById("modal-manual-close");
const manualPartForm = document.getElementById("manual-part-form");
const manualPartName = document.getElementById("manual-part-name");
const manualPartSku = document.getElementById("manual-part-sku");
const manualPartQty = document.getElementById("manual-part-qty");
const manualPartPrice = document.getElementById("manual-part-price");
const modalManualCancel = document.getElementById("modal-manual-cancel");

const serviceModalOverlay = document.getElementById("service-modal-overlay");
const modalServiceClose = document.getElementById("modal-service-close");
const serviceForm = document.getElementById("service-form");
const serviceDesc = document.getElementById("service-desc");
const serviceHours = document.getElementById("service-hours");
const serviceRate = document.getElementById("service-rate");
const modalServiceCancel = document.getElementById("modal-service-cancel");

// Modal de ações de Nota
const invoiceActionModalOverlay = document.getElementById("invoice-action-modal-overlay");
const modalInvoiceActionClose = document.getElementById("modal-invoice-action-close");
const btnInvoiceActionCloseFooter = document.getElementById("btn-invoice-action-close-footer");
const invoiceActionSubtitle = document.getElementById("invoice-action-subtitle");
const btnActionPdf = document.getElementById("btn-action-pdf");
const btnActionPrint = document.getElementById("btn-action-print");

// Ajustes — Gerenciador de Peças
const settingsPartForm = document.getElementById("settings-part-form");
const settingsEditId = document.getElementById("settings-edit-id");
const settingsName = document.getElementById("settings-name");
const settingsSku = document.getElementById("settings-sku");
const settingsCategorySelect = document.getElementById("settings-category");
const settingsPrice = document.getElementById("settings-price");
const settingsStock = document.getElementById("settings-stock");
const settingsDesc = document.getElementById("settings-desc");
const settingsSubmitBtn = document.getElementById("settings-submit-btn");
const settingsCancelEdit = document.getElementById("settings-cancel-edit");
const settingsPartsBody = document.getElementById("settings-parts-body");
const settingsSearch = document.getElementById("settings-search");
const btnClearCatalog = document.getElementById("btn-clear-catalog");
const settingsFormTitle = document.getElementById("settings-form-title");
const settingsStatTotal = document.getElementById("settings-stat-total");
const settingsStatLow = document.getElementById("settings-stat-low");
const settingsStatZero = document.getElementById("settings-stat-zero");

// Toast Container
const toastContainer = document.getElementById("toast-container");

// Print Preview Section Elements
const printInvoiceNumber = document.getElementById("print-invoice-number");
const printInvoiceDate = document.getElementById("print-invoice-date");
const printClientName = document.getElementById("print-client-name");
const printClientDoc = document.getElementById("print-client-doc");
const printClientPhone = document.getElementById("print-client-phone");
const printVehicleModel = document.getElementById("print-vehicle-model");
const printVehiclePlate = document.getElementById("print-vehicle-plate");
const printVehicleKm = document.getElementById("print-vehicle-km");
const printVehicleYear = document.getElementById("print-vehicle-year");
const printPartsBody = document.getElementById("print-parts-body");
const printServicesBody = document.getElementById("print-services-body");
const printInvoiceNotes = document.getElementById("print-invoice-notes");
const printTotalParts = document.getElementById("print-total-parts");
const printTotalServices = document.getElementById("print-total-services");
const printDiscount = document.getElementById("print-discount");
const printTax = document.getElementById("print-tax");
const printTotalValue = document.getElementById("print-total-value");
const printClientSignatureName = document.getElementById("print-client-signature-name");

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "btn-danger" : ""}`;
  
  // Custom toast content based on type
  let borderStyle = "var(--primary)";
  if (type === "error") borderStyle = "var(--danger)";
  else if (type === "warning") borderStyle = "var(--warning)";
  else if (type === "success") borderStyle = "var(--success)";
  
  toast.style.borderLeft = `4px solid ${borderStyle}`;
  toast.innerHTML = `
    <div style="display:flex; align-items:center; gap:0.5rem; width:100%;">
      <span>${message}</span>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// ==========================================================================
// SISTEMA DE NAVEGAÇÃO SPA
// ==========================================================================
function setupNavigation() {
  sidebarItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      const targetView = item.getAttribute("data-target");
      
      // Atualizar classe ativa do menu lateral
      sidebarItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");
      
      // Alternar visualização das seções
      viewSections.forEach(section => {
        if (section.id === targetView) {
          section.classList.add("active-view");
        } else {
          section.classList.remove("active-view");
        }
      });
      
      // Atualizar títulos do cabeçalho
      updateHeaderTitles(targetView);
      
      // Fechar a barra lateral no mobile
      if (window.innerWidth <= 768) {
        sidebar.classList.remove("open");
      }
    });
  });

  // Menu Hamburguer Mobile
  btnBurger.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });

  // Fechar sidebar ao clicar fora no mobile
  document.addEventListener("click", (e) => {
    if (window.innerWidth <= 768) {
      if (!sidebar.contains(e.target) && !btnBurger.contains(e.target) && sidebar.classList.contains("open")) {
        sidebar.classList.remove("open");
      }
    }
  });
}

function updateHeaderTitles(viewId) {
  switch (viewId) {
    case "view-catalog":
      viewTitle.textContent = "Catálogo de Autopeças";
      viewSubtitle.textContent = "Consulte nosso estoque de peças pesadas ou inicie uma ordem de serviço.";
      break;
    case "view-invoice-builder":
      viewTitle.textContent = "Nova Nota / Orçamento";
      viewSubtitle.textContent = "Monte a ordem de serviço do veículo detalhando peças e mão de obra.";
      break;
    case "view-history":
      viewTitle.textContent = "Histórico de Notas";
      viewSubtitle.textContent = "Gerencie as notas de serviço já emitidas e faturadas.";
      break;

    case "view-contact":
      viewTitle.textContent = "Fale Conosco";
      viewSubtitle.textContent = "Entre em contato com a Wando Diesel.";
      break;

    case "view-settings":
      viewTitle.textContent = "Ajustes — Catálogo de Peças";
      viewSubtitle.textContent = "Adicione, edite e remova peças do catálogo. As alterações são salvas automaticamente.";
      break;
  }
}

// ==========================================================================
// RENDERIZAÇÃO DO CATÁLOGO DE PRODUTOS
// ==========================================================================
function setupCatalog() {
  // Configurar Filtros de Categoria Dinamicamente
  categoryFilterBar.innerHTML = "";
  Object.entries(CATEGORIES).forEach(([key, label]) => {
    const btn = document.createElement("button");
    btn.className = `filter-btn ${key === selectedCategory ? "active" : ""}`;
    btn.textContent = label;
    btn.setAttribute("data-category", key);
    
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedCategory = key;
      renderCatalogGrid();
    });
    
    categoryFilterBar.appendChild(btn);
  });

  // Input de busca por texto
  catalogSearch.addEventListener("input", renderCatalogGrid);
  
  // Renderizar o estoque inicialmente
  renderCatalogGrid();
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function renderCatalogGrid() {
  const query = catalogSearch.value.trim().toLowerCase();
  
  // Filtrar banco de dados
  const filtered = DIESEL_DATABASE.filter(item => {
    const matchCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchText = item.name.toLowerCase().includes(query) || 
                      item.sku.toLowerCase().includes(query) || 
                      (item.description && item.description.toLowerCase().includes(query));
    return matchCategory && matchText;
  });

  catalogGrid.innerHTML = "";

  if (filtered.length === 0) {
    catalogGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem;">
        Nenhuma peça encontrada correspondente aos filtros.
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("article");
    card.className = "product-card";
    
    const isLowStock = item.stock <= 3;
    
    // Renderização dos cards com SVGs mecânicos
    card.innerHTML = `
      <div class="product-badge">${formatCurrency(item.price)}</div>
      <div class="product-image-container">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      </div>
      <div class="product-info">
        <h3 class="product-title" title="${item.name}">${item.name}</h3>
        <p class="product-desc">${item.description || ""}</p>
        <div class="product-meta">
          <span class="product-stock ${isLowStock ? "low-stock" : ""}">Estoque: ${item.stock} un</span>
          <span class="product-sku" style="font-size:0.75rem; color:var(--text-muted);">SKU: ${item.sku}</span>
        </div>
        <div class="product-actions">
          <button class="btn btn-secondary btn-sm btn-block btn-details" style="flex:1;">Detalhes</button>
          <button class="btn btn-primary btn-sm btn-quick-add" style="flex:1;">+ Nota</button>
        </div>
      </div>
    `;
    
    // Event listeners
    card.querySelector(".btn-details").addEventListener("click", () => openProductDetailModal(item));
    card.querySelector(".btn-quick-add").addEventListener("click", () => {
      addPartToInvoice(item, 1);
      showToast("Peça adicionada à Ordem de Serviço!");
    });
    
    catalogGrid.appendChild(card);
  });
}

// ==========================================================================
// MODAL DE DETALHES DE PRODUTO
// ==========================================================================
function openProductDetailModal(product) {
  activeProductDetail = product;
  
  modalProductTitle.textContent = product.name;
  modalProductDesc.textContent = product.description || "Nenhuma descrição disponível.";
  modalProductPrice.textContent = formatCurrency(product.price);
  
  // Stock Badge
  modalProductStockBadge.textContent = `Estoque: ${product.stock} un`;
  if (product.stock <= 3) {
    modalProductStockBadge.className = "badge btn-danger";
    modalProductStockBadge.style.color = "#fff";
  } else {
    modalProductStockBadge.className = "badge badge-success";
    modalProductStockBadge.style.color = "var(--success)";
  }
  
  // Specs
  modalProductSpecs.innerHTML = "";
  if (product.specs && Object.keys(product.specs).length > 0) {
    Object.entries(product.specs).forEach(([key, val]) => {
      const specRow = document.createElement("div");
      specRow.className = "summary-row";
      specRow.style.fontSize = "0.9rem";
      specRow.style.borderBottom = "1px solid rgba(255,255,255,0.03)";
      specRow.style.padding = "0.4rem 0";
      specRow.innerHTML = `
        <span style="color:var(--text-muted); font-weight:500;">${key}:</span>
        <span style="color:var(--text-main);">${val}</span>
      `;
      modalProductSpecs.appendChild(specRow);
    });
  } else {
    modalProductSpecs.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem;">Ficha técnica não disponível.</p>`;
  }
  
  productModalOverlay.classList.add("active");
}

function closeProductDetailModal() {
  productModalOverlay.classList.remove("active");
  activeProductDetail = null;
}

// Add to Cart from Details Modal
modalProductAddCart.addEventListener("click", () => {
  if (activeProductDetail) {
    addPartToInvoice(activeProductDetail, 1);
    showToast("Peça adicionada à Ordem de Serviço!");
    closeProductDetailModal();
  }
});

// ==========================================================================
// FORMULÁRIO DO CRIADOR DE NOTAS (EDITORES E LOGICA)
// ==========================================================================
function setupInvoiceBuilder() {
  // Vincular eventos dos campos de texto (para salvar rascunho em tempo real)
  const clientFields = [
    [clientNameInput, "clientName"],
    [clientDocInput, "clientDoc"],
    [clientPhoneInput, "clientPhone"],
    [vehicleModelInput, "vehicleModel"],
    [vehiclePlateInput, "vehiclePlate"],
    [vehicleKmInput, "vehicleKm"],
    [vehicleYearInput, "vehicleYear"],
    [invoiceNotesInput, "notes"]
  ];

  clientFields.forEach(([input, fieldKey]) => {
    input.value = currentInvoice[fieldKey] || "";
    input.addEventListener("input", (e) => {
      currentInvoice[fieldKey] = e.target.value;
      saveDraft();
    });
  });

  // Inputs numéricos do resumo
  invoiceDiscountInput.value = currentInvoice.discount || 0;
  invoiceDiscountInput.addEventListener("input", (e) => {
    currentInvoice.discount = parseFloat(e.target.value) || 0;
    recalculateInvoice();
    saveDraft();
  });

  invoiceTaxInput.value = currentInvoice.tax || 0;
  invoiceTaxInput.addEventListener("input", (e) => {
    currentInvoice.tax = parseFloat(e.target.value) || 0;
    recalculateInvoice();
    saveDraft();
  });

  // Modais de peças e serviços manuais
  btnAddManualPart.addEventListener("click", () => {
    manualPartModalOverlay.classList.add("active");
    manualPartForm.reset();
  });

  btnAddService.addEventListener("click", () => {
    serviceModalOverlay.classList.add("active");
    serviceForm.reset();
  });

  // Limpar Rascunho
  btnClearInvoice.addEventListener("click", () => {
    if (confirm("Tem certeza que deseja limpar todo o rascunho desta nota de serviço?")) {
      clearDraft();
      showToast("Rascunho limpo!", "success");
    }
  });

  // Salvar / Emitir nota de serviço
  btnSaveInvoice.addEventListener("click", emitInvoice);

  // Fechar modais
  modalProductClose.addEventListener("click", closeProductDetailModal);
  modalProductCancel.addEventListener("click", closeProductDetailModal);

  modalInvoiceActionClose.addEventListener("click", () => invoiceActionModalOverlay.classList.remove("active"));
  btnInvoiceActionCloseFooter.addEventListener("click", () => invoiceActionModalOverlay.classList.remove("active"));
  btnActionPdf.addEventListener("click", () => {
    if (lastEmittedInvoice) {
      downloadInvoicePDF(lastEmittedInvoice);
    }
  });
  btnActionPrint.addEventListener("click", () => {
    if (lastEmittedInvoice) {
      printInvoiceLayout(lastEmittedInvoice);
    }
  });

  modalManualClose.addEventListener("click", () => manualPartModalOverlay.classList.remove("active"));
  modalManualCancel.addEventListener("click", () => manualPartModalOverlay.classList.remove("active"));

  modalServiceClose.addEventListener("click", () => serviceModalOverlay.classList.remove("active"));
  modalServiceCancel.addEventListener("click", () => serviceModalOverlay.classList.remove("active"));

  // Formulário Peça Manual - Submit
  manualPartForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const item = {
      id: `manual-${Date.now()}`,
      sku: manualPartSku.value.trim() || "S/SKU",
      name: manualPartName.value.trim(),
      price: parseFloat(manualPartPrice.value) || 0,
      stock: 99, // manual item doesn't have stock limit
      description: "Adicionada manualmente"
    };
    const qty = parseInt(manualPartQty.value) || 1;
    addPartToInvoice(item, qty, true);
    manualPartModalOverlay.classList.remove("active");
    showToast("Peça manual adicionada!");
  });

  // Formulário Serviço - Submit
  serviceForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const service = {
      id: `srv-${Date.now()}`,
      desc: serviceDesc.value.trim(),
      hours: parseFloat(serviceHours.value) || 1,
      rate: parseFloat(serviceRate.value) || 120.00
    };
    currentInvoice.services.push(service);
    renderInvoiceTables();
    recalculateInvoice();
    saveDraft();
    serviceModalOverlay.classList.remove("active");
    showToast("Serviço adicionado!");
  });

  // Inicializar tabelas e cálculo
  renderInvoiceTables();
  recalculateInvoice();
}

function saveDraft() {
  localStorage.setItem("wd_current_draft", JSON.stringify(currentInvoice));
}

function clearDraft() {
  currentInvoice = {
    clientName: "",
    clientDoc: "",
    clientPhone: "",
    vehicleModel: "",
    vehiclePlate: "",
    vehicleKm: "",
    vehicleYear: "",
    parts: [],
    services: [],
    discount: 0,
    tax: 0,
    notes: ""
  };
  
  // Limpar inputs da UI
  clientNameInput.value = "";
  clientDocInput.value = "";
  clientPhoneInput.value = "";
  vehicleModelInput.value = "";
  vehiclePlateInput.value = "";
  vehicleKmInput.value = "";
  vehicleYearInput.value = "";
  invoiceNotesInput.value = "";
  
  invoiceDiscountInput.value = 0;
  invoiceTaxInput.value = 0;

  renderInvoiceTables();
  recalculateInvoice();
  saveDraft();
}

// Lógica de adição de peça
function addPartToInvoice(item, qty = 1, isManual = false) {
  // Verificar se o item já está na nota
  const existing = currentInvoice.parts.find(p => p.id === item.id);
  if (existing) {
    existing.qty += qty;
  } else {
    currentInvoice.parts.push({
      id: item.id,
      sku: item.sku,
      name: item.name,
      price: item.price,
      qty: qty,
      isManual: isManual
    });
  }
  
  renderInvoiceTables();
  recalculateInvoice();
  saveDraft();
}

function removePartFromInvoice(id) {
  currentInvoice.parts = currentInvoice.parts.filter(p => p.id !== id);
  renderInvoiceTables();
  recalculateInvoice();
  saveDraft();
  showToast("Peça removida da nota.", "warning");
}

function removeServiceFromInvoice(id) {
  currentInvoice.services = currentInvoice.services.filter(s => s.id !== id);
  renderInvoiceTables();
  recalculateInvoice();
  saveDraft();
  showToast("Serviço removido da nota.", "warning");
}

function updatePartQty(id, newQty) {
  const item = currentInvoice.parts.find(p => p.id === id);
  if (item) {
    item.qty = Math.max(1, parseInt(newQty) || 1);
    recalculateInvoice();
    saveDraft();
  }
}

function updateServiceHours(id, newHours) {
  const srv = currentInvoice.services.find(s => s.id === id);
  if (srv) {
    srv.hours = Math.max(0.5, parseFloat(newHours) || 0.5);
    recalculateInvoice();
    saveDraft();
  }
}

function updateServiceRate(id, newRate) {
  const srv = currentInvoice.services.find(s => s.id === id);
  if (srv) {
    srv.rate = Math.max(0, parseFloat(newRate) || 0);
    recalculateInvoice();
    saveDraft();
  }
}

// Renderizar tabelas
function renderInvoiceTables() {
  // 1. Peças
  invoicePartsBody.innerHTML = "";
  if (currentInvoice.parts.length === 0) {
    invoicePartsBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Nenhuma peça adicionada. Adicione peças do catálogo ou use o botão 'Peça Manual'.
        </td>
      </tr>
    `;
  } else {
    currentInvoice.parts.forEach(part => {
      const tr = document.createElement("tr");
      
      const total = part.qty * part.price;
      tr.innerHTML = `
        <td style="font-family:monospace; color:var(--text-muted);">${part.sku}</td>
        <td>
          <div style="font-weight:500;">${part.name}</div>
          ${part.isManual ? '<span style="font-size:0.7rem; color:var(--primary); padding:0.1rem 0.3rem; border:1px solid var(--primary); border-radius:4px; margin-top:0.2rem; display:inline-block;">MANUAL</span>' : ''}
        </td>
        <td style="text-align: center;">
          <input type="number" class="qty-input part-qty-field" value="${part.qty}" min="1" style="width: 70px;">
        </td>
        <td style="text-align: right;">${formatCurrency(part.price)}</td>
        <td style="text-align: right; font-weight:600;">${formatCurrency(total)}</td>
        <td style="text-align: center;">
          <button class="btn btn-danger btn-sm btn-delete-part" style="padding:0.3rem 0.5rem;" title="Remover">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </td>
      `;
      
      // Listeners
      tr.querySelector(".part-qty-field").addEventListener("change", (e) => {
        updatePartQty(part.id, e.target.value);
        tr.querySelector("td:nth-child(5)").textContent = formatCurrency(part.qty * part.price);
      });
      
      tr.querySelector(".btn-delete-part").addEventListener("click", () => {
        removePartFromInvoice(part.id);
      });
      
      invoicePartsBody.appendChild(tr);
    });
  }

  // 2. Serviços
  invoiceServicesBody.innerHTML = "";
  if (currentInvoice.services.length === 0) {
    invoiceServicesBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">
          Nenhum serviço de mão de obra cadastrado para esta ordem.
        </td>
      </tr>
    `;
  } else {
    currentInvoice.services.forEach(srv => {
      const tr = document.createElement("tr");
      const total = srv.hours * srv.rate;
      tr.innerHTML = `
        <td><div style="font-weight:500;">${srv.desc}</div></td>
        <td style="text-align: center;">
          <input type="number" class="qty-input service-hours-field" value="${srv.hours}" min="0.5" step="0.5" style="width: 80px;">
        </td>
        <td style="text-align: right;">
          <input type="number" class="qty-input service-rate-field" value="${srv.rate.toFixed(2)}" min="0" step="0.01" style="width: 100px; text-align: right;">
        </td>
        <td style="text-align: right; font-weight:600;">${formatCurrency(total)}</td>
        <td style="text-align: center;">
          <button class="btn btn-danger btn-sm btn-delete-service" style="padding:0.3rem 0.5rem;" title="Remover">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </td>
      `;

      // Listeners
      tr.querySelector(".service-hours-field").addEventListener("change", (e) => {
        updateServiceHours(srv.id, e.target.value);
        tr.querySelector("td:nth-child(4)").textContent = formatCurrency(srv.hours * srv.rate);
      });
      
      tr.querySelector(".service-rate-field").addEventListener("change", (e) => {
        updateServiceRate(srv.id, e.target.value);
        tr.querySelector("td:nth-child(4)").textContent = formatCurrency(srv.hours * srv.rate);
      });

      tr.querySelector(".btn-delete-service").addEventListener("click", () => {
        removeServiceFromInvoice(srv.id);
      });

      invoiceServicesBody.appendChild(tr);
    });
  }
}

// Recalcular totais
function recalculateInvoice() {
  const partsSubtotal = currentInvoice.parts.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const servicesSubtotal = currentInvoice.services.reduce((sum, item) => sum + (item.hours * item.rate), 0);
  
  const discount = currentInvoice.discount || 0;
  const tax = currentInvoice.tax || 0;

  const subtotal = partsSubtotal + servicesSubtotal;
  const discountAmount = subtotal * (discount / 100);
  const total = Math.max(0, subtotal + tax - discountAmount);
  
  // Atualizar DOM da calculadora
  summaryTotalParts.textContent = formatCurrency(partsSubtotal);
  summaryTotalServices.textContent = formatCurrency(servicesSubtotal);
  summaryTotalValue.textContent = formatCurrency(total);

  // Mostrar linha de desconto em R$ se houver percentual aplicado
  const discountDisplayRow = document.getElementById("discount-display-row");
  const summaryDiscountValue = document.getElementById("summary-discount-value");
  if (discountAmount > 0) {
    discountDisplayRow.style.display = "flex";
    summaryDiscountValue.textContent = `- ${formatCurrency(discountAmount)}`;
  } else {
    discountDisplayRow.style.display = "none";
  }

  // Atualizar Painel Principal (Orçamento em Edição)
  statCurrentInvoice.textContent = formatCurrency(total);
}

// ==========================================================================
// FATURAMENTO E HISTÓRICO DE NOTAS
// ==========================================================================
function setupHistory() {
  // Limpar todo histórico com confirmação
  btnClearHistory.addEventListener("click", () => {
    if (confirm("ATENÇÃO: Deseja realmente excluir permanentemente TODAS as notas do histórico?")) {
      invoiceHistory = [];
      localStorage.setItem("wd_invoice_history", JSON.stringify(invoiceHistory));
      renderHistory();
      showToast("Histórico deletado com sucesso.", "warning");
    }
  });

  renderHistory();
}

function renderHistory() {
  // Atualizar estatísticas do dashboard
  const count = invoiceHistory.length;
  statBilledCount.textContent = count;
  
  let partsRevenueSum = 0;
  let servicesRevenueSum = 0;
  let totalRevenueSum = 0;

  invoiceHistory.forEach(inv => {
    partsRevenueSum += inv.partsSubtotal;
    servicesRevenueSum += inv.servicesSubtotal;
    totalRevenueSum += inv.total;
  });

  historyTotalRevenue.textContent = formatCurrency(totalRevenueSum);
  historyPartsRevenue.textContent = formatCurrency(partsRevenueSum);
  historyServicesRevenue.textContent = formatCurrency(servicesRevenueSum);

  // Preencher tabela
  historyTableBody.innerHTML = "";
  
  if (invoiceHistory.length === 0) {
    historyTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2.5rem;">
          Nenhuma nota de serviço emitida até o momento.
        </td>
      </tr>
    `;
    return;
  }

  // Notas mais recentes primeiro
  const sortedHistory = [...invoiceHistory].reverse();

  sortedHistory.forEach(inv => {
    const tr = document.createElement("tr");
    const formattedDate = new Date(inv.createdAt).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

    tr.innerHTML = `
      <td style="font-weight:600; font-family:monospace; color:var(--primary);">${inv.number}</td>
      <td>${formattedDate}</td>
      <td style="font-weight:500;">${inv.clientName}</td>
      <td>${inv.vehicleModel}</td>
      <td style="text-align: right; font-weight:600; color:var(--success);">${formatCurrency(inv.total)}</td>
      <td style="text-align: center;">
        <div style="display:flex; gap:0.5rem; justify-content:center;">
          <button class="btn btn-secondary btn-sm btn-print-hist" title="Imprimir/Visualizar">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px;"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          </button>
          <button class="btn btn-secondary btn-sm btn-pdf-hist" title="Baixar PDF">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:2;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button class="btn btn-danger btn-sm btn-delete-hist" title="Excluir Nota">
            <svg viewBox="0 0 24 24" style="width:14px; height:14px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </td>
    `;

    tr.querySelector(".btn-print-hist").addEventListener("click", () => {
      printInvoiceLayout(inv);
    });

    tr.querySelector(".btn-pdf-hist").addEventListener("click", () => {
      downloadInvoicePDF(inv);
    });

    tr.querySelector(".btn-delete-hist").addEventListener("click", () => {
      if (confirm(`Excluir a nota ${inv.number} de ${inv.clientName}? Esta ação não pode ser desfeita.`)) {
        deleteInvoiceFromHistory(inv.id);
      }
    });

    historyTableBody.appendChild(tr);
  });
}

function deleteInvoiceFromHistory(id) {
  invoiceHistory = invoiceHistory.filter(inv => inv.id !== id);
  localStorage.setItem("wd_invoice_history", JSON.stringify(invoiceHistory));
  renderHistory();
  showToast("Nota de serviço excluída do histórico.", "warning");
}

function emitInvoice() {
  // Validar requisitos
  if (!currentInvoice.clientName.trim()) {
    showToast("Por favor, preencha o Nome do Cliente.", "warning");
    clientNameInput.focus();
    return;
  }
  if (!currentInvoice.vehicleModel.trim()) {
    showToast("Por favor, preencha o Modelo do Veículo.", "warning");
    vehicleModelInput.focus();
    return;
  }
  if (currentInvoice.parts.length === 0 && currentInvoice.services.length === 0) {
    showToast("Adicione pelo menos uma peça ou serviço mecânico à nota.", "warning");
    return;
  }

  // Gerar numeração
  const number = `WD-${10000 + invoiceHistory.length + 1}`;
  const partsSubtotal = currentInvoice.parts.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const servicesSubtotal = currentInvoice.services.reduce((sum, item) => sum + (item.hours * item.rate), 0);
  const subtotal = partsSubtotal + servicesSubtotal;
  const discountAmount = subtotal * (currentInvoice.discount / 100);
  const total = Math.max(0, subtotal + currentInvoice.tax - discountAmount);

  // Criar objeto da nota
  const invoiceData = {
    id: `invoice-${Date.now()}`,
    number: number,
    createdAt: Date.now(),
    clientName: currentInvoice.clientName,
    clientDoc: currentInvoice.clientDoc,
    clientPhone: currentInvoice.clientPhone,
    vehicleModel: currentInvoice.vehicleModel,
    vehiclePlate: currentInvoice.vehiclePlate,
    vehicleKm: currentInvoice.vehicleKm,
    vehicleYear: currentInvoice.vehicleYear,
    parts: [...currentInvoice.parts],
    services: [...currentInvoice.services],
    partsSubtotal: partsSubtotal,
    servicesSubtotal: servicesSubtotal,
    discount: currentInvoice.discount,
    tax: currentInvoice.tax,
    total: total,
    notes: currentInvoice.notes
  };

  // Salvar no histórico
  invoiceHistory.push(invoiceData);
  localStorage.setItem("wd_invoice_history", JSON.stringify(invoiceHistory));
  
  // Atualizar UI de histórico
  renderHistory();

  // Guardar última nota e abrir modal de sucesso
  lastEmittedInvoice = invoiceData;
  invoiceActionSubtitle.textContent = `Nota ${invoiceData.number} Faturada!`;
  invoiceActionModalOverlay.classList.add("active");

  // Limpar formulário de rascunho
  clearDraft();
  showToast("Nota Faturada e salva no Histórico!");
}

// ==========================================================================
// LAYOUT DE IMPRESSÃO FISICA / PDF
// ==========================================================================
function fillPrintInvoiceLayout(invoice) {
  // Preencher campos de cabeçalho e cliente
  printInvoiceNumber.textContent = invoice.number;
  
  const formattedDate = new Date(invoice.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  printInvoiceDate.textContent = formattedDate;

  printClientName.textContent = invoice.clientName;
  printClientDoc.textContent = invoice.clientDoc || "Não Informado";
  printClientPhone.textContent = invoice.clientPhone || "Não Informado";

  printVehicleModel.textContent = invoice.vehicleModel;
  printVehiclePlate.textContent = invoice.vehiclePlate || "Não Informado";
  printVehicleKm.textContent = invoice.vehicleKm ? `${parseInt(invoice.vehicleKm).toLocaleString("pt-BR")} KM` : "Não Informado";
  printVehicleYear.textContent = invoice.vehicleYear || "Não Informado";

  // Preencher Peças
  printPartsBody.innerHTML = "";
  if (invoice.parts.length === 0) {
    printPartsBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: #444; padding: 1rem;">Nenhuma peça aplicada.</td>
      </tr>
    `;
  } else {
    invoice.parts.forEach(part => {
      const tr = document.createElement("tr");
      const total = part.qty * part.price;
      tr.innerHTML = `
        <td style="font-family:monospace; text-align:center;">${part.sku}</td>
        <td>${part.name}</td>
        <td style="text-align: center;">${part.qty}</td>
        <td style="text-align: right;">${formatCurrency(part.price)}</td>
        <td style="text-align: right; font-weight: bold;">${formatCurrency(total)}</td>
      `;
      printPartsBody.appendChild(tr);
    });
  }

  // Preencher Serviços
  printServicesBody.innerHTML = "";
  if (invoice.services.length === 0) {
    printServicesBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: #444; padding: 1rem;">Nenhum serviço mecânico executado.</td>
      </tr>
    `;
  } else {
    invoice.services.forEach(srv => {
      const tr = document.createElement("tr");
      const total = srv.hours * srv.rate;
      tr.innerHTML = `
        <td>${srv.desc}</td>
        <td style="text-align: center;">${srv.hours} h</td>
        <td style="text-align: right;">${formatCurrency(srv.rate)}</td>
        <td style="text-align: right; font-weight: bold;">${formatCurrency(total)}</td>
      `;
      printServicesBody.appendChild(tr);
    });
  }

  // Observações
  printInvoiceNotes.textContent = invoice.notes || "Garantia legal de 90 dias conforme código de defesa do consumidor.";

  // Totais
  printTotalParts.textContent = formatCurrency(invoice.partsSubtotal);
  printTotalServices.textContent = formatCurrency(invoice.servicesSubtotal);
  
  // Desconto e Impostos
  const discountRow = document.getElementById("print-discount-row");
  if (invoice.discount > 0) {
    discountRow.style.display = "table-row";
    const discountAmt = (invoice.partsSubtotal + invoice.servicesSubtotal) * (invoice.discount / 100);
    printDiscount.textContent = `-${formatCurrency(discountAmt)} (${invoice.discount}%)`;
  } else {
    discountRow.style.display = "none";
  }

  const taxRow = document.getElementById("print-tax-row");
  if (invoice.tax > 0) {
    taxRow.style.display = "table-row";
    printTax.textContent = formatCurrency(invoice.tax);
  } else {
    taxRow.style.display = "none";
  }

  printTotalValue.textContent = formatCurrency(invoice.total);
  
  // Assinatura do Cliente
  printClientSignatureName.textContent = invoice.clientName;
}

function printInvoiceLayout(invoice) {
  fillPrintInvoiceLayout(invoice);

  // Chamar o comando de impressão do navegador
  setTimeout(() => {
    window.print();
  }, 100);
}

function downloadInvoicePDF(invoice) {
  fillPrintInvoiceLayout(invoice);

  const element = document.getElementById("print-preview-section");
  
  // Exibir temporariamente o container para que o html2canvas possa renderizar
  const originalDisplay = element.style.display;
  element.style.display = "block";

  const opt = {
    margin:       [10, 10, 10, 10], // em mm
    filename:     `Nota_${invoice.number}.pdf`,
    image:        { type: "jpeg", quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    element.style.display = originalDisplay;
  }).catch(err => {
    console.error("Erro ao gerar PDF:", err);
    element.style.display = originalDisplay;
    showToast("Erro ao gerar arquivo PDF da nota.", "error");
  });
}


// ==========================================================================
// AJUSTES — GERENCIADOR DE PEÇAS DO CATÁLOGO
// ==========================================================================
function setupSettings() {
  // Preencher o select de categorias (excluindo "all")
  Object.entries(CATEGORIES).forEach(([key, label]) => {
    if (key === "all") return;
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = label;
    settingsCategorySelect.appendChild(opt);
  });

  // Busca em tempo real
  settingsSearch.addEventListener("input", renderSettingsTable);

  // Cancelar edição
  settingsCancelEdit.addEventListener("click", () => {
    settingsEditingId = null;
    settingsPartForm.reset();
    settingsStock.value = 10;
    settingsCancelEdit.style.display = "none";
    settingsFormTitle.innerHTML = `
      <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Adicionar Nova Peça`;
    settingsSubmitBtn.textContent = "Salvar Peça";
  });

  // Submit do formulário (adicionar ou editar)
  settingsPartForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const partData = {
      id: settingsEditingId || `custom-${Date.now()}`,
      name: settingsName.value.trim(),
      sku: settingsSku.value.trim().toUpperCase(),
      category: settingsCategorySelect.value,
      price: parseFloat(settingsPrice.value) || 0,
      stock: parseInt(settingsStock.value) || 0,
      description: settingsDesc.value.trim(),
      specs: {}
    };

    if (settingsEditingId) {
      // Atualizar peça existente
      const idx = DIESEL_DATABASE.findIndex(p => p.id === settingsEditingId);
      if (idx !== -1) DIESEL_DATABASE[idx] = partData;
      showToast(`Peça "${partData.name}" atualizada com sucesso!`);
    } else {
      // Verificar SKU duplicado
      if (DIESEL_DATABASE.find(p => p.sku === partData.sku)) {
        showToast(`Já existe uma peça com o SKU "${partData.sku}".`, "warning");
        return;
      }
      DIESEL_DATABASE.push(partData);
      showToast(`Peça "${partData.name}" adicionada ao catálogo!`);
    }

    saveCatalog();
    renderCatalogGrid();
    statTotalItems.textContent = DIESEL_DATABASE.length;
    renderSettingsTable();

    // Resetar form
    settingsEditingId = null;
    settingsPartForm.reset();
    settingsStock.value = 10;
    settingsCancelEdit.style.display = "none";
    settingsFormTitle.innerHTML = `
      <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Adicionar Nova Peça`;
  });

  // Limpar todo o catálogo
  btnClearCatalog.addEventListener("click", () => {
    if (confirm("ATENÇÃO: Deseja excluir TODAS as peças do catálogo? Esta ação não pode ser desfeita.")) {
      DIESEL_DATABASE.length = 0;
      saveCatalog();
      renderCatalogGrid();
      renderSettingsTable();
      statTotalItems.textContent = 0;
      showToast("Catálogo limpo com sucesso.", "warning");
    }
  });

  renderSettingsTable();
}

function renderSettingsTable() {
  const query = settingsSearch.value.trim().toLowerCase();

  const filtered = DIESEL_DATABASE.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.sku.toLowerCase().includes(query) ||
    (p.description && p.description.toLowerCase().includes(query))
  );

  // Atualizar stats
  settingsStatTotal.textContent = DIESEL_DATABASE.length;
  settingsStatLow.textContent = DIESEL_DATABASE.filter(p => p.stock > 0 && p.stock <= 3).length;
  settingsStatZero.textContent = DIESEL_DATABASE.filter(p => p.stock === 0).length;

  settingsPartsBody.innerHTML = "";

  if (filtered.length === 0) {
    settingsPartsBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:var(--text-muted); padding:2rem;">
          ${DIESEL_DATABASE.length === 0 ? "Nenhuma peça cadastrada. Adicione peças usando o formulário ao lado." : "Nenhuma peça encontrada para a busca."}
        </td>
      </tr>`;
    return;
  }

  filtered.forEach(part => {
    const tr = document.createElement("tr");
    const isLow = part.stock <= 3 && part.stock > 0;
    const isZero = part.stock === 0;
    const categoryLabel = CATEGORIES[part.category] || part.category;

    tr.innerHTML = `
      <td style="font-family:monospace; color:var(--text-muted); font-size:0.85rem;">${part.sku}</td>
      <td style="font-weight:500;">${part.name}
        ${part.description ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">${part.description}</div>` : ""}
      </td>
      <td><span style="font-size:0.8rem; color:var(--primary); background:rgba(0,119,255,0.1); padding:0.2rem 0.5rem; border-radius:4px;">${categoryLabel}</span></td>
      <td style="text-align:right; font-weight:600; color:var(--success);">${formatCurrency(part.price)}</td>
      <td style="text-align:center;">
        <span style="font-size:0.9rem; font-weight:600; color:${isZero ? "var(--danger)" : isLow ? "var(--warning)" : "var(--text-main)"}">${part.stock}</span>
      </td>
      <td style="text-align:center;">
        <div style="display:flex; gap:0.4rem; justify-content:center;">
          <button class="btn btn-secondary btn-sm btn-settings-edit" title="Editar peça" style="padding:0.3rem 0.5rem;">
            <svg viewBox="0 0 24 24" style="width:13px;height:13px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-danger btn-sm btn-settings-delete" title="Excluir peça" style="padding:0.3rem 0.5rem;">
            <svg viewBox="0 0 24 24" style="width:13px;height:13px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          </button>
        </div>
      </td>`;

    tr.querySelector(".btn-settings-edit").addEventListener("click", () => {
      settingsEditingId = part.id;
      settingsName.value = part.name;
      settingsSku.value = part.sku;
      settingsCategorySelect.value = part.category;
      settingsPrice.value = part.price;
      settingsStock.value = part.stock;
      settingsDesc.value = part.description || "";
      settingsCancelEdit.style.display = "inline-flex";
      settingsFormTitle.innerHTML = `
        <svg viewBox="0 0 24 24" style="color:var(--warning);"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        Editando: ${part.name}`;
      // Rolar até o formulário
      settingsPartForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
      settingsName.focus();
    });

    tr.querySelector(".btn-settings-delete").addEventListener("click", () => {
      if (confirm(`Excluir a peça "${part.name}" do catálogo?`)) {
        const idx = DIESEL_DATABASE.findIndex(p => p.id === part.id);
        if (idx !== -1) DIESEL_DATABASE.splice(idx, 1);
        saveCatalog();
        renderCatalogGrid();
        renderSettingsTable();
        statTotalItems.textContent = DIESEL_DATABASE.length;
        showToast(`Peça "${part.name}" removida do catálogo.`, "warning");
      }
    });

    settingsPartsBody.appendChild(tr);
  });
}

// ==========================================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Configurar Itens no Catálogo inicial no widget superior
  statTotalItems.textContent = DIESEL_DATABASE.length;

  setupNavigation();
  setupCatalog();
  setupInvoiceBuilder();
  setupHistory();
  setupSettings();
});
