// --- VARIÁVEIS GLOBAIS ---
let modoAtual = 'taxa'; 

const MODOS_CONFIG = {
    'taxa': {
        titulo: "Descobrir Taxa Real",
        desc: "Saiba qual a taxa real cobrada no seu empréstimo.",
        hide: ['group-taxa'],
        show: ['group-valor', 'group-parcela', 'card-res-1', 'card-res-2', 'card-total'],
        res1: "Taxa Mensal",
        res2: "Taxa Anual"
    },
    'parcela': {
        titulo: "Simular Parcela",
        desc: "Calcule quanto ficará a prestação do financiamento.",
        hide: ['group-parcela', 'card-res-2'],
        show: ['group-valor', 'group-taxa', 'card-res-1', 'card-total', 'label-res-2'],
        res1: "Valor Parcela",
        res2: "Total Pago"
    },
    'valor': {
        titulo: "Descobrir Valor Financiado",
        desc: "Descubra quanto você consegue financiar com essa parcela.",
        hide: ['group-valor', 'card-res-2', 'card-total'],
        show: ['group-parcela', 'group-taxa', 'card-res-1'],
        res1: "Valor Financiado",
        res2: "Total Pago"
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

    // Atualiza Textos
    document.getElementById('titulo-func').innerText = config.titulo;
    document.getElementById('desc-func').innerText = config.desc;
    document.getElementById('label-res-1').innerText = config.res1;
    document.getElementById('label-res-2').innerText = config.res2;

    // Atualiza Campos
    config.hide.forEach(id => document.getElementById(id).style.display = 'none');
    config.show.forEach(id => document.getElementById(id).style.display = 'block');

    // Fecha menu e RECALCULA IMEDIATAMENTE
    const menu = document.getElementById('menu-modos');
    if (!menu.classList.contains('hidden')) {
        window.toggleMenu();
    }
    
    // Chama o cálculo para preencher os dados com os inputs atuais
    calcular();
};

// --- FUNÇÃO DE CÁLCULO PRINCIPAL ---
// Definida fora para garantir acesso global e imediato
async function calcular() {
    try {
        // Verifica dependências
        if (typeof UTILS === 'undefined' || typeof FinanciamentoAPI === 'undefined') {
            console.error("ERRO CRÍTICO: UTILS ou API não carregados. Verifique os imports no HTML.");
            return;
        }

        // 1. Coleta e Tratamento dos Inputs
        const valVista = UTILS.parseBRL(document.getElementById('val-inicial').value);
        const valParcela = UTILS.parseBRL(document.getElementById('val-mensal').value);
        
        let valTaxaInput = document.getElementById('val-taxa').value.replace(',', '.');
        let valTaxa = parseFloat(valTaxaInput) || 0;
        document.getElementById('val-taxa').value = valTaxa;


        let valPeriodo = parseFloat(document.getElementById('val-periodo').value) || 0;
        // Garante que inputs do tipo não sejam exibidos "32-1"
        document.getElementById('val-periodo').value = valPeriodo;

        // --- NOVA VERIFICAÇÃO DE SEGURANÇA ---
        // Verifica se Taxa ou Período são inválidos (NaN) ou negativos
        // Nota: valVista e valParcela já são tratados pelo parseBRL
        
        // Verifica se estamos no modo que usa a Taxa e se ela é inválida
        if (modoAtual !== 'taxa' && (isNaN(valTaxa) || valTaxa < 0)) {
            alert("Por favor, insira uma Taxa de Juros válida.");
            return;
        }

        // Verifica o Período
        if (isNaN(valPeriodo) || valPeriodo <= 0) {
            alert("Por favor, insira um Período válido maior que zero.");
            return;
        }

        if (document.getElementById('tipo-periodo').value === 'anos') valPeriodo *= 12;

        // Normalização da taxa se for input anual
        if (document.getElementById('tipo-taxa-input').value === 'anual') {
            valTaxa = UTILS.converterTaxaAnualParaMensal(valTaxa);
        } else {
            valTaxa = valTaxa / 100;
        }

        // 2. Execução Lógica baseada no Modo
        if (modoAtual === 'taxa') {
            // Modo Padrão: Precisa de Valor e Parcela
            if(valVista <= 0 || valParcela <= 0) return; // Não calcula se for zero
            
            const totalPago = valParcela * valPeriodo;

            if (totalPago < valVista){
                // Caso o usuário tente pagar menos do que pegou emprestado
                document.getElementById('res-1').innerText = "Inválido";
                document.getElementById('res-2').innerText = "---";
                document.getElementById('res-total').innerText = "---";
                
                // Opcional: Alerta visual ou log
                console.warn("Total pago (" + totalPago + ") é menor que o valor financiado (" + valVista + ")");
                return; // Interrompe o cálculo
            }

            const i = FinanciamentoAPI.calcJurosEmprestimo(valVista, valParcela, valPeriodo);
            
            // Tratamento de erro matemático (caso não ache raiz)
            if (isNaN(i) || i === null) {
                document.getElementById('res-1').innerText = "Erro";
                return;
            }

            const iAnual = UTILS.converterTaxaMensalParaAnual(i);
            
            document.getElementById('res-1').innerText = (i*100).toFixed(2) + "% a.m.";
            document.getElementById('res-2').innerText = iAnual.toFixed(2) + "% a.a.";
            document.getElementById('res-total').innerText = UTILS.formatBRL(valParcela * valPeriodo);
        }
        else if (modoAtual === 'parcela') {
            if(valVista <= 0) return;
            const pmt = FinanciamentoAPI.calcParcela(valVista, valTaxa, valPeriodo);
            
            document.getElementById('res-1').innerText = UTILS.formatBRL(pmt);
            document.getElementById('res-total').innerText = UTILS.formatBRL(pmt * valPeriodo);
        }
        else if (modoAtual === 'valor') {
            if(valParcela <= 0) return;
            const pv = FinanciamentoAPI.calcValorFinanciado(valParcela, valTaxa, valPeriodo);
            
            document.getElementById('res-1').innerText = UTILS.formatBRL(pv);
        }

    } catch (error) {
        console.error("Erro no cálculo:", error);
        document.getElementById('res-1').innerText = "Erro";
    }
}

// --- INICIALIZAÇÃO (Ao carregar a página) ---
document.addEventListener('DOMContentLoaded', () => {
    
    function permitirApenasNumeros(evento) {
        const elemento = evento.target;
        // Regex: Substitui tudo que NÃO for (0-9), ponto ou vírgula por vazio
        elemento.value = elemento.value.replace(/[^0-9.,]/g, '');
    }

    function aplicarMascaraMoeda(evento) {
        const elemento = evento.target;
        let valor = elemento.value.replace(/\D/g, "");
        if (valor === "") valor = "0";
        elemento.value = (parseInt(valor) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }

    function limpar() {
        document.getElementById('val-inicial').value = '0,00';
        document.getElementById('val-mensal').value = '0,00';
        document.getElementById('val-taxa').value = '0,00';
        document.getElementById('val-periodo').value = '0';
        
        document.getElementById('res-total').innerText = 'R$ ---';
        document.getElementById('res-1').innerText = 'R$ ---';
        document.getElementById('res-2').innerText = 'R$ ---';
    }

    document.getElementById('val-taxa').addEventListener('input', permitirApenasNumeros);
    document.getElementById('val-periodo').addEventListener('input', permitirApenasNumeros);

    // Listeners de Eventos
    const btnCalc = document.getElementById('btn-calcular');
    const btnClean = document.getElementById('btn-limpar');

    if (btnCalc) btnCalc.addEventListener('click', calcular);
    if(btnClean) btnClean.addEventListener('click', limpar);

    document.getElementById('val-inicial').addEventListener('input', aplicarMascaraMoeda);
    document.getElementById('val-mensal').addEventListener('input', aplicarMascaraMoeda);
    
    // Fechar menu ao clicar fora
    document.addEventListener('click', function(event) {
        const menu = document.getElementById('menu-modos');
        const headerTitle = document.querySelector('.title-wrapper');
        if (!menu.classList.contains('hidden')) {
            if (!menu.contains(event.target) && !headerTitle.contains(event.target)) {
                window.toggleMenu();
            }
        }
    });

    // --- PONTO CHAVE: STARTUP ---
    // Define o modo inicial e força o cálculo dos valores padrão
    mudarModo('taxa'); 
});