const form = document.getElementById('task-form');
const titleInput = document.getElementById('task-title');
const descriptionInput = document.getElementById('task-description');
const submitButton = document.getElementById('task-submit');
const cancelButton = document.getElementById('cancel-edit');
const taskList = document.getElementById('task-list');
const statusMessage = document.getElementById('status-message');
let config;
let editingId = null;
let tasks = [];

function message(text) {
  statusMessage.textContent = text;
}

async function request(path = '', method = 'GET', data) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.tableName}${path}`, {
    method,
    headers: {
      'apikey': config.supabasePublishableKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Request failed: ${response.status}`);
  }
  return response.status === 204 ? [] : response.json();
}

function resetForm() {
  form.reset();
  editingId = null;
  submitButton.textContent = 'Add Task';
  cancelButton.hidden = true;
}

function renderTasks() {
  taskList.replaceChildren();
  if (tasks.length === 0) {
    taskList.textContent = 'No tasks yet.';
    return;
  }
  tasks.forEach(task => {
    const item = document.createElement('div');
    item.className = 'task-item';
    item.dataset.id = task.id;

    const title = document.createElement('h3');
    title.className = 'task-title';
    title.textContent = task.title;

    const description = document.createElement('p');
    description.className = 'task-description';
    description.textContent = task.description || '';

    const status = document.createElement('p');
    status.className = 'task-status';
    status.textContent = task.completed ? 'Completed' : 'Pending';

    const edit = document.createElement('button');
    edit.className = 'edit-task';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => {
      editingId = task.id;
      titleInput.value = task.title;
      descriptionInput.value = task.description || '';
      submitButton.textContent = 'Save Task';
      cancelButton.hidden = false;
      titleInput.focus();
    });

    const toggle = document.createElement('button');
    toggle.className = 'toggle-task';
    toggle.textContent = task.completed ? 'Mark Incomplete' : 'Complete';
    toggle.addEventListener('click', () => changeTask(task.id, { completed: !task.completed }));

    const remove = document.createElement('button');
    remove.className = 'delete-task';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => deleteTask(task.id));

    item.append(title, description, status, edit, toggle, remove);
    taskList.append(item);
  });
}

async function loadTasks() {
  tasks = await request('?select=*&order=id.desc');
  renderTasks();
}

async function changeTask(id, values) {
  try {
    await request(`?id=eq.${id}`, 'PATCH', values);
    await loadTasks();
    message('Task updated.');
  } catch (error) {
    message('Error updating task: ' + error.message);
  }
}

async function deleteTask(id) {
  try {
    await request(`?id=eq.${id}`, 'DELETE');
    if (editingId === id) resetForm();
    await loadTasks();
    message('Task deleted.');
  } catch (error) {
    message('Error deleting task: ' + error.message);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const title = titleInput.value.trim();
  if (!title) return;
  const values = { title, description: descriptionInput.value.trim() };
  submitButton.disabled = true;
  try {
    if (editingId === null) {
      await request('', 'POST', { ...values, completed: false });
    } else {
      await request(`?id=eq.${editingId}`, 'PATCH', values);
    }
    resetForm();
    await loadTasks();
    message('Task saved.');
  } catch (error) {
    message('Error saving task: ' + error.message);
  } finally {
    submitButton.disabled = false;
  }
});

cancelButton.addEventListener('click', resetForm);

async function start() {
  try {
    const response = await fetch('config.json');
    if (!response.ok) throw new Error('Could not load config.json');
    config = await response.json();
    if (!config.supabaseUrl || !config.supabasePublishableKey || config.tableName !== 'tasks') {
      throw new Error('Check config.json');
    }
    await loadTasks();
    message('Tasks loaded.');
  } catch (error) {
    message('Error loading tasks: ' + error.message);
  }
}

start();
