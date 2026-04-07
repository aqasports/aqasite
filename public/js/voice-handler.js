/**
 * AQA SPORTS ACADEMY - Voice Message Handler
 * Handles audio recording, file uploads, and form submission
 */

class VoiceMessageHandler {
    constructor() {
        // Recording properties
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.recordedBlob = null;
        this.uploadedFile = null;
        this.isRecording = false;
        this.recordingTime = 0;
        this.recordingTimer = null;
        this.autoStopTimeout = null;
        
        // Audio visualization
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.animationFrame = null;
        
        // Configuration
        this.maxRecordingSeconds = 300; // 5 minutes max
        this.maxFileSizeMB = 25; // 25MB max file size
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize the handler
     */
    init() {
        this.cacheElements();
        this.bindEvents();
        this.resizeVisualizer();
        window.addEventListener('resize', () => this.resizeVisualizer());
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        // Recording controls
        this.recordBtn = document.getElementById('recordBtn');
        this.recordBtnText = document.getElementById('recordBtnText');
        this.recordTimer = document.getElementById('recordTimer');
        
        // File upload
        this.voiceInput = document.getElementById('voiceInput');
        
        // Audio preview
        this.audioPreview = document.getElementById('audioPreview');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.removeAudioBtn = document.getElementById('removeAudio');
        
        // Visualizer
        this.visualizerCanvas = document.getElementById('visualizer');
        this.visualizerContext = this.visualizerCanvas?.getContext('2d');
        
        // Form elements
        this.contactForm = document.getElementById('contactForm');
        this.submitBtn = document.getElementById('submitBtn');
        this.submitText = document.getElementById('submitText');
        this.formContainer = document.getElementById('listenFormContainer');
        this.thankYouMessage = document.getElementById('thankYouMessage');
        this.newMessageBtn = document.getElementById('newMessageBtn');
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        if (this.recordBtn) {
            this.recordBtn.addEventListener('click', () => this.toggleRecording());
        }
        
        if (this.voiceInput) {
            this.voiceInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        
        if (this.removeAudioBtn) {
            this.removeAudioBtn.addEventListener('click', () => this.removeAudio());
        }
        
        if (this.contactForm) {
            this.contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
        }
        
        if (this.newMessageBtn) {
            this.newMessageBtn.addEventListener('click', () => this.resetForm());
        }
    }

    /**
     * Resize visualizer canvas
     */
    resizeVisualizer() {
        if (!this.visualizerCanvas) return;
        this.visualizerCanvas.width = this.visualizerCanvas.offsetWidth || 600;
        this.visualizerCanvas.height = 60;
    }

    /**
     * Toggle recording on/off
     */
    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    /**
     * Start audio recording
     */
    async startRecording() {
        try {
            // Request microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Set up audio context for visualization
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            // Set up media recorder
            const mimeType = this.getSupportedMimeType();
            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            this.audioChunks = [];
            this.recordingTime = 0;

            // Handle data availability
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // Handle recording stop
            this.mediaRecorder.onstop = () => {
                this.recordedBlob = new Blob(this.audioChunks, { type: mimeType });
                this.showAudioPreview(this.recordedBlob);
                stream.getTracks().forEach(track => track.stop());
                if (this.audioContext) {
                    this.audioContext.close();
                }
            };

            // Start recording
            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordBtn.classList.add('recording');
            this.recordBtnText.textContent = 'Arrêter';
            this.recordTimer.style.display = 'inline-block';
            if (this.visualizerCanvas) {
                this.visualizerCanvas.style.display = 'block';
            }
            this.startTimer();
            this.startVisualizer();

            // Auto-stop after max duration
            this.autoStopTimeout = setTimeout(
                () => this.stopRecording(), 
                this.maxRecordingSeconds * 1000
            );

        } catch (error) {
            console.error('Recording error:', error);
            this.showStatus(
                "Erreur : accès au micro refusé ou indisponible. Veuillez vérifier vos paramètres.", 
                'error'
            );
        }
    }

    /**
     * Stop audio recording
     */
    stopRecording() {
        if (!this.mediaRecorder || !this.isRecording) return;
        
        this.mediaRecorder.stop();
        this.isRecording = false;
        this.recordBtn.classList.remove('recording');
        this.recordBtnText.textContent = 'Enregistrer';
        this.stopTimer();
        this.stopVisualizer();
        
        if (this.autoStopTimeout) {
            clearTimeout(this.autoStopTimeout);
        }
    }

    /**
     * Get supported MIME type for recording
     */
    getSupportedMimeType() {
        const types = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4'
        ];
        
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) {
                return type;
            }
        }
        
        return '';
    }

    /**
     * Start recording timer
     */
    startTimer() {
        this.recordTimer.textContent = '00:00';
        let seconds = 0;
        
        this.recordingTimer = setInterval(() => {
            seconds++;
            const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
            const secs = String(seconds % 60).padStart(2, '0');
            this.recordTimer.textContent = `${minutes}:${secs}`;
        }, 1000);
    }

    /**
     * Stop recording timer
     */
    stopTimer() {
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
        }
        this.recordTimer.style.display = 'none';
    }

    /**
     * Start audio visualizer
     */
    startVisualizer() {
        const draw = () => {
            if (!this.isRecording) return;
            
            this.animationFrame = requestAnimationFrame(draw);
            this.analyser.getByteFrequencyData(this.dataArray);
            
            if (!this.visualizerContext) return;
            
            // Clear canvas
            this.visualizerContext.clearRect(
                0, 
                0, 
                this.visualizerCanvas.width, 
                this.visualizerCanvas.height
            );
            
            // Draw frequency bars
            const barWidth = (this.visualizerCanvas.width / this.dataArray.length) * 2.5;
            let x = 0;
            
            for (let i = 0; i < this.dataArray.length; i++) {
                const barHeight = (this.dataArray[i] / 255) * this.visualizerCanvas.height;
                this.visualizerContext.fillStyle = '#00ffff';
                this.visualizerContext.fillRect(
                    x, 
                    this.visualizerCanvas.height - barHeight, 
                    barWidth, 
                    barHeight
                );
                x += barWidth + 1;
            }
        };
        
        draw();
    }

    /**
     * Stop audio visualizer
     */
    stopVisualizer() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.visualizerCanvas) {
            this.visualizerCanvas.style.display = 'none';
        }
    }

    /**
     * Handle file upload
     */
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('audio/')) {
            this.showStatus('Veuillez sélectionner un fichier audio valide', 'error');
            this.voiceInput.value = '';
            return;
        }
        
        // Validate file size
        const maxSizeBytes = this.maxFileSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            this.showStatus(
                `Fichier trop volumineux. Limite: ${this.maxFileSizeMB}MB`, 
                'error'
            );
            this.voiceInput.value = '';
            return;
        }
        
        this.uploadedFile = file;
        this.recordedBlob = null;
        this.showAudioPreview(file);
    }

    /**
     * Show audio preview
     */
    showAudioPreview(source) {
        const url = URL.createObjectURL(source);
        this.audioPlayer.src = url;
        this.audioPreview.style.display = 'flex';
        
        // Announce to screen readers
        this.announceToScreenReader('Audio ajouté avec succès');
    }

    /**
     * Remove audio
     */
    removeAudio() {
        this.recordedBlob = null;
        this.uploadedFile = null;
        this.voiceInput.value = '';
        this.audioPlayer.src = '';
        this.audioPreview.style.display = 'none';
        
        // Announce to screen readers
        this.announceToScreenReader('Audio supprimé');
    }

    /**
     * Handle form submission
     */
    async handleSubmit() {
        // Get form data
        const name = document.getElementById('userName').value.trim();
        const email = document.getElementById('userEmail').value.trim();
        const message = document.getElementById('messageText').value.trim();

        // Validate - at least one field must be filled
        const hasText = !!(name || email || message);
        const hasAudio = !!(this.recordedBlob || this.uploadedFile);

        if (!hasText && !hasAudio) {
            this.showStatus(
                'Veuillez fournir au moins un nom, e-mail, message écrit ou audio', 
                'error'
            );
            return;
        }

        try {
            this.setSubmitLoading(true);

            // Prepare audio data
            let audioBase64 = null;
            let audioFilename = null;

            if (this.recordedBlob) {
                audioFilename = `voice-${Date.now()}.webm`;
                audioBase64 = await this.blobToBase64(this.recordedBlob);
            } else if (this.uploadedFile) {
                audioFilename = this.uploadedFile.name;
                audioBase64 = await this.blobToBase64(this.uploadedFile);
            }

            // Send to Netlify Function
            const response = await fetch('/.netlify/functions/send-message', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    name,
                    email,
                    message,
                    timestamp: new Date().toISOString(),
                    audioBase64,
                    audioFilename
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showThankYou();
            } else {
                throw new Error(result.error || 'Erreur inconnue');
            }

        } catch (error) {
            console.error('Submit error:', error);
            this.showStatus(
                'Erreur lors de l\'envoi du message. Veuillez réessayer.', 
                'error'
            );
        } finally {
            this.setSubmitLoading(false);
        }
    }

    /**
     * Convert blob to base64
     */
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Set submit button loading state
     */
    setSubmitLoading(loading) {
        if (loading) {
            this.submitBtn.disabled = true;
            this.submitText.textContent = 'Envoi en cours...';
            this.submitBtn.style.opacity = '0.7';
        } else {
            this.submitBtn.disabled = false;
            this.submitText.textContent = 'Envoyer';
            this.submitBtn.style.opacity = '1';
        }
    }

    /**
     * Show thank you message
     */
    showThankYou() {
        this.formContainer.style.display = 'none';
        this.thankYouMessage.style.display = 'block';
        
        // Scroll to thank you message
        this.thankYouMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Announce to screen readers
        this.announceToScreenReader('Message envoyé avec succès');
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        // Clear form fields
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        document.getElementById('messageText').value = '';
        
        // Remove audio
        this.removeAudio();
        
        // Show form, hide thank you
        this.formContainer.style.display = 'block';
        this.thankYouMessage.style.display = 'none';
        
        // Remove any status messages
        const existingStatus = document.querySelector('.status-message');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Scroll to form
        this.formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Show status message
     */
    showStatus(message, type = 'info') {
        // Remove existing status
        const existing = document.querySelector('.status-message');
        if (existing) {
            existing.remove();
        }
        
        // Create new status message
        const div = document.createElement('div');
        div.className = `status-message ${type}`;
        div.textContent = message;
        div.setAttribute('role', type === 'error' ? 'alert' : 'status');
        div.setAttribute('aria-live', 'polite');
        
        // Insert after form container
        this.formContainer.parentNode.insertBefore(div, this.formContainer.nextSibling);
        
        // Auto-remove success messages after 5 seconds
        if (type !== 'error') {
            setTimeout(() => {
                if (div.parentNode) {
                    div.remove();
                }
            }, 5000);
        }
    }

    /**
     * Announce message to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

// Initialize when DOM is ready
if (typeof window !== 'undefined') {
    window.voiceMessageHandler = new VoiceMessageHandler();
}