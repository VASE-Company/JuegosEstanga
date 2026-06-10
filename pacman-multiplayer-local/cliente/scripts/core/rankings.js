const Rankings = {
  lastData: null,
  async load(email) {
    if (!email) return;
    const response = await fetch(`/api/rankings/pacman?email=${encodeURIComponent(email)}`);
    const data = await response.json();
    this.lastData = data;
    this.render(data);
    return data;
  },
  render(data = this.lastData) {
    if (!data) return;
    const personal = document.getElementById("personalRanking");
    const general = document.getElementById("generalRanking");
    if (!personal || !general) return;
    personal.innerHTML = this.items(data.personalTop3, "Todavía no hay scores personales.");
    general.innerHTML = this.items(data.generalTop10, "Todavía no hay scores generales.");
  },
  items(scores, empty) {
    if (!scores || !scores.length) return `<li>${empty}</li>`;
    return scores
      .map((score) => {
        const displayName = score.displayName || Preferences.fallbackDisplayName(score.email);
        const meta = `${displayName} · ${score.email} (${score.mode}, ${score.role}, nivel ${score.level})`;
        return `
          <li>
            <span class="rank-score">${score.score}</span>
            <span class="rank-details">${meta}</span>
          </li>
        `;
      })
      .join("");
  }
};
