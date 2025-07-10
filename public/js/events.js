// Event handling module
class EventManager {
  constructor(mindMap) {
    this.mindMap = mindMap;
    this.viewport = document.getElementById("viewport");
    this.lastMousePos = { x: 0, y: 0 };
    this.touchStartDistance = 0;

    this.setupEventListeners();
  }

  setupEventListeners() {
    // Mouse events
    this.viewport.addEventListener(
      "mousedown",
      this.handleMouseDown.bind(this)
    );
    this.viewport.addEventListener(
      "mousemove",
      this.handleMouseMove.bind(this)
    );
    this.viewport.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.viewport.addEventListener("wheel", this.handleWheel.bind(this));
    this.viewport.addEventListener(
      "dblclick",
      this.handleDoubleClick.bind(this)
    );
    this.viewport.addEventListener(
      "contextmenu",
      this.handleContextMenu.bind(this)
    );

    // Touch events
    this.viewport.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    );
    this.viewport.addEventListener(
      "touchmove",
      this.handleTouchMove.bind(this)
    );
    this.viewport.addEventListener("touchend", this.handleTouchEnd.bind(this));

    // Keyboard events
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("keyup", this.handleKeyUp.bind(this));
  }

handleMouseDown(e) {
    if (e.button === 2) return; // Right-click handled separately

    e.preventDefault();
    this.mindMap.ui.hideContextMenu();

    // New: If the user clicked on background (not a node or input), blur any focused element
    const isClickOnBackground = !e.target.closest('.node') && e.target !== document.activeElement;
    if (isClickOnBackground) {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur();
        }
    }

    this.lastMousePos = { x: e.clientX, y: e.clientY };

    if (e.target.classList.contains('connection-line')) {
        this.mindMap.deleteConnection(e.target.dataset.connectionId);
        return;
    }

    const node = e.target.closest('.node');
    if (node) {
        if (e.ctrlKey || e.metaKey) {
            this.mindMap.startConnection(node);
        } else {
            this.mindMap.startDragging(node, e);
        }
    } else {
        this.mindMap.startPanning(e);
    }
}

  handleMouseMove(e) {
    const deltaX = e.clientX - this.lastMousePos.x;
    const deltaY = e.clientY - this.lastMousePos.y;

    if (this.mindMap.isConnecting) {
      this.mindMap.updateTempLine(e.clientX, e.clientY);
    } else if (this.mindMap.isDragging && this.mindMap.dragTarget) {
      this.mindMap.updateNodePosition(this.mindMap.dragTarget, deltaX, deltaY);
    } else if (this.mindMap.isDragging) {
      this.mindMap.updatePan(deltaX, deltaY);
    }

    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }

  handleMouseUp(e) {
    if (this.mindMap.isConnecting) {
      const targetNode = e.target.closest(".node");
      if (targetNode && targetNode !== this.mindMap.connectingFrom) {
        this.mindMap.createConnection(this.mindMap.connectingFrom, targetNode);
      }
      this.mindMap.endConnection();
    }

    this.mindMap.endDragging();
    this.mindMap.endPanning();
  }

  handleContextMenu(e) {
    e.preventDefault();

    const rect = this.viewport.getBoundingClientRect();
    const contextMenuPos = {
      x: (e.clientX - rect.left - this.mindMap.translateX) / this.mindMap.scale,
      y: (e.clientY - rect.top - this.mindMap.translateY) / this.mindMap.scale,
    };

    const node = e.target.closest(".node");
    this.mindMap.ui.setContextMenuState(contextMenuPos, node);
    this.mindMap.ui.showContextMenu(e.clientX, e.clientY, node);
  }

  handleTouchStart(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.lastMousePos = { x: touch.clientX, y: touch.clientY };

      const node = e.target.closest(".node");
      if (node) {
        this.mindMap.startDragging(node, touch);
      } else {
        this.mindMap.startPanning(touch);
      }
    } else if (e.touches.length === 2) {
      this.touchStartDistance = this.getTouchDistance(e.touches);
    }
  }

  handleTouchMove(e) {
    e.preventDefault();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.lastMousePos.x;
      const deltaY = touch.clientY - this.lastMousePos.y;

      if (this.mindMap.isDragging && this.mindMap.dragTarget) {
        this.mindMap.updateNodePosition(
          this.mindMap.dragTarget,
          deltaX,
          deltaY
        );
      } else if (this.mindMap.isDragging) {
        this.mindMap.updatePan(deltaX, deltaY);
      }

      this.lastMousePos = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2) {
      const currentDistance = this.getTouchDistance(e.touches);
      const scaleFactor = currentDistance / this.touchStartDistance;
      this.mindMap.zoom(scaleFactor, 0, 0);
      this.touchStartDistance = currentDistance;
    }
  }

  handleTouchEnd(e) {
    this.mindMap.endDragging();
    this.mindMap.endPanning();
  }

  handleWheel(e) {
    // Two‑finger swipe on a touch‑pad usually arrives as a wheel event.
    // We’ll treat the *scroll delta* as a request to pan, not to zoom.
    e.preventDefault(); // keep the page from scrolling

    const speed = 0.3; // Adjust this value to change panning speed
    // Scale deltas down a bit so panning speed feels natural.
    const panX = -e.deltaX*speed; // invert so left = move canvas right
    const panY = -e.deltaY*speed; // invert so up   = move canvas down

    this.mindMap.updatePan(panX, panY);
  }

  handleDoubleClick(e) {
    const node = e.target.closest(".node");
    if (!node) {
      const rect = this.viewport.getBoundingClientRect();
      const x =
        (e.clientX - rect.left - this.mindMap.translateX) / this.mindMap.scale;
      const y =
        (e.clientY - rect.top - this.mindMap.translateY) / this.mindMap.scale;
      this.mindMap.createNode(x, y);
    }
  }

  handleKeyDown(e) {
    // Existing Escape handling…
    if (e.key === "Escape") {
      this.mindMap.ui.hideContextMenu();
      this.mindMap.ui.hidePasteDialog();
      return;
    }

    // New: Ctrl/Cmd  +  (+ or -)  => zoom
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
      if (e.key === "+" || e.key === "=") {
        // some layouts use '=' for plus
        e.preventDefault(); // stop browser page‑zoom
        this.mindMap.zoom(1.1, 0, 0); // zoom in around centre
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        this.mindMap.zoom(0.9, 0, 0); // zoom out
      }
    }
  }

  handleKeyUp(e) {
    // Handle key releases if needed
  }

  getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
