$(document).ready(function() {
    if (!localStorage.getItem('loggedIn')) {
        window.location.href = 'login.html';
    }

    // Particles.js
    particlesJS('particles-js', {
        particles: {
            number: { value: 100, density: { enable: true, value_area: 800 } },
            color: { value: '#00d4ff' },
            shape: { type: 'circle' },
            opacity: { value: 0.5 },
            size: { value: 3, random: true },
            move: { speed: 6 }
        },
        interactivity: {
            events: { onhover: { enable: true, mode: 'repulse' } }
        }
    });

    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    let budget = parseInt(localStorage.getItem('budget')) || 0;
    let categories = {};
    let chart = null;
    let chartType = 'pie';
    let lang = localStorage.getItem('lang') || 'en';

    // Load initial data
    loadDashboard();
    loadExpenses();
    updateLanguage();

    // Logout
    $('#logout').click(function() {
        localStorage.removeItem('loggedIn');
        window.location.href = 'login.html';
    });

    // Form submit
    $('#expenseForm').submit(function(e) {
        e.preventDefault();
        addExpense();
    });

    // Voice input
    $('#voiceInput').click(function() {
        if ('webkitSpeechRecognition' in window) {
            let recognition = new webkitSpeechRecognition();
            recognition.lang = lang === 'en' ? 'en-US' : 'hi-IN';
            recognition.start();
            recognition.onresult = function(event) {
                let text = event.results[0][0].transcript;
                $('#description').val(text);
            };
        } else {
            alert(lang === 'hi' ? 'यह ब्राउज़र वॉयस इनपुट समर्थन नहीं करता!' : 'Voice input not supported!');
        }
    });

    // Set budget
    $('#setBudget').click(function() {
        budget = parseInt($('#budgetAmount').val()) || 0;
        localStorage.setItem('budget', budget);
        loadDashboard();
        $('#budgetAmount').val('');
    });

    // Apply filters
    $('#applyFilters').click(function() {
        loadExpenses();
    });

    // Sort expenses
    $('#sortBy').change(function() {
        loadExpenses();
    });

    // Export to CSV
    $('#exportCSV').click(function() {
        let csv = lang === 'hi' ? 'तिथि,श्रेणी,राशि,विवरण\n' : 'Date,Category,Amount,Description\n';
        expenses.forEach(exp => {
            csv += `${exp.date},${exp.category},${exp.amount},${exp.description}\n`;
        });
        let blob = new Blob([csv], { type: 'text/csv' });
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'expenses.csv';
        link.click();
    });

    // Import CSV
    $('#importCSV').change(function(e) {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.onload = function(event) {
            let lines = event.target.result.split('\n').slice(1);
            lines.forEach(line => {
                let [date, category, amount, description] = line.split(',');
                if (date && category && amount) {
                    expenses.push({ date, category, amount: parseInt(amount), description });
                }
            });
            localStorage.setItem('expenses', JSON.stringify(expenses));
            loadDashboard();
            loadExpenses();
        };
        reader.readAsText(file);
    });

    // Toggle chart type
    $('#toggleChartType').click(function() {
        chartType = chartType === 'pie' ? 'bar' : 'pie';
        $(this).text(lang === 'hi' ? `${chartType === 'pie' ? 'बार' : 'पाई'} चार्ट पर स्विच करें` : `Switch to ${chartType === 'pie' ? 'Bar' : 'Pie'} Chart`);
        updateChart();
    });

    // Dark mode
    $('#darkModeToggle').click(function() {
        $('body').toggleClass('light');
        localStorage.setItem('lightMode', $('body').hasClass('light'));
        updateLanguage();
    });
    if (localStorage.getItem('lightMode') === 'true') {
        $('body').addClass('light');
    }

    // Full screen
    $('#fullScreen').click(function() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });

    // Language toggle
    $('#langToggle').click(function() {
        lang = lang === 'en' ? 'hi' : 'en';
        localStorage.setItem('lang', lang);
        $(this).text(lang === 'en' ? 'हिन्दी' : 'English');
        updateLanguage();
        loadDashboard(); // Dashboard ko bhi update karo language change ke baad
    });

    // Add expense
    function addExpense() {
        let amount = parseInt($('#amount').val());
        let category = $('#category').val();
        let description = $('#description').val();
        let date = $('#date').val();

        if (amount <= 0) {
            alert(lang === 'hi' ? 'राशि धनात्मक होनी चाहिए!' : 'Amount must be positive!');
            return;
        }

        let expense = { amount, category, description, date };
        expenses.push(expense);
        localStorage.setItem('expenses', JSON.stringify(expenses));
        checkBudget(amount);
        loadDashboard();
        loadExpenses();
        $('#expenseForm')[0].reset();
    }

    // Load dashboard
    function loadDashboard() {
        let total = expenses.reduce((sum, exp) => sum + exp.amount, 0) || 0;
        let monthly = expenses
            .filter(exp => new Date(exp.date).getMonth() === new Date().getMonth() && new Date(exp.date).getFullYear() === new Date().getFullYear())
            .reduce((sum, exp) => sum + exp.amount, 0) || 0;
        let savings = budget - monthly;

        $('#total').text(total);
        $('#monthly').text(monthly);
        $('#savings').text(savings > 0 ? savings : '0');
    }

    // Load expenses
    function loadExpenses() {
        let startDate = $('#startDate').val();
        let endDate = $('#endDate').val();
        let filterCategory = $('#filterCategory').val();
        let minAmount = parseInt($('#minAmount').val()) || 0;
        let maxAmount = parseInt($('#maxAmount').val()) || Infinity;
        let sortBy = $('#sortBy').val();

        let filtered = expenses.filter(exp => {
            let expDate = new Date(exp.date);
            return (
                (!startDate || expDate >= new Date(startDate)) &&
                (!endDate || expDate <= new Date(endDate)) &&
                (!filterCategory || exp.category === filterCategory) &&
                exp.amount >= minAmount &&
                exp.amount <= maxAmount
            );
        });

        filtered.sort((a, b) => {
            if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
            if (sortBy === 'amount') return b.amount - a.amount;
            if (sortBy === 'category') return a.category.localeCompare(b.category);
        });

        $('#expenseList').empty();
        categories = {};
        filtered.forEach((exp, index) => {
            $('#expenseList').append(`
                <div class="expense-card animate__animated animate__fadeIn" data-index="${index}">
                    <div class="front">
                        ${exp.date} - ${exp.category}: ₹${exp.amount} - ${exp.description}
                    </div>
                    <div class="back">
                        <button class="edit" data-index="${index}" data-lang-en="Edit" data-lang-hi="संपादन">Edit</button>
                        <button class="delete" data-index="${index}" data-lang-en="Delete" data-lang-hi="हटाएँ">Delete</button>
                    </div>
                </div>
            `);
            updateCategories(exp.category, exp.amount);
        });

        $('.expense-card').click(function() {
            $(this).toggleClass('flipped');
        });

        $('.delete').click(function(e) {
            e.stopPropagation();
            let index = $(this).data('index');
            expenses.splice(index, 1);
            localStorage.setItem('expenses', JSON.stringify(expenses));
            loadDashboard();
            loadExpenses();
        });

        $('.edit').click(function(e) {
            e.stopPropagation();
            let index = $(this).data('index');
            let exp = expenses[index];
            $('#amount').val(exp.amount);
            $('#category').val(exp.category);
            $('#description').val(exp.description);
            $('#date').val(exp.date);
            expenses.splice(index, 1);
            localStorage.setItem('expenses', JSON.stringify(expenses));
            loadDashboard();
            loadExpenses();
        });

        updateChart();
        updateLanguage();
    }

    // Update categories
    function updateCategories(category, amount) {
        categories[category] = (categories[category] || 0) + amount;
    }

    // Update chart
    function updateChart() {
        if (chart) chart.destroy();
        let ctx = $('#expenseChart')[0].getContext('2d');
        chart = new Chart(ctx, {
            type: chartType,
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    label: lang === 'hi' ? 'खर्च' : 'Spending',
                    data: Object.values(categories),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top', labels: { color: '#e0e1dd' } },
                    title: { 
                        display: true, 
                        text: lang === 'hi' ? 'खर्च विश्लेषण' : 'Spending Analysis', 
                        color: '#e0e1dd' 
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true
                }
            }
        });
    }

    // Budget alert
    function checkBudget(newAmount) {
        let monthly = expenses
            .filter(exp => new Date(exp.date).getMonth() === new Date().getMonth() && new Date(exp.date).getFullYear() === new Date().getFullYear())
            .reduce((sum, exp) => sum + exp.amount, 0);
        if (budget && monthly + newAmount > budget) {
            $('#alertSound')[0].play();
            alert(lang === 'hi' ? `चेतावनी: आपने अपने ₹${budget} के बजट को पार कर लिया है!` : `Warning: You've exceeded your budget of ₹${budget}!`);
        }
    }

    // Language update
    function updateLanguage() {
        $('[data-lang-en]').each(function() {
            let text = $(this).data(`lang-${lang}`);
            $(this).text(text);
            if ($(this).is('input') && !$(this).is('[type="file"]') && !$(this).is('[type="date"]')) {
                $(this).attr('placeholder', text);
            }
        });
        document.title = $(document).find('title').data(`lang-${lang}`);
        $('#toggleChartType').text(lang === 'hi' ? `${chartType === 'pie' ? 'बार' : 'पाई'} चार्ट पर स्विच करें` : `Switch to ${chartType === 'pie' ? 'Bar' : 'Pie'} Chart`);
    }
});