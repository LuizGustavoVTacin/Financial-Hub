const FinanciamentoAPI = {

    /**
     * SOLVER NUMÉRICO (Método de Newton-Raphson)
     * Necessário para encontrar a taxa de juros (Raiz da equação)
     */
    _fsolve: (equacao, chuteInicial = 0.01) => {
        let x = chuteInicial;
        const tolerancia = 1e-7;
        const maxIteracoes = 100;
        const h = 1e-5; 

        for (let i = 0; i < maxIteracoes; i++) {
            const y = equacao(x);
            
            // Se o resultado for muito próximo de 0, achamos a raiz
            if (Math.abs(y) < tolerancia) return x;

            // Derivada numérica
            const y_plus = equacao(x + h);
            const derivada = (y_plus - y) / h;

            if (Math.abs(derivada) < 1e-9) break;

            x = x - (y / derivada);
        }
        return x;
    },

    /**
     * MODO 1: Descobrir Taxa de Juros (Juros do Empréstimo)
     * Usa o Solver Numérico acima.
     */
    calcJurosEmprestimo: (valorEmprestado, parcela, meses) => {
        const equacao = (i) => {
            if (Math.abs(i) < 1e-9) return parcela - (valorEmprestado / meses); 
            // Fórmula: PMT - PV * [ i(1+i)^n ] / [ (1+i)^n - 1 ] = 0
            // Simplificada para busca de raiz:
            return parcela - (valorEmprestado * i) / (1 - Math.pow(1 + i, -meses));
        };

        const taxaDecimal = FinanciamentoAPI._fsolve(equacao, 0.01);
        return taxaDecimal; 
    },

    /**
     * MODO 2: Simular Parcela (PMT)
     * Fórmula Price: PMT = PV * [ i(1+i)^n ] / [ (1+i)^n - 1 ]
     */
    calcParcela: (pv, i, n) => {
        if (i === 0) return pv / n;
        return pv * ( (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1) );
    },

    /**
     * MODO 3: Descobrir Valor Financiado (PV)
     * Fórmula Price Inversa: PV = PMT * [ (1 - (1+i)^-n) / i ]
     */
    calcValorFinanciado: (pmt, i, n) => {
        if (i === 0) return pmt * n;
        return pmt * ( (1 - Math.pow(1 + i, -n)) / i );
    },

   /**
     * MODO 4: Calcular Amortização
     * Retorna um objeto com os dados para a interface usar.
     */
    calcAmortizacao: (divida, taxa, n, amortizacao, tipoAmortizacao) => {
        // 1. Cenário Atual
        const parcelaOriginal = FinanciamentoAPI.calcParcela(divida, taxa, n);
        const totalRestanteOriginal = parcelaOriginal * n;

        // 2. Novo Saldo
        const novoSaldoDevedor = divida - amortizacao;

        // Se quitou a dívida
        if (novoSaldoDevedor <= 0.01) {
            return {
                status: 'QUITADO',
                parcelaOriginal: parcelaOriginal,
                novoValor: 0,
                economia: totalRestanteOriginal - amortizacao,
                msg: "Dívida Quitada!"
            };
        }

        let novoValorPrincipal = 0;
        let novoTotal = 0;
        let novoN = n;
        let novaParcela = parcelaOriginal;

        if (tipoAmortizacao === 'prazo') {
            // REDUZIR PRAZO (Mantém parcela, reduz N)
            const numerador = Math.log(1 - (novoSaldoDevedor * taxa / parcelaOriginal));
            const denominador = Math.log(1 + taxa);
            novoN = -(numerador / denominador);
            
            novoValorPrincipal = Math.ceil(novoN); // Retorna número de parcelas
            novoTotal = parcelaOriginal * novoN; // Total considerando parcelas inteiras

        } else {
            // REDUZIR PARCELA (Mantém N, reduz PMT)
            novaParcela = FinanciamentoAPI.calcParcela(novoSaldoDevedor, taxa, n);
            
            novoValorPrincipal = novaParcela; // Retorna valor monetário
            novoTotal = novaParcela * n;
        }

        const economia = totalRestanteOriginal - (novoTotal + amortizacao);

        return {
            status: 'OK',
            tipo: tipoAmortizacao,
            parcelaOriginal: parcelaOriginal, // Retorna a parcela antiga para comparação
            prazoOriginal: n,                 // Retorna o prazo antigo
            novoValor: novoValorPrincipal,
            economia: economia
        };
    }
};

window.FinanciamentoAPI = FinanciamentoAPI;