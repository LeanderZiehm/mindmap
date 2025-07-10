class StorageManager {
    constructor(useServer = true) {
        this.useServer = useServer;
        this.storageKey = 'mindmap-data';
        this.apiBase = '/api/storage';
    }

    async save(data) {
        console.log('Saving data:', data);
        if (this.useServer) {
            try {
                const response = await fetch(`${this.apiBase}/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
                if (!response.ok) throw new Error('Server save failed');
                console.log('Data saved to server');
            } catch (error) {
                console.error('Error saving to server:', error);
            }
        } else {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(data));
                console.log('Data saved locally');
            } catch (error) {
                console.error('Error saving to local storage:', error);
            }
        }
    }

    async load() {
        if (this.useServer) {
            try {
                const response = await fetch(`${this.apiBase}/load`);
                if (!response.ok) throw new Error('Server load failed');
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Error loading from server:', error);
                return null;
            }
        } else {
            try {
                const data = localStorage.getItem(this.storageKey);
                return data ? JSON.parse(data) : null;
            } catch (error) {
                console.error('Error loading from local storage:', error);
                return null;
            }
        }
    }

    exportToFile(data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mindmap-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importFromFile(callback) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        callback(data);
                    } catch (error) {
                        alert('Error loading file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    setUseServer(value) {
        this.useServer = value;
    }
}
