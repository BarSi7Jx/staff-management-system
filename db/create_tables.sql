-- Полный скрипт для PostgreSQL (Занятие 15)

-- Очистка старых таблиц (если нужно пересоздать)
DROP TABLE IF EXISTS employee_projects CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS positions CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- 1. Справочник отделов
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Справочник должностей
CREATE TABLE positions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    base_salary NUMERIC(10, 2) DEFAULT 0
);

-- 3. Основная таблица сотрудников
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100),
    email VARCHAR(150),
    department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    position_id INTEGER REFERENCES positions(id) ON DELETE SET NULL,
    hire_date DATE DEFAULT CURRENT_DATE
);

-- 4. Справочник проектов
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    start_date DATE,
    budget NUMERIC(15, 2)
);

-- 5. Связующая таблица (многие-ко-многим: сотрудники на проектах)
CREATE TABLE employee_projects (
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    role_in_project VARCHAR(100),
    PRIMARY KEY (employee_id, project_id)
);

-- Начальное наполнение данными
INSERT INTO departments (name) VALUES ('IT-разработка'), ('Аналитика'), ('HR'), ('Маркетинг');
INSERT INTO positions (name) VALUES ('Senior Developer'), ('Junior Analyst'), ('HR-менеджер'), ('Project Manager');

INSERT INTO employees (last_name, first_name, email, department_id, position_id) 
VALUES 
('Сидоров', 'Алексей', 'sidorov@corp.com', 1, 1),
('Петрова', 'Мария', 'petrova@corp.com', 2, 2);