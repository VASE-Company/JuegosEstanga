const Rankings = {
  async load(email) {
    if (!email) return;
    const response = await fetch(`/api/rankings/pacman?email=${encodeURIComponent(email)}`);
    const data = await response.json();
    this.render(data);
  },
  render(data) {
    const personal = document.getElementById("personalRanking");
    const general = document.getElementById("generalRanking");
    personal.innerHTML = this.items(data.personalTop3, "Todavia no hay scores personales.");
    general.innerHTML = this.items(data.generalTop10, "Todavia no hay scores generales.");
  },
  items(scores, empty) {
    if (!scores || !scores.length) return `<li>${empty}</li>`;
    return scores
      .map((score) => `<li><strong>${score.score}</strong> - ${score.email} (${score.mode}, ${score.role}, nivel ${score.level})</li>`)
      .join("");
  }
};
