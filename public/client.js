const socket = io();
const $ = (id) => document.getElementById(id);
let miNombre = '';
let temporizador;
let ultimoAviso = 0;

function entrar(nombre) {
  socket.timeout(5000).emit('entrar', nombre, (error, respuesta) => {
    if (error || !respuesta?.ok) {
      $('error').textContent = error ? 'No se pudo entrar. Revisa la conexión.' : respuesta.error;
      $('login').classList.remove('oculto');
      $('chat').classList.add('oculto');
      return;
    }
    miNombre = nombre;
    $('error').textContent = '';
    $('login').classList.add('oculto');
    $('chat').classList.remove('oculto');
    $('input-mensaje').focus();
  });
}
$('form-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const nombre = $('input-nombre').value.trim();
  if (nombre && socket.connected) entrar(nombre);
  else $('error').textContent = 'Escribe un nombre y espera a que conecte el servidor.';
});
$('form-mensaje').addEventListener('submit', (e) => {
  e.preventDefault();
  const texto = $('input-mensaje').value.trim();
  if (!texto || !socket.connected) return;
  socket.emit('mensaje', texto); // Solo texto: el servidor decide el autor.
  $('input-mensaje').value = '';
});
$('input-mensaje').addEventListener('input', () => {
  if (!socket.connected || !miNombre || Date.now() - ultimoAviso < 500) return;
  ultimoAviso = Date.now();
  socket.emit('escribiendo');
});

// Los listeners se registran una sola vez, fuera de los formularios.
socket.on('mensaje', pintarMensaje);
socket.on('historial', (lista) => {
  $('mensajes').replaceChildren();
  lista.forEach(pintarMensaje);
});
socket.on('sistema', (texto) => {
  const li = document.createElement('li');
  li.className = 'sistema';
  li.textContent = texto;
  $('mensajes').append(li);
  $('mensajes').scrollTop = $('mensajes').scrollHeight;
});
socket.on('usuarios', (lista) => {
  $('lista-usuarios').replaceChildren(...lista.map(nombre => {
    const li = document.createElement('li');
    li.textContent = nombre;
    return li;
  }));
  $('cantidad').textContent = lista.length;
  clearTimeout(temporizador);
  $('escribiendo').textContent = '';
});
socket.on('escribiendo', (nombre) => {
  $('escribiendo').textContent = `${nombre} está escribiendo…`;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { $('escribiendo').textContent = ''; }, 1500);
});
socket.on('connect', () => {
  $('estado').textContent = 'En línea';
  $('input-mensaje').disabled = false;
  if (miNombre) entrar(miNombre);
});
socket.on('disconnect', () => {
  $('estado').textContent = 'Sin conexión · reconectando…';
  $('input-mensaje').disabled = true;
  $('lista-usuarios').replaceChildren();
  $('cantidad').textContent = '0';
  clearTimeout(temporizador);
  $('escribiendo').textContent = '';
});

function pintarMensaje({ autor, texto, hora }) {
  const li = document.createElement('li');
  li.className = autor === (miNombre || $('input-nombre').value.trim()) ? 'mensaje propio' : 'mensaje';
  const nombre = document.createElement('span');
  nombre.className = 'autor';
  nombre.textContent = autor;
  const contenido = document.createElement('span');
  contenido.className = 'texto';
  contenido.textContent = texto; // El texto del usuario nunca se interpreta como HTML.
  const tiempo = document.createElement('time');
  tiempo.dateTime = hora;
  tiempo.textContent = new Date(hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  li.append(nombre, contenido, tiempo);
  $('mensajes').append(li);
  $('mensajes').scrollTop = $('mensajes').scrollHeight;
}
