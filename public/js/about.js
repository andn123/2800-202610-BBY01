let click = 0;

document.querySelectorAll(".team-card").forEach((card) => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".team-card").forEach((c) => {
      if (c !== card) c.classList.remove("flipped");
    });
    card.classList.toggle("flipped");
  });
});

document.getElementById("logo").addEventListener("click", () => {
  click++;
  if (click % 5 != 0) return;
  window.location.href = "about_us_easter_egg";
});
