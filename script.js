// ===== ЖДЁМ ЗАГРУЗКИ DOM =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Diagnostic Session Site загружен');
    init();
});

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
    const form = document.getElementById('diagnosticForm');
    const clearBtn = document.getElementById('clearBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');

    if (!form || !clearBtn || !downloadPdfBtn) {
        console.error('Элементы формы не найдены!');
        return;
    }

    clearBtn.addEventListener('click', handleClearForm);
    downloadPdfBtn.addEventListener('click', handleDownloadPDF);
    form.addEventListener('input', debounce(saveFormData, 1000));
    form.addEventListener('input', updateCalculator);

    loadFormData();

    const sessionDateInput = document.getElementById('sessionDate');
    if (sessionDateInput && !sessionDateInput.value) {
        sessionDateInput.value = new Date().toISOString().split('T')[0];
    }

    updateCalculator();
    console.log('Инициализация завершена');
}

// ===== УМНЫЙ КАЛЬКУЛЯТОР ПОТЕРЬ =====
function updateCalculator() {
    const revenue = parseFloat(document.getElementById('revenue')?.value) || 0;
    const reviewsPerMonth = parseFloat(document.getElementById('reviewsPerMonth')?.value) || 0;
    const currentRating = parseFloat(document.getElementById('currentRating')?.value) || 0;
    const timeSpent = parseFloat(document.getElementById('timeSpent')?.value) || 0;

    const timeLossPerMonth = timeSpent * 30 * 500;
    document.getElementById('timeLoss').textContent = formatCurrency(timeLossPerMonth);

    let ratingLoss = 0;
    if (currentRating > 0 && currentRating < 4.9) {
        const ratingDeficit = 4.9 - currentRating;
        const percentLoss = ratingDeficit * 10 * 5;
        ratingLoss = (revenue * percentLoss) / 100;
    }
    document.getElementById('ratingLoss').textContent = formatCurrency(ratingLoss);

    let penalties = 0;
    if (currentRating > 0 && currentRating < 4.5 && reviewsPerMonth > 30) {
        penalties = revenue * 0.02;
    }
    document.getElementById('penalties').textContent = formatCurrency(penalties);

    let lostProfit = 0;
    if (timeSpent > 2 && reviewsPerMonth > 50) {
        const percentUnprocessed = Math.min((timeSpent - 2) * 10, 30);
        const lostCustomers = (reviewsPerMonth * percentUnprocessed) / 100;
        lostProfit = lostCustomers * 1500;
    }
    document.getElementById('lostProfit').textContent = formatCurrency(lostProfit);

    const totalLoss = timeLossPerMonth + ratingLoss + penalties + lostProfit;
    document.getElementById('totalLoss').textContent = formatCurrency(totalLoss);

    const setupCost = 15000;
    const monthlyCost = 5000;
    const monthlySavings = totalLoss - monthlyCost;
    document.getElementById('monthlySavings').textContent = formatCurrency(monthlySavings);

    let paybackPeriod = '-';
    if (monthlySavings > 0) {
        const months = Math.ceil(setupCost / monthlySavings);
        paybackPeriod = months === 1 ? '1 месяц' : `${months} месяца`;
    } else {
        paybackPeriod = 'Не окупается';
    }
    document.getElementById('paybackPeriod').textContent = paybackPeriod;

    let sixMonthProfit = 0;
    if (monthlySavings > 0) {
        sixMonthProfit = (monthlySavings * 6) - setupCost;
    }
    document.getElementById('sixMonthProfit').textContent = formatCurrency(sixMonthProfit);

    let yearProfit = 0;
    if (monthlySavings > 0) {
        yearProfit = (monthlySavings * 12) - setupCost;
    }
    document.getElementById('yearProfit').textContent = formatCurrency(yearProfit);
}

// ===== ФОРМАТИРОВАНИЕ ВАЛЮТЫ =====
function formatCurrency(amount) {
    if (amount === 0) return '0 ₽';
    if (amount < 0) return '-' + Math.abs(amount).toLocaleString('ru-RU') + ' ₽';
    return amount.toLocaleString('ru-RU') + ' ₽';
}

// ===== ОЧИСТКА ФОРМЫ =====
function handleClearForm() {
    if (confirm('Вы уверены, что хотите очистить всю форму? Это действие нельзя отменить.')) {
        document.getElementById('diagnosticForm').reset();
        localStorage.removeItem('diagnosticFormData');

        const sessionDateInput = document.getElementById('sessionDate');
        if (sessionDateInput) {
            sessionDateInput.value = new Date().toISOString().split('T')[0];
        }
        updateCalculator();
    }
}

// ===== СОХРАНЕНИЕ ДАННЫХ =====
function saveFormData() {
    try {
        const formData = getFormData();
        localStorage.setItem('diagnosticFormData', JSON.stringify(formData));
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// ===== ЗАГРУЗКА ДАННЫХ =====
function loadFormData() {
    try {
        const savedData = localStorage.getItem('diagnosticFormData');
        if (!savedData) return;

        const formData = JSON.parse(savedData);

        Object.keys(formData).forEach(key => {
            const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = formData[key];
                } else {
                    element.value = formData[key];
                }
            }
        });

        updateCalculator();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// ===== ПОЛУЧЕНИЕ ДАННЫХ ФОРМЫ =====
function getFormData() {
    const formData = {};

    const inputs = document.querySelectorAll('#diagnosticForm input:not([type="checkbox"]), #diagnosticForm select, #diagnosticForm textarea');
    inputs.forEach(input => {
        if (input.id) formData[input.id] = input.value;
    });

    const checkboxes = document.querySelectorAll('#diagnosticForm input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.name) formData[checkbox.name] = checkbox.checked;
    });

    return formData;
}

// ===== ГЕНЕРАЦИЯ PDF ИСПОЛЬЗУЯ PDFMAKE =====
async function handleDownloadPDF() {
    const downloadBtn = document.getElementById('downloadPdfBtn');
    const originalText = downloadBtn.textContent;

    try {
        downloadBtn.disabled = true;
        downloadBtn.textContent = '⏳ Генерация PDF...';

        const formData = getFormData();

        if (!formData.clientName) {
            alert('Пожалуйста, заполните имя клиента');
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
            return;
        }

        console.log('Начинаем генерацию PDF для:', formData.clientName);

        // Проверяем что pdfMake загружен
        if (typeof pdfMake === 'undefined') {
            throw new Error('pdfMake не загружен. Проверьте интернет-соединение.');
        }

        // Расчёт калькулятора
        const revenue = parseFloat(formData.revenue) || 0;
        const reviewsPerMonth = parseFloat(formData.reviewsPerMonth) || 0;
        const currentRating = parseFloat(formData.currentRating) || 0;
        const timeSpent = parseFloat(formData.timeSpent) || 0;

        const timeLoss = timeSpent * 30 * 500;

        let ratingLoss = 0;
        if (currentRating > 0 && currentRating < 4.9) {
            const ratingDeficit = 4.9 - currentRating;
            const percentLoss = ratingDeficit * 10 * 5;
            ratingLoss = (revenue * percentLoss) / 100;
        }

        let penalties = 0;
        if (currentRating > 0 && currentRating < 4.5 && reviewsPerMonth > 30) {
            penalties = revenue * 0.02;
        }

        let lostProfit = 0;
        if (timeSpent > 2 && reviewsPerMonth > 50) {
            const percentUnprocessed = Math.min((timeSpent - 2) * 10, 30);
            const lostCustomers = (reviewsPerMonth * percentUnprocessed) / 100;
            lostProfit = lostCustomers * 1500;
        }

        const totalLoss = timeLoss + ratingLoss + penalties + lostProfit;
        const monthlySavings = totalLoss - 5000;
        const sixMonthProfit = (monthlySavings * 6) - 15000;
        const yearProfit = (monthlySavings * 12) - 15000;
        const paybackMonths = monthlySavings > 0 ? Math.ceil(15000 / monthlySavings) : 0;

        // Собираем возражения
        const objections = [];
        if (formData.objection_ai_mistake) objections.push('AI напишет не то');
        if (formData.objection_cant_setup) objections.push('Не смогу настроить');
        if (formData.objection_service_close) objections.push('Сервис закроется');
        if (formData.objection_legal) objections.push('Это легально?');
        if (formData.objection_buyers_notice) objections.push('Покупатели поймут');
        if (formData.objection_price) objections.push('Дорого');

        // Создаём документ pdfMake
        const docDefinition = {
            content: [
                // Заголовок
                { text: 'ОТЧЁТ ДИАГНОСТИЧЕСКОЙ СЕССИИ', style: 'header' },
                { text: 'AI-автоматизация отзывов Wildberries', style: 'subheader' },
                { text: '\n' },

                // 1. Основная информация
                { text: '📋 Основная информация', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['40%', '60%'],
                        body: [
                            ['Имя клиента:', formData.clientName || 'Не указано'],
                            ['Контакт:', formData.contactInfo || 'Не указано'],
                            ['Источник:', formData.leadSource || 'Не указано'],
                            ['Дата сессии:', formData.sessionDate || new Date().toLocaleDateString('ru-RU')]
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 5, 0, 15]
                },

                // 2. Контекст бизнеса
                { text: '💼 Контекст бизнеса', style: 'sectionHeader' },
                {
                    table: {
                        widths: ['50%', '50%'],
                        body: [
                            ['Месячный оборот:', formatCurrency(revenue)],
                            ['Отзывов в месяц:', reviewsPerMonth.toString()],
                            ['Текущий рейтинг WB:', currentRating ? currentRating.toString() : 'Не указано'],
                            ['Время на отзывы в день:', timeSpent ? timeSpent + ' ч.' : 'Не указано']
                        ]
                    },
                    layout: 'lightHorizontalLines',
                    margin: [0, 5, 0, 10]
                },
                formData.currentProcess ? { text: 'Текущий процесс: ' + formData.currentProcess, margin: [0, 5, 0, 15] } : { text: '\n' },

                // 3. Калькулятор потерь
                { text: '💸 Калькулятор потерь', style: 'sectionHeaderRed' },
                {
                    table: {
                        widths: ['*', 'auto'],
                        body: [
                            ['Потери времени:', formatCurrency(timeLoss) + '/мес'],
                            ['Потери из-за низкого рейтинга:', formatCurrency(ratingLoss) + '/мес'],
                            ['Штрафы WB:', formatCurrency(penalties) + '/мес'],
                            ['Упущенная прибыль:', formatCurrency(lostProfit) + '/мес'],
                            [
                                { text: 'ОБЩИЕ ПОТЕРИ:', bold: true, fontSize: 12 },
                                { text: formatCurrency(totalLoss) + '/мес', bold: true, fontSize: 12, color: '#dc2626' }
                            ]
                        ]
                    },
                    layout: {
                        fillColor: function (rowIndex) {
                            return rowIndex === 4 ? '#fee2e2' : null;
                        }
                    },
                    margin: [0, 5, 0, 15]
                },

                // 4. ROI от внедрения
                { text: '📊 ROI от внедрения автоматизации', style: 'sectionHeaderGreen' },
                {
                    table: {
                        widths: ['*', 'auto'],
                        body: [
                            ['Затраты первый месяц:', '15,000 ₽'],
                            ['Затраты последующие месяцы:', '5,000 ₽/мес'],
                            ['Экономия в месяц:', formatCurrency(monthlySavings)],
                            ['Окупаемость:', paybackMonths > 0 ? paybackMonths + ' мес' : 'Не окупается'],
                            ['Прибыль за 6 месяцев:', formatCurrency(sixMonthProfit)],
                            ['Прибыль за год:', formatCurrency(yearProfit)]
                        ]
                    },
                    layout: {
                        fillColor: function (rowIndex) {
                            return rowIndex >= 2 ? '#f0fdf4' : null;
                        }
                    },
                    margin: [0, 5, 0, 15]
                }
            ],

            styles: {
                header: {
                    fontSize: 18,
                    bold: true,
                    alignment: 'center',
                    color: '#667eea',
                    margin: [0, 0, 0, 5]
                },
                subheader: {
                    fontSize: 12,
                    alignment: 'center',
                    color: '#64748b',
                    margin: [0, 0, 0, 20]
                },
                sectionHeader: {
                    fontSize: 14,
                    bold: true,
                    color: '#667eea',
                    margin: [0, 10, 0, 5]
                },
                sectionHeaderRed: {
                    fontSize: 14,
                    bold: true,
                    color: '#dc2626',
                    margin: [0, 10, 0, 5]
                },
                sectionHeaderGreen: {
                    fontSize: 14,
                    bold: true,
                    color: '#16a34a',
                    margin: [0, 10, 0, 5]
                },
                sectionHeaderOrange: {
                    fontSize: 14,
                    bold: true,
                    color: '#ea580c',
                    margin: [0, 10, 0, 5]
                },
                sectionHeaderBlue: {
                    fontSize: 14,
                    bold: true,
                    color: '#0891b2',
                    margin: [0, 10, 0, 5]
                }
            },

            defaultStyle: {
                font: 'Roboto',
                fontSize: 10
            }
        };

        // Добавляем секцию "Боли и проблемы" если есть данные
        if (formData.whatTried || formData.whyFailed || formData.emotionalPain ||
            formData.businessImpact || formData.lifeImpact || formData.costOfInaction) {

            docDefinition.content.push({ text: '😰 Боли и проблемы', style: 'sectionHeaderRed' });

            const painContent = [];
            if (formData.whatTried) painContent.push({ text: 'Что пробовал раньше: ' + formData.whatTried, margin: [0, 3, 0, 3] });
            if (formData.whyFailed) painContent.push({ text: 'Почему не сработало: ' + formData.whyFailed, margin: [0, 3, 0, 3] });
            if (formData.emotionalPain) painContent.push({ text: 'Эмоциональная боль: ' + formData.emotionalPain, margin: [0, 3, 0, 3] });
            if (formData.businessImpact) painContent.push({ text: 'Влияние на бизнес: ' + formData.businessImpact, margin: [0, 3, 0, 3] });
            if (formData.lifeImpact) painContent.push({ text: 'Влияние на жизнь: ' + formData.lifeImpact, margin: [0, 3, 0, 3] });
            if (formData.costOfInaction) painContent.push({ text: 'Цена бездействия: ' + formatCurrency(parseFloat(formData.costOfInaction)) + '/мес', margin: [0, 3, 0, 3] });

            docDefinition.content.push(...painContent);
            docDefinition.content.push({ text: '\n' });
        }

        // Добавляем секцию "Видение и ожидания" если есть данные
        if (formData.idealSituation || formData.successCriteria || formData.readyToInvest || formData.readyToImplement) {
            docDefinition.content.push({ text: '🎯 Видение и ожидания', style: 'sectionHeaderGreen' });

            const visionContent = [];
            if (formData.idealSituation) visionContent.push({ text: 'Идеальная ситуация: ' + formData.idealSituation, margin: [0, 3, 0, 3] });
            if (formData.successCriteria) visionContent.push({ text: 'Критерии успеха: ' + formData.successCriteria, margin: [0, 3, 0, 3] });
            if (formData.readyToInvest) visionContent.push({ text: 'Готов инвестировать: ' + formData.readyToInvest, margin: [0, 3, 0, 3] });
            if (formData.readyToImplement) visionContent.push({ text: 'Готов внедрять: ' + formData.readyToImplement, margin: [0, 3, 0, 3] });

            docDefinition.content.push(...visionContent);
            docDefinition.content.push({ text: '\n' });
        }

        // Добавляем секцию "Возражения" если есть данные
        if (objections.length > 0 || formData.objectionNotes) {
            docDefinition.content.push({ text: '🚫 Возражения и сомнения', style: 'sectionHeaderOrange' });

            if (objections.length > 0) {
                docDefinition.content.push({ text: 'Основные возражения: ' + objections.join(', '), margin: [0, 3, 0, 3] });
            }
            if (formData.objectionNotes) {
                docDefinition.content.push({ text: 'Дополнительно: ' + formData.objectionNotes, margin: [0, 3, 0, 3] });
            }
            docDefinition.content.push({ text: '\n' });
        }

        // Добавляем секцию "Итоги сессии" если есть данные
        if (formData.sessionResult || formData.nextSteps || formData.sessionNotes) {
            docDefinition.content.push({ text: '✅ Итоги сессии', style: 'sectionHeaderBlue' });

            const resultContent = [];
            if (formData.sessionResult) resultContent.push({ text: 'Результат: ' + formData.sessionResult, margin: [0, 3, 0, 3] });
            if (formData.nextSteps) resultContent.push({ text: 'Следующие шаги: ' + formData.nextSteps, margin: [0, 3, 0, 3] });
            if (formData.sessionNotes) resultContent.push({ text: 'Дополнительные заметки: ' + formData.sessionNotes, margin: [0, 3, 0, 3] });

            docDefinition.content.push(...resultContent);
            docDefinition.content.push({ text: '\n' });
        }

        // Футер
        docDefinition.content.push({
            text: [
                'AI-автоматизация отзывов Wildberries | Конфиденциальный документ\n',
                'Создано: ' + new Date().toLocaleDateString('ru-RU') + ' ' + new Date().toLocaleTimeString('ru-RU')
            ],
            fontSize: 8,
            color: '#94a3b8',
            alignment: 'center',
            margin: [0, 20, 0, 0]
        });

        // Генерируем и скачиваем PDF
        const fileName = `diagnostic-session-${formData.clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
        pdfMake.createPdf(docDefinition).download(fileName);

        console.log('PDF успешно создан:', fileName);

        downloadBtn.disabled = false;
        downloadBtn.textContent = '✅ PDF скачан!';
        setTimeout(() => { downloadBtn.textContent = originalText; }, 3000);

    } catch (error) {
        console.error('ОШИБКА генерации PDF:', error);
        alert('Ошибка: ' + error.message);
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalText;
    }
}

// ===== DEBOUNCE =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

console.log('script.js загружен успешно');
