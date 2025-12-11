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

// --- 1. ALTERNÂNCIA DE MODOS ---
function mudarModo(novoModo) {
    modoAtual = novoModo;
    const titulo = document.getElementById('titulo-func');
    const desc = document.getElementById('desc-func');
    
    // Elementos de UI
    const grpAporte = document.getElementById('group-aporte');
    const grpParcela = document.getElementById('group-parcela');
    const grpPeriodo = document.getElementById('group-periodo');
    const grpRendimento = document.getElementById('group-rendimento'); 
    
    const lblInvestido = document.getElementById('lbl-investido');
    const lblFinanciamento = document.getElementById('lbl-financiamento');
    const cardsContainer = document.getElementById('cards-result');

    // Reset visual: exibe grupos padrão
    grpAporte.style.display = 'block';
    grpParcela.style.display = 'block';
    grpPeriodo.style.display = 'block';
    grpRendimento.style.display = 'block'; 

    // Garante que a área de resultados esteja visível
    document.getElementById('results-container').classList.remove('hidden');

    if (modoAtual === 'comparacao') {
        titulo.innerText = "Investimento vs Amortização";
        desc.innerText = "Compare o impacto de investir ou pagar dívida.";
        lblInvestido.innerText = "Montante Investido";
        lblFinanciamento.innerText = "Saldo Devedor";
        
        // Em comparação, mantemos os cards visíveis para mostrar detalhes dos dois cenários
        if(cardsContainer) cardsContainer.classList.remove('hidden');

    } else if (modoAtual === 'meta') {
        titulo.innerText = "Calculadora de Metas";
        desc.innerText = "Descubra quanto investir mensalmente para seu sonho.";
        lblInvestido.innerText = "Já tenho investido";
        lblFinanciamento.innerText = "Valor da Meta (Objetivo)";
        
        grpAporte.style.display = 'none'; 
        grpParcela.style.display = 'none';
        
        // Esconde cards, resultado será no gráfico
        if(cardsContainer) cardsContainer.classList.add('hidden');

    } else if (modoAtual === 'fire') {
        titulo.innerText = "Independência Financeira (FIRE)";
        desc.innerText = "Planeje sua aposentadoria e liberdade.";
        lblInvestido.innerText = "Patrimônio Atual";
        lblFinanciamento.innerText = "Custo de Vida Mensal";
        
        grpParcela.style.display = 'none';
        grpPeriodo.style.display = 'none';
        
        // Esconde cards, resultado será no gráfico
        if(cardsContainer) cardsContainer.classList.add('hidden');
    }
    
    fecharMenuModos();
    realizarSimulacao();
}

// --- 2. CÁLCULO CORE ---
async function realizarSimulacao() {
    try {
        const valEsq = UI.parseBRL(document.getElementById('val-investido').value);
        const valDir = UI.parseBRL(document.getElementById('val-financiamento').value);
        const valAporte = UI.parseBRL(document.getElementById('val-aporte').value);
        const valParcela = UI.parseBRL(document.getElementById('val-parcela').value);
        
        let prazo = parseFloat(document.getElementById('val-periodo').value);
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
            
            // Atualiza cards de comparação (opcional, mantido para este modo)
            const diff = res.cenario2[res.cenario2.length-1] - res.cenario1[res.cenario1.length-1];
            atualizarCards("Diferença Final", UI.formatBRL(diff), "Cenário Investir", UI.formatBRL(res.cenario1[res.cenario1.length-1]), "Cenário Amortizar", UI.formatBRL(res.cenario2[res.cenario2.length-1]));
            
            atualizarGraficoComparacao(res);

        } else if (modoAtual === 'meta') {
            const res = await PlanejamentoAPI.calcularMeta({
                valorMeta: valDir, valorAtual: valEsq, prazoMeses: prazo, taxaMensal: taxaMensal
            });
            
            // Cria texto de destaque para o gráfico
            const textoResultado = `Aporte Mensal Necessário: ${UI.formatBRL(res.aporteMensal)}`;
            atualizarGraficoMeta(res, textoResultado);

        } else if (modoAtual === 'fire') {
            const res = await PlanejamentoAPI.calcularFIRE({
                custoMensal: valDir, valorAtual: valEsq, aporteMensal: valAporte, taxaMensal: taxaMensal
            });
            
            // Cria texto de destaque para o gráfico
            const textoResultado = `Liberdade em: ${res.anosParaLiberdade.toFixed(1)} anos (${res.mesesParaLiberdade.toFixed(0)} meses)`;
            atualizarGraficoFIRE(res, textoResultado);
        }

    } catch (e) { console.error(e); }
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
            datasets: [{
                label: 'Evolução do Patrimônio', data: dados.grafico,
                borderColor: COLOR_C1, backgroundColor: BG_C1, fill: true, borderWidth: 3, pointRadius: 0
            }]
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
            datasets: [{
                label: 'Rumo à Liberdade', data: dados.grafico,
                borderColor: COLOR_META, backgroundColor: BG_META, fill: true, borderWidth: 3, pointRadius: 0
            }]
        },
        options: getChartOptionsWithLine(dados.metaAlvo, "Número Mágico", textoResultado)
    });
}

// Configuração Base do Gráfico
function getChartOptions(tituloPrincipal) {
    return {
        responsive: true, 
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            // TÍTULO GRANDE (Serve como Legenda de Resultado)
            title: {
                display: !!tituloPrincipal,
                text: tituloPrincipal,
                font: { size: 22, weight: 'bold', family: "'Segoe UI', sans-serif" },
                padding: { top: 10, bottom: 20 },
                color: '#2980b9' // Azul da marca
            },
            legend: { display: true, position: 'bottom' },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleFont: { size: 13 },
                bodyFont: { size: 13 },
                padding: 10,
                callbacks: {
                    label: function(context) {
                        return context.dataset.label + ': ' + UI.formatBRL(context.parsed.y);
                    }
                }
            }
        },
        scales: {
            x: { display: false },
            y: { 
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { callback: (v) => v >= 1000 ? (v/1000).toFixed(0)+'k' : v }
            }
        }
    };
}

// Configuração com Linha de Meta (Tracejada)
function getChartOptionsWithLine(valorMeta, labelMeta, tituloResultado) {
    const opts = getChartOptions(tituloResultado);
    
    // Adiciona anotação se o plugin estiver disponível
    if (window.Chart && window.Chart.registry.plugins.get('annotation')) {
        opts.plugins.annotation = {
            annotations: {
                line1: {
                    type: 'line', yMin: valorMeta, yMax: valorMeta,
                    borderColor: 'rgba(255, 99, 132, 0.8)', borderWidth: 2, borderDash: [6, 6],
                    label: { 
                        content: labelMeta + ': ' + UI.formatBRL(valorMeta), 
                        enabled: true, position: 'end', 
                        backgroundColor: 'rgba(255,99,132,0.8)', color: 'white', font: { size: 11, weight: 'bold' }
                    }
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
    carregarAtivosNoMenu();
    
    // Máscaras
    ['val-investido', 'val-aporte', 'val-financiamento', 'val-parcela'].forEach(id => {
        const el = document.getElementById(id);
        if(el) {
            el.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, "");
                e.target.value = (parseInt(v) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
            });
        }
    });

    const btnCalc = document.getElementById('btn-calcular');
    if(btnCalc) btnCalc.addEventListener('click', realizarSimulacao);
    
    const btnLimp = document.getElementById('btn-limpar');
    if(btnLimp) btnLimp.addEventListener('click', () => {
        document.querySelector('.inputs-grid').reset();
        document.getElementById('val-investido').value = "0,00";
        if(modoAtual !== 'meta') document.getElementById('val-financiamento').value = "0,00";
        limparResultados();
    });

    // Fechar menus ao clicar fora
    document.addEventListener('click', (e) => {
        const menuM = document.getElementById('menu-modos');
        const tit = document.querySelector('.title-wrapper');
        if (menuM && !menuM.classList.contains('hidden') && !menuM.contains(e.target) && !tit.contains(e.target)) {
            fecharMenuModos();
        }
        
        const menuA = document.getElementById('dropdown-ativos');
        const btnA = document.getElementById('btn-ativos');
        if (menuA && !menuA.classList.contains('hidden') && !menuA.contains(e.target) && e.target !== btnA) {
            menuA.classList.add('hidden');
        }
    });

    // Inicia
    mudarModo('comparacao');
});