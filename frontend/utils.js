/* Salve em: /projeto/utils.js */
const UTILS = {
    // Formata Moeda
    formatBRL: (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
    
    // Converte String "1.000,00" para Float
    parseBRL: (val) => {
        if (!val) return 0;
        return parseFloat(val.replace(/\./g, '').replace(',', '.') || 0);
    },

    // Trecho necessário no utils.js
    converterTaxaMensalParaAnual: (taxaDecimal) => {
        return (Math.pow(1 + taxaDecimal, 12) - 1) * 100;
    },

    converterTaxaAnualParaMensal: (taxaAnual) => {
        return Math.pow(1 + (taxaAnual / 100), 1/12) - 1;
    },

     // Opcional: Calcular Taxa Anual equivalente
    // Algoritmo Matemático para achar a raiz da equação (Newton-Raphson)
    _fsolve: (equacao, chuteInicial = 0.01) => {
        let x = chuteInicial;
        const tolerancia = 1e-7;
        const maxIteracoes = 100;
        const h = 1e-5; 

        for (let i = 0; i < maxIteracoes; i++) {
            const y = equacao(x);
            if (Math.abs(y) < tolerancia) return x;

            const y_plus = equacao(x + h);
            const derivada = (y_plus - y) / h;

            if (Math.abs(derivada) < 1e-9) break;
            x = x - (y / derivada);
        }
        return x;
    }
};
// Exporta para window
window.UTILS = UTILS;