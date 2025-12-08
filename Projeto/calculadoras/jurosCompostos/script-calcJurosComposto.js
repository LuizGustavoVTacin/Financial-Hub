// --- CONFIGURAÇÃO DOS MODOS ---
const MODOS_CONFIG = {
    'composto': {
        titulo: "Juros Compostos",
        desc: "O poder dos juros sobre juros no longo prazo.",
        show: ['group-valor', 'group-parcela', 'group-taxa', 'group-periodo'],
        hide: [] 
    },
    'simples': {
        titulo: "Juros Simples",
        desc: "Rendimento linear (Ideal para curto prazo).",
        show: ['group-valor', 'group-parcela', 'group-taxa', 'group-periodo'],
        hide: []
    }
};

let modoAtual = 'composto'; 

// --- FUNÇÕES GLOBAIS ---
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

    if(config) {
        document.getElementById('titulo-func').innerText = config.titulo;
        document.getElementById('desc-func').innerText = config.desc;

        config.hide.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });
        config.show.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'block';
        });
    }

    window.toggleMenu();
    document.getElementById('btn-calcular').click();
};


// --- INICIALIZAÇÃO ---
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
        elemento.value = (parseInt(valor) / 100).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    async function calcular() {
        try {
            // 1. Coleta
            const valInicial = UTILS.parseBRL(document.getElementById('val-inicial').value);
            const valMensal = UTILS.parseBRL(document.getElementById('val-mensal').value);
            
            let valTaxaInput = document.getElementById('val-taxa').value.replace(',', '.');
            const valTaxa = parseFloat(valTaxaInput) || 0; 
            
            let valPeriodo = parseFloat(document.getElementById('val-periodo').value);
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

            const tipoTaxa = document.getElementById('tipo-taxa').value; 
            const tipoPeriodo = document.getElementById('tipo-periodo').value;

            // 2. Normalização
            let periodoEmMeses = valPeriodo;
            if (tipoPeriodo === 'anos') periodoEmMeses = valPeriodo * 12;

            let taxaMensalDecimal = 0;
            
            // Lógica de conversão de taxa baseada no modo
            if (tipoTaxa === 'anual') {
                if (modoAtual === 'simples') {
                    // Juros Simples: Divisão direta
                    taxaMensalDecimal = (valTaxa / 12) / 100;
                } else {
                    // Juros Compostos: Tenta usar UTILS ou fórmula padrão
                    if (typeof UTILS !== 'undefined' && UTILS.converterTaxaAnualParaMensal) {
                        taxaMensalDecimal = UTILS.converterTaxaAnualParaMensal(valTaxa);
                    } else {
                        taxaMensalDecimal = Math.pow(1 + (valTaxa/100), 1/12) - 1;
                    }
                }
            } else {
                taxaMensalDecimal = valTaxa / 100;
            }

            let resultado = { total: 0, investido: 0, juros: 0 };

            // 3. Execução do Cálculo
            if (modoAtual === 'composto') {
                if (typeof JurosAPI === 'undefined') {
                    console.error("API não carregada.");
                    return;
                }
                resultado = await JurosAPI.calcularJurosCompostos(valInicial, valMensal, taxaMensalDecimal, periodoEmMeses);
            } 
            else if (modoAtual === 'simples') {
                if (typeof JurosAPI === 'undefined') {
                    console.error("API não carregada.");
                    return;
                }
                resultado = await JurosAPI.calcularJurosSimples(valInicial, valMensal, taxaMensalDecimal, periodoEmMeses);
            }

            // 4. Exibição
            document.getElementById('res-total').innerText = UTILS.formatBRL(resultado.total);
            document.getElementById('res-investido').innerText = UTILS.formatBRL(resultado.investido);
            document.getElementById('res-juros').innerText = UTILS.formatBRL(resultado.juros);

        } catch (error) {
            console.error("Erro no cálculo:", error);
        }
    }

    function limpar() {
        document.getElementById('val-inicial').value = '0,00';
        document.getElementById('val-mensal').value = '0,00';
        document.getElementById('val-taxa').value = '0,00';
        document.getElementById('val-periodo').value = '0';
        
        document.getElementById('res-total').innerText = 'R$ ---';
        document.getElementById('res-investido').innerText = 'R$ ---';
        document.getElementById('res-juros').innerText = 'R$ ---';
    }

    document.getElementById('val-taxa').addEventListener('input', permitirApenasNumeros);
    document.getElementById('val-periodo').addEventListener('input', permitirApenasNumeros);

    const btnCalc = document.getElementById('btn-calcular');
    const btnClean = document.getElementById('btn-limpar');
    
    if(btnCalc) btnCalc.addEventListener('click', calcular);
    if(btnClean) btnClean.addEventListener('click', limpar);

    document.getElementById('val-inicial').addEventListener('input', aplicarMascaraMoeda);
    document.getElementById('val-mensal').addEventListener('input', aplicarMascaraMoeda);
    
    document.getElementById('tipo-taxa').addEventListener('change', calcular);
    document.getElementById('tipo-periodo').addEventListener('change', calcular);

    document.addEventListener('click', function(event) {
        const menu = document.getElementById('menu-modos');
        const headerTitle = document.querySelector('.title-wrapper');
        if (!menu.classList.contains('hidden')) {
            if (!menu.contains(event.target) && !headerTitle.contains(event.target)) {
                window.toggleMenu();
            }
        }
    });

    mudarModo('composto');
});