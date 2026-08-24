const SUBJECTS = [
  {name:'General', color:'#5C6478'},
  {name:'Cálculo', color:'#3B6EA5'},
  {name:'Física', color:'#D2603A'},
  {name:'Programación', color:'#2F6F4E'},
  {name:'Historia', color:'#7C5CBF'},
  {name:'Inglés', color:'#B54A65'},
  {name:'Otra', color:'#4A8FA8'}
];

const STORAGE_KEY = 'mis-tareas-universidad';

const subjectSelect = document.getElementById('subjectInput');
SUBJECTS.forEach(s=>{
  const opt = document.createElement('option');
  opt.value = s.name;
  opt.textContent = s.name;
  subjectSelect.appendChild(opt);
});

function colorFor(name){
  const found = SUBJECTS.find(s=>s.name === name);
  if(found) return found.color;
  let hash = 0;
  for(let i=0;i<(name||'').length;i++){ hash = name.charCodeAt(i) + ((hash<<5)-hash); }
  const palette = ['#D2603A','#3B6EA5','#7C5CBF','#2F6F4E','#B54A65','#4A8FA8'];
  return palette[Math.abs(hash) % palette.length];
}

const todayLabel = document.getElementById('todayLabel');
const dateStr = new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' });
todayLabel.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

const binding = document.getElementById('binding');
for(let i=0;i<11;i++){
  const r = document.createElement('div');
  r.className='ring';
  binding.appendChild(r);
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

function addTask(text, subject){
  tasks.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    text,
    subject: subject || 'General',
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

function taskRow(t){
  const li = document.createElement('li');
  li.className = 'task' + (t.done ? ' done' : '');
  li.innerHTML = `
    <button class="stamp-btn" aria-label="${t.done ? 'Marcar como pendiente' : 'Marcar como hecha'}" data-id="${t.id}" data-action="toggle">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12.5L9.5 18L20 6" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="task-body">
      <div class="task-text">${escapeHtml(t.text)}</div>
      <div class="subject-tag"><span class="dot" style="background:${colorFor(t.subject)}"></span>${escapeHtml(t.subject)}</div>
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

  const pending = tasks.filter(t=>!t.done);
  const completed = tasks.filter(t=>t.done);

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
    done.style.padding = '14px 10px';
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
    toggleBtn.style.marginTop = '16px';
    toggleBtn.textContent = showCompleted ? `Ocultar completadas (${completed.length})` : `Ver completadas (${completed.length})`;
    toggleBtn.onclick = () => { showCompleted = !showCompleted; render(); };
    content.appendChild(toggleBtn);

    if(showCompleted){
      const ul2 = document.createElement('ul');
      ul2.className = 'tasks';
      ul2.style.marginTop = '6px';
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
  const text = input.value.trim();
  if(!text) return;
  addTask(text, subjectSelect.value);
  input.value = '';
  input.focus();
});

loadTasks();
