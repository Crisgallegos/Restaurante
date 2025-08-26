// ============================
// CONFIGURACIÓN
// ============================
const API_URL = "https://script.google.com/macros/s/AKfycbzlz2QfTgUu4sdwgJfdHTCHYXfvMN66N3ZCTaZN4MXFA8N0MQ_x74_8JoAIhQY7CExVnw/exec"; // reemplaza con tu URL
let currentMesa = null;
let currentOrder = [];

// Mesas locales
const mesasLocales = [
  { id: 1, nombre: "Mesa 1", estado: "libre" },
  { id: 2, nombre: "Mesa 2", estado: "libre" },
  { id: 3, nombre: "Mesa 3", estado: "libre" },
  { id: 4, nombre: "Mesa 4", estado: "libre" },
  { id: 5, nombre: "Mesa 5", estado: "libre" },
  { id: 6, nombre: "Mesa 6", estado: "libre" }
];

// ============================
// FUNCIONES AUXILIARES
// ============================
async function _get(action) {
  try {
    const res = await fetch(`${API_URL}?action=${action}`);
    if (!res.ok) throw new Error("Error HTTP " + res.status);
    return await res.json();
  } catch (err) {
    console.error("Fallo remoto", err);
    return [];
  }
}

async function _post(data) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Error HTTP " + res.status);
    return await res.json();
  } catch (err) {
    console.error("Fallo remoto", err);
    return { error: err.message };
  }
}

// ============================
// RENDERIZADO MESAS Y MENÚ
// ============================
function renderTables() {
  const container = document.getElementById("tables");
  container.innerHTML = "";

  mesasLocales.forEach(table => {
    const col = document.createElement("div");
    col.className = "col-md-3";

    const card = document.createElement("div");
    card.className = `card mesa-card ${table.estado}`;
    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">${table.nombre}</h5>
        <p class="card-text">Estado: ${table.estado}</p>
      </div>
    `;
    card.addEventListener("click", () => selectTable(table));
    col.appendChild(card);
    container.appendChild(col);
  });
}

function selectTable(table) {
  if (table.estado === "ocupada") {
    alert("Esta mesa ya está ocupada");
    return;
  }
  currentMesa = table.nombre;
  alert(`Mesa seleccionada: ${table.nombre}`);
}

// Render menú desde Apps Script
async function renderMenu() {
  const menu = await _get("menu");
  const container = document.getElementById("menu");
  container.innerHTML = "";

  menu.forEach(item => {
    const col = document.createElement("div");
    col.className = "col-md-3";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-body">
        <h5>${item.Nombre}</h5>
        <p>Precio: $${item.Precio}</p>
        <button class="btn btn-sm btn-primary" onclick="addToOrder('${item.Nombre}', ${item.Precio})">Agregar</button>
      </div>
    `;
    col.appendChild(card);
    container.appendChild(col);
  });
}

// ============================
// CARRITO DE PEDIDO
// ============================
function addToOrder(nombre, precio) {
  if (!currentMesa) {
    alert("Selecciona una mesa primero");
    return;
  }
  currentOrder.push({ nombre, precio });
  renderOrder();
}

function renderOrder() {
  const container = document.getElementById("order");
  container.innerHTML = "";
  let total = 0;

  currentOrder.forEach(item => {
    total += item.precio;
    const li = document.createElement("li");
    li.textContent = `${item.nombre} - $${item.precio}`;
    container.appendChild(li);
  });

  document.getElementById("total").textContent = `Total: $${total}`;
}

// ============================
// CONFIRMAR PEDIDO
// ============================
async function confirmOrder() {
  if (!currentMesa) { alert("Selecciona una mesa"); return; }
  if (currentOrder.length === 0) { alert("El pedido está vacío"); return; }

  const total = currentOrder.reduce((acc, i) => acc + i.precio, 0);
  const result = await _post({ mesa: currentMesa, items: currentOrder, total });

  if (result.success) {
    alert("Pedido guardado ✅");
    // Marcar mesa como ocupada localmente
    mesasLocales.find(m => m.nombre === currentMesa).estado = "ocupada";
    renderTables();
    currentOrder = [];
    renderOrder();
    currentMesa = null;
  } else {
    alert("Error guardando el pedido ❌");
  }
}

// ============================
// PEDIDOS Y CAJA
// ============================
async function renderOrders() {
  const pedidos = await _get("orders");
  const container = document.getElementById("orders");
  container.innerHTML = "";

  pedidos.forEach(p => {
    const card = document.createElement("div");
    card.className = "card p-2 mb-2";
    card.innerHTML = `
      <h5>${p.mesa}</h5>
      <p>Estado: ${p.estado}</p>
      <p>Total: $${p.total}</p>
    `;
    container.appendChild(card);
  });
}

async function renderCaja() {
  const pedidos = await _get("orders");
  const container = document.getElementById("caja");
  container.innerHTML = "";

  pedidos.filter(p => p.estado === "entregado").forEach(p => {
    const card = document.createElement("div");
    card.className = "card p-2 mb-2";
    card.innerHTML = `
      <h5>${p.mesa}</h5>
      <p>Total: $${p.total}</p>
      <p>Detalle: ${p.items.map(i => i.nombre).join(", ")}</p>
    `;
    container.appendChild(card);
  });
}

// ============================
// INICIALIZACIÓN
// ============================
document.addEventListener("DOMContentLoaded", async () => {
  renderTables();
  renderMenu();
});
