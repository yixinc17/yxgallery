(function () {
  const preview = document.getElementById('preview');
  const hexEl = document.getElementById('hex');
  const hueInput = document.getElementById('hue');
  const presets = document.querySelectorAll('.presets button');

  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = function (n) {
      const k = (n + h / 30) % 12;
      return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    };
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    return '#' + [r, g, b].map(function (x) {
      return x.toString(16).padStart(2, '0');
    }).join('');
  }

  function setColor(hex) {
    preview.style.background = hex;
    hexEl.textContent = hex;
  }

  function updateFromHue() {
    const hex = hslToHex(parseInt(hueInput.value, 10), 70, 50);
    setColor(hex);
  }

  hueInput.addEventListener('input', updateFromHue);

  presets.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setColor(btn.dataset.color);
    });
  });

  updateFromHue();
})();
