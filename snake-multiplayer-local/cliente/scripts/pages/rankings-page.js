import { getCurrentUser } from "../core/auth.js";
import { fetchRankings, renderRanking } from "../core/rankings.js";

const user = getCurrentUser();
const userEmail = document.getElementById("rankingsUserEmail");
const personalRanking = document.getElementById("personalRanking");
const generalRanking = document.getElementById("generalRanking");
const refreshButton = document.getElementById("refreshRankingsBtn");

if (!user?.email) {
  window.location.href = "../";
}

userEmail.textContent = user.email;

async function loadRankings() {
  refreshButton.disabled = true;
  try {
    const data = await fetchRankings(user.email);
    renderRanking(personalRanking, data.personalTop3, "Todavia no tenes trofeos.");
    renderRanking(generalRanking, data.generalTop10, "Todavia no hay cazadores en este servidor.");
  } catch {
    renderRanking(personalRanking, [], "No se pudieron cargar los rankings.");
    renderRanking(generalRanking, [], "No se pudieron cargar los rankings.");
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", loadRankings);
loadRankings();
