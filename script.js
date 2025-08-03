class ImageTextExtractor {
    constructor() {
        this.images = [];
        this.results = [];
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        this.imageInput = document.getElementById('imageInput');
        this.imagesContainer = document.getElementById('imagesContainer');
        this.extractBtn = document.getElementById('extractBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.loading = document.getElementById('loading');
        this.statusSection = document.getElementById('statusSection');
        this.statusContainer = document.getElementById('statusContainer');
        this.copyBtn = document.getElementById('copyBtn');
        this.clearResultsBtn = document.getElementById('clearResultsBtn');
        this.hamburgerIcon = document.getElementById('hamburgerIcon');
        this.menuContent = document.getElementById('menuContent');
        this.aboutModal = document.getElementById('aboutModal');
    }

    bindEvents() {
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.extractBtn.addEventListener('click', () => this.extractText());
        this.clearBtn.addEventListener('click', () => this.clearAll());
        this.copyBtn.addEventListener('click', () => this.copyAllText());
        this.clearResultsBtn.addEventListener('click', () => this.clearResults());
        this.hamburgerIcon.addEventListener('click', () => this.toggleMenu());
        
        document.addEventListener('click', (e) => {
            if (!this.hamburgerIcon.contains(e.target) && !this.menuContent.contains(e.target)) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        this.hamburgerIcon.classList.toggle('active');
        this.menuContent.classList.toggle('show');
    }

    closeMenu() {
        this.hamburgerIcon.classList.remove('active');
        this.menuContent.classList.remove('show');
    }

    showAbout() {
        this.closeMenu();
        this.aboutModal.classList.add('show');
    }

    closeModal() {
        this.aboutModal.classList.remove('show');
    }

    openRepo() {
        this.closeMenu();
        window.open('https://github.com/ShiiiivanshSingh/img2txt', '_blank');
    }

    openIssues() {
        this.closeMenu();
        window.open('https://github.com/ShiiiivanshSingh/img2txt/issues', '_blank');
    }

    handleImageUpload(event) {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) return;

        let validFiles = 0;
        let invalidFiles = 0;

        files.forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageData = {
                        id: Date.now() + Math.random(),
                        file: file,
                        src: e.target.result,
                        name: file.name
                    };
                    this.images.push(imageData);
                    this.displayImage(imageData);
                    this.updateExtractButton();
                    validFiles++;
                };
                reader.onerror = () => {
                    this.addStatusMessage(`failed to read ${file.name}`, 'error');
                    invalidFiles++;
                };
                reader.readAsDataURL(file);
            } else {
                this.addStatusMessage(`${file.name} is not a valid image file`, 'error');
                invalidFiles++;
            }
        });

        if (validFiles > 0) {
            this.addStatusMessage(`loaded ${validFiles} image(s)`, 'success');
        }
        if (invalidFiles > 0) {
            this.addStatusMessage(`skipped ${invalidFiles} invalid file(s)`, 'error');
        }
    }

    displayImage(imageData) {
        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        imageItem.dataset.id = imageData.id;
        
        imageItem.innerHTML = `
            <img src="${imageData.src}" alt="${imageData.name}">
            <button class="remove-btn" onclick="extractor.removeImage('${imageData.id}')">×</button>
        `;
        
        this.imagesContainer.appendChild(imageItem);
    }

    removeImage(imageId) {
        this.images = this.images.filter(img => img.id !== imageId);
        const imageElement = document.querySelector(`[data-id="${imageId}"]`);
        if (imageElement) {
            imageElement.remove();
        }
        this.updateExtractButton();
        this.addStatusMessage('image removed', 'success');
    }

    updateExtractButton() {
        this.extractBtn.disabled = this.images.length === 0;
    }

    updateActionButtons() {
        const hasResults = this.results.length > 0;
        this.copyBtn.disabled = !hasResults;
        this.clearResultsBtn.disabled = !hasResults;
    }

    addStatusMessage(message, type = 'processing') {
        const timestamp = new Date().toLocaleTimeString();
        const statusItem = document.createElement('div');
        statusItem.className = `status-item ${type}`;
        statusItem.innerHTML = `
            <span class="timestamp">${timestamp}</span>
            <span class="message">${message}</span>
        `;
        
        this.statusContainer.appendChild(statusItem);
        this.statusContainer.scrollTop = this.statusContainer.scrollHeight;
        
        if (this.statusContainer.children.length > 0) {
            this.statusSection.style.display = 'block';
        }
    }

    async extractText() {
        if (this.images.length === 0) {
            this.addStatusMessage('no images to process', 'error');
            return;
        }

        this.showLoading(true);
        this.results = [];
        this.statusSection.style.display = 'block';
        this.addStatusMessage(`starting text extraction for ${this.images.length} image(s)`, 'processing');

        let successCount = 0;
        let errorCount = 0;

        try {
            for (let i = 0; i < this.images.length; i++) {
                const image = this.images[i];
                this.addStatusMessage(`processing ${image.name} (${i + 1}/${this.images.length})`, 'processing');
                
                try {
                    const result = await this.extractTextFromImage(image);
                    this.results.push({
                        imageName: image.name,
                        text: result
                    });
                    this.addStatusMessage(`completed: ${image.name}`, 'success');
                    successCount++;
                } catch (error) {
                    this.addStatusMessage(`failed: ${image.name} - ${error.message}`, 'error');
                    this.results.push({
                        imageName: image.name,
                        text: '',
                        error: error.message
                    });
                    errorCount++;
                }
            }
            
            this.displayResults();
            this.updateActionButtons();
            
            if (successCount > 0) {
                this.showNotification(`extraction completed: ${successCount} success, ${errorCount} failed`, 'success');
            } else {
                this.showNotification('all extractions failed', 'error');
            }
            
        } catch (error) {
            console.error('extraction error:', error);
            this.addStatusMessage(`critical error: ${error.message}`, 'error');
            this.showNotification('text extraction failed', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async extractTextFromImage(imageData) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('extraction timeout (300s)'));
            }, 300000);

            Tesseract.recognize(
                imageData.src,
                'eng',
                {
                    logger: m => {
                        if (m.status === 'recognizing text') {
                            this.updateLoadingText(`processing ${imageData.name}...`);
                        }
                    }
                }
            ).then(({ data: { text } }) => {
                clearTimeout(timeout);
                resolve(text.trim());
            }).catch(error => {
                clearTimeout(timeout);
                reject(new Error(error.message || 'unknown extraction error'));
            });
        });
    }

    displayResults() {
        this.resultsContainer.innerHTML = '';
        
        if (this.results.length === 0) {
            this.resultsContainer.innerHTML = '<p class="placeholder">no text found</p>';
            return;
        }

        this.results.forEach((result, index) => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';
            
            if (result.error) {
                resultItem.innerHTML = `
                    <h3>${result.imageName} (ERROR)</h3>
                    <div class="error-details">${result.error}</div>
                `;
            } else {
                resultItem.innerHTML = `
                    <h3>${result.imageName}</h3>
                    <div class="text-content">${result.text || 'no text detected'}</div>
                `;
            }
            
            this.resultsContainer.appendChild(resultItem);
            
            if (index < this.results.length - 1) {
                const separator = document.createElement('div');
                separator.className = 'result-separator';
                separator.innerHTML = '<hr>';
                this.resultsContainer.appendChild(separator);
            }
        });
    }

    copyAllText() {
        if (this.results.length === 0) return;

        const allText = this.results
            .filter(result => !result.error && result.text)
            .map((result, index) => {
                const separator = index > 0 ? '\n\n' + '─'.repeat(50) + '\n\n' : '';
                return `${separator}${result.imageName}:\n${result.text}`;
            })
            .join('\n\n');

        if (allText.trim()) {
            navigator.clipboard.writeText(allText).then(() => {
                this.showNotification('text copied to clipboard', 'success');
            }).catch(() => {
                this.showNotification('failed to copy text', 'error');
            });
        } else {
            this.showNotification('no text to copy', 'error');
        }
    }

    clearResults() {
        this.results = [];
        this.resultsContainer.innerHTML = '<p class="placeholder">upload images and click extract to see results</p>';
        this.updateActionButtons();
        this.addStatusMessage('results cleared', 'success');
    }

    showLoading(show) {
        this.loading.style.display = show ? 'flex' : 'none';
        this.extractBtn.disabled = show;
    }

    updateLoadingText(text) {
        const loadingText = this.loading.querySelector('p');
        if (loadingText) {
            loadingText.textContent = text;
        }
    }

    showError(message) {
        this.resultsContainer.innerHTML = `<p class="placeholder">${message}</p>`;
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    clearAll() {
        this.images = [];
        this.results = [];
        this.imagesContainer.innerHTML = '';
        this.resultsContainer.innerHTML = '<p class="placeholder">upload images and click extract to see results</p>';
        this.statusContainer.innerHTML = '';
        this.statusSection.style.display = 'none';
        this.imageInput.value = '';
        this.updateExtractButton();
        this.updateActionButtons();
        this.addStatusMessage('all data cleared', 'success');
    }
}

const extractor = new ImageTextExtractor(); 