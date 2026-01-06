/**
 * script-calcPlanejamento.js
 * Frontend: Gerencia Comparação, Metas e FIRE.
 */

let chartInstance = null;
let modoAtual = 'comparacao';

const UI = {
    parseBRL: (v) => v ? parseFloat(v.replace(/\./g, '').replace(',', '.')) : 0,
    formatBRL: (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    parsePercent: (v) => v ? parseFloat(v.replace(',', '.')) : 0
};

const EXPLICACOES = {
    comparacao: "Este gráfico compara o seu patrimônio líquido (Investimentos menos Dívidas). A estratégia vencedora é a que faz sua curva subir mais rápido.",
    meta: "Mostra a evolução mensal do seu capital investido somado aos aportes até atingir a linha tracejada do seu objetivo.",
    fire: "Projeta o crescimento do seu patrimônio até que o rendimento mensal gerado seja suficiente para cobrir seu custo de vida (Independência Financeira).",
    avista_parcelado: "Este gráfico mostra o seu 'Saldo de Caixa'. <br><br><b>À Vista:</b> Representa o crescimento dos juros sobre o dinheiro que você economizou com o desconto.<br><b>Parcelado:</b> Mostra seu capital total rendendo, mas sendo consumido mensalmente pelo pagamento das parcelas."
};

function mudarModo(novoModo) {
    modoAtual = novoModo;
    const titulo = document.getElementById('titulo-func');
    const desc = document.getElementById('desc-func');
    const spanSimbolo = document.querySelector('#group-financiamento .currency');
    
    // Captura dos inputs para definir valores de exemplo
    const inputInvestido = document.getElementById('val-investido');
    const inputFinanciamento = document.getElementById('val-financiamento');
    const inputPeriodo = document.getElementById('val-periodo');
    const inputAporte = document.getElementById('val-aporte');

    // Elementos de layout
    const grpAporte = document.getElementById('group-aporte');
    const grpParcela = document.getElementById('group-parcela');
    const grpPeriodo = document.getElementById('group-periodo');
    const lblInvestido = document.getElementById('lbl-investido');
    const lblFinanciamento = document.getElementById('lbl-financiamento');
    const lblPeriodo = document.getElementById('lbl-periodo');

    // RESET PADRÃO (Garante que a UI volte ao estado original)
    if (grpAporte) grpAporte.style.display = 'block';
    if (grpParcela) grpParcela.style.display = 'block';
    if (grpPeriodo) grpPeriodo.style.display = 'block';
    if (lblPeriodo) lblPeriodo.innerText = "Período";
    if (spanSimbolo) spanSimbolo.innerText = "R$"; 

    // APLICAÇÃO DOS VALORES POR MODO
    if (modoAtual === 'comparacao') {
        titulo.innerText = "Simular Investimento vs Amortização";
        desc.innerText = "Escolha a melhor estratégia para você.";
        lblInvestido.innerText = "Montante Investido";
        lblFinanciamento.innerText = "Valor Restante";
        
        inputInvestido.value = "40.000,00";
        inputFinanciamento.value = "100.000,00";
        inputPeriodo.value = "80";

    } else if (modoAtual === 'meta') {
        titulo.innerText = "Calculadora de Metas";
        desc.innerText = "Descubra quanto investir para realizar um sonho.";
        lblInvestido.innerText = "Já tenho investido";
        lblFinanciamento.innerText = "Valor da Meta (Objetivo)";
        
        inputInvestido.value = "10.000,00";
        inputFinanciamento.value = "50.000,00";
        inputPeriodo.value = "24";
        
        if (grpAporte) grpAporte.style.display = 'none';
        if (grpParcela) grpParcela.style.display = 'none';

    } else if (modoAtual === 'fire') {
        titulo.innerText = "Independência Financeira (FIRE)";
        desc.innerText = "Quando poderei viver de renda?";
        lblInvestido.innerText = "Patrimônio Atual";
        lblFinanciamento.innerText = "Custo de Vida Mensal";
        
        inputInvestido.value = "100.000,00";
        inputFinanciamento.value = "5.000,00";
        inputAporte.value = "2.000,00";

        if (grpParcela) grpParcela.style.display = 'none';
        if (grpPeriodo) grpPeriodo.style.display = 'none';

    } else if (modoAtual === 'avista_parcelado') {
        titulo.innerText = "À Vista vs. Parcelado";
        desc.innerText = "Vale a pena o desconto ou parcelar e investir?";
        lblInvestido.innerText = "Valor Total do Bem (R$)";
        lblFinanciamento.innerText = "Desconto à Vista (%)";
        
        if (spanSimbolo) spanSimbolo.innerText = "%"; 
        if (lblPeriodo) lblPeriodo.innerText = "Número de Parcelas";

        // CONFIGURAÇÃO DOS VALORES DE EXEMPLO (IPVA ou Compras)
        inputInvestido.value = "1.500,00"; 
        inputFinanciamento.value = "10,00"; // Agora inicia com 10% conforme solicitado
        inputPeriodo.value = "12"; 
        
        if (grpAporte) grpAporte.style.display = 'none';
        if (grpParcela) grpParcela.style.display = 'none';
    }
    
    fecharMenuModos();
    realizarSimulacao(); // Executa para já plotar o gráfico com os valores novos
}
// --- 2. CÁLCULO CORE (CORRIGIDO) ---
async function realizarSimulacao() {
    try {
        const valEsq = UI.parseBRL(document.getElementById('val-investido').value);
        // Tratamento especial para o Desconto: se for modo avista_parcelado, parseia como número simples
        const valDir = UI.parseBRL(document.getElementById('val-financiamento').value);
        
        const valAporte = UI.parseBRL(document.getElementById('val-aporte').value);
        const valParcela = UI.parseBRL(document.getElementById('val-parcela').value);
        
        let prazo = parseFloat(document.getElementById('val-periodo').value) || 0;
        if (document.getElementById('tipo-periodo').value === 'anos') prazo *= 12;

        const taxaInput = UI.parsePercent(document.getElementById('val-rendimento').value);
        const tipoRend = document.getElementById('tipo-rendimento').value;
        
        if (typeof PlanejamentoAPI === 'undefined') return;

        let taxaMensal = (tipoRend === 'anual') ? PlanejamentoAPI.converterTaxaAnualParaMensal(taxaInput) : taxaInput / 100;

        if (modoAtual === 'comparacao') {
            const res = await PlanejamentoAPI.simularCenarios({
                dividaTotal: valDir, parcelaDivida: valParcela, prazoMeses: prazo,
                montanteInvestido: valEsq, aporteMensal: valAporte, taxaInvestMensal: taxaMensal
            });
            atualizarGraficoComparacao(res);

        } else if (modoAtual === 'meta') {
            const res = await PlanejamentoAPI.calcularMeta({
                valorMeta: valDir, valorAtual: valEsq, prazoMeses: prazo, taxaMensal: taxaMensal
            });
            atualizarGraficoMeta(res, `Aporte Mensal Necessário: ${UI.formatBRL(res.aporteMensal)}`);

        } else if (modoAtual === 'fire') {
            const res = await PlanejamentoAPI.calcularFIRE({
                custoMensal: valDir, valorAtual: valEsq, aporteMensal: valAporte, taxaMensal: taxaMensal
            });
            atualizarGraficoFIRE(res, `Liberdade em: ${res.anosParaLiberdade.toFixed(1)} anos`);

        } else if (modoAtual === 'avista_parcelado') {
            const res = await PlanejamentoAPI.simularAVistaVsParcelado({
                total: valEsq,
                descontoPercent: valDir, 
                parcelas: prazo,
                taxaMensal: taxaMensal
            });
            
            const textoResultado = res.economiaReal > 0 
                ? `Vantagem à Vista: ${UI.formatBRL(res.economiaReal)}` 
                : `Vantagem Parcelado: ${UI.formatBRL(Math.abs(res.economiaReal))}`;

            atualizarGraficoAvista(res, textoResultado);
        }

    } catch (e) { console.error("Erro na simulação:", e); }
}

function atualizarCards(lbl1, val1, lbl2, val2, lbl3, val3) {
    const el1 = document.getElementById('card-value-1');
    if(el1) {
        document.getElementById('card-label-1').innerText = lbl1;
        el1.innerText = val1;
        document.getElementById('card-label-2').innerText = lbl2;
        document.getElementById('card-value-2').innerText = val2;
        document.getElementById('card-label-3').innerText = lbl3;
        document.getElementById('card-value-3').innerText = val3;
    }
}

// --- 3. GRÁFICOS ---

// --- 3. GRÁFICOS (MANTIDOS E ADICIONADO AVISTA) ---
const COLOR_C1 = '#7c3aed'; 
const BG_C1 = 'rgba(124, 58, 237, 0.1)';
const COLOR_C2 = '#06b6d4'; 
const BG_C2 = 'rgba(6, 182, 212, 0.1)';
const COLOR_META = '#f59e0b'; 
const BG_META = 'rgba(245, 158, 11, 0.1)';

function atualizarGraficoComparacao(dados) {
    const ctx = document.getElementById('chartPlanejamento').getContext('2d');
    const labels = Array.from({length: dados.prazo + 1}, (_, i) => i);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Investir', data: dados.cenario1, borderColor: COLOR_C1, backgroundColor: BG_C1, fill: true, borderWidth: 3, pointRadius: 0 },
                { label: 'Amortizar', data: dados.cenario2, borderColor: COLOR_C2, backgroundColor: BG_C2, fill: true, borderWidth: 3, pointRadius: 0 }
            ]
        },
        options: getChartOptions("Evolução Comparativa do Patrimônio")
    });
}

function atualizarGraficoMeta(dados, textoResultado) {
    const ctx = document.getElementById('chartPlanejamento').getContext('2d');
    const labels = Array.from({length: dados.prazo + 1}, (_, i) => i);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Evolução', data: dados.grafico, borderColor: COLOR_C1, backgroundColor: BG_C1, fill: true, borderWidth: 3, pointRadius: 0 }]
        },
        options: getChartOptionsWithLine(dados.metaAlvo, "Meta", textoResultado)
    });
}

function atualizarGraficoFIRE(dados, textoResultado) {
    const ctx = document.getElementById('chartPlanejamento').getContext('2d');
    const labels = dados.grafico.map((_, i) => i);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: 'Rumo à Liberdade', data: dados.grafico, borderColor: COLOR_META, backgroundColor: BG_META, fill: true, borderWidth: 3, pointRadius: 0 }]
        },
        options: getChartOptionsWithLine(dados.metaAlvo, "Número Mágico", textoResultado)
    });
}

// Configuração Base do Gráfico
function getChartOptions(tituloPrincipal) {
    // Injeta o título no HTML
    const elTitulo = document.getElementById('chart-title-html');
    if (elTitulo) elTitulo.innerText = tituloPrincipal;
    
    // Injeta a explicação no balão de ajuda
    const elAjuda = document.getElementById('help-tooltip-text');
    if (elAjuda) elAjuda.innerHTML = EXPLICACOES[modoAtual] || "Sem explicação disponível.";

    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        plugins: {
            title: { display: false }, // Título agora é via HTML
            legend: { display: true, position: 'bottom' },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) label += UI.formatBRL(context.parsed.y);
                        return label;
                    }
                }
            }
        },
        scales: {
            y: { ticks: { callback: (v) => UI.formatBRL(v) } }
        }
    };
}

function getChartOptionsWithLine(valorMeta, labelMeta, tituloResultado) {
    const opts = getChartOptions(tituloResultado);
    if (window.Chart && window.Chart.registry.plugins.get('annotation')) {
        opts.plugins.annotation = {
            annotations: {
                line1: {
                    type: 'line', yMin: valorMeta, yMax: valorMeta,
                    borderColor: 'rgba(255, 99, 132, 0.8)', borderWidth: 2, borderDash: [6, 6],
                    label: { content: labelMeta, enabled: true, position: 'end' }
                }
            }
        };
    }
    return opts;
}
// --- 4. SETUP E EVENTOS ---

window.toggleMenu = function() {
    document.getElementById('menu-modos').classList.toggle('hidden');
    document.querySelector('.title-wrapper').classList.toggle('menu-open');
}
function fecharMenuModos() {
    document.getElementById('menu-modos').classList.add('hidden');
    document.querySelector('.title-wrapper').classList.remove('menu-open');
}

// MENU DE ATIVOS (Correção: Auto-recuperação)
async function carregarAtivosNoMenu() {
    if (typeof PlanejamentoAPI === 'undefined') return;
    const ativos = await PlanejamentoAPI.getAtivos();
    const lista = document.getElementById('lista-ativos-db');
    
    if(!lista) return;
    
    lista.innerHTML = ''; // Limpa para não duplicar
    ativos.forEach(ativo => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${ativo.nome}</span> <strong>${ativo.valor}%</strong>`;
        li.onclick = () => {
            document.getElementById('val-rendimento').value = ativo.valor.toString().replace('.', ',');
            document.getElementById('tipo-rendimento').value = ativo.tipo;
            
            const btn = document.getElementById('btn-ativos');
            btn.innerText = ativo.nome.split(' ')[0];
            btn.style.color = '#2980b9';
            btn.style.fontWeight = 'bold';
            
            toggleMenuAtivos();
            realizarSimulacao(); 
        };
        lista.appendChild(li);
    });
}

function atualizarGraficoAvista(dados, textoResultado) {
    const ctx = document.getElementById('chartPlanejamento').getContext('2d');
    const labels = Array.from({length: dados.prazo + 1}, (_, i) => `Mês ${i}`);
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { 
                    label: 'Saldo (Pagar à Vista)', 
                    data: dados.cenarioAVista, 
                    borderColor: '#10b981', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                    fill: true, 
                    pointRadius: 4, // Pontos visíveis
                    pointHoverRadius: 6 
                },
                { 
                    label: 'Saldo (Pagar Parcelado)', 
                    data: dados.cenarioParcelado, 
                    borderColor: '#ef4444', 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    fill: true, 
                    pointRadius: 4, 
                    pointHoverRadius: 6 
                }
            ]
        },
        options: getChartOptions(textoResultado)
    });
}

window.toggleMenuAtivos = function() { 
    const menu = document.getElementById('dropdown-ativos');
    
    // SEGURANÇA: Se o menu estiver vazio, recarrega os ativos
    const lista = document.getElementById('lista-ativos-db');
    if (lista && lista.children.length === 0) {
        carregarAtivosNoMenu();
    }

    if(menu) menu.classList.toggle('hidden'); 
}

window.ativarModoManual = function() { 
    const input = document.getElementById('val-rendimento');
    input.value = ''; 
    input.focus();
    
    const btn = document.getElementById('btn-ativos');
    btn.innerText = 'Selecionar';
    btn.style.color = '';
    btn.style.fontWeight = '';
    
    toggleMenuAtivos(); 
}

document.addEventListener('DOMContentLoaded', () => {
    // Configura máscaras para os campos
    ['val-investido', 'val-aporte', 'val-financiamento', 'val-parcela'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', (e) => {
                // Se for o campo de desconto no modo À Vista, permitimos números decimais simples
                if (id === 'val-financiamento' && modoAtual === 'avista_parcelado') {
                    // Remove tudo que não for número ou vírgula/ponto
                    e.target.value = e.target.value.replace(/[^\d,.]/g, "");
                    return;
                }
                
                // Máscara de Moeda R$ padrão para os outros casos
                let v = e.target.value.replace(/\D/g, "");
                if (v === "") v = "0";
                e.target.value = (parseInt(v) / 100).toLocaleString("pt-BR", { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                });
            });
        }
    });

    const btnCalc = document.getElementById('btn-calcular');
    if(btnCalc) btnCalc.addEventListener('click', realizarSimulacao);
    
    // Inicia no modo comparação
    mudarModo('comparacao');
});