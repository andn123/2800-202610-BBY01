document.querySelectorAll(".team-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".team-card").forEach((c) => {
      if (c !== card) c.classList.remove("flipped");
    });
    card.classList.toggle("flipped");
  });
});
