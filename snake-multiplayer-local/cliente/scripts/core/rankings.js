// rankings.js concentra todo lo relacionado con puntajes: pedir tablas,
// guardar una partida individual y pintar listas ordenadas en pantalla.

// Trae el Top 3 personal y el Top 10 general del servidor local.
export async function fetchRankings(email) {
  const response = await fetch(`/api/rankings/snake?email=${encodeURIComponent(email || "")}`);
  if (!response.ok) throw new Error("No se pudieron cargar los rankings.");
  return response.json();
}

// Guarda el puntaje de una partida individual. En multijugador el servidor
// guarda los dos puntajes cuando termina el segundo turno.
export async function saveSingleplayerScore(email, score) {
  const response = await fetch("/api/scores/snake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, score, mode: "singleplayer" })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "No se pudo guardar el score.");
  return data;
}

// Recibe un <ol>, limpia su contenido y crea una fila por puntaje.
// Se usa tanto en el inicio como en el panel lateral del juego.
export function renderRanking(list, scores, emptyText) {
  list.innerHTML = "";
  if (!scores.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyText;
    list.appendChild(li);
    return;
  }
  scores.forEach((score, index) => {
    const li = document.createElement("li");
    const position = document.createElement("strong");
    const email = document.createElement("span");
    const points = document.createElement("strong");
    position.textContent = `#${index + 1}`;
    email.textContent = score.email;
    points.textContent = score.score;
    li.append(position, email, points);
    list.appendChild(li);
  });
}
