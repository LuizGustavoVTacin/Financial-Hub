document.addEventListener('DOMContentLoaded', () => {
    
    // --- NAVEGAÇÃO ---
    // Tornamos a função global (window) porque ela é chamada no onclick do HTML
    window.navigateTo = function(view) {
        const dashView = document.getElementById('view-dashboard');
        const calcView = document.getElementById('view-calculadora');
        const title = document.getElementById('page-title');
        
        // Botões
        const btnDash = document.getElementById('nav-dashboard');
        const btnCalc = document.getElementById('nav-calculadora');

        // Resetar ativos
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

        if (view === 'dashboard') {
            dashView.classList.remove('hidden');
            calcView.classList.add('hidden');
            title.textContent = 'Dashboard';
            btnDash.classList.add('active');
        } else if (view === 'calculadora') {
            dashView.classList.add('hidden');
            calcView.classList.remove('hidden');
            title.textContent = 'Calculadora';
            btnCalc.classList.add('active');
        }
    };

    // --- MODO NOTURNO ---
    const btnTheme = document.getElementById('theme-toggle');
    const html = document.documentElement;

    // Detectar preferência do sistema
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        html.classList.add('dark');
    }

    btnTheme.addEventListener('click', () => {
        html.classList.toggle('dark');
    });

    // --- CHART.JS ---
    const ctx = document.getElementById('financialChart').getContext('2d');
            
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['-15', '-10', '-5', '0', '5', '10', '15', '20', '25', '30'],
            datasets: [{
                label: 'Diferença de Amplitude Média',
                data: [1.7, 1.4, 1.15, 1.05, 1.01, 1.0, 1.0, 1.0, 1.0, 1.0],
                borderColor: '#6b7280', 
                borderWidth: 1.5,
                pointBackgroundColor: '#ef4444', 
                pointBorderColor: '#ef4444',
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    min: 0.8,
                    max: 1.8,
                    grid: { color: 'rgba(0, 0, 0, 0.05)', borderDash: [5, 5] }
                },
                x: {
                    grid: { color: 'rgba(0, 0, 0, 0.05)', borderDash: [5, 5] }
                }
            },
            plugins: {
                legend: {
                    display: true, position: 'top', align: 'end',
                    labels: { usePointStyle: true, boxWidth: 8 }
                }
            }
        }
    });
});