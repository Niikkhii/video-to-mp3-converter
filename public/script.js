const videoInput = document.getElementById('videoInput');
const uploadLabel = document.getElementById('uploadLabel');
const fileName = document.getElementById('fileName');
const formSection = document.getElementById('formSection');
const audioNameInput = document.getElementById('audioName');
const convertBtn = document.getElementById('convertBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const errorSection = document.getElementById('errorSection');
const resultMessage = document.getElementById('resultMessage');
const errorMessage = document.getElementById('errorMessage');

let selectedFile = null;

// Drag and drop functionality
uploadLabel.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadLabel.classList.add('dragover');
});

uploadLabel.addEventListener('dragleave', () => {
    uploadLabel.classList.remove('dragover');
});

uploadLabel.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadLabel.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
        handleFileSelect(file);
    } else {
        showError('Please select a valid video file');
    }
});

videoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileSelect(file);
    }
});

function handleFileSelect(file) {
    selectedFile = file;
    fileName.textContent = `Selected: ${file.name}`;
    fileName.style.display = 'block';
    formSection.style.display = 'block';
    hideResults();
}

function hideResults() {
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
    progressSection.style.display = 'none';
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    resultSection.style.display = 'none';
    progressSection.style.display = 'none';
}

function showSuccess(message) {
    resultMessage.textContent = message;
    resultSection.style.display = 'block';
    errorSection.style.display = 'none';
    progressSection.style.display = 'none';
}

function showProgress(message) {
    progressText.textContent = message;
    progressSection.style.display = 'block';
    resultSection.style.display = 'none';
    errorSection.style.display = 'none';
}

function updateProgress(percent) {
    progressFill.style.width = percent + '%';
}

convertBtn.addEventListener('click', async () => {
    if (!selectedFile) {
        showError('Please select a video file first');
        return;
    }

    const audioName = audioNameInput.value.trim();
    if (!audioName) {
        showError('Please enter a name for the audio file');
        return;
    }

    // Clean the audio name (remove .mp3 if user added it)
    const cleanAudioName = audioName.replace(/\.mp3$/i, '');

    convertBtn.disabled = true;
    hideResults();
    showProgress('Uploading video file...');
    updateProgress(10);

    try {
        const formData = new FormData();
        formData.append('video', selectedFile);
        formData.append('audioName', cleanAudioName);

        updateProgress(30);
        showProgress('Converting video to MP3...');

        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Conversion failed');
        }

        updateProgress(70);
        showProgress('Uploading to Google Drive...');

        const result = await response.json();
        
        updateProgress(100);
        showSuccess(`Audio file "${cleanAudioName}.mp3" has been successfully uploaded to Google Drive!`);
        
        // Reset form
        setTimeout(() => {
            videoInput.value = '';
            selectedFile = null;
            fileName.textContent = '';
            fileName.style.display = 'none';
            formSection.style.display = 'none';
            audioNameInput.value = '';
            convertBtn.disabled = false;
        }, 3000);

    } catch (error) {
        showError(error.message || 'An error occurred during conversion');
        convertBtn.disabled = false;
    }
});

