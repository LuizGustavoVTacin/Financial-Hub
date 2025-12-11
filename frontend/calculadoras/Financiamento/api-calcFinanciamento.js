const FinanciamentoAPI = {

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

        const taxaDecimal = UTILS._fsolve(equacao, 0.01);
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
            const numerador = Math.log(1 - (novoSaldoDevedor * taxa / parcelaOriginal));
            const denominador = Math.log(1 + taxa);
            const novoN_Exact = -(numerador / denominador);

            // 2. Separar meses cheios
            // Usamos floor para pegar quantas parcelas INTEIRAS cabem
            const mesesCheios = Math.floor(novoN_Exact); 

            // 3. Calcular o Saldo Devedor após pagar os meses cheios
            // Fórmula do Valor Futuro de uma anuidade (FV)
            // Saldo = Divida * (1+i)^n - PMT * [((1+i)^n - 1) / i]
            const fatorJuros = Math.pow(1 + taxa, mesesCheios);
            const saldoAposMesesCheios = (novoSaldoDevedor * fatorJuros) - (parcelaOriginal * (fatorJuros - 1) / taxa);

            // 4. Calcular a Parcela Residual (A última)
            // O saldo restante sofre juros de mais 1 mês antes de ser pago
            let parcelaResidual = saldoAposMesesCheios * (1 + taxa);

            // ARREDONDAMENTO BANCÁRIO:
            // Se a residual for muito pequena (ex: centavos), bancos costumam somar na anterior.
            // Mas para simulação, vamos considerar como uma última parcela distinta.
                
            // 5. Totais Finais
            // O novo N será os meses cheios + 1 (se houver residual significativo)
            novoN = parcelaResidual > 0.01 ? mesesCheios + 1 : mesesCheios;
                
            // O total pago é a soma das cheias + a residual
            novoTotal = (parcelaOriginal * mesesCheios) + parcelaResidual;
                
            // Para exibição, usamos o novoN inteiro
            novoValorPrincipal = novoN; 

            } else {

                novaParcela = FinanciamentoAPI.calcParcela(novoSaldoDevedor, taxa, n);
                novoValorPrincipal = novaParcela;
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