const STORAGE_KEY = 'mis-tareas-universidad';

const todayLabel = document.getElementById('todayLabel');
const today = new Date();
today.setHours(0,0,0,0);
const dateStr = today.toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
todayLabel.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

// fecha mínima seleccionable = hoy
document.getElementById('dateInput').min = toISODate(today);

function toISODate(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function parseISODate(str){
  // 'YYYY-MM-DD' -> Date local, sin desfase de zona horaria
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

function daysUntil(dueISO){
  if(!dueISO) return null;
  const due = parseISODate(dueISO);
  due.setHours(0,0,0,0);
  return Math.round((due - today) / 86400000);
}

function urgencyClass(diff){
  if(diff === null) return 'u-none';
  if(diff < 0) return 'u-overdue';
  if(diff <= 2) return 'u-critical';
  if(diff <= 5) return 'u-soon';
  if(diff <= 10) return 'u-upcoming';
  return 'u-later';
}

function dueLabel(diff, dueISO){
  if(diff === null) return 'Sin fecha';
  if(diff < 0) return `Venció hace ${Math.abs(diff)} día${Math.abs(diff)===1?'':'s'}`;
  if(diff === 0) return 'Vence hoy';
  if(diff === 1) return 'Vence mañana';
  return `En ${diff} días`;
}

let tasks = [];
let showCompleted = false;

function loadTasks(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  }catch(e){
    console.error('No se pudieron leer las tareas guardadas', e);
    tasks = [];
  }
  render();
}

function saveTasks(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }catch(e){
    console.error('No se pudo guardar. ¿Modo incógnito o almacenamiento lleno?', e);
    alert('No se pudo guardar el cambio. Si estás en modo incógnito, tus tareas no persistirán al cerrar la ventana.');
  }
}

function addTask(text, due){
  tasks.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    text,
    due: due || null,
    done: false,
    createdAt: Date.now()
  });
  saveTasks();
  render();
}

function toggleTask(id){
  const t = tasks.find(t=>t.id===id);
  if(t){ t.done = !t.done; t.completedAt = t.done ? Date.now() : null; }
  saveTasks();
  render();
}

function deleteTask(id){
  tasks = tasks.filter(t=>t.id!==id);
  saveTasks();
  render();
}

function sortByDue(list){
  return [...list].sort((a,b)=>{
    if(a.due && b.due) return a.due.localeCompare(b.due);
    if(a.due && !b.due) return -1;
    if(!a.due && b.due) return 1;
    return a.createdAt - b.createdAt;
  });
}

function taskRow(t){
  const diff = daysUntil(t.due);
  const uClass = urgencyClass(diff);
  const li = document.createElement('li');
  li.className = 'task ' + uClass + (t.done ? ' done' : '');
  li.innerHTML = `
    <button class="stamp-btn" aria-label="${t.done ? 'Marcar como pendiente' : 'Marcar como hecha'}" data-id="${t.id}" data-action="toggle">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12.5L9.5 18L20 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="task-body">
      <div class="task-text">${escapeHtml(t.text)}</div>
      <span class="due-badge ${uClass}">${dueLabel(diff, t.due)}</span>
    </div>
    <button class="del-btn" aria-label="Eliminar tarea" data-id="${t.id}" data-action="delete">✕</button>
  `;
  return li;
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function render(){
  const content = document.getElementById('content');
  content.className = '';
  content.innerHTML = '';

  const pending = sortByDue(tasks.filter(t=>!t.done));
  const completed = sortByDue(tasks.filter(t=>t.done));

  if(tasks.length === 0){
    content.innerHTML = `<div class="empty"><div class="big">Página en blanco.</div>Agrega tu primera tarea de hoy arriba.</div>`;
    return;
  }

  const pendingLabel = document.createElement('div');
  pendingLabel.className = 'section-label';
  pendingLabel.textContent = `Pendientes (${pending.length})`;
  content.appendChild(pendingLabel);

  if(pending.length === 0){
    const done = document.createElement('div');
    done.className = 'empty';
    done.style.padding = '20px 10px';
    done.innerHTML = `<div class="big">Todo listo por hoy 🎉</div>`;
    content.appendChild(done);
  } else {
    const ul = document.createElement('ul');
    ul.className = 'tasks';
    pending.forEach(t => ul.appendChild(taskRow(t)));
    content.appendChild(ul);
  }

  if(completed.length > 0){
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-completed';
    toggleBtn.style.marginTop = '10px';
    toggleBtn.textContent = showCompleted ? `Ocultar completadas (${completed.length})` : `Ver completadas (${completed.length})`;
    toggleBtn.onclick = () => { showCompleted = !showCompleted; render(); };
    content.appendChild(toggleBtn);

    if(showCompleted){
      const ul2 = document.createElement('ul');
      ul2.className = 'tasks';
      ul2.style.marginTop = '8px';
      completed.forEach(t => ul2.appendChild(taskRow(t)));
      content.appendChild(ul2);
    }
  }

  content.addEventListener('click', onListClick);
}

function onListClick(e){
  const btn = e.target.closest('button[data-action]');
  if(!btn) return;
  const id = btn.dataset.id;
  if(btn.dataset.action === 'toggle') toggleTask(id);
  if(btn.dataset.action === 'delete') deleteTask(id);
}

document.getElementById('addForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const input = document.getElementById('taskInput');
  const dateInput = document.getElementById('dateInput');
  const text = input.value.trim();
  if(!text) return;
  addTask(text, dateInput.value || null);
  input.value = '';
  dateInput.value = '';
  input.focus();
});

loadTasks();
