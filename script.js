// =============================
// CONFIGURACIÓN
// =============================
const API_URL = "https://script.google.com/macros/s/AKfycbzlz2QfTgUu4sdwgJfdHTCHYXfvMN66N3ZCTaZN4MXFA8N0MQ_x74_8JoAIhQY7CExVnw/exec"; 
// 👆 reemplaza con la URL de tu despliegue en Apps Script

// =============================
// FUNCIONES AUXILIARES
// =============================
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

// =============================
// OBTENER DATOS
// =============================
async function getMenu() {
  return await _get("menu");
}

async function getTables() {
  return await _get("tables");
}

async function getOrders() {
  return await _get("orders");
}

async function saveOrder(mesa, items, total) {
  return await _post({ mesa, items, total });
}

// =============================
// RENDERIZADO EN EL DOM
// =============================

// Renderizar menú
async function renderMenu() {
  const menu = await getMenu();
  const container = document.getElementById("menu");
  container.innerHTML = "";

  menu.forEach(item => {
    const div = document.createElement("div");
    div.classList.add("card", "m-2", "p-2");
    div.innerHTML = `
      <h5>${item.Nombre}</h5>
      <p>Precio: $${item.Precio}</p>
      <button class="btn btn-sm btn-primary" onclick="addToOrder('${item.Nombre}', ${item.Precio})">Agregar</button>
    `;
    container.appendChild(div);
  });
}

// Renderizar mesas
async function renderTables() {
  const tables = await getTables();
  const container = document.getElementById("tables");
  container.innerHTML = "";

  tables.forEach(t => {
    const div = document.createElement("div");
    div.classList.add("card", "m-2", "p-2");
    div.innerHTML = `
      <h5>Mesa ${t.Numero}</h5>
      <p>Estado: ${t.Estado}</p>
    `;
    container.appendChild(div);
  });
}

// =============================
// CARRITO DE PEDIDOS
// =============================
let currentOrder = [];
let currentMesa = null;

function addToOrder(nombre, precio) {
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

  document.getElementById("total").textContent = "Total: $" + total;
}

async function confirmOrder() {
  if (!currentMesa) {
    alert("Selecciona una mesa antes de confirmar el pedido.");
    return;
  }
  if (currentOrder.length === 0) {
    alert("El pedido está vacío.");
    return;
  }

  let total = currentOrder.reduce((acc, i) => acc + i.precio, 0);
  const result = await saveOrder(currentMesa, currentOrder, total);

  if (result.success) {
    alert("Pedido guardado con éxito ✅");
    currentOrder = [];
    renderOrder();
  } else {
    alert("Error al guardar el pedido ❌");
  }
}

// =============================
// INICIALIZACIÓN
// =============================
async function loadData() {
  await renderMenu();
  await renderTables();
}

document.addEventListener("DOMContentLoaded", loadData);
