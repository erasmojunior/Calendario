const API_URL = "https://calendario-51xg.onrender.com";

const diaInput = document.getElementById("dia");
const carregarBtn = document.getElementById("carregar");
const tbody = document.querySelector("#agenda tbody");
const msg = document.getElementById("mensagem");

carregarBtn.addEventListener("click", carregarAgenda);

async function carregarAgenda() {
  const dia = diaInput.value;
  if (!dia) return alert("Selecione uma data!");

  try {
    const res = await fetch(`${API_URL}/agenda/${dia}`);
    const data = await res.json();
    exibirAgenda(data.agenda, dia);
  } catch (err) {
    alert("Erro ao carregar agenda.");
  }
}

function exibirAgenda(agenda, dia) {
  tbody.innerHTML = "";
  for (const hora in agenda) {
    const cliente = agenda[hora];
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${hora}</td>
      <td>${cliente || "<i>livre</i>"}</td>
      <td>
        ${cliente
          ? `<button onclick="liberar('${dia}','${hora}')">Liberar</button>`
          : `<button onclick="agendar('${dia}','${hora}')">Agendar</button>`}
      </td>
    `;
    tbody.appendChild(tr);
  }
}

async function agendar(dia, hora) {
  const cliente = prompt(`Nome do cliente para ${hora}:`);
  if (!cliente) return;

  const res = await fetch(`${API_URL}/agendar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dia, hora, cliente }),
  });
  const data = await res.json();
  msg.textContent = data.mensagem || data.erro;
  carregarAgenda();
}

async function liberar(dia, hora) {
  if (!confirm(`Liberar horário ${hora}?`)) return;

  const res = await fetch(`${API_URL}/liberar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dia, hora }),
  });
  const data = await res.json();
  msg.textContent = data.mensagem || data.erro;
  carregarAgenda();
}
