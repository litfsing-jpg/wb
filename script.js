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

    // Загружаем сохранённые данные
    loadFormData();

    // Устанавливаем текущую дату по умолчанию
    const sessionDateInput = document.getElementById('sessionDate');
    if (sessionDateInput && !sessionDateInput.value) {
        sessionDateInput.value = new Date().toISOString().split('T')[0];
    }

    console.log('Инициализация завершена');
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
            const element = document.getElementById(key) || document.querySelector(`[name="${key}"]`);

            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = formData[key];
                } else {
                    element.value = formData[key];
                }
            }
        });

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

// ===== ГЕНЕРАЦИЯ PDF =====
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

        // Создаём PDF используя jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Настройки
        let y = 20; // Начальная позиция Y
        const lineHeight = 7;
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const maxWidth = pageWidth - margin * 2;

        // Функция для добавления текста с переносом строк
        function addText(text, isBold = false) {
            if (isBold) {
                doc.setFont('helvetica', 'bold');
            } else {
                doc.setFont('helvetica', 'normal');
            }

            const lines = doc.splitTextToSize(text, maxWidth);

            lines.forEach(line => {
                // Проверяем, не выходим ли за границу страницы
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(line, margin, y);
                y += lineHeight;
            });
        }

        // Функция для добавления секции
        function addSection(title) {
            y += 5;
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(102, 126, 234); // Фиолетовый цвет
            addText(title, true);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            y += 2;
        }

        // Заголовок документа
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        addText('DIAGNOSTIC SESSION REPORT', true);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        addText('AI-Avtomatizaciya otzyvov Wildberries');
        y += 5;

        // БЛОК 1: Основная информация
        addSection('1. OSNOVNAYA INFORMACIYA');
        addText(`Imya klienta: ${formData.clientName || 'N/A'}`);
        addText(`Kontakt: ${formData.contactInfo || 'N/A'}`);
        addText(`Istochnik: ${formData.leadSource || 'N/A'}`);
        addText(`Data sessii: ${formData.sessionDate || new Date().toLocaleDateString()}`);

        // БЛОК 2: Контекст бизнеса
        addSection('2. KONTEKST BIZNESA');
        addText(`Mesyachnyj oborot: ${formData.revenue ? Number(formData.revenue).toLocaleString() + ' RUB' : 'N/A'}`);
        addText(`Otzyvov v mesyac: ${formData.reviewsPerMonth || 'N/A'}`);
        addText(`Tekushchij rejting WB: ${formData.currentRating || 'N/A'}`);
        addText(`Vremya na otzyvy v den': ${formData.timeSpent ? formData.timeSpent + ' chasov' : 'N/A'}`);

        if (formData.currentProcess) {
            addText('Tekushchij process:');
            addText(formData.currentProcess);
        }

        // БЛОК 3: Боли и проблемы
        addSection('3. BOLI I PROBLEMY');

        if (formData.whatTried) {
            addText('Chto probyval ran\'she:');
            addText(formData.whatTried);
        }

        if (formData.whyFailed) {
            addText('Pochemu ne srabotalo:');
            addText(formData.whyFailed);
        }

        if (formData.emotionalPain) {
            addText('Emocional\'naya bol\':');
            addText(formData.emotionalPain);
        }

        if (formData.businessImpact) {
            addText('Vliyanie na biznes:');
            addText(formData.businessImpact);
        }

        if (formData.lifeImpact) {
            addText('Vliyanie na lichnuyu zhizn\':');
            addText(formData.lifeImpact);
        }

        if (formData.costOfInaction) {
            addText(`Cena bezdejstviya: ${Number(formData.costOfInaction).toLocaleString()} RUB/mes`);
        }

        // БЛОК 4: Видение и ожидания
        addSection('4. VIDENIE I OZHIDANIYA');

        if (formData.idealSituation) {
            addText('Ideal\'naya situaciya:');
            addText(formData.idealSituation);
        }

        if (formData.successCriteria) {
            addText('Kriterii uspekha:');
            addText(formData.successCriteria);
        }

        addText(`Gotov investirovat\': ${formData.readyToInvest || 'N/A'}`);
        addText(`Gotov vnedryat\': ${formData.readyToImplement || 'N/A'}`);

        // БЛОК 5: Возражения
        addSection('5. VOZRAZHENIYA');

        const objections = [];
        if (formData.objection_ai_mistake) objections.push('AI napishet ne to');
        if (formData.objection_cant_setup) objections.push('Ne smogu nastroit\'');
        if (formData.objection_service_close) objections.push('Servis zakroetsya');
        if (formData.objection_legal) objections.push('Eto legal\'no?');
        if (formData.objection_buyers_notice) objections.push('Pokupateli pojmut');
        if (formData.objection_price) objections.push('Dorogo');

        if (objections.length > 0) {
            addText('Osnovnye vozrazheniya:');
            objections.forEach(obj => addText(`- ${obj}`));
        }

        if (formData.objectionNotes) {
            addText('Dopolnitel\'nye vozrazheniya:');
            addText(formData.objectionNotes);
        }

        // БЛОК 6: Итоги
        addSection('6. ITOGI SESSII');
        addText(`Rezul\'tat: ${formData.sessionResult || 'N/A'}`);

        if (formData.nextSteps) {
            addText('Sleduyushchie shagi:');
            addText(formData.nextSteps);
        }

        if (formData.sessionNotes) {
            addText('Dopolnitel\'nye zametki:');
            addText(formData.sessionNotes);
        }

        // ROI Calculation
        if (formData.revenue && formData.timeSpent) {
            addSection('7. ROI RASCHET');
            const monthlyTimeCost = Number(formData.timeSpent) * 30 * 500; // 500 RUB/час
            const savings = monthlyTimeCost - 5000; // Минус подписка

            addText(`Mesyachnye zatraty vremeni: ${monthlyTimeCost.toLocaleString()} RUB`);
            addText(`Stoimost\' podpiski: 5,000 RUB`);
            addText(`Mesyachnaya ekonomiya: ${savings.toLocaleString()} RUB`);
            addText(`Srok okupaemosti: ${Math.ceil(15000 / savings)} mes`);
        }

        // Футер
        y = doc.internal.pageSize.getHeight() - 20;
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('AI Avtomatizaciya otzyvov Wildberries | Confidencial\'nyj dokument', margin, y);

        // Сохраняем PDF
        const fileName = `diagnostic-session-${formData.clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);

        console.log('PDF успешно создан:', fileName);

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

// ===== УТИЛИТЫ =====

// Форматирование чисел
function formatNumber(num) {
    if (!num) return 'N/A';
    return Number(num).toLocaleString('ru-RU');
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

console.log('script.js загружен успешно');
