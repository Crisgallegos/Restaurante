/* script.js (frontend) */
/* Reemplaza con tu URL del Web App (Apps Script) */
const API_URL = "https://script.google.com/macros/s/AKfycbzAB83XFsjG9MxKU_bDYv-b2Rur6pySGquoHE5GOiTjna2ImLGEFZlbX3DlEkz2dwVX/exec"; // <-- pega tu URL

// Estado local
let currentTable = null;   // {id,nombre,estado}
let cart = [];             // [{id,nombre,precio,cantidad}]

// ---------- API FACADE (fetch con fallback JSONP) ----------
async function apiGet(action, params={}) {
  const url = `${API_URL}?action=${encodeURIComponent(action)}${toQuery(params)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json && json.ok === false) throw new Error(json.error || 'API error');
    // si la respuesta viene como {ok:true,data:...} manejamos ambigüedad
    if (json && json.ok && json.data !== undefined) return json.data;
    return json;
  } catch (err) {
    // fallback JSONP (solo para GET)
    return await jsonpRequest(action, params);
  }
}

async function apiPost(action, body) {
  const url = `${API_URL}?action=${encodeURIComponent(action)}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    if (json && json.ok === false) throw new Error(json.error || 'API error');
    if (json && json.ok && json.data !== undefined) return json.data;
    return json;
  } catch (err) {
    // Como fallback, enviamos la acción vía JSONP (GET) con payload
    const payloadParam = { payload: encodeURIComponent(JSON.stringify(body)) };
    return await jsonpRequest(action, payloadParam);
  }
}

function toQuery(params){
  const keys = Object.keys(params||{});
  if (keys.length===0) return '';
  return '&' + keys.map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
}

function jsonpRequest(action, params={}){
  return new Promise((resolve, reject) => {
    const cb = 'cb_' + Date.now() + '_' + Math.floor(Math.random()*10000);
    window[cb] = function(resp){
      try { resolve(resp && resp.data !== undefined ? resp.data : resp); } finally { delete window[cb]; script.remove(); }
    };
    const q = Object.assign({}, params, { action, callback: cb });
    const src = `${API_URL}?${Object.keys(q).map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(q[k])}`).join('&')}`;
    const script = document.createElement('script');
    script.src = src;
    script.onerror = () => { delete window[cb]; script.remove(); reject(new Error('JSONP load error')); };
    document.body.appendChild(script);
  });
}

// ---------- UI: navegación ----------
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tab-mesas').addEventListener('click', showMesas);
  document.getElementById('tab-pedidos').addEventListener('click', showPedidos);
  document.getElementById('tab-caja').addEventListener('click', showCaja);
  // load initial view
  loadAll();
});

// ---------- Loaders ----------
async function loadAll(){
  await renderTables();
  await renderOrders();
  await renderCaja();
}

/* ------------------ MESAS ------------------ */
async function renderTables(){
  const grid = document.getElementById('mesasGrid');
  grid.innerHTML = '';
  const tables = await apiGet('tables') || [];
  if (!Array.isArray(tables)) {
    console.error('Respuesta tables inválida', tables);
    return;
  }
  tables.forEach(t => {
    const col = document.createElement('div'); col.className = 'col-md-3';
    const estadoClass = (t.estado||'').toLowerCase().includes('ocup') ? 'border-danger' : 'border-success';
    const card = document.createElement('div');
    card.className = `card mesa-card ${estadoClass}`;
    card.innerHTML = `
      <div class="card-body text-center">
        <h5 class="card-title">Mesa ${t.nombre || t.id}</h5>
        <p class="mb-2"><span class="badge bg-${(t.estado||'').toLowerCase().includes('ocup') ? 'danger' : 'success'} estado-badge">${t.estado}</span></p>
        <div class="d-flex justify-content-center gap-2">
          <button class="btn btn-outline-primary btn-sm" data-mesaid="${t.id}" onclick="openMenuModal('${t.id}','${escapeHtml(t.nombre||t.id)}')">Abrir / Pedir</button>
          <button class="btn btn-outline-secondary btn-sm" onclick="refreshAll()">Refrescar</button>
        </div>
      </div>
    `;
    col.appendChild(card);
    grid.appendChild(col);
  });
}

/* ------------------ MODAL MENÚ ------------------ */
async function openMenuModal(id, name){
  currentTable = { id, nombre: name };
  cart = [];
  document.getElementById('modalMesaName').innerText = name;
  document.getElementById('modalCart').innerHTML = '';
  document.getElementById('modalTotal').innerText = '0';
  // cargar menu
  const menu = await apiGet('menu') || [];
  const menuGrid = document.getElementById('menuGrid');
  menuGrid.innerHTML = '';
  menu.forEach(item => {
    const col = document.createElement('div'); col.className = 'col-md-6';
    const price = Number(item.precio || item.Precio || item.Price || 0);
    col.innerHTML = `
      <div class="card menu-card">
        <div class="card-body d-flex flex-column">
          <div><strong>${item.nombre || item.Nombre}</strong></div>
          <div class="small text-muted">Precio: $${price}</div>
          <div class="mt-2 d-flex gap-2 align-items-center">
            <input type="number" min="0" value="0" class="form-control form-control-sm qty-input" style="width:90px" data-id="${item.id}" data-nombre="${escapeHtml(item.nombre||item.Nombre)}" data-precio="${price}">
            <button class="btn btn-sm btn-outline-success" data-add="${item.id}">Agregar</button>
          </div>
        </div>
      </div>
    `;
    menuGrid.appendChild(col);
  });

  // add listeners for add buttons inside modal
  menuGrid.querySelectorAll('[data-add]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      const parent = ev.currentTarget.closest('.card');
      const input = parent.querySelector('.qty-input');
      const qty = Number(input.value || 0);
      if (qty <= 0) { alert('Ingrese cantidad mayor a 0'); return; }
      const nombre = input.getAttribute('data-nombre');
      const precio = Number(input.getAttribute('data-precio')||0);
      const id = input.getAttribute('data-id');
      addToCart({ id, nombre, precio, cantidad: qty });
    });
  });

  // confirm listener
  document.getElementById('modalConfirmBtn').onclick = async () => {
    if (!currentTable) return alert('Mesa no seleccionada');
    if (cart.length === 0) return alert('El carrito está vacío');
    // enviar pedido
    const body = { action:'createOrder', mesa: currentTable.id, items: cart, total: cart.reduce((s,i)=>s + (Number(i.precio||i.price||0) * Number(i.cantidad||1)),0) };
    const res = await apiPost('createOrder', body);
    // if apiPost used fetch it expects server to handle the action param; our server handles both GET (payload) and POST
    // but fallback jsonp returns data directly
    alert('Pedido creado ✓');
    const bsModal = bootstrap.Modal.getInstance(document.getElementById('menuModal'));
    if (bsModal) bsModal.hide();
    await refreshAll();
  };

  // show modal
  const modal = new bootstrap.Modal(document.getElementById('menuModal'));
  modal.show();
}

function addToCart(item){
  // si existe sumar cantidad
  const idx = cart.findIndex(x=>String(x.id)===String(item.id));
  if (idx >= 0) cart[idx].cantidad = Number(cart[idx].cantidad||0) + Number(item.cantidad||1);
  else cart.push(item);
  renderCart();
}

function renderCart(){
  const ul = document.getElementById('modalCart');
  ul.innerHTML = '';
  let total = 0;
  cart.forEach(it => {
    total += (Number(it.precio||0) * Number(it.cantidad||1));
    const li = document.createElement('li');
    li.className = 'list-group-item d-flex justify-content-between align-items-center';
    li.innerHTML = `<div>${it.cantidad} × ${it.nombre}</div><div>$${Number(it.precio||0) * Number(it.cantidad||1)}</div>`;
    ul.appendChild(li);
  });
  document.getElementById('modalTotal').innerText = total;
}

/* ------------------ PEDIDOS ------------------ */
async function renderOrders(){
  const list = document.getElementById('pedidosList');
  list.innerHTML = '';
  const orders = await apiGet('orders') || [];
  if (!Array.isArray(orders)) { console.error('orders invalid', orders); return; }
  orders.forEach(o=>{
    const div = document.createElement('div');
    div.className = 'card mb-2';
    const itemsHtml = (o.items || []).map(it=>`<li>${it.cantidad}× ${it.nombre} — $${Number(it.precio||0)*Number(it.cantidad||1)}</li>`).join('');
    div.innerHTML = `
      <div class="card-body">
        <h5 class="card-title">Mesa ${o.mesa}</h5>
        <p>Estado: <strong>${o.estado}</strong></p>
        <ul>${itemsHtml}</ul>
        <p><strong>Total: $${o.total || 0}</strong></p>
        ${ (o.estado === 'en proceso' || o.estado === 'en_proceso') ? `<button class="btn btn-success" onclick="markDelivered('${o.id}')">Marcar entregado</button>` : ''}
      </div>
    `;
    list.appendChild(div);
  });
}

async function markDelivered(orderId){
  // update via POST or JSONP fallback
  const payload = { action:'updateOrderStatus', id: orderId, estado: 'entregado', estadoNormalized: 'entregado' };
  await apiPost('updateOrderStatus', { id: orderId, estado: 'entregado' });
  await refreshAll();
}

/* ------------------ CAJA ------------------ */
async function renderCaja(){
  const container = document.getElementById('cajaList');
  if (!container) return;
  container.innerHTML = '';
  const orders = await apiGet('orders') || [];
  const entregados = (orders || []).filter(o => (String(o.estado||'').toLowerCase().indexOf('entreg') !== -1) || (String(o.estado||'').toLowerCase() === 'entregado'));
  entregados.forEach(o=>{
    const div = document.createElement('div');
    div.className = 'card mb-2';
    const itemsHtml = (o.items || []).map(it=>`<li>${it.cantidad}× ${it.nombre} — $${Number(it.precio||0)*Number(it.cantidad||1)}</li>`).join('');
    div.innerHTML = `
      <div class="card-body">
        <h5>Mesa ${o.mesa}</h5>
        <ul>${itemsHtml}</ul>
        <p><strong>Total: $${o.total || 0}</strong></p>
        <button class="btn btn-primary" onclick="payOrder('${o.id}')">Cobrar y liberar mesa</button>
      </div>
    `;
    container.appendChild(div);
  });
}

async function payOrder(orderId){
  // POST or JSONP fallback
  await apiPost('payOrder', { id: orderId });
  // Show receipt (optional)
  const orders = await apiGet('orders') || [];
  const order = (orders || []).find(x => String(x.id)===String(orderId));
  if (order) {
    const html = `<p><strong>Mesa:</strong> ${order.mesa}</p>
                  <p><strong>Items:</strong></p>
                  <ul>${(order.items||[]).map(i=>`<li>${i.cantidad}× ${i.nombre} — $${Number(i.precio||0)*Number(i.cantidad||1)}</li>`).join('')}</ul>
                  <p><strong>Total:</strong> $${order.total || 0}</p>`;
    document.getElementById('receiptBody').innerHTML = html;
    const rmodal = new bootstrap.Modal(document.getElementById('receiptModal'));
    rmodal.show();
  }
  await refreshAll();
}

/* ------------------ Helpers UI ------------------ */
function showMesas(){ document.getElementById('view-mesas').classList.remove('d-none'); document.getElementById('view-pedidos').classList.add('d-none'); document.getElementById('view-caja').classList.add('d-none'); }
function showPedidos(){ document.getElementById('view-mesas').classList.add('d-none'); document.getElementById('view-pedidos').classList.remove('d-none'); document.getElementById('view-caja').classList.add('d-none'); renderOrders(); }
function showCaja(){ document.getElementById('view-mesas').classList.add('d-none'); document.getElementById('view-pedidos').classList.add('d-none'); document.getElementById('view-caja').classList.remove('d-none'); renderCaja(); }

async function refreshAll(){ await renderTables(); await renderOrders(); await renderCaja(); }

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
