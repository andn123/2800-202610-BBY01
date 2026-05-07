const helpSearch = document.getElementById("helpSearch");
const tutorialSections = document.querySelectorAll(".tutorial-section");
const featureCards = document.querySelectorAll(".feature-card");

helpSearch.addEventListener("input", function () {
  const searchValue = helpSearch.value.toLowerCase().trim();

  tutorialSections.forEach((section) => {
    const title = section.dataset.title.toLowerCase();
    const text = section.innerText.toLowerCase();

    if (title.includes(searchValue) || text.includes(searchValue)) {
      section.classList.remove("hidden");
    } else {
      section.classList.add("hidden");
    }
  });

  featureCards.forEach((card) => {
    const text = card.innerText.toLowerCase();

    if (text.includes(searchValue)) {
      card.classList.remove("hidden");
    } else {
      card.classList.add("hidden");
    }
  });
});