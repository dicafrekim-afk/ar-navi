/**
 * A-Frame Custom Component: teleport-on-click
 * Registers a component that enables gaze-based teleportation to marked zones.
 * When a teleport marker is clicked, the camera animates to the destination.
 */

AFRAME.registerComponent('teleport-on-click', {
  init: function () {
    const sceneEl = this.el;

    // Handle click events on teleport markers
    sceneEl.addEventListener('click', (event) => {
      const marker = event.detail.intersection?.object.el;

      if (!marker) return;

      // Check if the clicked element has teleport-marker class
      if (marker.classList.contains('teleport-marker')) {
        const destination = marker.getAttribute('data-destination');
        const label = marker.getAttribute('data-label');

        if (destination) {
          const [x, y, z] = destination.split(' ').map(parseFloat);
          this.teleportCamera(sceneEl, x, y, z, label);
        }
      }
    });
  },

  /**
   * Animate the camera to a new position
   * @param {AEntity} sceneEl - The A-Frame scene element
   * @param {number} x - Target X coordinate
   * @param {number} y - Target Y coordinate
   * @param {number} z - Target Z coordinate
   * @param {string} label - Zone label for console feedback
   */
  teleportCamera: function (sceneEl, x, y, z, label) {
    const camera = sceneEl.querySelector('a-camera');

    if (!camera) return;

    // Get current camera position
    const currentPos = camera.getAttribute('position');

    // Create animation component
    camera.setAttribute(
      'animation',
      `
        property: position;
        from: ${currentPos.x} ${currentPos.y} ${currentPos.z};
        to: ${x} ${y} ${z};
        dur: 1500;
        easing: easeInOutQuad;
      `
    );

    console.log(`Teleporting to ${label} (${x}, ${y}, ${z})`);
  }
});
