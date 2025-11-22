// ===== ЖДЁМ ЗАГРУЗКИ DOM =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('Diagnostic Session Site загружен');
    init();
});

// ===== ИНИЦИАЛИЗАЦИЯ =====
function init() {
    // Получаем элементы
    const form = document.getElementById('diagnosticForm');
    const clearBtn = document.getElementById('clearBtn');
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');

    // Проверяем что они существуют
    if (!form || !clearBtn || !downloadPdfBtn) {
        console.error('Элементы формы не найдены!');
        return;
    }

    // Вешаем обработчики
    clearBtn.addEventListener('click', handleClearForm);
    downloadPdfBtn.addEventListener('click', handleDownloadPDF);

    // Автосохранение в localStorage при изменении полей
    form.addEventListener('input', debounce(saveFormData, 1000));

    // Калькулятор обновляется при изменении полей
    form.addEventListener('input', updateCalculator);

    // Загружаем сохранённые данные
    loadFormData();

    // Устанавливаем текущую дату по умолчанию
    const sessionDateInput = document.getElementById('sessionDate');
    if (sessionDateInput && !sessionDateInput.value) {
        sessionDateInput.value = new Date().toISOString().split('T')[0];
    }

    // Первичный расчёт калькулятора
    updateCalculator();

    console.log('Инициализация завершена');
}

// ===== УМНЫЙ КАЛЬКУЛЯТОР ПОТЕРЬ =====
function updateCalculator() {
    // Получаем данные
    const revenue = parseFloat(document.getElementById('revenue')?.value) || 0;
    const reviewsPerMonth = parseFloat(document.getElementById('reviewsPerMonth')?.value) || 0;
    const currentRating = parseFloat(document.getElementById('currentRating')?.value) || 0;
    const timeSpent = parseFloat(document.getElementById('timeSpent')?.value) || 0;

    // 1. ПОТЕРИ ВРЕМЕНИ
    // Формула: часы в день × 30 дней × 500 ₽/час
    const timeLossPerMonth = timeSpent * 30 * 500;
    document.getElementById('timeLoss').textContent = formatCurrency(timeLossPerMonth);

    // 2. ПОТЕРИ ИЗ-ЗА НИЗКОГО РЕЙТИНГА
    // Логика: Идеальный рейтинг 4.9-5.0
    // Каждые -0.1 от идеального = -5% продаж
    let ratingLoss = 0;
    if (currentRating > 0 && currentRating < 4.9) {
        const ratingDeficit = 4.9 - currentRating;
        const percentLoss = ratingDeficit * 10 * 5; // Каждые 0.1 = 5%
        ratingLoss = (revenue * percentLoss) / 100;
    }
    document.getElementById('ratingLoss').textContent = formatCurrency(ratingLoss);

    // 3. ШТРАФЫ WB
    // Логика: Если отзывов много и рейтинг низкий = штрафы
    // Примерно 10% от оборота если рейтинг < 4.5
    let penalties = 0;
    if (currentRating > 0 && currentRating < 4.5 && reviewsPerMonth > 30) {
        penalties = revenue * 0.02; // 2% штрафы
    }
    document.getElementById('penalties').textContent = formatCurrency(penalties);

    // 4. УПУЩЕННАЯ ПРИБЫЛЬ
    // Логика: Необработанные отзывы = потерянные клиенты
    // Если тратит много времени = скорее всего не все обрабатывает
    // Каждый необработанный отзыв = -1 покупатель
    // Средний чек на WB = 1500 ₽
    let lostProfit = 0;
    if (timeSpent > 2 && reviewsPerMonth > 50) {
        const percentUnprocessed = Math.min((timeSpent - 2) * 10, 30); // До 30% необработанных
        const lostCustomers = (reviewsPerMonth * percentUnprocessed) / 100;
        lostProfit = lostCustomers * 1500; // Средний чек 1500₽
    }
    document.getElementById('lostProfit').textContent = formatCurrency(lostProfit);

    // 5. ОБЩИЕ ПОТЕРИ
    const totalLoss = timeLossPerMonth + ratingLoss + penalties + lostProfit;
    document.getElementById('totalLoss').textContent = formatCurrency(totalLoss);

    // 6. ROI РАСЧЁТЫ
    const setupCost = 15000;
    const monthlyCost = 5000;

    // Экономия = потери - стоимость подписки
    const monthlySavings = totalLoss - monthlyCost;
    document.getElementById('monthlySavings').textContent = formatCurrency(monthlySavings);

    // Окупаемость
    let paybackPeriod = '-';
    if (monthlySavings > 0) {
        const months = Math.ceil(setupCost / monthlySavings);
        paybackPeriod = months === 1 ? '1 месяц' : \`\${months} месяца\`;
    } else {
        paybackPeriod = 'Не окупается';
    }
    document.getElementById('paybackPeriod').textContent = paybackPeriod;

    // Прибыль за 6 месяцев
    let sixMonthProfit = 0;
    if (monthlySavings > 0) {
        sixMonthProfit = (monthlySavings * 6) - setupCost;
    }
    document.getElementById('sixMonthProfit').textContent = formatCurrency(sixMonthProfit);

    // Прибыль за год
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
        console.log('Форма очищена');

        // Устанавливаем текущую дату снова
        const sessionDateInput = document.getElementById('sessionDate');
        if (sessionDateInput) {
            sessionDateInput.value = new Date().toISOString().split('T')[0];
        }

        // Обновляем калькулятор
        updateCalculator();
    }
}

// ===== СОХРАНЕНИЕ ДАННЫХ ФОРМЫ В LOCALSTORAGE =====
function saveFormData() {
    try {
        const formData = getFormData();
        localStorage.setItem('diagnosticFormData', JSON.stringify(formData));
        console.log('Данные сохранены в localStorage');
    } catch (error) {
        console.error('Ошибка сохранения данных:', error);
    }
}

// ===== ЗАГРУЗКА ДАННЫХ ИЗ LOCALSTORAGE =====
function loadFormData() {
    try {
        const savedData = localStorage.getItem('diagnosticFormData');
        if (!savedData) {
            console.log('Нет сохранённых данных');
            return;
        }

        const formData = JSON.parse(savedData);
        console.log('Загружены сохранённые данные:', formData);

        // Заполняем форму
        Object.keys(formData).forEach(key => {
            const element = document.getElementById(key) || document.querySelector(\`[name="\${key}"]\`);

            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = formData[key];
                } else {
                    element.value = formData[key];
                }
            }
        });

        // Обновляем калькулятор после загрузки
        updateCalculator();

    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// ===== ПОЛУЧЕНИЕ ДАННЫХ ФОРМЫ =====
function getFormData() {
    const formData = {};

    // Обычные поля
    const inputs = document.querySelectorAll('#diagnosticForm input:not([type="checkbox"]), #diagnosticForm select, #diagnosticForm textarea');
    inputs.forEach(input => {
        if (input.id) {
            formData[input.id] = input.value;
        }
    });

    // Чекбоксы
    const checkboxes = document.querySelectorAll('#diagnosticForm input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.name) {
            formData[checkbox.name] = checkbox.checked;
        }
    });

    return formData;
}

// ===== ГЕНЕРАЦИЯ PDF С РУССКИМ ТЕКСТОМ =====
async function handleDownloadPDF() {
    try {
        console.log('Начинаем генерацию PDF...');

        const downloadBtn = document.getElementById('downloadPdfBtn');
        const originalText = downloadBtn.textContent;
        downloadBtn.disabled = true;
        downloadBtn.textContent = '⏳ Генерация PDF...';

        // Получаем данные формы
        const formData = getFormData();
        console.log('Данные формы:', formData);

        // Проверяем обязательные поля
        if (!formData.clientName) {
            alert('Пожалуйста, заполните имя клиента');
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
            return;
        }

        // Создаём HTML для PDF
        const pdfContent = generatePDFHTML(formData);

        // Настройки html2pdf
        const opt = {
            margin: 10,
            filename: \`diagnostic-session-\${formData.clientName.replace(/\\s+/g, '-')}-\${new Date().toISOString().split('T')[0]}.pdf\`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Генерируем PDF
        await html2pdf().set(opt).from(pdfContent).save();

        console.log('PDF успешно создан');

        // Восстанавливаем кнопку
        downloadBtn.disabled = false;
        downloadBtn.textContent = '✅ PDF скачан!';

        setTimeout(() => {
            downloadBtn.textContent = originalText;
        }, 3000);

    } catch (error) {
        console.error('Ошибка генерации PDF:', error);
        alert('Произошла ошибка при генерации PDF. Проверьте консоль для деталей.');

        const downloadBtn = document.getElementById('downloadPdfBtn');
        downloadBtn.disabled = false;
        downloadBtn.textContent = '📥 Скачать PDF';
    }
}

// ===== ГЕНЕРАЦИЯ HTML ДЛЯ PDF =====
function generatePDFHTML(data) {
    const revenue = parseFloat(data.revenue) || 0;
    const reviewsPerMonth = parseFloat(data.reviewsPerMonth) || 0;
    const currentRating = parseFloat(data.currentRating) || 0;
    const timeSpent = parseFloat(data.timeSpent) || 0;

    // Калькулятор для PDF
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

    // Возражения
    const objections = [];
    if (data.objection_ai_mistake) objections.push('AI напишет не то');
    if (data.objection_cant_setup) objections.push('Не смогу настроить');
    if (data.objection_service_close) objections.push('Сервис закроется');
    if (data.objection_legal) objections.push('Это легально?');
    if (data.objection_buyers_notice) objections.push('Покупатели поймут');
    if (data.objection_price) objections.push('Дорого');

    const html = \`
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #667eea; text-align: center; margin-bottom: 10px;">ОТЧЁТ ДИАГНОСТИЧЕСКОЙ СЕССИИ</h1>
        <p style="text-align: center; color: #64748b; margin-bottom: 30px;">AI-автоматизация отзывов Wildberries</p>

        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #667eea; font-size: 18px; margin-bottom: 15px;">📋 Основная информация</h2>
            <p><strong>Имя клиента:</strong> \${data.clientName || 'Не указано'}</p>
            <p><strong>Контакт:</strong> \${data.contactInfo || 'Не указано'}</p>
            <p><strong>Источник:</strong> \${data.leadSource || 'Не указано'}</p>
            <p><strong>Дата сессии:</strong> \${data.sessionDate || new Date().toLocaleDateString('ru-RU')}</p>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #667eea; font-size: 18px; margin-bottom: 15px;">💼 Контекст бизнеса</h2>
            <p><strong>Месячный оборот:</strong> \${formatCurrency(revenue)}</p>
            <p><strong>Отзывов в месяц:</strong> \${reviewsPerMonth || 'Не указано'}</p>
            <p><strong>Текущий рейтинг WB:</strong> \${currentRating || 'Не указано'}</p>
            <p><strong>Время на отзывы в день:</strong> \${timeSpent ? timeSpent + ' часов' : 'Не указано'}</p>
            \${data.currentProcess ? \`<p><strong>Текущий процесс:</strong> \${data.currentProcess}</p>\` : ''}
        </div>

        <div style="background: #fef2f2; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
            <h2 style="color: #dc2626; font-size: 18px; margin-bottom: 15px;">💸 Калькулятор потерь</h2>
            <p><strong>Потери времени:</strong> \${formatCurrency(timeLoss)}/мес</p>
            <p><strong>Потери из-за низкого рейтинга:</strong> \${formatCurrency(ratingLoss)}/мес</p>
            <p><strong>Штрафы WB:</strong> \${formatCurrency(penalties)}/мес</p>
            <p><strong>Упущенная прибыль:</strong> \${formatCurrency(lostProfit)}/мес</p>
            <p style="font-size: 20px; font-weight: bold; color: #dc2626; margin-top: 10px;">ОБЩИЕ ПОТЕРИ: \${formatCurrency(totalLoss)}/мес</p>
        </div>

        <div style="background: #f0fdf4; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
            <h2 style="color: #16a34a; font-size: 18px; margin-bottom: 15px;">📊 ROI от внедрения</h2>
            <p><strong>Экономия в месяц:</strong> \${formatCurrency(monthlySavings)}</p>
            <p><strong>Окупаемость:</strong> \${paybackMonths > 0 ? paybackMonths + ' мес' : 'Не окупается'}</p>
            <p><strong>Прибыль за 6 месяцев:</strong> \${formatCurrency(sixMonthProfit)}</p>
            <p><strong>Прибыль за год:</strong> \${formatCurrency(yearProfit)}</p>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; font-size: 18px; margin-bottom: 15px;">😰 Боли и проблемы</h2>
            \${data.whatTried ? \`<p><strong>Что пробовал раньше:</strong> \${data.whatTried}</p>\` : ''}
            \${data.whyFailed ? \`<p><strong>Почему не сработало:</strong> \${data.whyFailed}</p>\` : ''}
            \${data.emotionalPain ? \`<p><strong>Эмоциональная боль:</strong> \${data.emotionalPain}</p>\` : ''}
            \${data.businessImpact ? \`<p><strong>Влияние на бизнес:</strong> \${data.businessImpact}</p>\` : ''}
            \${data.lifeImpact ? \`<p><strong>Влияние на личную жизнь:</strong> \${data.lifeImpact}</p>\` : ''}
            \${data.costOfInaction ? \`<p><strong>Цена бездействия:</strong> \${formatCurrency(parseFloat(data.costOfInaction))}/мес</p>\` : ''}
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #16a34a; font-size: 18px; margin-bottom: 15px;">🎯 Видение и ожидания</h2>
            \${data.idealSituation ? \`<p><strong>Идеальная ситуация:</strong> \${data.idealSituation}</p>\` : ''}
            \${data.successCriteria ? \`<p><strong>Критерии успеха:</strong> \${data.successCriteria}</p>\` : ''}
            \${data.readyToInvest ? \`<p><strong>Готов инвестировать:</strong> \${data.readyToInvest}</p>\` : ''}
            \${data.readyToImplement ? \`<p><strong>Готов внедрять:</strong> \${data.readyToImplement}</p>\` : ''}
        </div>

        \${objections.length > 0 || data.objectionNotes ? \`
        <div style="background: #fff7ed; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #ea580c; font-size: 18px; margin-bottom: 15px;">🚫 Возражения</h2>
            \${objections.length > 0 ? \`<p><strong>Основные возражения:</strong> \${objections.join(', ')}</p>\` : ''}
            \${data.objectionNotes ? \`<p><strong>Дополнительно:</strong> \${data.objectionNotes}</p>\` : ''}
        </div>\` : ''}

        <div style="background: #e0f2fe; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #0891b2; font-size: 18px; margin-bottom: 15px;">✅ Итоги сессии</h2>
            \${data.sessionResult ? \`<p><strong>Результат:</strong> \${data.sessionResult}</p>\` : ''}
            \${data.nextSteps ? \`<p><strong>Следующие шаги:</strong> \${data.nextSteps}</p>\` : ''}
            \${data.sessionNotes ? \`<p><strong>Дополнительные заметки:</strong> \${data.sessionNotes}</p>\` : ''}
        </div>

        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p>AI-автоматизация отзывов Wildberries | Конфиденциальный документ</p>
            <p>Создано: \${new Date().toLocaleDateString('ru-RU')} \${new Date().toLocaleTimeString('ru-RU')}</p>
        </div>
    </div>
    \`;

    return html;
}

// ===== DEBOUNCE ФУНКЦИЯ =====
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
