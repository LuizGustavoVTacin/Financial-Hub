/**
 * api.js
 * Responsável puramente pela regra de negócio e cálculos matemáticos.
 * Não acessa o DOM nem manipula HTML.
 * Este ficheiro deve ser carregado ANTES do script.js no HTML.
 */

const JurosAPI = {
    /**
     * Calcula Juros Compostos com Aportes Mensais.
     * Fórmula: FV = P*(1+r)^n + PMT * [ ((1+r)^n - 1) / r ]
     * * @param {number} p - Valor Inicial (Principal)
     * @param {number} m - Valor Mensal (Aporte)
     * @param {number} r - Taxa de Juros Mensal (em decimal, ex: 0.01)
     * @param {number} n - Período em meses
     * @returns {Promise<Object>} - Retorna Promise para simular comportamento assíncrono de API
     */
    calcularJurosCompostos: async (p, m, r, n) => {
        // Simulação de latência de rede (opcional, para realismo)
        // await new Promise(resolve => setTimeout(resolve, 100));

        // Cálculo do montante referente ao valor inicial
        let montanteInicial = p * Math.pow(1 + r, n);
        
        // Cálculo do montante referente aos aportes mensais
        let montanteAportes = 0;
        if (r > 0) {
            montanteAportes = m * ((Math.pow(1 + r, n) - 1) / r);
        } else {
            montanteAportes = m * n;
        }

        const totalFinal = montanteInicial + montanteAportes;
        const totalInvestido = p + (m * n);
        const totalJuros = totalFinal - totalInvestido;

        // Retorna o objeto de dados puro
        return {
            total: totalFinal,
            investido: totalInvestido,
            juros: totalJuros
        };
    },
    /**
     * Calcula Juros Compostos com Aportes Mensais.
     * Fórmula: FV = P*(1+r)^n + PMT * [ ((1+r)^n - 1) / r ]
     * * @param {number} p - Valor Inicial (Principal)
     * @param {number} m - Valor Mensal (Aporte)
     * @param {number} r - Taxa de Juros Mensal (em decimal, ex: 0.01)
     * @param {number} n - Período em meses
     * @returns {Promise<Object>} - Retorna Promise para simular comportamento assíncrono de API
     */
    calcularJurosSimples: async (p, m, r, n) => {
        // Simulação de latência de rede (opcional, para realismo)
        // await new Promise(resolve => setTimeout(resolve, 100));

        // Cálculo do montante referente ao valor inicial
        const jurosPrincipal = p * r * n;
        const totalAportado = m * n;
        const jurosAportes = m * r * (n * (n + 1)) / 2; // Aporte no início
                
        const totalInvestido = p + totalAportado;
        const totalJuros = jurosPrincipal + jurosAportes;

        // Retorna o objeto de dados puro
        return {
            total: totalInvestido + totalJuros,
            investido: totalInvestido,
            juros: totalJuros
        };
    }
};

// Exporta para o escopo global (window) para ser acessível pelo script.js
window.JurosAPI = JurosAPI;