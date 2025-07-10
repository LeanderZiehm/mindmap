// Main MindMap class
class MindMap {
  constructor() {
    this.nodes = new Map();
    this.connections = new Map();
    this.nextNodeId = 1;
    this.nextConnectionId = 1;

    this.viewport = document.getElementById("viewport");
    this.canvas = document.getElementById("canvas");
    this.svg = document.querySelector("#connections svg");

    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;

    this.isDragging = false;
    this.isConnecting = false;
    this.dragTarget = null;
    this.connectingFrom = null;
    this.tempLine = null;

    // Initialize modules
    this.storage = new StorageManager();
    this.ui = new UIManager(this);
    this.events = new EventManager(this);

    this.init();
  }

    async init() {
        this.updateCanvasTransform();
        await this.loadFromStorage();  // ← now awaits
    }


  updateCanvasTransform() {
    this.canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
  }

  createNode(x, y, text = "New Node") {
    const nodeId = "node-" + this.nextNodeId++;
    const node = document.createElement("div");
    node.className = "node";
    node.dataset.nodeId = nodeId;
    node.style.left = x + "px";
    node.style.top = y + "px";

    const content = document.createElement("div");
    content.className = "node-content";
    content.contentEditable = true;
    content.textContent = text;

    node.appendChild(content);

    content.addEventListener("click", (e) => {
      e.stopPropagation();
      content.focus();
    });

    content.addEventListener("blur", () => {
      this.saveToStorage();
    });

    this.canvas.appendChild(node);
    this.nodes.set(nodeId, {
      id: nodeId,
      x: x,
      y: y,
      text: text,
      element: node,
    });

    this.saveToStorage();
    return node;
  }

  deleteNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node) {
      // Delete all connections involving this node
      this.connections.forEach((connection, connectionId) => {
        if (connection.from === nodeId || connection.to === nodeId) {
          this.deleteConnection(connectionId);
        }
      });

      // Remove the node
      node.element.remove();
      this.nodes.delete(nodeId);
      this.saveToStorage();
    }
  }

  startConnection(node) {
    this.isConnecting = true;
    this.connectingFrom = node;
    node.classList.add("selected");

    const rect = node.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    this.tempLine = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "line"
    );
    this.tempLine.classList.add("temp-line");
    this.tempLine.setAttribute("x1", centerX);
    this.tempLine.setAttribute("y1", centerY);
    this.tempLine.setAttribute("x2", centerX);
    this.tempLine.setAttribute("y2", centerY);
    this.svg.appendChild(this.tempLine);
  }

  updateTempLine(x, y) {
    if (this.tempLine) {
      this.tempLine.setAttribute("x2", x);
      this.tempLine.setAttribute("y2", y);
    }
  }

  endConnection() {
    this.isConnecting = false;
    if (this.connectingFrom) {
      this.connectingFrom.classList.remove("selected");
      this.connectingFrom = null;
    }
    if (this.tempLine) {
      this.tempLine.remove();
      this.tempLine = null;
    }
  }

  createConnection(fromNode, toNode) {
    const fromId = fromNode.dataset.nodeId;
    const toId = toNode.dataset.nodeId;

    // Check if connection already exists
    for (const [id, connection] of this.connections) {
      if (
        (connection.from === fromId && connection.to === toId) ||
        (connection.from === toId && connection.to === fromId)
      ) {
        return;
      }
    }

    const connectionId = "connection-" + this.nextConnectionId++;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add("connection-line");
    line.dataset.connectionId = connectionId;

    this.svg.appendChild(line);

    this.connections.set(connectionId, {
      id: connectionId,
      from: fromId,
      to: toId,
      element: line,
    });

    this.updateConnection(connectionId);
    this.saveToStorage();
  }

  deleteConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.element.remove();
      this.connections.delete(connectionId);
      this.saveToStorage();
    }
  }

  updateConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const fromNode = this.nodes.get(connection.from);
    const toNode = this.nodes.get(connection.to);

    if (!fromNode || !toNode) {
      this.deleteConnection(connectionId);
      return;
    }

    const fromRect = fromNode.element.getBoundingClientRect();
    const toRect = toNode.element.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    const fromX =
      (fromRect.left + fromRect.width / 2 - canvasRect.left) / this.scale;
    const fromY =
      (fromRect.top + fromRect.height / 2 - canvasRect.top) / this.scale;
    const toX = (toRect.left + toRect.width / 2 - canvasRect.left) / this.scale;
    const toY = (toRect.top + toRect.height / 2 - canvasRect.top) / this.scale;

    connection.element.setAttribute("x1", fromX);
    connection.element.setAttribute("y1", fromY);
    connection.element.setAttribute("x2", toX);
    connection.element.setAttribute("y2", toY);
  }

  startDragging(node, event) {
    this.isDragging = true;
    this.dragTarget = node;
    node.classList.add("dragging");
    this.viewport.classList.add("dragging");
  }

  updateNodePosition(node, deltaX, deltaY) {
    const currentX = parseFloat(node.style.left || 0);
    const currentY = parseFloat(node.style.top || 0);
    node.style.left = currentX + deltaX / this.scale + "px";
    node.style.top = currentY + deltaY / this.scale + "px";

    this.updateConnections(node.dataset.nodeId);
  }

  endDragging() {
    if (this.dragTarget) {
      this.dragTarget.classList.remove("dragging");
      this.dragTarget = null;
    }
    this.isDragging = false;
    this.viewport.classList.remove("dragging");
    this.saveToStorage();
  }

  startPanning(event) {
    this.isDragging = true;
    this.viewport.classList.add("dragging");
  }

  updatePan(deltaX, deltaY) {
    this.translateX += deltaX;
    this.translateY += deltaY;
    this.updateCanvasTransform();
  }

  endPanning() {
    this.isDragging = false;
    this.viewport.classList.remove("dragging");
    this.saveToStorage();
  }

  zoom(scaleFactor, centerX, centerY) {
    const rect = this.viewport.getBoundingClientRect();
    const offsetX = centerX - rect.left;
    const offsetY = centerY - rect.top;

    const newScale = Math.max(0.1, Math.min(5, this.scale * scaleFactor));
    const scaleChange = newScale / this.scale;

    this.translateX = offsetX - (offsetX - this.translateX) * scaleChange;
    this.translateY = offsetY - (offsetY - this.translateY) * scaleChange;
    this.scale = newScale;

    this.updateCanvasTransform();
    this.updateAllConnections();
  }

  updateConnections(nodeId) {
    this.connections.forEach((connection, connectionId) => {
      if (connection.from === nodeId || connection.to === nodeId) {
        this.updateConnection(connectionId);
      }
    });
  }

  updateAllConnections() {
    this.connections.forEach((connection, connectionId) => {
      this.updateConnection(connectionId);
    });
  }

  // Data management methods
  exportData() {
    const data = this.getDataObject();
    this.storage.exportToFile(data);
  }

  importData() {
    this.storage.importFromFile((data) => {
      this.loadData(data);
    });
  }

  getDataObject() {
    return {
      nodes: Array.from(this.nodes.values()).map((node) => ({
        id: node.id,
        x: parseFloat(node.element.style.left),
        y: parseFloat(node.element.style.top),
        text: node.element.querySelector(".node-content").textContent,
      })),
      connections: Array.from(this.connections.values()).map((connection) => ({
        id: connection.id,
        from: connection.from,
        to: connection.to,
      })),
      view: {
        scale: this.scale,
        translateX: this.translateX,
        translateY: this.translateY,
      },
    };
  }

  loadData(data) {
    console.log("Loading data:", data);
    this.clearAll();

    // Load view settings
    if (data.view) {
      this.scale = data.view.scale || 1;
      this.translateX = data.view.translateX || 0;
      this.translateY = data.view.translateY || 0;
      this.updateCanvasTransform();
    }

    // Load nodes
    if (data.nodes) {
      data.nodes.forEach((nodeData) => {
        const node = this.createNode(nodeData.x, nodeData.y, nodeData.text);
        node.dataset.nodeId = nodeData.id;
        this.nodes.set(nodeData.id, {
          id: nodeData.id,
          x: nodeData.x,
          y: nodeData.y,
          text: nodeData.text,
          element: node,
        });
      });
    }

    // Load connections
    if (data.connections) {
      data.connections.forEach((connectionData) => {
        const fromNode = this.nodes.get(connectionData.from);
        const toNode = this.nodes.get(connectionData.to);
        if (fromNode && toNode) {
          this.createConnection(fromNode.element, toNode.element);
        }
      });
    }

    this.saveToStorage();
  }

  clearAll() {
    this.nodes.clear();
    this.connections.clear();
    this.canvas.innerHTML = '<div id="connections"><svg></svg></div>';
    this.svg = document.querySelector("#connections svg");
    this.saveToStorage();
  }

  resetView() {
    this.scale = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updateCanvasTransform();
    this.updateAllConnections();
  }

  saveToStorage() {
    const data = this.getDataObject();
    this.storage.save(data);
  }

  async loadFromStorage() {
    console.log("Loading data from storage…");
    const data = await this.storage.load(); // ← wait for the promise
    if (data) {
      console.log("Data loaded:", data);
      this.loadData(data);
    }
  }

  // UI delegation methods (called from HTML onclick attributes)
  createNodeFromMenu() {
    this.ui.createNodeFromMenu();
  }

  deleteNodeFromMenu() {
    this.ui.deleteNodeFromMenu();
  }

  showPasteDialog() {
    this.ui.showPasteDialog();
  }

  hidePasteDialog() {
    this.ui.hidePasteDialog();
  }

  createNodeFromPaste() {
    this.ui.createNodeFromPaste();
  }
}
