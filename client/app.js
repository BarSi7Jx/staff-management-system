/**
 * Фронтенд ИС «Учёт сотрудников»
 * Реализует CRUD-операции, фильтрацию и разграничение прав доступа.
 */

const API = "/api";
let editingId = null;

/**
 * Функция для переключения видимости формы добавления/редактирования
 */
function toggleForm(show = true) {
    const formContainer = document.getElementById("add-employee-form");
    if (formContainer) {
        formContainer.style.display = show ? "block" : "none";
    }
}

/**
 * Открывает форму для добавления нового сотрудника
 */
function openAddForm() {
    cancelEdit();
    toggleForm(true);
}

/**
 * Загрузка справочников и заполнение всех <select> (включая фильтры)
 */
async function loadDictionaries() {
    try {
        const [deptsResp, posResp] = await Promise.all([
            fetch(`${API}/departments`),
            fetch(`${API}/positions`)
        ]);
        
        if (!deptsResp.ok || !posResp.ok) throw new Error("Ошибка загрузки данных с сервера");

        const departments = await deptsResp.json();
        const positions = await posResp.json();

        // 1. Заполняем списки в основной форме
        const deptSelect = document.getElementById("department_id");
        const posSelect = document.getElementById("position_id");

        if (deptSelect) {
            deptSelect.innerHTML = '<option value="">-- Выберите отдел --</option>' + 
                departments.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
        }

        if (posSelect) {
            posSelect.innerHTML = '<option value="">-- Выберите должность --</option>' + 
                positions.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
        }

        // 2. Заполняем списки в блоке фильтрации (Поиск)
        const filterDept = document.getElementById("filter-dept");
        const filterPos = document.getElementById("filter-pos");

        if (filterDept) {
            filterDept.innerHTML = '<option value="">Все отделы</option>' + 
                departments.map(d => `<option value="${d.id}">${d.name}</option>`).join("");
        }

        if (filterPos) {
            filterPos.innerHTML = '<option value="">Все должности</option>' + 
                positions.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
        }
            
    } catch (err) {
        console.error("Ошибка загрузки справочников:", err);
    }
}

/**
 * Загрузка списка сотрудников из БД
 */
async function loadEmployees() {
    try {
        const resp = await fetch(`${API}/employees`);
        if (!resp.ok) throw new Error("Не удалось загрузить список сотрудников");
        
        const employees = await resp.json();
        const tbody = document.getElementById("employees-list");
        
        if (!tbody) return;

        if (employees.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Сотрудники не найдены</td></tr>';
            return;
        }

        tbody.innerHTML = employees.map(emp => `
            <tr>
                <td>${emp.id}</td>
                <td>${emp.last_name}</td>
                <td>${emp.first_name || '-'}</td>
                <td>${emp.department_name || 'Не указан'}</td>
                <td>${emp.position_name || 'Не указана'}</td>
                <td>${emp.email || '-'}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editEmployee(${emp.id})">Редактировать</button>
                    <button class="btn-delete" onclick="deleteEmployee(${emp.id})">Удалить</button>
                </td>
            </tr>
        `).join("");

        // Применяем фильтры после отрисовки, если они активны в HTML
        if (typeof window.filterEmployees === 'function') {
            window.filterEmployees();
        }
        
    } catch (err) {
        console.error("Ошибка загрузки сотрудников:", err);
        const tbody = document.getElementById("employees-list");
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="color:red; text-align:center">Ошибка связи с сервером</td></tr>';
        }
    }
}

/**
 * Сохранение (Создание или Обновление) сотрудника
 */
async function saveEmployee(event) {
    event.preventDefault();

    const data = {
        last_name: document.getElementById("last_name").value,
        first_name: document.getElementById("first_name").value,
        email: document.getElementById("email").value,
        department_id: document.getElementById("department_id").value || null,
        position_id: document.getElementById("position_id").value || null
    };

    const url = editingId ? `${API}/employees/${editingId}` : `${API}/employees`;
    const method = editingId ? "PUT" : "POST";

    try {
        const resp = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            cancelEdit();
            await loadEmployees();
        } else {
            const error = await resp.json();
            alert("Ошибка сохранения: " + (error.error || "Неизвестная ошибка"));
        }
    } catch (err) {
        console.error("Ошибка запроса:", err);
        alert("Не удалось связаться с сервером");
    }
}

/**
 * Получение данных сотрудника для редактирования
 */
async function editEmployee(id) {
    try {
        const resp = await fetch(`${API}/employees/${id}`);
        if (!resp.ok) throw new Error("Сотрудник не найден");
        
        const emp = await resp.json();
        
        editingId = id;
        document.getElementById("form-title").innerText = "Редактировать сотрудника";
        document.getElementById("last_name").value = emp.last_name;
        document.getElementById("first_name").value = emp.first_name || "";
        document.getElementById("email").value = emp.email || "";
        document.getElementById("department_id").value = emp.department_id || "";
        document.getElementById("position_id").value = emp.position_id || "";
        
        toggleForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
        console.error("Ошибка получения данных:", err);
    }
}

/**
 * Отмена редактирования и сброс формы
 */
function cancelEdit() {
    editingId = null;
    const formTitle = document.getElementById("form-title");
    const employeeForm = document.getElementById("employee-form");
    
    if (formTitle) formTitle.innerText = "Добавить сотрудника";
    if (employeeForm) employeeForm.reset();
    
    toggleForm(false);
}

/**
 * Удаление сотрудника
 */
async function deleteEmployee(id) {
    if (!confirm("Вы уверены, что хотите удалить этого сотрудника?")) return;
    try {
        const resp = await fetch(`${API}/employees/${id}`, { method: "DELETE" });
        if (resp.ok) {
            await loadEmployees();
        } else {
            alert("Ошибка при удалении");
        }
    } catch (err) {
        console.error("Ошибка удаления:", err);
    }
}

/**
 * Инициализация при загрузке страницы
 */
window.onload = async () => {
    // Подгружаем справочники для всех списков и фильтров
    await loadDictionaries();
    
    // Загружаем основной список
    await loadEmployees();
    
    // Устанавливаем обработчик отправки формы
    const form = document.getElementById("employee-form");
    if (form) {
        form.onsubmit = saveEmployee;
    }

    // Привязываем функцию к кнопке "Добавить" в DOM
    const addBtn = document.getElementById("btn-open-form");
    if (addBtn) {
        addBtn.onclick = openAddForm;
    }
};