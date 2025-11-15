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
let loadAttempts = 0;
const MAX_LOAD_ATTEMPTS = 3;

async function loadFFmpeg() {
    if (ffmpegLoaded && ffmpeg) return;
    
    showProgress('Loading FFmpeg (this may take a moment)...');
    updateProgress(5);
    
    const methods = [
        // Method 1: ESM import from unpkg (newer version uses FFmpeg class)
        async () => {
            console.log('🔄 Method 1: Trying ESM import from unpkg...');
            const module = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
            console.log('Module imported:', Object.keys(module));
            
            // Try different possible export names - newer versions export FFmpeg class
            const FFmpegClass = module.FFmpeg || module.default?.FFmpeg || module.default;
            const createFFmpeg = module.createFFmpeg || module.default?.createFFmpeg;
            
            // If we have the class, return a factory function
            if (FFmpegClass && typeof FFmpegClass === 'function') {
                return (options) => new FFmpegClass(options);
            }
            
            // Fallback to createFFmpeg if available
            if (typeof createFFmpeg === 'function') {
                return createFFmpeg;
            }
            
            throw new Error('FFmpeg class or createFFmpeg not found in module exports');
        },
        
        // Method 2: ESM import from jsdelivr
        async () => {
            console.log('🔄 Method 2: Trying ESM import from jsdelivr...');
            const module = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
            
            const FFmpegClass = module.FFmpeg || module.default?.FFmpeg || module.default;
            const createFFmpeg = module.createFFmpeg || module.default?.createFFmpeg;
            
            if (FFmpegClass && typeof FFmpegClass === 'function') {
                return (options) => new FFmpegClass(options);
            }
            
            if (typeof createFFmpeg === 'function') {
                return createFFmpeg;
            }
            
            throw new Error('FFmpeg class or createFFmpeg not found in module exports');
        },
        
        // Method 3: Try older version with createFFmpeg
        async () => {
            console.log('🔄 Method 3: Trying older version with createFFmpeg...');
            const module = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.11.6/dist/esm/index.js');
            
            const createFFmpeg = module.createFFmpeg || module.default?.createFFmpeg || module.default;
            
            if (typeof createFFmpeg === 'function') {
                return createFFmpeg;
            }
            
            throw new Error('createFFmpeg not found in older version');
        },
        
        // Method 4: UMD script tag approach
        async () => {
            console.log('🔄 Method 4: Trying UMD script tag...');
            return new Promise((resolve, reject) => {
                // Check if already loaded
                if (window.FFmpeg) {
                    // Check if it's a class or has createFFmpeg
                    if (typeof window.FFmpeg === 'function') {
                        resolve((options) => new window.FFmpeg(options));
                        return;
                    }
                    if (window.FFmpeg.createFFmpeg && typeof window.FFmpeg.createFFmpeg === 'function') {
                        resolve(window.FFmpeg.createFFmpeg);
                        return;
                    }
                }
                
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js';
                script.type = 'text/javascript';
                
                const timeout = setTimeout(() => {
                    reject(new Error('Script load timeout'));
                }, 30000);
                
                script.onload = () => {
                    clearTimeout(timeout);
                    
                    // Try different ways to access FFmpeg
                    const FFmpegGlobal = window.FFmpeg || window.FFmpegWASM;
                    
                    if (typeof FFmpegGlobal === 'function') {
                        // It's a class
                        resolve((options) => new FFmpegGlobal(options));
                    } else if (FFmpegGlobal && typeof FFmpegGlobal.createFFmpeg === 'function') {
                        resolve(FFmpegGlobal.createFFmpeg);
                    } else if (FFmpegGlobal && typeof FFmpegGlobal.FFmpeg === 'function') {
                        resolve((options) => new FFmpegGlobal.FFmpeg(options));
                    } else {
                        reject(new Error('FFmpeg loaded but not accessible in expected format'));
                    }
                };
                
                script.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Failed to load FFmpeg script'));
                };
                
                document.head.appendChild(script);
            });
        }
    ];
    
    let lastError = null;
    
    for (let i = 0; i < methods.length; i++) {
        try {
            console.log(`Attempting method ${i + 1} of ${methods.length}...`);
            
            // Validate method exists
            if (!methods[i] || typeof methods[i] !== 'function') {
                throw new Error(`Method ${i + 1} is not a valid function`);
            }
            
            const createFFmpeg = await methods[i]();
            
            if (typeof createFFmpeg !== 'function') {
                throw new Error('createFFmpeg is not a function');
            }
            
            console.log('✅ createFFmpeg function obtained, creating instance...');
            updateProgress(10);
            
            // Create FFmpeg instance with error handling
            try {
                ffmpeg = createFFmpeg({ 
                    log: false,
                    corePath: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js',
                    wasmPath: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/'
                });
                
                if (!ffmpeg) {
                    throw new Error('FFmpeg instance creation returned null/undefined');
                }
                
                updateProgress(15);
                showProgress('Loading FFmpeg core (this may take 30-60 seconds, please wait)...');
                console.log('Loading FFmpeg core...');
                
                // Add timeout for loading
                const loadPromise = ffmpeg.load();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('FFmpeg load timeout (120s)')), 120000)
                );
                
                await Promise.race([loadPromise, timeoutPromise]);
                
                // Verify FFmpeg is properly loaded
                if (!ffmpeg.FS || typeof ffmpeg.FS !== 'function') {
                    throw new Error('FFmpeg loaded but FS not available');
                }
                
                if (!ffmpeg.run || typeof ffmpeg.run !== 'function') {
                    throw new Error('FFmpeg loaded but run not available');
                }
                
                ffmpegLoaded = true;
                console.log('✅ FFmpeg loaded successfully!');
                updateProgress(30);
                return; // Success!
                
            } catch (instanceError) {
                console.error(`❌ Error creating/loading FFmpeg instance:`, instanceError);
                lastError = instanceError;
                // Continue to next method
                continue;
            }
            
        } catch (methodError) {
            console.error(`❌ Method ${i + 1} failed:`, methodError);
            lastError = methodError;
            // Try next method
            continue;
        }
    }
    
    // All methods failed
    const errorMessage = lastError ? lastError.message : 'Unknown error';
    console.error('❌ All FFmpeg loading methods failed. Last error:', errorMessage);
    
    throw new Error(
        `Failed to load FFmpeg after trying ${methods.length} methods. ` +
        `Last error: ${errorMessage}. ` +
        `Please check your internet connection, try a different browser, or refresh the page.`
    );
}

convertBtn.addEventListener('click', async () => {
    // Input validation
    if (!selectedFile) {
        showError('Please select a video file first');
        return;
    }

    const audioName = audioNameInput.value.trim();
    if (!audioName) {
        showError('Please enter a name for the audio file');
        return;
    }

    // Validate file size (500MB limit)
    const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > MAX_FILE_SIZE) {
        showError(`File is too large (${(selectedFile.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 500MB.`);
        return;
    }

    // Validate file type
    if (!selectedFile.type.startsWith('video/') && !selectedFile.name.match(/\.(mp4|avi|mov|mkv|webm|flv|wmv|m4v)$/i)) {
        showError('Please select a valid video file');
        return;
    }

    // Clean the audio name (remove .mp3 if user added it)
    const cleanAudioName = audioName.replace(/\.mp3$/i, '').replace(/[<>:"/\\|?*]/g, '_'); // Remove invalid filename characters

    convertBtn.disabled = true;
    hideResults();
    
    let videoName = null;
    let outputFileName = null;
    
    try {
        // Step 1: Load FFmpeg if not already loaded
        if (!ffmpegLoaded || !ffmpeg) {
            try {
                await loadFFmpeg();
            } catch (loadError) {
                throw new Error(`Failed to load FFmpeg: ${loadError.message}`);
            }
        }

        // Step 2: Read video file
        updateProgress(10);
        showProgress('Reading video file...');
        
        let videoData;
        try {
            videoData = await selectedFile.arrayBuffer();
            if (!videoData || videoData.byteLength === 0) {
                throw new Error('Video file is empty or could not be read');
            }
        } catch (readError) {
            throw new Error(`Failed to read video file: ${readError.message}`);
        }
        
        videoName = selectedFile.name.replace(/[<>:"/\\|?*]/g, '_'); // Sanitize filename
        
        // Step 3: Write video to FFmpeg virtual file system
        updateProgress(20);
        showProgress('Preparing video for conversion...');
        
        try {
            ffmpeg.FS('writeFile', videoName, new Uint8Array(videoData));
        } catch (writeError) {
            throw new Error(`Failed to write video to FFmpeg: ${writeError.message}. File may be too large.`);
        }
        
        // Step 4: Convert to MP3
        updateProgress(30);
        showProgress('Converting video to MP3 (this may take a while, please wait)...');
        
        outputFileName = `${cleanAudioName}.mp3`;
        
        try {
            // Add timeout for conversion (10 minutes max)
            const conversionPromise = ffmpeg.run(
                '-i', videoName,
                '-vn', // No video
                '-acodec', 'libmp3lame',
                '-ab', '192k',
                '-ar', '44100',
                '-y', // Overwrite output file
                outputFileName
            );
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Conversion timeout (10 minutes). File may be too large or complex.')), 600000)
            );
            
            await Promise.race([conversionPromise, timeoutPromise]);
        } catch (conversionError) {
            // Clean up on conversion error
            try {
                if (videoName) ffmpeg.FS('unlink', videoName).catch(() => {});
                if (outputFileName) ffmpeg.FS('unlink', outputFileName).catch(() => {});
            } catch {}
            
            if (conversionError.message.includes('timeout')) {
                throw conversionError;
            }
            throw new Error(`Conversion failed: ${conversionError.message}`);
        }
        
        // Step 5: Read converted audio file
        updateProgress(70);
        showProgress('Reading converted audio...');
        
        let audioData;
        try {
            audioData = ffmpeg.FS('readFile', outputFileName);
            if (!audioData || audioData.length === 0) {
                throw new Error('Converted audio file is empty');
            }
        } catch (readError) {
            throw new Error(`Failed to read converted audio: ${readError.message}`);
        }
        
        // Step 6: Clean up FFmpeg files
        try {
            if (videoName) ffmpeg.FS('unlink', videoName).catch(() => {});
            if (outputFileName) ffmpeg.FS('unlink', outputFileName).catch(() => {});
        } catch (cleanupError) {
            console.warn('Cleanup warning:', cleanupError);
            // Non-critical, continue
        }
        
        // Step 7: Convert to base64
        updateProgress(75);
        showProgress('Preparing audio for upload...');
        
        let base64Audio;
        try {
            const audioBlob = new Blob([audioData.buffer], { type: 'audio/mpeg' });
            const reader = new FileReader();
            
            base64Audio = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Base64 conversion timeout'));
                }, 30000);
                
                reader.onload = () => {
                    clearTimeout(timeout);
                    try {
                        const base64 = reader.result.split(',')[1];
                        if (!base64) {
                            reject(new Error('Invalid base64 conversion result'));
                            return;
                        }
                        resolve(base64);
                    } catch (parseError) {
                        reject(new Error(`Failed to parse base64: ${parseError.message}`));
                    }
                };
                reader.onerror = (error) => {
                    clearTimeout(timeout);
                    reject(new Error(`FileReader error: ${error.message || 'Unknown error'}`));
                };
                reader.readAsDataURL(audioBlob);
            });
        } catch (base64Error) {
            throw new Error(`Failed to convert audio to base64: ${base64Error.message}`);
        }
        
        // Step 8: Upload to Google Drive (with retry)
        updateProgress(80);
        showProgress('Uploading to Google Drive...');
        
        let response;
        let result;
        const maxRetries = 3;
        let lastUploadError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                response = await fetch('/api/convert-v2', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        audioBlob: base64Audio,
                        fileName: `${cleanAudioName}.mp3`
                    }),
                    signal: (() => {
                        // Create abort controller for timeout (fallback for browsers without AbortSignal.timeout)
                        if (typeof AbortSignal.timeout === 'function') {
                            return AbortSignal.timeout(120000);
                        }
                        const controller = new AbortController();
                        setTimeout(() => controller.abort(), 120000);
                        return controller.signal;
                    })()
                });

                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch {
                        errorData = { error: `Server error: ${response.status} ${response.statusText}` };
                    }
                    
                    if (response.status === 413) {
                        throw new Error('File is too large for upload. Maximum size is 4.5MB on free tier.');
                    }
                    
                    if (attempt < maxRetries) {
                        console.log(`Upload attempt ${attempt} failed, retrying...`);
                        await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
                        continue;
                    }
                    
                    throw new Error(errorData.error || `Upload failed: ${response.status} ${response.statusText}`);
                }

                try {
                    result = await response.json();
                } catch (parseError) {
                    throw new Error(`Failed to parse server response: ${parseError.message}`);
                }
                
                break; // Success, exit retry loop
                
            } catch (uploadError) {
                lastUploadError = uploadError;
                
                if (uploadError.name === 'AbortError' || uploadError.name === 'TimeoutError') {
                    throw new Error('Upload timeout. Please try again with a smaller file.');
                }
                
                if (attempt === maxRetries) {
                    throw new Error(`Upload failed after ${maxRetries} attempts: ${uploadError.message}`);
                }
                
                console.log(`Upload attempt ${attempt} failed:`, uploadError.message);
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            }
        }
        
        // Success!
        updateProgress(100);
        showSuccess(`Audio file "${cleanAudioName}.mp3" has been successfully uploaded to Google Drive!`);
        
        // Reset form after delay
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
        console.error('Conversion error:', error);
        
        // Clean up FFmpeg files on error
        try {
            if (ffmpeg && ffmpeg.FS) {
                if (videoName) ffmpeg.FS('unlink', videoName).catch(() => {});
                if (outputFileName) ffmpeg.FS('unlink', outputFileName).catch(() => {});
            }
        } catch (cleanupError) {
            console.warn('Cleanup error:', cleanupError);
        }
        
        // Show user-friendly error message
        let errorMessage = error.message || 'An error occurred during conversion';
        
        // Make error messages more user-friendly
        if (errorMessage.includes('timeout')) {
            errorMessage = 'The operation took too long. Please try with a smaller video file.';
        } else if (errorMessage.includes('too large')) {
            errorMessage = 'File is too large. Please use a smaller video file (max 500MB for conversion, 4.5MB for upload on free tier).';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        showError(errorMessage);
        convertBtn.disabled = false;
    }
});

