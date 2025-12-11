// --- VARIÁVEIS GLOBAIS ---
let modoAtual = 'taxa'; 

const MODOS_CONFIG = {
    'taxa': {
        titulo: "Descobrir Taxa Real",
        desc: "Saiba qual a taxa real cobrada no seu empréstimo.",
        hide: ['group-taxa', 'group-amortizacao-valor', 'group-amortizacao'],
        show: ['group-valor', 'group-parcela', 'group-periodo', 'card-res-1', 'card-res-2', 'card-total'],
        res1: "Taxa Mensal",
        res2: "Taxa Anual"
    },
    'parcela': {
        titulo: "Simular Parcela",
        desc: "Calcule quanto ficará a prestação do financiamento.",
        hide: ['group-parcela', 'card-res-2', 'group-amortizacao-valor', 'group-amortizacao'],
        show: ['group-valor', 'group-taxa', 'group-periodo', 'card-res-1', 'card-total', 'label-res-2'],
        res1: "Valor Parcela",
        res2: "Total Pago"
    },
    'valor': {
        titulo: "Descobrir Valor Financiado",
        desc: "Descubra quanto você consegue financiar com essa parcela.",
        hide: ['group-valor', 'card-res-2', 'card-total', 'group-amortizacao-valor', 'group-amortizacao'],
        show: ['group-parcela', 'group-taxa', 'group-periodo', 'card-res-1', 'card-total', 'label-res-2'],
        res1: "Valor Financiado",
        res2: "Total Pago"
    },
    'amortizacao': {
        titulo: "Simular Amortização",
        desc: "Veja o impacto de antecipar um valor na sua dívida.",
        hide: ['group-parcela'], 
        show: ['group-valor', 'group-taxa', 'group-periodo', 'group-amortizacao-valor', 'group-amortizacao', 'card-res-1', 'card-res-2', 'card-total'],
        res1: "Resultado",
        res2: "Comparativo"
    }
};

// --- FUNÇÕES DE INTERFACE ---
window.toggleMenu = function() {
    const menu = document.getElementById('menu-modos');
    const header = document.querySelector('.title-wrapper');
    menu.classList.toggle('hidden');
    
    if(menu.classList.contains('hidden')) {
        header.classList.remove('menu-open');
    } else {
        header.classList.add('menu-open');
    }
};

window.mudarModo = function(modo) {
    modoAtual = modo;
    const config = MODOS_CONFIG[modo];

    document.getElementById('titulo-func').innerText = config.titulo;
    document.getElementById('desc-func').innerText = config.desc;
    document.getElementById('label-res-1').innerText = config.res1;
    if(config.res2) document.getElementById('label-res-2').innerText = config.res2;

    config.hide.forEach(id => document.getElementById(id).style.display = 'none');
    config.show.forEach(id => document.getElementById(id).style.display = 'block');

    const menu = document.getElementById('menu-modos');
    if (!menu.classList.contains('hidden')) {
        window.toggleMenu();
    }
    
    calcular();
};

// --- FUNÇÃO DE CÁLCULO PRINCIPAL ---
async function calcular() {
    try {
        if (typeof UTILS === 'undefined' || typeof FinanciamentoAPI === 'undefined') return;

        // 1. Coleta Inputs Comuns
        const valSaldoDevedor = UTILS.parseBRL(document.getElementById('val-inicial').value);
        const valParcelaAtual = UTILS.parseBRL(document.getElementById('val-mensal').value);
        
        let valTaxaInput = document.getElementById('val-taxa').value.replace(',', '.');
        let valTaxa = parseFloat(valTaxaInput) || 0;
        document.getElementById('val-taxa').value = valTaxa;

        let valPeriodo = parseFloat(document.getElementById('val-periodo').value) || 0;
        document.getElementById('val-periodo').value = valPeriodo;

        // Normalização
        if (document.getElementById('tipo-periodo').value === 'anos') valPeriodo *= 12;

        if (document.getElementById('tipo-taxa-input').value === 'anual') {
            valTaxa = UTILS.converterTaxaAnualParaMensal(valTaxa);
        } else {
            valTaxa = valTaxa / 100;
        }

        // Referências visuais para controle de visibilidade
        const card2 = document.getElementById('card-res-2');
        const cardTotal = document.getElementById('card-total');

        // Reseta visibilidade padrão (importante para quando troca de modo)
        card2.style.visibility = 'visible';
        cardTotal.style.visibility = 'visible';

        // 2. Lógica por Modo
        if (modoAtual === 'taxa') {
            if(valSaldoDevedor <= 0 || valParcelaAtual <= 0) return;
            const i = FinanciamentoAPI.calcJurosEmprestimo(valSaldoDevedor, valParcelaAtual, valPeriodo);
            
            if (isNaN(i) || i === null) {
                document.getElementById('res-1').innerText = "Erro"; return;
            }
            const iAnual = UTILS.converterTaxaMensalParaAnual(i);
            document.getElementById('res-1').innerText = (i*100).toFixed(2) + "% a.m.";
            document.getElementById('res-2').innerText = iAnual.toFixed(2) + "% a.a.";
            document.getElementById('res-total').innerText = UTILS.formatBRL(valParcelaAtual * valPeriodo);
        }
        else if (modoAtual === 'parcela') {
            if(valSaldoDevedor <= 0) return;
            const pmt = FinanciamentoAPI.calcParcela(valSaldoDevedor, valTaxa, valPeriodo);
            document.getElementById('res-1').innerText = UTILS.formatBRL(pmt);
            document.getElementById('res-total').innerText = UTILS.formatBRL(pmt * valPeriodo);
        }
        else if (modoAtual === 'valor') {
            if(valParcelaAtual <= 0) return;
            const pv = FinanciamentoAPI.calcValorFinanciado(valParcelaAtual, valTaxa, valPeriodo);
            document.getElementById('res-1').innerText = UTILS.formatBRL(pv);
        }
        
        // --- MODO AMORTIZAÇÃO (Lógica Ajustada) ---
        else if (modoAtual === 'amortizacao') {
            const valAmortizacao = UTILS.parseBRL(document.getElementById('val-amortizacao-valor').value);
            const tipoAmortizacao = document.getElementById('tipo-amortizacao').value;

            if (valSaldoDevedor <= 0 || valTaxa <= 0) return;

            const resultado = FinanciamentoAPI.calcAmortizacao(
                valSaldoDevedor, valTaxa, valPeriodo, valAmortizacao, tipoAmortizacao
            );

            if (resultado.status === 'QUITADO') {
                // Se quitou: Mostra Status e Economia (no card 2) e oculta o final
                document.getElementById('label-res-1').innerText = "Status";
                document.getElementById('res-1').innerText = "Quitado!";
                
                document.getElementById('label-res-2').innerText = "Economia Total";
                document.getElementById('res-2').innerText = UTILS.formatBRL(resultado.economia);
                
                cardTotal.style.visibility = 'hidden'; 
            } 
            else {
                if (resultado.tipo === 'parcela') {
                    // REDUZIR PARCELA: Usa os 3 cards
                    // 1: Atual, 2: Nova, 3: Economia
                    document.getElementById('label-res-1').innerText = "Parcela Atual";
                    document.getElementById('res-1').innerText = UTILS.formatBRL(resultado.parcelaOriginal);
                    
                    document.getElementById('label-res-2').innerText = "Nova Parcela";
                    document.getElementById('res-2').innerText = UTILS.formatBRL(resultado.novoValor);
                    
                    document.querySelector('#card-total .res-label').innerText = "Economia Total";
                    document.getElementById('res-total').innerText = UTILS.formatBRL(resultado.economia);
                
                } else {
                    // REDUZIR PRAZO: Oculta o último card
                    // 1: Novo Prazo, 2: Economia (Movido para cá), 3: Oculto
                    document.getElementById('label-res-1').innerText = "Novo Prazo";
                    document.getElementById('res-1').innerText = resultado.novoValor + " parcelas";
                    
                    document.getElementById('label-res-2').innerText = "Economia Total";
                    document.getElementById('res-2').innerText = UTILS.formatBRL(resultado.economia);
                    
                    cardTotal.style.visibility = 'hidden'; // Oculta o card final
                }
            }
        }

    } catch (error) {
        console.error("Erro no cálculo:", error);
        document.getElementById('res-1').innerText = "Erro";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    function permitirApenasNumeros(evento) {
        const elemento = evento.target;
        elemento.value = elemento.value.replace(/[^0-9.,]/g, '');
    }

    function aplicarMascaraMoeda(evento) {
        const elemento = evento.target;
        let valor = elemento.value.replace(/\D/g, "");
        if (valor === "") valor = "0";
        elemento.value = (parseInt(valor) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }

    // Listeners padrão
    document.getElementById('val-taxa').addEventListener('input', permitirApenasNumeros);
    document.getElementById('val-periodo').addEventListener('input', permitirApenasNumeros);
    document.getElementById('val-inicial').addEventListener('input', aplicarMascaraMoeda);
    document.getElementById('val-mensal').addEventListener('input', aplicarMascaraMoeda);
    
    // Listeners específicos de Amortização
    const inputAmortizacao = document.getElementById('val-amortizacao-valor');
    if(inputAmortizacao) {
        inputAmortizacao.addEventListener('input', aplicarMascaraMoeda);
    }
    
    const selectTipoAmort = document.getElementById('tipo-amortizacao');
    if(selectTipoAmort) {
        selectTipoAmort.addEventListener('change', calcular);
    }

    const btnCalc = document.getElementById('btn-calcular');
    if (btnCalc) btnCalc.addEventListener('click', calcular);

    const btnClean = document.getElementById('btn-limpar');
    if(btnClean) btnClean.addEventListener('click', () => {
        document.getElementById('val-inicial').value = '0,00';
        document.getElementById('val-mensal').value = '0,00';
        document.getElementById('res-1').innerText = '---';
        document.getElementById('res-total').innerText = '---';
    });

    // Startup
    mudarModo('taxa'); 
});