// UI module for handling user interface interactions
class UIManager {
    constructor(mindMap) {
        this.mindMap = mindMap;
        this.contextMenu = document.getElementById('contextMenu');
        this.pasteDialog = document.getElementById('pasteDialog');
        this.pasteTextarea = document.getElementById('pasteTextarea');
        this.contextMenuPos = { x: 0, y: 0 };
        this.contextMenuTarget = null;
        
        this.initializeUI();
    }

    initializeUI() {
        // Click outside to close context menu
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Paste dialog events
        this.pasteDialog.addEventListener('click', (e) => {
            if (e.target === this.pasteDialog) {
                this.hidePasteDialog();
            }
        });

        // Enter key in paste dialog
        this.pasteTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.createNodeFromPaste();
            }
        });
    }

    showContextMenu(x, y, node) {
        this.hideContextMenu();
        
        // Update context menu items visibility
        const deleteItem = this.contextMenu.querySelector('.danger');
        if (node) {
            deleteItem.style.display = 'flex';
        } else {
            deleteItem.style.display = 'none';
        }
        
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        
        // Adjust position if menu goes off screen
        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = (y - rect.height) + 'px';
        }
    }

    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.contextMenuTarget = null;
    }

    setContextMenuState(pos, target) {
        this.contextMenuPos = pos;
        this.contextMenuTarget = target;
    }

    createNodeFromMenu() {
        this.mindMap.createNode(this.contextMenuPos.x, this.contextMenuPos.y);
        this.hideContextMenu();
    }

    deleteNodeFromMenu() {
        if (this.contextMenuTarget) {
            this.mindMap.deleteNode(this.contextMenuTarget.dataset.nodeId);
        }
        this.hideContextMenu();
    }

    showPasteDialog() {
        this.hideContextMenu();
        this.pasteDialog.style.display = 'flex';
        this.pasteTextarea.value = '';
        this.pasteTextarea.focus();
    }

    hidePasteDialog() {
        this.pasteDialog.style.display = 'none';
    }

    createNodeFromPaste() {
        const text = this.pasteTextarea.value.trim();
        if (text) {
            // Split text by lines and create multiple nodes if needed
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length === 1) {
                // Single line - create one node
                this.mindMap.createNode(this.contextMenuPos.x, this.contextMenuPos.y, text);
            } else {
                // Multiple lines - create multiple nodes
                lines.forEach((line, index) => {
                    const offsetY = index * 80; // Offset each node vertically
                    this.mindMap.createNode(this.contextMenuPos.x, this.contextMenuPos.y + offsetY, line.trim());
                });
            }
        }
        this.hidePasteDialog();
    }
}
