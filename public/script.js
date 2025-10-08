// script.js (modal de agendamento integrado)
const API_URL = "https://calendario-51xg.onrender.com";

const calendarEl = document.getElementById('calendar');
const monthLabel = document.getElementById('monthLabel');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
const datePicker = document.getElementById('datePicker');
const loadDayBtn = document.getElementById('loadDay');
const selectedDayTitle = document.getElementById('selectedDayTitle');
const tbody = document.querySelector('#agenda tbody');
const msg = document.getElementById('mensagem');

const modalOverlay = document.getElementById('modalOverlay');
const modal = document.getElementById('modal');
const modalForm = document.getElementById('modalForm');
const modalDia = document.getElementById('modalDia');
const modalHora = document.getElementById('modalHora');
const modalDate = document.getElementById('modalDate');
const modalHour = document.getElementById('modalHour');
const modalCliente = document.getElementById('modalCliente');
const modalObs = document.getElementById('modalObs');
const modalError = document.getElementById('modalError');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalSubmit = document.getElementById('modalSubmit');
const exportBtn = document.getElementById('exportImageBtn');

let scheduledDays = new Set();
let current = new Date();
let selectedDate = null;
let isBusy = false;
let lastFocusedBeforeModal = null;
let lastAgenda = null;
let lastDia = null;

init();

async function init() {
  datePicker.value = toISODate(new Date());
  await fetchScheduledDays();
  renderCalendar(current);
  attachEvents();
  attachModalEvents();
}

async function fetchScheduledDays() {
  try {
    const res = await fetch(`${API_URL}/dias`);
    if (!res.ok) { scheduledDays = new Set(); return; }
    const j = await res.json();
    const arr = Array.isArray(j.dias) ? j.dias : (j.dias || []);
    scheduledDays = new Set(Array.isArray(arr) ? arr : []);
  } catch (e) {
    console.error('Erro fetch /dias', e);
    scheduledDays = new Set();
  }
}

function attachEvents() {
  prevBtn.addEventListener('click', () => { current.setMonth(current.getMonth() - 1); renderCalendar(current); });
  nextBtn.addEventListener('click', () => { current.setMonth(current.getMonth() + 1); renderCalendar(current); });
  loadDayBtn.addEventListener('click', () => {
    const v = datePicker.value;
    if (!v) return showMessage('Selecione uma data', false);
    loadAgendaForDay(v);
  });

  // handler do botão de exportar imagem
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      console.log('[export] clique detectado, lastDia=', lastDia, ' lastAgenda=', lastAgenda);
      if (!lastDia || !lastAgenda) {
        showMessage('Carregue uma agenda antes de exportar.', false);
        return;
      }
      // chama a função que gera o PNG
      exportAgendaImage(lastDia, lastAgenda);
    });
  } else {
    console.warn('Botão exportImageBtn não encontrado no DOM');
  }
}
function renderCalendar(date) {
  calendarEl.innerHTML = '';
  const year = date.getFullYear();
  const month = date.getMonth();
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  monthLabel.textContent = `${monthNames[month]} ${year}`;

  const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  for (let i=0;i<7;i++){
    const dn = document.createElement('div');
    dn.className = 'dayName';
    dn.textContent = dayNames[i];
    calendarEl.appendChild(dn);
  }

  const first = new Date(year, month, 1);
  const startWeekDay = first.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();

  for (let i=0;i<startWeekDay;i++) {
    const blank = document.createElement('div');
    blank.className = 'dayCell';
    blank.style.visibility = 'hidden';
    calendarEl.appendChild(blank);
  }

  for (let d=1; d<=daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'dayCell';
    const cellDate = new Date(year, month, d);
    const dateStr = toISODate(cellDate);

    if (sameDay(cellDate, new Date())) cell.classList.add('today');
    if (scheduledDays.has(dateStr)) cell.classList.add('scheduled');
    if (selectedDate === dateStr) cell.classList.add('selected');

    cell.innerHTML = `
      <div class="dayNumber">${d}</div>
      <div class="small">${dateStr}</div>
    `;

    cell.addEventListener('click', () => {
      selectedDate = dateStr;
      datePicker.value = dateStr;
      renderCalendar(current);
      loadAgendaForDay(dateStr);
    });

    calendarEl.appendChild(cell);
  }
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function sameDay(a,b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

async function loadAgendaForDay(dia) {
  setBusy(true);
  clearMessage();
  try {
    const res = await fetch(`${API_URL}/agenda/${dia}`);
    if (!res.ok) {
      const body = await safeJson(res);
      showMessage(body.erro || (body.error && body.error.message) || `Erro ${res.status}`, false);
      tbody.innerHTML = '';
      selectedDayTitle.textContent = '';
      return;
    }
    const json = await res.json();
     // <- AQUI: guarda os dados carregados para exportação
    lastDia = dia;
    lastAgenda = json.agenda || json || {};
    selectedDayTitle.textContent = `Agenda de ${dia}`;
    exibirAgenda(json.agenda || json || {}, dia);
  } catch (e) {
    console.error(e);
    showMessage('Erro ao carregar agenda', false);
    tbody.innerHTML = '';
    selectedDayTitle.textContent = '';
  } finally {
    setBusy(false);
  }
}

function exibirAgenda(agenda, dia) {
  tbody.innerHTML = '';
  const horas = Object.keys(agenda).sort();
  for (const hora of horas) {
    const clienteRaw = agenda[hora];
    let cliente = '';
    if (clienteRaw == null) cliente = null;
    else if (typeof clienteRaw === 'string') cliente = clienteRaw;
    else if (typeof clienteRaw === 'object') cliente = clienteRaw.cliente || clienteRaw.nome || JSON.stringify(clienteRaw);
    else cliente = String(clienteRaw);

    const tr = document.createElement('tr');
    const tdHora = document.createElement('td'); tdHora.textContent = hora;
    const tdCli = document.createElement('td'); tdCli.innerHTML = cliente ? escapeHtml(cliente) : '<i>livre</i>';
    const tdAcao = document.createElement('td');

    const btn = document.createElement('button');
    btn.textContent = cliente ? 'Liberar' : 'Agendar';
    btn.disabled = isBusy;
    btn.addEventListener('click', () => {
      if (cliente) return liberar(dia, hora);
      return openModalFor(dia, hora);
    });

    tdAcao.appendChild(btn);
    tr.appendChild(tdHora); tr.appendChild(tdCli); tr.appendChild(tdAcao);
    tbody.appendChild(tr);
  }
}

/* ------------------ Modal functions ------------------ */
function attachModalEvents() {
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && !modalOverlay.classList.contains('hidden')) closeModal();
  });

  modalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    modalError.textContent = '';
    const cliente = modalCliente.value && modalCliente.value.trim();
    if (!cliente) {
      modalError.textContent = 'Informe o nome do cliente.';
      modalCliente.focus();
      return;
    }
    const payload = {
      dia: modalDia.value,
      hora: modalHora.value,
      cliente,
      obs: modalObs.value && modalObs.value.trim()
    };
    await sendAgendar(payload);
    closeModal();
  });
}

function openModalFor(dia, hora) {
  lastFocusedBeforeModal = document.activeElement;
  modalDia.value = dia;
  modalHora.value = hora;
  modalDate.value = dia;
  modalHour.value = hora;
  modalCliente.value = '';
  modalObs.value = '';
  modalError.textContent = '';
  modalOverlay.classList.remove('hidden');
  modalOverlay.setAttribute('data-hidden', 'false');
  // focus
  setTimeout(() => modalCliente.focus(), 50);
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  modalOverlay.setAttribute('data-hidden', 'true');
  modalError.textContent = '';
  if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === 'function') {
    lastFocusedBeforeModal.focus();
  }
}

/* ------------------ API actions ------------------ */
async function sendAgendar(payload) {
  setBusy(true);
  clearMessage();
  try {
    const res = await fetch(`${API_URL}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await safeJson(res);
    if (!res.ok) {
      showMessage(body.erro || (body.error && body.error.message) || `Erro ${res.status}`, false);
      return;
    }
    showMessage(body.mensagem || 'Agendado', true);
    await refreshScheduledAndReload(payload.dia);
  } catch (e) {
    console.error(e);
    showMessage('Erro ao agendar', false);
  } finally {
    setBusy(false);
  }
}

async function liberar(dia, hora) {
  if (!confirm(`Confirmar liberação de ${hora} em ${dia}?`)) return;
  setBusy(true);
  clearMessage();
  try {
    const res = await fetch(`${API_URL}/liberar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dia, hora })
    });
    const j = await safeJson(res);
    if (!res.ok) {
      showMessage(j.erro || (j.error && j.error.message) || `Erro ${res.status}`, false);
      return;
    }
    showMessage(j.mensagem || 'Horário liberado', true);
    await refreshScheduledAndReload(dia);
  } catch (e) {
    console.error(e);
    showMessage('Erro ao liberar', false);
  } finally {
    setBusy(false);
  }
}

async function refreshScheduledAndReload(dia) {
  await fetchScheduledDays();
  renderCalendar(current);
  await loadAgendaForDay(dia);
}

/* ------------------ Helpers ------------------ */
function showMessage(text, ok = true) {
  msg.textContent = text || '';
  msg.style.color = ok ? '#2a8f4d' : '#b33';
}
function clearMessage() { msg.textContent = ''; }
function setBusy(v) {
  isBusy = !!v;
  prevBtn.disabled = v;
  nextBtn.disabled = v;
  loadDayBtn.disabled = v;
  datePicker.disabled = v;
  document.querySelectorAll('#agenda button').forEach(b => b.disabled = v);
}
async function safeJson(res) {
  try { return await res.json(); } catch (e) { return {}; }
}
function escapeHtml(str) {
  return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}
async function exportAgendaImage(dia, agenda) {
  // configurações visuais
  const slotKeys = Object.keys(agenda).sort();
  const cols = 1; // só uma coluna vertical de horários
  const slotH = 56; // altura de cada slot
  const headerH = 80;
  const legendH = 48;
  const padding = 28;
  const width = 900; // pixels (base)
  const height = headerH + slotH * slotKeys.length + legendH + padding;

  // suporte retina
  const ratio = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);

  // fundo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // título
  ctx.fillStyle = '#2a4d8f';
  ctx.font = '600 20px Arial';
  ctx.textBaseline = 'top';
  ctx.fillText(`Agenda — ${dia}`, padding, 12);

  // subtítulo / legenda
  ctx.font = '14px Arial';
  ctx.fillStyle = '#444';
  ctx.fillText(`Horários livres em verde — ocupados em vermelho`, padding, 40);

  // draw slots
  const x = padding;
  let y = headerH - 10;

  for (let i = 0; i < slotKeys.length; i++) {
    const hora = slotKeys[i];
    const slot = agenda[hora];
    const isFree = slot == null;

    // rect
    const rectW = width - padding * 2;
    const rectH = slotH - 8;
    const rectX = x;
    const rectY = y + i * slotH;

    // cor
    ctx.fillStyle = isFree ? '#e6ffed' : '#ffecec';
    ctx.fillRect(rectX, rectY, rectW, rectH);

    // border
    ctx.strokeStyle = isFree ? '#9fe0a4' : '#f1a3a3';
    ctx.lineWidth = 1;
    ctx.strokeRect(rectX + 0.5, rectY + 0.5, rectW - 1, rectH - 1);

    // hora à esquerda
    ctx.fillStyle = '#222';
    ctx.font = '600 15px Arial';
    ctx.textBaseline = 'middle';
    ctx.fillText(hora, rectX + 12, rectY + rectH / 2);

    // cliente no centro/direita
    let clienteTxt = isFree ? 'LIVRE' : 'Ocupado';
    ctx.font = '14px Arial';
    ctx.fillStyle = isFree ? '#0a6f2b' : '#7a1313';
    ctx.fillText(clienteTxt, rectX + 120, rectY + rectH / 2);
  }

  // legenda
  const legX = padding;
  const legY = headerH + slotKeys.length * slotH + 6;
  const boxSize = 16;
  // livre
  ctx.fillStyle = '#e6ffed';
  ctx.fillRect(legX, legY, boxSize, boxSize);
  ctx.strokeStyle = '#9fe0a4';
  ctx.strokeRect(legX + 0.5, legY + 0.5, boxSize - 1, boxSize - 1);
  ctx.fillStyle = '#222';
  ctx.font = '13px Arial';
  ctx.fillText('Livre', legX + boxSize + 8, legY + 2);

  // ocupado
  ctx.fillStyle = '#ffecec';
  ctx.fillRect(legX + 120, legY, boxSize, boxSize);
  ctx.strokeStyle = '#f1a3a3';
  ctx.strokeRect(legX + 120 + 0.5, legY + 0.5, boxSize - 1, boxSize - 1);
  ctx.fillStyle = '#222';
  ctx.fillText('Ocupado', legX + 120 + boxSize + 8, legY + 2);

  // exporta
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `agenda-${dia}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
