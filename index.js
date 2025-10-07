const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Pasta para salvar os arquivos JSON da agenda
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// Função para carregar/criar a agenda de um dia
function loadAgenda(dia) {
    const filePath = path.join(DATA_DIR, `${dia}.json`);
    if (!fs.existsSync(filePath)) {
        const agenda = {};
        for (let h = 8; h <= 20; h++) {
            agenda[`${h.toString().padStart(2, '0')}:00`] = null;
        }
        fs.writeFileSync(filePath, JSON.stringify(agenda, null, 2));
        return agenda;
    } else {
        return JSON.parse(fs.readFileSync(filePath));
    }
}

function saveAgenda(dia, agenda) {
    const filePath = path.join(DATA_DIR, `${dia}.json`);
    fs.writeFileSync(filePath, JSON.stringify(agenda, null, 2));
}

// 🟢 GET /agenda/2025-12-10
app.get('/agenda/:dia', (req, res) => {
    const dia = req.params.dia;
    try {
        const agenda = loadAgenda(dia);
        res.json({ dia, agenda });
    } catch (err) {
        res.status(500).json({ erro: 'Erro ao carregar agenda' });
    }
});

// 🟢 POST /agendar
app.post('/agendar', (req, res) => {
    const { dia, hora, cliente } = req.body;
    if (!dia || !hora || !cliente) {
        return res.status(400).json({ erro: 'Parâmetros faltando' });
    }

    const agenda = loadAgenda(dia);
    if (!agenda.hasOwnProperty(hora)) {
        return res.status(400).json({ erro: 'Horário inválido' });
    }

    if (agenda[hora]) {
        return res.status(409).json({ erro: 'Horário já ocupado' });
    }

    agenda[hora] = cliente;
    saveAgenda(dia, agenda);

    return res.json({ mensagem: `✅ ${cliente} agendado em ${dia} às ${hora}` });
});

// 🟢 POST /liberar
app.post('/liberar', (req, res) => {
    const { dia, hora } = req.body;
    if (!dia || !hora) {
        return res.status(400).json({ erro: 'Parâmetros faltando' });
    }

    const agenda = loadAgenda(dia);
    if (!agenda.hasOwnProperty(hora)) {
        return res.status(400).json({ erro: 'Horário inválido' });
    }

    if (!agenda[hora]) {
        return res.status(409).json({ erro: 'Horário já está livre' });
    }

    const cliente = agenda[hora];
    agenda[hora] = null;
    saveAgenda(dia, agenda);

    return res.json({ mensagem: `✅ Horário ${hora} de ${dia} liberado (cliente ${cliente})` });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 API rodando em http://localhost:${PORT}`);
});

app.use(express.static('public'));

