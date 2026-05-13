var searchInput = document.getElementById("searchInput");
var envSelect = document.getElementById("envSelect");
var postsGrid = document.querySelector(".posts-grid");
var paginationContainer = document.getElementById("paginationContainer");

var typingTimer = null;

function updatePosts() {
  var search = searchInput.value;
  var env = envSelect.value;

  var url =
    "/posts?search=" + encodeURIComponent(search) + "&environment=" + env;

  fetch(url)
    .then(function (response) {
      return response.text();
    })
    .then(function (html) {
      var parser = new DOMParser();
      var doc = parser.parseFromString(html, "text/html");

      // Replace posts
      var newGrid = doc.querySelector(".posts-grid");
      postsGrid.innerHTML = newGrid.innerHTML;

      // Replace pagination
      var newPagination = doc.querySelector("#paginationContainer");
      if (newPagination) {
        paginationContainer.innerHTML = newPagination.innerHTML;
      } else {
        paginationContainer.innerHTML = "";
      }
    });
}

searchInput.addEventListener("input", function () {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(updatePosts, 200);
});

envSelect.addEventListener("change", function () {
  updatePosts();
});

// Like/dislike handler
document.addEventListener("click", function (e) {
  var likeButton = e.target.closest(".like-btn");
  var dislikeButton = e.target.closest(".dislike-btn");

  if (likeButton) {
    var id = likeButton.getAttribute("data-id");

    fetch("/posts/" + id + "/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        likeButton.querySelector("span").textContent = data.likes;
        var other = likeButton.parentNode.querySelector(".dislike-btn span");
        if (other) {
          other.textContent = data.dislikes;
        }
      });
  }

  if (dislikeButton) {
    var id2 = dislikeButton.getAttribute("data-id");

    fetch("/posts/" + id2 + "/dislike", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        dislikeButton.querySelector("span").textContent = data.dislikes;
        var other2 = dislikeButton.parentNode.querySelector(".like-btn span");
        if (other2) {
          other2.textContent = data.likes;
        }
      });
  }
});
