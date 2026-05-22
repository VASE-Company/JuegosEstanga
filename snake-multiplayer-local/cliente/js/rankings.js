export async function fetchRankings(email) {
  const response = await fetch(`/api/rankings/snake?email=${encodeURIComponent(email || "")}`);
  if (!response.ok) throw new Error("No se pudieron cargar los rankings.");
  return response.json();
}

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
