// Reemplaza con la URL de tu WebApp desplegada
const API_URL = "https://script.google.com/macros/s/AKfycbzChN7dYncGJZ_Na212Fg5zjliSctBf0IuT9b2DMJdXxrb2BdBu4E5iRAwaCq9xyzYcvQ/execc";

// Función genérica GET
async function apiGet(action) {
  try {
    const res = await fetch(`${API_URL}?action=${action}`);
    return await res.json();
  } catch (err) {
    console.error("Error GET:", err);
    return [];
  }
}

// Función genérica POST
async function apiPost(action, data) {
  try {
    const res = await fetch(`${API_URL}?action=${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (err) {
    console.error("Error POST:", err);
    return { success: false, error: err };
  }
}

// Renderizar mesas
async function renderTables() {
  const tables = await apiGet("tables");
  const container = document.getElementById("tables-container");
  container.innerHTML = "";

  tables.forEach(table => {
    const div = document.createElement("div");
    div.className = "table-card";
    div.innerHTML = `
      <h3>${table.nombre}</h3>
      <p>Estado: ${table.estado}</p>
      <button onclick="openMenu('${table.nombre}')">Agregar Pedido</button>
    `;
    container.appendChild(div);
  });
}

// Abrir modal con menú
function openMenu(mesa) {
  const modal = document.getElementById("menuModal");
  modal.style.display = "block";
  document.getElementById("selectedMesa").value = mesa;
}

// Guardar pedido
document.getElementById("saveOrderBtn").addEventListener("click", async () => {
  const mesa = document.getElementById("selectedMesa").value;
  const items = Array.from(document.querySelectorAll(".menu-item:checked"))
    .map(item => item.value);

  if (!items.length) {
    alert("Debes seleccionar al menos un ítem del menú");
    return;
  }

  await apiPost("createOrder", { mesa, items });

  document.getElementById("menuModal").style.display = "none";
  renderOrders();
});

// Renderizar pedidos
async function renderOrders() {
  const orders = await apiGet("orders");
  const container = document.getElementById("orders-container");
  container.innerHTML = "";

  orders.forEach(order => {
    const div = document.createElement("div");
    div.className = "order-card";
    div.innerHTML = `
      <h4>Mesa: ${order.mesa}</h4>
      <p>Pedido: ${order.items}</p>
      <p>Estado: ${order.estado}</p>
    `;
    container.appendChild(div);
  });
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  renderTables();
  renderOrders();
});
