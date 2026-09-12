const stage = document.getElementById("map-stage");
const image = document.getElementById("map-image");
const preview = document.getElementById("preview-pin");
const xInput = document.getElementById("id_x");
const yInput = document.getElementById("id_y");

if (stage && image && xInput && yInput) {
  stage.addEventListener("click", (event) => {
    const rect = image.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right) return;
    if (event.clientY < rect.top || event.clientY > rect.bottom) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    xInput.value = x.toFixed(2);
    yInput.value = y.toFixed(2);

    if (preview) {
      preview.hidden = false;
      preview.style.left = `${x}%`;
      preview.style.top = `${y}%`;
    }
  });
}
