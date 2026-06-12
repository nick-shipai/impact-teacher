document.addEventListener("DOMContentLoaded", () => {
  const items = document.querySelectorAll(".reveal-up, .reveal-fade");

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    }
  );

  items.forEach(item => {
    observer.observe(item);
  });
});