// Este script corre en GitHub Actions (no en el navegador).
// Lee las tareas desde Firebase y arma el HTML del correo.
const https = require('https');
const fs = require('fs');

const dbUrl = process.env.FIREBASE_DB_URL;
if(!dbUrl){
  console.error('Falta la variable de entorno FIREBASE_DB_URL');
  process.exit(1);
}

function get(url){
  return new Promise((resolve, reject)=>{
    https.get(url, res=>{
      let data='';
      res.on('data', c=>data+=c);
      res.on('end', ()=>resolve(data));
    }).on('error', reject);
  });
}

function daysUntil(dueISO, today){
  if(!dueISO) return null;
  const [y,m,d] = dueISO.split('-').map(Number);
  const due = new Date(y, m-1, d);
  return Math.round((due - today) / 86400000);
}

function label(diff){
  if(diff === null) return 'Sin fecha';
  if(diff < 0) return `Venció hace ${Math.abs(diff)} día${Math.abs(diff)===1?'':'s'}`;
  if(diff === 0) return 'Vence hoy';
  if(diff === 1) return 'Vence mañana';
  return `Faltan ${diff} días`;
}

function colorFor(diff){
  if(diff === null) return '#5C6478';
  if(diff < 0) return '#7A1F2B';
  if(diff <= 2) return '#C4342E';
  if(diff <= 5) return '#C97324';
  if(diff <= 10) return '#A98A1F';
  return '#2E7D5B';
}

(async ()=>{
  const raw = await get(`${dbUrl}/tasks.json`);
  let tasksObj = {};
  try{ tasksObj = JSON.parse(raw) || {}; }catch(e){}

  const today = new Date();
  today.setHours(0,0,0,0);

  const pending = Object.values(tasksObj)
    .filter(t => t && !t.done)
    .sort((a,b)=>{
      if(a.due && b.due) return a.due.localeCompare(b.due);
      if(a.due) return -1;
      if(b.due) return 1;
      return 0;
    });

  let rows;
  if(pending.length === 0){
    rows = `<tr><td style="padding:16px;font-family:Arial,sans-serif;color:#333;">🎉 No tienes tareas pendientes. ¡Buen trabajo!</td></tr>`;
  } else {
    rows = pending.map(t=>{
      const diff = daysUntil(t.due, today);
      const color = colorFor(diff);
      return `<tr>
        <td style="padding:9px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:14px;color:#222;">${escapeHtml(t.text)}</td>
        <td style="padding:9px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;font-size:12.5px;font-weight:bold;color:${color};white-space:nowrap;text-align:right;">${label(diff)}</td>
      </tr>`;
    }).join('');
  }

  const html = `
  <div style="max-width:520px;margin:0 auto;font-family:Arial,sans-serif;">
    <h2 style="font-family:Georgia,serif;color:#1D2438;margin-bottom:4px;">📚 Tienes ${pending.length} tarea${pending.length===1?'':'s'} pendiente${pending.length===1?'':'s'}</h2>
    <p style="color:#666;font-size:13px;margin-top:0;">Resumen automático de tu lista de tareas</p>
    <table style="width:100%;border-collapse:collapse;margin-top:10px;">${rows}</table>
    <p style="color:#999;font-size:11px;margin-top:20px;">Este correo se generó automáticamente desde tu lista de tareas.</p>
  </div>`;

  fs.writeFileSync('email-body.html', html);
  console.log(`Correo generado con ${pending.length} tareas pendientes.`);
})();

function escapeHtml(str){
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}
