const API_URL = "TU_WEB_APP_URL"; // <- reemplaza con tu URL de Apps Script

/* --------------------- Helpers --------------------- */
async function _get(action, params = {}) {
    try {
        const query = new URLSearchParams({ action, ...params }).toString();
        const url = `${API_URL}?${query}`;
        const response = await fetch(url);
        const text = await response.text();
        return JSON.parse(text).data;
    } catch (err) {
        console.error("Fallo remoto", err);
        return [];
    }
}

async function _post(action, body = {}) {
    try {
        body.action = action;
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const text = await res.text();
        return JSON.parse(text).data;
    } catch (err) {
        console.error("POST falló", err);
        return null;
    }
}

/* --------------------- Menú --------------------- */
async function getMenu() {
    const menu = await _get("menu");
    const container = document.getElementById("menu-container");
    container.innerHTML = "";
    menu.forEach(item => {
        const card = document.createElement("div");
        card.className = "card m-2";
        card.style.width = "14rem";
        card.innerHTML = `
            <div class="card-body">
                <h5 class="card-title">${item.nombre}</h5>
                <p class="card-text">${item.descripcion}</p>
                <p class="card-text fw-bold">$${item.precio}</p>
                <button class="btn btn-success btn-sm" onclick='addToOrder("${item.nombre}",${item.precio})'>Agregar</button>
            </div>
        `;
        container.appendChild(card);
    });
}

/* --------------------- Mesas --------------------- */
async function getTables() {
    const tables = await _get("tables");
    const container = document.getElementById("tables-container");
    container.innerHTML = "";
    tables.forEach(table => {
        const btn = document.createElement("button");
        btn.className = "btn m-1 " + (table.estado === "libre" ? "btn-success" : "btn-danger");
        btn.innerText = `Mesa ${table.mesa} - ${table.estado.toUpperCase()}`;
        btn.disabled = table.estado !== "libre";
        btn.onclick = () => selectTable(table.mesa);
        container.appendChild(btn);
    });
}

/* --------------------- Pedidos --------------------- */
async function getOrders(status = "") {
    const orders = await _get("orders", status ? { estado: status } : {});
    const container = document.getElementById("orders-container");
    container.innerHTML = "";
    orders.forEach(order => {
        const div = document.createElement("div");
        div.className = "border p-2 mb-2";
        div.innerHTML = `
            <h6>Mesa ${order.mesa} - Estado: ${order.estado}</h6>
            <ul>
                ${order.items.map(i => `<li>${i.plato} x ${i.cantidad} = $${i.subtotal || i.precio}</li>`).join("")}
            </ul>
            <strong>Total: $${order.total}</strong>
            ${order.estado === "en_proceso" ? `<button class="btn btn-primary btn-sm" onclick='markServed("${order.idPedido}")'>Entregado</button>` : ""}
            ${order.estado === "entregado" ? `<button class="btn btn-success btn-sm" onclick='markPaid("${order.idPedido}")'>Pagar</button>` : ""}
        `;
        container.appendChild(div);
    });
}

/* --------------------- Pedido actual --------------------- */
let currentOrder = { mesa: null, items: [] };

function selectTable(mesa) {
    currentOrder.mesa = mesa;
    currentOrder.items = [];
    alert("Mesa " + mesa + " seleccionada para el pedido");
}

function addToOrder(nombre, precio) {
    if (!currentOrder.mesa) { alert("Selecciona una mesa primero"); return; }
    currentOrder.items.push({ plato: nombre, precio, cantidad: 1 });
    alert(`${nombre} agregado al pedido de la mesa ${currentOrder.mesa}`);
}

async function sendOrder() {
    if (!currentOrder.mesa || currentOrder.items.length === 0) { alert("Mesa o items vacíos"); return; }
    const result = await _post("createOrder", currentOrder);
    if (result && result.idPedido) {
        alert("Pedido creado correctamente!");
        currentOrder = { mesa: null, items: [] };
        loadData();
    } else {
        alert("Error al crear pedido");
    }
}

/* --------------------- Actualizar estado --------------------- */
async function markServed(idPedido) {
    await _post("updateOrderStatus", { idPedido, estado: "entregado" });
    loadData();
}

async function markPaid(idPedido) {
    await _post("markPaid", { idPedido });
    loadData();
}

/* --------------------- Cargar todo --------------------- */
async function loadData() {
    await getMenu();
    await getTables();
    await getOrders();
}

document.addEventListener("DOMContentLoaded", loadData);
