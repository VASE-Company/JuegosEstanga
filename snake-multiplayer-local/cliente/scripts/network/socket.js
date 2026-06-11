// socket.js es una capa fina sobre Socket.IO. El resto del cliente llama
// estas funciones y no necesita recordar los nombres exactos de eventos.
let socket = null;

// Crea una sola conexion Socket.IO y la reutiliza durante toda la sesion.
export function getSocket() {
  if (!socket) socket = io();
  return socket;
}

// Le pide al servidor una sala nueva y devuelve el resultado por callback ack.
export function createRoom(user) {
  return new Promise((resolve) => {
    getSocket().emit("crear-partida-snake", user, resolve);
  });
}

// Intenta entrar a una sala existente usando el codigo que creo otro jugador.
export function joinRoom(user, codigo) {
  return new Promise((resolve) => {
    getSocket().emit("unirse-partida-snake", { user, codigo }, resolve);
  });
}

// Manda el estado del Snake activo para que el rival lo vea en tiempo real.
export function sendSnakeState(codigo, state) {
  getSocket().emit("estado-snake", { codigo, state });
}

// Avisa que el turno termino y espera que el servidor responda si lo acepto.
export function finishTurn(codigo, score) {
  return new Promise((resolve) => {
    getSocket().emit("finalizar-turno-snake", { codigo, score }, resolve);
  });
}

// Sale de una sala activa. El servidor cancela la partida para ambos.
export function leaveRoom(codigo) {
  if (codigo) getSocket().emit("abandonar-partida", { codigo });
}

// Pide rankings actualizados sin recargar la pagina.
export function askRankings(email) {
  getSocket().emit("pedir-rankings", { email });
}
