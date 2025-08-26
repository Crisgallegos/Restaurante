const API_URL = "https://script.google.com/macros/s/AKfycbyVsQQqvwXJ9z6l4S2o4hluDLjmtoBBCYOJ0wfJPa-d3o-hvl0HeURo-Pics2XPAkGzYw/exec"; // cambia por tu URL webapp

async function _get(action) {
  try {
    const res = await fetch(`${API_URL}?action=${action}`);
    return res.json();
  } catch (err) {
    console.error("Error GET:", err);
  }
}

async function _post(data) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" }
    });
    return res.json();
  } catch (err) {
    console.error("Error POST:", err);
  }
}

// === Render Mesas ===
async function renderTables() {
  const container = document.getElementById("tables");
  container.innerHTML = "";
  let tables = await _get("tables");

  tables.forEach(table => {
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
    card.addEventListener("click", () => openMenuModal(table));
    col.appendChild(card);
    container.appendChild(col);
  });
}

// === Modal de menú ===
async function openMenuModal(table) {
  const menuContainer = document.getElementById("menu-items");
  menuContainer.innerHTML = "";

  let menu = await _get("menu");
  menu.forEach(item => {
    const div = document.createElement("div");
    div.className = "form-check";
    div.innerHTML = `
      <input class="form-check-input" type="checkbox" value="${item.id}" data-nombre="${item.nombre}" data-precio="${item.precio}">
      <label class="form-check-label">${item.nombre} - $${item.precio}</label>
    `;
    menuContainer.appendChild(div);
  });

  document.getElementById("confirmOrderBtn").onclick = () => confirmOrder(table);
  new bootstrap.Modal(document.getElementById("menuModal")).show();
}

async function confirmOrder(table) {
  const selected = document.querySelectorAll("#menu-items input:checked");
  let items = [];
  selected.forEach(el => {
    items.push({
      id: el.value,
      nombre: el.dataset.nombre,
      precio: el.dataset.precio
    });
  });

  await _post({ action: "createOrder", mesaId: table.id, items });
  bootstrap.Modal.getInstance(document.getElementById("menuModal")).hide();
  renderTables();
  renderOrders();
}

// === Pedidos ===
async function renderOrders() {
  const container = document.getElementById("orders");
  container.innerHTML = "";
  let orders = await _get("orders");

  orders.forEach(order => {
    const div = document.createElement("div");
    div.className = "card mb-2";
    div.innerHTML = `
      <div class="card-body">
        <h5>Mesa ${order.mesaId}</h5>
        <p>Estado: ${order.estado}</p>
        <ul>${order.items.map(i => `<li>${i.nombre} - $${i.precio}</li>`).join("")}</ul>
        ${order.estado === "en proceso" 
          ? `<button class="btn btn-success" onclick="updateStatus(${order.mesaId}, 'entregado')">Marcar entregado</button>` 
          : ""}
      </div>
    `;
    container.appendChild(div);
  });
}

async function updateStatus(mesaId, estado) {
  await _post({ action: "updateOrderStatus", mesaId, estado });
  renderOrders();
  renderCaja();
}

// === Caja ===
async function renderCaja() {
  const container = document.getElementById("caja");
  container.innerHTML = "";
  let orders = await _get("orders");

  let entregados = orders.filter(o => o.estado === "entregado");

  entregados.forEach(order => {
    const total = order.items.reduce((sum, i) => sum + Number(i.precio), 0);
    const div = document.createElement("div");
    div.className = "card mb-2";
    div.innerHTML = `
      <div class="card-body">
        <h5>Mesa ${order.mesaId}</h5>
        <ul>${order.items.map(i => `<li>${i.nombre} - $${i.precio}</li>`).join("")}</ul>
        <p><strong>Total: $${total}</strong></p>
        <button class="btn btn-primary" onclick="pay(${order.mesaId})">Pagar</button>
      </div>
    `;
    container.appendChild(div);
  });
}

async function pay(mesaId) {
  await _post({ action: "payOrder", mesaId });
  renderTables();
  renderCaja();
}

// === Inicialización ===
document.addEventListener("DOMContentLoaded", () => {
  renderTables();
  renderOrders();
  renderCaja();
});
