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

// Load FFmpeg for client-side conversion
let ffmpegLoaded = false;
let ffmpeg = null;

async function loadFFmpeg() {
    if (ffmpegLoaded) return;
    
    showProgress('Loading FFmpeg (this may take a moment)...');
    updateProgress(5);
    
    try {
        // Wait for FFmpeg to be available - check multiple possible global names
        let FFmpegLib = window.FFmpeg || window.FFmpegWASM || FFmpeg;
        
        // Wait up to 10 seconds for the script to load
        let attempts = 0;
        while (typeof FFmpegLib === 'undefined' && attempts < 100) {
            await new Promise(resolve => setTimeout(resolve, 100));
            FFmpegLib = window.FFmpeg || window.FFmpegWASM || FFmpeg;
            attempts++;
        }
        
        if (typeof FFmpegLib === 'undefined') {
            // Try loading it manually
            console.log('FFmpeg not found, attempting to load...');
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js';
                script.onload = () => {
                    FFmpegLib = window.FFmpeg || window.FFmpegWASM || FFmpeg;
                    if (typeof FFmpegLib !== 'undefined') {
                        resolve();
                    } else {
                        reject(new Error('FFmpeg loaded but not accessible'));
                    }
                };
                script.onerror = () => reject(new Error('Failed to load FFmpeg script'));
                document.head.appendChild(script);
            });
        }
        
        // Get createFFmpeg function - try different ways it might be exposed
        let createFFmpeg;
        if (FFmpegLib && FFmpegLib.createFFmpeg) {
            createFFmpeg = FFmpegLib.createFFmpeg;
        } else if (FFmpegLib && typeof FFmpegLib === 'function') {
            createFFmpeg = FFmpegLib;
        } else if (typeof createFFmpeg === 'undefined') {
            // Last resort: try importing from CDN
            const module = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
            createFFmpeg = module.createFFmpeg;
        }
        
        if (!createFFmpeg) {
            throw new Error('createFFmpeg function not found');
        }
        
        ffmpeg = createFFmpeg({ 
            log: false,
            corePath: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js',
            wasmPath: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/'
        });
        
        updateProgress(15);
        showProgress('Loading FFmpeg core (this may take 30-60 seconds)...');
        
        await ffmpeg.load();
        ffmpegLoaded = true;
        console.log('FFmpeg loaded successfully');
    } catch (error) {
        console.error('Error loading FFmpeg:', error);
        throw new Error('Failed to load FFmpeg: ' + error.message + '. Please try refreshing the page.');
    }
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
    
    try {
        // Load FFmpeg if not already loaded
        if (!ffmpegLoaded) {
            await loadFFmpeg();
        }

        updateProgress(10);
        showProgress('Reading video file...');
        
        // Read video file
        const videoData = await selectedFile.arrayBuffer();
        const videoName = selectedFile.name;
        
        updateProgress(20);
        showProgress('Converting video to MP3 (this may take a while)...');
        
        // Write video file to FFmpeg virtual file system
        ffmpeg.FS('writeFile', videoName, new Uint8Array(videoData));
        
        updateProgress(40);
        
        // Convert to MP3
        const outputFileName = `${cleanAudioName}.mp3`;
        await ffmpeg.run(
            '-i', videoName,
            '-vn', // No video
            '-acodec', 'libmp3lame',
            '-ab', '192k',
            '-ar', '44100',
            outputFileName
        );
        
        updateProgress(70);
        showProgress('Reading converted audio...');
        
        // Read the converted file
        const audioData = ffmpeg.FS('readFile', outputFileName);
        
        // Clean up
        ffmpeg.FS('unlink', videoName);
        ffmpeg.FS('unlink', outputFileName);
        
        updateProgress(80);
        showProgress('Uploading to Google Drive...');
        
        // Convert to base64 for API
        const audioBlob = new Blob([audioData.buffer], { type: 'audio/mpeg' });
        const reader = new FileReader();
        
        const base64Audio = await new Promise((resolve, reject) => {
            reader.onload = () => {
                const base64 = reader.result.split(',')[1]; // Remove data:audio/mpeg;base64, prefix
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });
        
        // Upload to Vercel API
        const response = await fetch('/api/convert-v2', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audioBlob: base64Audio,
                fileName: `${cleanAudioName}.mp3`
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

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
        console.error('Error:', error);
        showError(error.message || 'An error occurred during conversion');
        convertBtn.disabled = false;
    }
});

