/**
 * api-calcPlanejamento.js
 * Backend Simulado: Agora retorna dados de gráfico para TODOS os modos.
 */

const PlanejamentoAPI = {
    
    // --- 1. BANCO DE DADOS (MANTIDO) ---
    getAtivos: async () => {
        return [
            { id: 1, nome: "Poupança Nova", valor: 6.17, tipo: "anual" },
            { id: 2, nome: "Tesouro Selic 2029", valor: 10.75, tipo: "anual" },
            { id: 3, nome: "CDB 100% CDI", valor: 10.65, tipo: "anual" },
            { id: 4, nome: "LCI/LCA Isento", valor: 9.20, tipo: "anual" },
            { id: 5, nome: "FIIs (Média IFIX)", valor: 0.85, tipo: "mensal" },
            { id: 6, nome: "IVVB11 (S&P 500)", valor: 10.50, tipo: "anual" },
            { id: 7, nome: "Bitcoin (Histórico)", valor: 45.00, tipo: "anual" }
        ];
    },

    converterTaxaAnualParaMensal: (taxaAnual) => {
        if (typeof UTILS !== 'undefined' && UTILS.converterTaxaAnualParaMensal) {
            return UTILS.converterTaxaAnualParaMensal(taxaAnual);
        }
        return Math.pow(1 + (taxaAnual / 100), 1 / 12) - 1;
    },

    // --- MODO A: COMPARAÇÃO (Existente) ---
    simularCenarios: async (params) => {
        const equacaoJuros = (i) => {
            if (i === 0) return -params.dividaTotal;
            const fator = (1 - Math.pow(1 + i, -params.prazoMeses)) / i;
            return (params.parcelaDivida * fator) - params.dividaTotal;
        };

        let taxaDividaMensal = 0.01;
        if (typeof UTILS !== 'undefined' && UTILS._fsolve) {
            taxaDividaMensal = UTILS._fsolve(equacaoJuros);
        }

        let c1 = [], c2 = [];
        let d1 = params.dividaTotal, i1 = params.montanteInvestido;
        let d2 = params.dividaTotal, i2 = params.montanteInvestido;

        for (let m = 0; m <= params.prazoMeses; m++) {
            if (m > 0) {
                // C1
                if(d1 > 0) d1 = Math.max(0, d1 * (1+taxaDividaMensal) - params.parcelaDivida);
                i1 = i1 * (1 + params.taxaInvestMensal) + params.aporteMensal;
                
                // C2
                let fluxo = params.parcelaDivida + params.aporteMensal;
                if(d2 > 0) {
                    let juros = d2 * taxaDividaMensal;
                    d2 -= (fluxo - juros);
                    if(d2 < 0) { i2 += Math.abs(d2); d2 = 0; }
                } else {
                    i2 += fluxo;
                }
                i2 *= (1 + params.taxaInvestMensal);
            }
            c1.push(i1 - d1);
            c2.push(i2 - d2);
        }

        return { tipo: 'comparacao', prazo: params.prazoMeses, cenario1: c1, cenario2: c2 };
    },

    // --- MODO B: METAS (Com Gráfico de Evolução) ---
    calcularMeta: async (params) => {
        const i = params.taxaMensal;
        const n = params.prazoMeses;
        const pv = params.valorAtual;
        const fv = params.valorMeta;

        let montanteSemAporte = pv * Math.pow(1 + i, n);
        let falta = fv - montanteSemAporte;
        let aporteNecessario = 0;

        if (falta > 0) {
            if (i === 0) aporteNecessario = falta / n;
            else aporteNecessario = falta / ((Math.pow(1 + i, n) - 1) / i);
        }

        // Gerar dados para o gráfico (Evolução mensal)
        let evolucao = [];
        let saldo = pv;
        for(let m=0; m <= n; m++) {
            evolucao.push(saldo);
            saldo = saldo * (1 + i) + aporteNecessario;
        }

        return {
            tipo: 'meta',
            aporteMensal: aporteNecessario,
            totalJuros: fv - (pv + (aporteNecessario * n)),
            totalAcumulado: fv,
            prazo: n,
            grafico: evolucao,
            metaAlvo: fv // Para desenhar linha de meta
        };
    },

    // --- MODO C: FIRE (Com Gráfico até a Liberdade) ---
    calcularFIRE: async (params) => {
        const taxaRetirada = params.taxaRetiradaSegura || 0.04; 
        const numeroMagico = (params.custoMensal * 12) / taxaRetirada;

        const i = params.taxaMensal;
        const pmt = params.aporteMensal;
        const pv = params.valorAtual;
        
        // Calcula tempo NPER
        let meses = 0;
        if (i === 0) {
            if(pmt > 0) meses = (numeroMagico - pv) / pmt;
        } else {
            const num = pmt + (i * numeroMagico);
            const den = pmt + (i * pv);
            if (num > 0 && den > 0) meses = Math.log(num / den) / Math.log(1 + i);
        }
        
        if (!isFinite(meses) || meses < 0) meses = 0;
        const mesesArredondado = Math.ceil(meses);

        // Gerar gráfico da jornada FIRE
        let evolucao = [];
        let saldo = pv;
        // Plota até atingir ou um limite de 50 anos (600 meses) para não travar
        const limiteGrafico = Math.min(mesesArredondado + 12, 600); 

        for(let m=0; m <= limiteGrafico; m++) {
            evolucao.push(saldo);
            if (saldo >= numeroMagico && m >= mesesArredondado) break; // Para um pouco depois da meta
            saldo = saldo * (1 + i) + pmt;
        }

        return {
            tipo: 'fire',
            patrimonioNecessario: numeroMagico,
            mesesParaLiberdade: meses,
            anosParaLiberdade: meses / 12,
            rendaPassivaEstimada: params.custoMensal,
            grafico: evolucao,
            metaAlvo: numeroMagico
        };
    },

    simularAVistaVsParcelado: async (params) => {
        const { total, descontoPercent, parcelas, taxaMensal } = params;
        
        // Cenário 1: Pagamento à Vista com Desconto
        const valorComDesconto = total * (1 - (descontoPercent / 100));
        let saldoAVista = total - valorComDesconto; // O que sobrou do "montante" inicial
        let c1 = [saldoAVista];

        // Cenário 2: Pagamento Parcelado (Sem juros da loja, mas perdendo o desconto)
        const valorParcela = total / parcelas;
        let saldoParcelado = total; 
        let c2 = [saldoParcelado];

        for (let m = 1; m <= parcelas; m++) {
            // Evolução À Vista (Rendimento puro do que sobrou)
            saldoAVista = saldoAVista * (1 + taxaMensal);
            c1.push(saldoAVista);

            // Evolução Parcelado (Rende, mas paga a parcela)
            saldoParcelado = (saldoParcelado * (1 + taxaMensal)) - valorParcela;
            c2.push(Math.max(0, saldoParcelado));
        }

        return { 
            tipo: 'avista_parcelado', 
            prazo: parcelas, 
            cenarioAVista: c1, 
            cenarioParcelado: c2,
            economiaReal: c1[c1.length-1] - c2[c2.length-1]
        };
    },

};

window.PlanejamentoAPI = PlanejamentoAPI;