(() => {
  "use strict";

  const { classify } = globalThis.StepnovMethod;
  const { draw } = globalThis.StepnovFaces;
  for (const figure of document.querySelectorAll("[data-example-order]")) {
    const { face_id, brow_id } = classify(`1e${figure.dataset.exampleOrder}`, 2, "0");
    figure.innerHTML = draw(face_id, brow_id);
  }
})();
