import { useState, useRef } from 'react'
import lamejs from 'lamejs'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [outputName, setOutputName] = useState('')
  const [converting, setConverting] = useState(false)

  const handleFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
  }

  const convertAndUpload = async () => {
    if (!file) { 
      setStatus('Error: Choose a video file first')
      return 
    }
    if (!outputName) { 
      setStatus('Error: Please enter preferred audio filename (without extension)')
      return 
    }

    try {
      setConverting(true)
      setStatus('Extracting audio from video...')
      setProgress(10)

      // Create video element
      const video = document.createElement('video')
      video.preload = 'auto'
      video.muted = true
      video.playsInline = true
      video.crossOrigin = 'anonymous'
      
      const videoURL = URL.createObjectURL(file)
      video.src = videoURL

      // Wait for video metadata
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Failed to load video'))
        setTimeout(() => reject(new Error('Video loading timeout')), 10000)
      })

      setProgress(20)
      setStatus('Processing audio...')

      // Create AudioContext
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const sampleRate = audioContext.sampleRate

      // Use MediaRecorder to capture audio from video
      const stream = video.captureStream ? video.captureStream() : null
      
      if (!stream) {
        // Fallback: decode audio directly
        const response = await fetch(videoURL)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        // Convert to MP3
        setProgress(40)
        setStatus('Encoding to MP3...')
        const mp3Blob = await encodeToMP3(audioBuffer, sampleRate)
        
        await uploadToDrive(mp3Blob, outputName)
        return
      }

      // Use MediaRecorder approach
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })

      const chunks = []
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }

      await new Promise((resolve, reject) => {
        mediaRecorder.onstop = resolve
        mediaRecorder.onerror = reject
        
        mediaRecorder.start()
        video.play()
        
        video.onended = () => {
          mediaRecorder.stop()
          video.pause()
        }
        
        // Fallback timeout
        setTimeout(() => {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
            video.pause()
          }
        }, (video.duration || 60) * 1000 + 2000)
      })

      setProgress(60)
      setStatus('Converting to MP3...')

      // Decode the recorded audio
      const audioBlob = new Blob(chunks, { type: 'audio/webm' })
      const audioArrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer)

      // Convert to MP3
      setProgress(70)
      const mp3Blob = await encodeToMP3(audioBuffer, sampleRate)

      // Cleanup
      URL.revokeObjectURL(videoURL)
      audioContext.close()
      stream.getTracks().forEach(track => track.stop())

      // Upload
      await uploadToDrive(mp3Blob, outputName)

    } catch (err) {
      console.error('Conversion error:', err)
      setStatus('❌ Error: ' + (err.message || err))
    } finally {
      setConverting(false)
      setProgress(0)
    }
  }

  const encodeToMP3 = async (audioBuffer, sampleRate) => {
    setProgress(75)
    const channels = audioBuffer.numberOfChannels
    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128) // 128kbps
    
    const leftChannel = audioBuffer.getChannelData(0)
    const rightChannel = channels > 1 ? audioBuffer.getChannelData(1) : leftChannel
    
    const sampleBlockSize = 1152
    const mp3Data = []
    
    for (let i = 0; i < leftChannel.length; i += sampleBlockSize) {
      const leftChunk = leftChannel.subarray(i, i + sampleBlockSize)
      const rightChunk = rightChannel.subarray(i, i + sampleBlockSize)
      
      // Convert Float32Array to Int16Array
      const leftInt16 = new Int16Array(leftChunk.length)
      const rightInt16 = new Int16Array(rightChunk.length)
      for (let j = 0; j < leftChunk.length; j++) {
        leftInt16[j] = Math.max(-32768, Math.min(32767, leftChunk[j] * 32768))
        rightInt16[j] = Math.max(-32768, Math.min(32767, rightChunk[j] * 32768))
      }
      
      const mp3buf = mp3encoder.encodeBuffer(leftInt16, rightInt16)
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf)
      }
      
      setProgress(75 + Math.floor((i / leftChannel.length) * 20))
    }
    
    // Flush encoder
    const mp3buf = mp3encoder.flush()
    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf)
    }

    return new Blob(mp3Data, { type: 'audio/mpeg' })
  }

  const uploadToDrive = async (mp3Blob, filename) => {
    setProgress(90)
    setStatus('Uploading to Google Drive...')
    
    const outputNameWithExt = filename.endsWith('.mp3') ? filename : filename + '.mp3'
    const form = new FormData()
    form.append('file', new File([mp3Blob], outputNameWithExt, { type: 'audio/mpeg' }))
    form.append('filename', outputNameWithExt)

    const res = await fetch('/api/upload', { method: 'POST', body: form })
    const resJson = await res.json()

    if (res.ok) {
      setStatus(`✅ Uploaded successfully! File ID: ${resJson.id}. Link: ${resJson.link || 'N/A'}`)
      console.log('Upload success:', resJson)
      setTimeout(() => {
        setFile(null)
        setOutputName('')
        setStatus('')
        setProgress(0)
      }, 5000)
    } else {
      setStatus('❌ Upload failed: ' + (resJson.error || JSON.stringify(resJson)))
      console.error('Upload failed:', resJson)
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1>🎵 Video to MP3 Converter</h1>
        <p className={styles.subtitle}>Upload any video file and convert it to MP3 format</p>

        <div className={styles.uploadSection}>
          <input 
            type="file" 
            accept="video/*,audio/*" 
            onChange={handleFile}
            id="videoInput"
            className={styles.fileInput}
          />
          <label htmlFor="videoInput" className={styles.uploadLabel}>
            <div className={styles.uploadIcon}>📁</div>
            <div className={styles.uploadText}>
              <span className={styles.uploadTitle}>
                {file ? file.name : 'Click to upload video'}
              </span>
              <span className={styles.uploadSubtitle}>or drag and drop</span>
            </div>
          </label>
        </div>

        <div className={styles.formSection}>
          <div className={styles.inputGroup}>
            <label htmlFor="audioName">Enter preferred name for audio file:</label>
            <input
              id="audioName"
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              placeholder="e.g., My Audio File"
              className={styles.textInput}
            />
            <small>Don't include .mp3 extension (it will be added automatically)</small>
          </div>

          <button 
            onClick={convertAndUpload} 
            disabled={converting}
            className={styles.convertButton}
          >
            {converting ? 'Working...' : 'Convert & Upload to Drive'}
          </button>
        </div>

        {status && (
          <div className={styles.statusSection}>
            <div className={status.includes('Error') || status.includes('❌') ? styles.error : styles.status}>
              {status}
            </div>
            {converting && progress > 0 && (
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        <div className={styles.notes}>
          <small>
            <strong>Note:</strong> Uses Web Audio API + MediaRecorder - no SharedArrayBuffer required. Works in all modern browsers.
          </small>
        </div>
      </div>
    </main>
  )
}
