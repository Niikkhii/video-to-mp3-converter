import { useState, useRef } from 'react'
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg'
import styles from '../styles/Home.module.css'

export default function Home() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [progress, setProgress] = useState(0)
  const [outputName, setOutputName] = useState('')
  const [converting, setConverting] = useState(false)
  const ffmpegRef = useRef(null)

  const loadFFmpeg = async () => {
    if (!ffmpegRef.current) {
      const ffmpeg = createFFmpeg({ log: true })
      ffmpeg.setProgress(({ ratio }) => setProgress(Math.round(ratio * 100)))
      setStatus('Loading FFmpeg (this runs once, may take 30-60 seconds)...')
      await ffmpeg.load()
      ffmpegRef.current = ffmpeg
      setStatus('FFmpeg loaded successfully')
    }
  }

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
      await loadFFmpeg()

      const ffmpeg = ffmpegRef.current

      setStatus('Reading file...')
      const inputName = 'input' + getExt(file.name)
      const outputNameWithExt = outputName.endsWith('.mp3') ? outputName : outputName + '.mp3'

      ffmpeg.FS('writeFile', inputName, await fetchFile(file))

      setStatus('Converting to MP3...')
      await ffmpeg.run('-i', inputName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', 'output.mp3')

      setStatus('Extraction done — preparing upload')
      const data = ffmpeg.FS('readFile', 'output.mp3')
      const mp3Blob = new Blob([data.buffer], { type: 'audio/mpeg' })

      // Clean up
      ffmpeg.FS('unlink', inputName)
      ffmpeg.FS('unlink', 'output.mp3')

      // Send to server
      setStatus('Uploading to Google Drive...')
      const form = new FormData()
      form.append('file', new File([mp3Blob], outputNameWithExt, { type: 'audio/mpeg' }))
      form.append('filename', outputNameWithExt)

      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const resJson = await res.json()

      if (res.ok) {
        setStatus(`✅ Uploaded successfully! File ID: ${resJson.id}. Link: ${resJson.link || 'N/A'}`)
        console.log('Upload success:', resJson)
        // Reset form
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

    } catch (err) {
      console.error(err)
      setStatus('❌ Error: ' + (err.message || err))
    } finally {
      setConverting(false)
      setProgress(0)
    }
  }

  function getExt(name) {
    const idx = name.lastIndexOf('.')
    return idx === -1 ? '' : name.slice(idx)
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
            <strong>Note:</strong> ffmpeg.wasm is moderately heavy and will download WebAssembly assets to the browser (first load). Use on desktop or modern mobile.
          </small>
        </div>
      </div>
    </main>
  )
}

