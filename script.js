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

// ===== ГЕНЕРАЦИЯ PDF =====
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

        // Проверяем что html2pdf загружен
        if (typeof html2pdf === 'undefined') {
            throw new Error('html2pdf не загружен. Проверьте интернет-соединение.');
        }

        // Создаём элемент для PDF
        const element = document.createElement('div');
        element.style.width = '210mm';
        element.style.padding = '20px';
        element.style.backgroundColor = 'white';
        element.style.fontFamily = 'Arial, sans-serif';

        // Генерируем полный HTML
        element.innerHTML = generateFullPDFHTML(formData);

        document.body.appendChild(element);
        console.log('Элемент создан и добавлен в DOM');

        const opt = {
            margin: 10,
            filename: `diagnostic-session-${formData.clientName.replace(/\s+/g, '-')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        console.log('Запускаем html2pdf...');
        await html2pdf().set(opt).from(element).save();
        console.log('PDF создан успешно!');

        document.body.removeChild(element);

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

// ===== ГЕНЕРАЦИЯ ПОЛНОГО HTML ДЛЯ PDF =====
function generateFullPDFHTML(data) {
    // Расчёт калькулятора
    const revenue = parseFloat(data.revenue) || 0;
    const reviewsPerMonth = parseFloat(data.reviewsPerMonth) || 0;
    const currentRating = parseFloat(data.currentRating) || 0;
    const timeSpent = parseFloat(data.timeSpent) || 0;

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

    return `
        <div style="max-width: 800px; margin: 0 auto;">
            <h1 style="color: #667eea; text-align: center; margin-bottom: 5px;">ОТЧЁТ ДИАГНОСТИЧЕСКОЙ СЕССИИ</h1>
            <p style="text-align: center; color: #64748b; margin-bottom: 30px; font-size: 14px;">AI-автоматизация отзывов Wildberries</p>

            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h2 style="color: #667eea; font-size: 16px; margin: 0 0 10px 0;">📋 Основная информация</h2>
                <p style="margin: 5px 0;"><strong>Имя клиента:</strong> ${data.clientName || 'Не указано'}</p>
                <p style="margin: 5px 0;"><strong>Контакт:</strong> ${data.contactInfo || 'Не указано'}</p>
                <p style="margin: 5px 0;"><strong>Источник:</strong> ${data.leadSource || 'Не указано'}</p>
                <p style="margin: 5px 0;"><strong>Дата сессии:</strong> ${data.sessionDate || new Date().toLocaleDateString('ru-RU')}</p>
            </div>

            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h2 style="color: #667eea; font-size: 16px; margin: 0 0 10px 0;">💼 Контекст бизнеса</h2>
                <p style="margin: 5px 0;"><strong>Месячный оборот:</strong> ${formatCurrency(revenue)}</p>
                <p style="margin: 5px 0;"><strong>Отзывов в месяц:</strong> ${reviewsPerMonth || 'Не указано'}</p>
                <p style="margin: 5px 0;"><strong>Текущий рейтинг WB:</strong> ${currentRating || 'Не указано'}</p>
                <p style="margin: 5px 0;"><strong>Время на отзывы в день:</strong> ${timeSpent ? timeSpent + ' ч.' : 'Не указано'}</p>
                ${data.currentProcess ? `<p style="margin: 5px 0;"><strong>Текущий процесс:</strong> ${data.currentProcess}</p>` : ''}
            </div>

            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #dc2626;">
                <h2 style="color: #dc2626; font-size: 16px; margin: 0 0 10px 0;">💸 Калькулятор потерь</h2>
                <p style="margin: 5px 0;"><strong>Потери времени:</strong> ${formatCurrency(timeLoss)}/мес</p>
                <p style="margin: 5px 0;"><strong>Потери из-за низкого рейтинга:</strong> ${formatCurrency(ratingLoss)}/мес</p>
                <p style="margin: 5px 0;"><strong>Штрафы WB:</strong> ${formatCurrency(penalties)}/мес</p>
                <p style="margin: 5px 0;"><strong>Упущенная прибыль:</strong> ${formatCurrency(lostProfit)}/мес</p>
                <p style="font-size: 18px; font-weight: bold; color: #dc2626; margin: 10px 0 0 0;">ОБЩИЕ ПОТЕРИ: ${formatCurrency(totalLoss)}/мес</p>
            </div>

            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #16a34a;">
                <h2 style="color: #16a34a; font-size: 16px; margin: 0 0 10px 0;">📊 ROI от внедрения</h2>
                <p style="margin: 5px 0;"><strong>Экономия в месяц:</strong> ${formatCurrency(monthlySavings)}</p>
                <p style="margin: 5px 0;"><strong>Окупаемость:</strong> ${paybackMonths > 0 ? paybackMonths + ' мес' : 'Не окупается'}</p>
                <p style="margin: 5px 0;"><strong>Прибыль за 6 месяцев:</strong> ${formatCurrency(sixMonthProfit)}</p>
                <p style="margin: 5px 0;"><strong>Прибыль за год:</strong> ${formatCurrency(yearProfit)}</p>
            </div>

            ${data.whatTried || data.whyFailed || data.emotionalPain || data.businessImpact || data.lifeImpact || data.costOfInaction ? `
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h2 style="color: #dc2626; font-size: 16px; margin: 0 0 10px 0;">😰 Боли и проблемы</h2>
                ${data.whatTried ? `<p style="margin: 5px 0;"><strong>Что пробовал:</strong> ${data.whatTried}</p>` : ''}
                ${data.whyFailed ? `<p style="margin: 5px 0;"><strong>Почему не сработало:</strong> ${data.whyFailed}</p>` : ''}
                ${data.emotionalPain ? `<p style="margin: 5px 0;"><strong>Эмоциональная боль:</strong> ${data.emotionalPain}</p>` : ''}
                ${data.businessImpact ? `<p style="margin: 5px 0;"><strong>Влияние на бизнес:</strong> ${data.businessImpact}</p>` : ''}
                ${data.lifeImpact ? `<p style="margin: 5px 0;"><strong>Влияние на жизнь:</strong> ${data.lifeImpact}</p>` : ''}
                ${data.costOfInaction ? `<p style="margin: 5px 0;"><strong>Цена бездействия:</strong> ${formatCurrency(parseFloat(data.costOfInaction))}/мес</p>` : ''}
            </div>` : ''}

            ${data.idealSituation || data.successCriteria || data.readyToInvest || data.readyToImplement ? `
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h2 style="color: #16a34a; font-size: 16px; margin: 0 0 10px 0;">🎯 Видение и ожидания</h2>
                ${data.idealSituation ? `<p style="margin: 5px 0;"><strong>Идеальная ситуация:</strong> ${data.idealSituation}</p>` : ''}
                ${data.successCriteria ? `<p style="margin: 5px 0;"><strong>Критерии успеха:</strong> ${data.successCriteria}</p>` : ''}
                ${data.readyToInvest ? `<p style="margin: 5px 0;"><strong>Готов инвестировать:</strong> ${data.readyToInvest}</p>` : ''}
                ${data.readyToImplement ? `<p style="margin: 5px 0;"><strong>Готов внедрять:</strong> ${data.readyToImplement}</p>` : ''}
            </div>` : ''}

            ${objections.length > 0 || data.objectionNotes ? `
            <div style="background: #fff7ed; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h2 style="color: #ea580c; font-size: 16px; margin: 0 0 10px 0;">🚫 Возражения</h2>
                ${objections.length > 0 ? `<p style="margin: 5px 0;"><strong>Основные:</strong> ${objections.join(', ')}</p>` : ''}
                ${data.objectionNotes ? `<p style="margin: 5px 0;"><strong>Дополнительно:</strong> ${data.objectionNotes}</p>` : ''}
            </div>` : ''}

            ${data.sessionResult || data.nextSteps || data.sessionNotes ? `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <h2 style="color: #0891b2; font-size: 16px; margin: 0 0 10px 0;">✅ Итоги сессии</h2>
                ${data.sessionResult ? `<p style="margin: 5px 0;"><strong>Результат:</strong> ${data.sessionResult}</p>` : ''}
                ${data.nextSteps ? `<p style="margin: 5px 0;"><strong>Следующие шаги:</strong> ${data.nextSteps}</p>` : ''}
                ${data.sessionNotes ? `<p style="margin: 5px 0;"><strong>Заметки:</strong> ${data.sessionNotes}</p>` : ''}
            </div>` : ''}

            <div style="text-align: center; color: #94a3b8; font-size: 11px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 3px 0;">AI-автоматизация отзывов Wildberries | Конфиденциальный документ</p>
                <p style="margin: 3px 0;">Создано: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}</p>
            </div>
        </div>
    `;
}

// ===== ГЕНЕРАЦИЯ HTML ДЛЯ PDF (старая функция, не используется) =====
function generatePDFHTML(data) {
    const revenue = parseFloat(data.revenue) || 0;
    const reviewsPerMonth = parseFloat(data.reviewsPerMonth) || 0;
    const currentRating = parseFloat(data.currentRating) || 0;
    const timeSpent = parseFloat(data.timeSpent) || 0;

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

    const objections = [];
    if (data.objection_ai_mistake) objections.push('AI напишет не то');
    if (data.objection_cant_setup) objections.push('Не смогу настроить');
    if (data.objection_service_close) objections.push('Сервис закроется');
    if (data.objection_legal) objections.push('Это легально?');
    if (data.objection_buyers_notice) objections.push('Покупатели поймут');
    if (data.objection_price) objections.push('Дорого');

    return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #667eea; text-align: center; margin-bottom: 10px;">ОТЧЁТ ДИАГНОСТИЧЕСКОЙ СЕССИИ</h1>
        <p style="text-align: center; color: #64748b; margin-bottom: 30px;">AI-автоматизация отзывов Wildberries</p>

        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #667eea; font-size: 18px; margin-bottom: 15px;">📋 Основная информация</h2>
            <p><strong>Имя клиента:</strong> ${data.clientName || 'Не указано'}</p>
            <p><strong>Контакт:</strong> ${data.contactInfo || 'Не указано'}</p>
            <p><strong>Источник:</strong> ${data.leadSource || 'Не указано'}</p>
            <p><strong>Дата сессии:</strong> ${data.sessionDate || new Date().toLocaleDateString('ru-RU')}</p>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #667eea; font-size: 18px; margin-bottom: 15px;">💼 Контекст бизнеса</h2>
            <p><strong>Месячный оборот:</strong> ${formatCurrency(revenue)}</p>
            <p><strong>Отзывов в месяц:</strong> ${reviewsPerMonth || 'Не указано'}</p>
            <p><strong>Текущий рейтинг WB:</strong> ${currentRating || 'Не указано'}</p>
            <p><strong>Время на отзывы в день:</strong> ${timeSpent ? timeSpent + ' часов' : 'Не указано'}</p>
            ${data.currentProcess ? `<p><strong>Текущий процесс:</strong> ${data.currentProcess}</p>` : ''}
        </div>

        <div style="background: #fef2f2; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #dc2626;">
            <h2 style="color: #dc2626; font-size: 18px; margin-bottom: 15px;">💸 Калькулятор потерь</h2>
            <p><strong>Потери времени:</strong> ${formatCurrency(timeLoss)}/мес</p>
            <p><strong>Потери из-за низкого рейтинга:</strong> ${formatCurrency(ratingLoss)}/мес</p>
            <p><strong>Штрафы WB:</strong> ${formatCurrency(penalties)}/мес</p>
            <p><strong>Упущенная прибыль:</strong> ${formatCurrency(lostProfit)}/мес</p>
            <p style="font-size: 20px; font-weight: bold; color: #dc2626; margin-top: 10px;">ОБЩИЕ ПОТЕРИ: ${formatCurrency(totalLoss)}/мес</p>
        </div>

        <div style="background: #f0fdf4; padding: 15px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #16a34a;">
            <h2 style="color: #16a34a; font-size: 18px; margin-bottom: 15px;">📊 ROI от внедрения</h2>
            <p><strong>Экономия в месяц:</strong> ${formatCurrency(monthlySavings)}</p>
            <p><strong>Окупаемость:</strong> ${paybackMonths > 0 ? paybackMonths + ' мес' : 'Не окупается'}</p>
            <p><strong>Прибыль за 6 месяцев:</strong> ${formatCurrency(sixMonthProfit)}</p>
            <p><strong>Прибыль за год:</strong> ${formatCurrency(yearProfit)}</p>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #dc2626; font-size: 18px; margin-bottom: 15px;">😰 Боли и проблемы</h2>
            ${data.whatTried ? `<p><strong>Что пробовал раньше:</strong> ${data.whatTried}</p>` : ''}
            ${data.whyFailed ? `<p><strong>Почему не сработало:</strong> ${data.whyFailed}</p>` : ''}
            ${data.emotionalPain ? `<p><strong>Эмоциональная боль:</strong> ${data.emotionalPain}</p>` : ''}
            ${data.businessImpact ? `<p><strong>Влияние на бизнес:</strong> ${data.businessImpact}</p>` : ''}
            ${data.lifeImpact ? `<p><strong>Влияние на личную жизнь:</strong> ${data.lifeImpact}</p>` : ''}
            ${data.costOfInaction ? `<p><strong>Цена бездействия:</strong> ${formatCurrency(parseFloat(data.costOfInaction))}/мес</p>` : ''}
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #16a34a; font-size: 18px; margin-bottom: 15px;">🎯 Видение и ожидания</h2>
            ${data.idealSituation ? `<p><strong>Идеальная ситуация:</strong> ${data.idealSituation}</p>` : ''}
            ${data.successCriteria ? `<p><strong>Критерии успеха:</strong> ${data.successCriteria}</p>` : ''}
            ${data.readyToInvest ? `<p><strong>Готов инвестировать:</strong> ${data.readyToInvest}</p>` : ''}
            ${data.readyToImplement ? `<p><strong>Готов внедрять:</strong> ${data.readyToImplement}</p>` : ''}
        </div>

        ${objections.length > 0 || data.objectionNotes ? `
        <div style="background: #fff7ed; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #ea580c; font-size: 18px; margin-bottom: 15px;">🚫 Возражения</h2>
            ${objections.length > 0 ? `<p><strong>Основные возражения:</strong> ${objections.join(', ')}</p>` : ''}
            ${data.objectionNotes ? `<p><strong>Дополнительно:</strong> ${data.objectionNotes}</p>` : ''}
        </div>` : ''}

        <div style="background: #e0f2fe; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #0891b2; font-size: 18px; margin-bottom: 15px;">✅ Итоги сессии</h2>
            ${data.sessionResult ? `<p><strong>Результат:</strong> ${data.sessionResult}</p>` : ''}
            ${data.nextSteps ? `<p><strong>Следующие шаги:</strong> ${data.nextSteps}</p>` : ''}
            ${data.sessionNotes ? `<p><strong>Дополнительные заметки:</strong> ${data.sessionNotes}</p>` : ''}
        </div>

        <div style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p>AI-автоматизация отзывов Wildberries | Конфиденциальный документ</p>
            <p>Создано: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU')}</p>
        </div>
    </div>
    `;
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
