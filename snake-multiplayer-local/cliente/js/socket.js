let socket = null;

export function getSocket() {
  if (!socket) socket = io();
  return socket;
}

export function createRoom(user) {
  return new Promise((resolve) => {
    getSocket().emit("crear-partida-snake", user, resolve);
  });
}

export function joinRoom(user, codigo) {
  return new Promise((resolve) => {
    getSocket().emit("unirse-partida-snake", { user, codigo }, resolve);
  });
}

export function sendSnakeState(codigo, state) {
  getSocket().emit("estado-snake", { codigo, state });
}

export function finishTurn(codigo, score) {
  return new Promise((resolve) => {
    getSocket().emit("finalizar-turno-snake", { codigo, score }, resolve);
  });
}

export function leaveRoom(codigo) {
  if (codigo) getSocket().emit("abandonar-partida", { codigo });
}

export function askRankings(email) {
  getSocket().emit("pedir-rankings", { email });
}
