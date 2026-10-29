const express = require('express');
const http = require('node:http');
const path = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));
const usuarios = new Map(); // socket.id -> nombre
const historial = []; // Extra: conservar los últimos 20 mensajes en memoria.

io.on('connection', (socket) => {
  socket.on('entrar', (dato, responder) => {
    const respuesta = typeof responder === 'function' ? responder : () => {};
    if (usuarios.has(socket.id)) return respuesta({ ok: true });
    const nombre = typeof dato === 'string' ? dato.trim() : '';
    if (!nombre || nombre.length > 30) return respuesta({ ok: false, error: 'Usa un nombre de 1 a 30 caracteres.' });
    if ([...usuarios.values()].some(n => n.toLocaleLowerCase() === nombre.toLocaleLowerCase())) {
      return respuesta({ ok: false, error: 'Ese nombre ya está en uso.' });
    }
    usuarios.set(socket.id, nombre);
    socket.emit('historial', historial);
    io.emit('sistema', `${nombre} se unió al chat`);
    io.emit('usuarios', [...usuarios.values()]);
    respuesta({ ok: true });
  });

  socket.on('mensaje', (dato) => {
    const autor = usuarios.get(socket.id); // El autor nunca se toma del mensaje del cliente.
    if (!autor || typeof dato !== 'string') return;
    const texto = dato.trim();
    if (!texto || texto.length > 2000) return;
    const mensaje = { autor, texto, hora: new Date().toISOString() };
    historial.push(mensaje);
    if (historial.length > 20) historial.shift();
    io.emit('mensaje', mensaje); // Incluye a quien envió el mensaje.
  });

  socket.on('escribiendo', () => {
    const nombre = usuarios.get(socket.id);
    if (nombre) socket.broadcast.emit('escribiendo', nombre);
  });

  socket.on('disconnect', () => {
    const nombre = usuarios.get(socket.id);
    if (!nombre) return;
    usuarios.delete(socket.id);
    io.emit('sistema', `${nombre} salió del chat`);
    io.emit('usuarios', [...usuarios.values()]);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Chat: http://localhost:${PORT}`));
