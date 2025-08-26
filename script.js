const API_URL = "https://script.google.com/macros/s/AKfycbxPOQxO3WLbU2RLQjkiguggKYVC5eZlSnDOBk_Q_nprL7_JmQyjxxJNecExnoNYM9Tv7g/exec"; // <-- pega aquí tu URL de despliegue de Apps Script

let selectedTable = null;
let selectedItems = [];

// Función genérica GET
async function _get(action) {
  try {
    const res = await fetch(`${API_URL}?action=${action}`);
    return await res.json();
  } catch (err) {
    console.error("Error GET:", err);
  }
}

// Función genérica POST
async function _post(action, data) {
  try {
    const res = await fetch(`${API_URL}?action=${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (err) {
    console.error("Error POST:", err);
  }
}

// Renderizar Mesas
async function renderTables() {
  const tables = await _get("tables");
  const container = document.getElementById("tables");
  container.innerHTML = "";

  tables.forEach(t => {
    const div = document.createElement("div");
    div.className = "col-md-3";
    div.innerHTML = `
      <div class="card shadow-sm">
        <div class="card-body text-center">
          <h5 class="card-title">Mesa ${t.Nombre}</h5>
          <p class="card-text">Estado: <strong>${t.Estado}</strong></p>
          <button class="btn btn-primary btn-sm" onclick="abrirMenu('${t.Nombre}')">Pedir</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });
}

// Abrir menú para una mesa
async function abrirMenu(mesa) {
  selectedTable = mesa;
  selectedItems = [];

  document.getElementById("mesaSeleccionada").innerText = mesa;

  const menu = await _get("menu");
  const container = document.getElementById("menu");
  container.innerHTML = "";

  menu.forEach(item => {
    const div = document.createElement("div");
    div.className = "col";
    div.innerHTML = `
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <h5 class="card-title">${item.Nombre}</h5>
          <p class="card-text">Precio: $${item.Precio}</p>
          <button class="btn btn-outline-success btn-sm" onclick="agregarItem('${item.Nombre}', ${item.Precio})">Agregar</button>
        </div>
      </div>
    `;
    container.appendChild(div);
  });

  const modal = new bootstrap.Modal(document.getElementById("menuModal"));
  modal.show();
}

// Agregar item al pedido
function agregarItem(nombre, precio) {
  selectedItems.push({ nombre, precio });
  console.log("Pedido actual:", selectedItems);
}

// Confirmar pedido
document.getElementById("btnConfirmarPedido").addEventListener("click", async () => {
  if (!selectedTable || selectedItems.length === 0) {
    alert("Selecciona al menos un producto");
    return;
  }

  await _post("order", { table: selectedTable, items: selectedItems });
  alert("Pedido confirmado para mesa " + selectedTable);

  const modal = bootstrap.Modal.getInstance(document.getElementById("menuModal"));
  modal.hide();
  renderTables(); // refresca mesas
});

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  renderTables();
});
