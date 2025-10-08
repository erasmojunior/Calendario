const API_URL = "https://calendario-51xg.onrender.com";

const API_URL = "https://SEU-ENDERECO-DO-RENDER.onrender.com"; // <--- ajuste aqui

// elementos
const calendarEl = document.getElementById('calendar');
const monthLabel = document.getElementById('monthLabel');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
const datePicker = document.getElementById('datePicker');
const loadDayBtn = document.getElementById('loadDay');
const selectedDayTitle = document.getElementById('selectedDayTitle');
const tbody = document.querySelector('#agenda tbody');
const msg = document.getElementById('mensagem');

let scheduledDays = new Set(); // conjunto de strings 'YYYY-MM-DD'
let current = new Date(); // mês/ano mostrado
let selectedDate = null;

// inicialização
init();

async function init() {
  await fetchScheduledDays();
  renderCalendar(current);
  attachEvents();
}

// busca /dias e popula scheduledDays
async function fetchScheduledDays() {
  try {
    const res = await fetch(`${API_URL}/dias`);
    const j = await res.json();
    if (j.dias && Array.isArray(j.dias)) {
      scheduledDays = new Set(j.dias);
    } else {
      scheduledDays = new Set();
    }
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
    if (!v) return alert('Selecione uma data');
    loadAgendaForDay(v);
  });
}

// monta calendário do mês (ano, mês do objeto Date)
function renderCalendar(date) {
  calendarEl.innerHTML = '';
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  monthLabel.textContent = `${monthNames[month]} ${year}`;

  // cabeçalho dos dias da semana
  const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  for (let i=0;i<7;i++){
    const dn = document.createElement('div');
    dn.className = 'dayName';
    dn.textContent = dayNames[i];
    calendarEl.appendChild(dn);
  }

  // primeiro dia do mês (0-dom ..6-sáb)
  const first = new Date(year, month, 1);
  const startWeekDay = first.getDay();

  // quantos dias no mês
  const daysInMonth = new Date(year, month+1, 0).getDate();

  // preenchimento de células vazias antes do 1º
  for (let i=0;i<startWeekDay;i++) {
    const blank = document.createElement('div');
    blank.className = 'dayCell';
    blank.style.visibility = 'hidden';
    calendarEl.appendChild(blank);
  }

  // criar células de dias
  for (let d=1; d<=daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'dayCell';
    const cellDate = new Date(year, month, d);
    const dateStr = toISODate(cellDate); // 'YYYY-MM-DD'

    // marca hoje
    const today = new Date();
    if (sameDay(cellDate, today)) cell.classList.add('today');

    // se tiver agendamento pinta
    if (scheduledDays.has(dateStr)) {
      cell.classList.add('scheduled');
    }

    cell.innerHTML = `
      <div class="dayNumber">${d}</div>
      <div class="small">${dateStr}</div>
    `;

    cell.addEventListener('click', () => {
      // mostrar agenda do dia
      selectedDate = dateStr;
      datePicker.value = dateStr;
      loadAgendaForDay(dateStr);
    });

    calendarEl.appendChild(cell);
  }
}

// util helpers
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function sameDay(a,b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

// Carrega agenda do backend e popula tabela
async function loadAgendaForDay(dia) {
  try {
    const res = await fetch(`${API_URL}/agenda/${dia}`);
    const json = await res.json();
    if (json.erro) {
      msg.textContent = json.erro;
      tbody.innerHTML = '';
      selectedDayTitle.textContent = '';
      return;
    }
    selectedDayTitle.textContent = `Agenda de ${dia}`;
    exibirAgenda(json.agenda, dia);
  } catch (e) {
    console.error(e);
    msg.textContent = 'Erro ao carregar agenda';
  }
}

function exibirAgenda(agenda, dia) {
  tbody.innerHTML = '';
  for (const hora in agenda) {
    const cliente = agenda[hora];
    const tr = document.createElement('tr');
    const acaoHtml = cliente
      ? `<button onclick="liberar('${dia}','${hora}')">Liberar</button>`
      : `<button onclick="agendarPrompt('${dia}','${hora}')">Agendar</button>`;

    tr.innerHTML = `<td>${hora}</td><td>${cliente || '<i>livre</i>'}</td><td>${acaoHtml}</td>`;
    tbody.appendChild(tr);
  }
}

// funções globais usadas nos botões (precisam ser globais)
window.agendarPrompt = async function(dia, hora) {
  const cliente = prompt(`Nome do cliente para ${hora} em ${dia}:`);
  if (!cliente) return;
  try {
    const res = await fetch(`${API_URL}/agendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dia, hora, cliente })
    });
    const j = await res.json();
    msg.textContent = j.mensagem || j.erro || '';
    // após alterar, atualizar lista de dias e recalcular calendário e recarregar dia
    await refreshScheduledAndReload(dia);
  } catch (e) {
    console.error(e);
    msg.textContent = 'Erro ao agendar';
  }
};

window.liberar = async function(dia, hora) {
  if (!confirm(`Confirmar liberação de ${hora} em ${dia}?`)) return;
  try {
    const res = await fetch(`${API_URL}/liberar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dia, hora })
    });
    const j = await res.json();
    msg.textContent = j.mensagem || j.erro || '';
    await refreshScheduledAndReload(dia);
  } catch (e) {
    console.error(e);
    msg.textContent = 'Erro ao liberar';
  }
};

async function refreshScheduledAndReload(dia) {
  // atualizar dias agendados e reconstruir calendário
  await fetchScheduledDays();
  renderCalendar(current);
  // recarregar a agenda do dia (pode estar ainda sem horários)
  await loadAgendaForDay(dia);
}
