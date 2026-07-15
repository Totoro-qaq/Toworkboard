const clock = document.querySelector('.header-side > time');

function updateClock() {
  clock.textContent = new Date(2026, 6, 15, 9, 42, 18).toLocaleTimeString('en-GB');
}

updateClock();

