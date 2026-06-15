(function () {
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const indicator = document.getElementById('indicator');
  let current = 0;

  function show(index) {
    slides.forEach(function (slide, i) {
      slide.classList.toggle('is-active', i === index);
    });
    indicator.textContent = (index + 1) + ' / ' + slides.length;
    current = index;
  }

  prevBtn.addEventListener('click', function () {
    show(current > 0 ? current - 1 : slides.length - 1);
  });

  nextBtn.addEventListener('click', function () {
    show(current < slides.length - 1 ? current + 1 : 0);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') prevBtn.click();
    if (e.key === 'ArrowRight') nextBtn.click();
  });

  show(0);
})();
