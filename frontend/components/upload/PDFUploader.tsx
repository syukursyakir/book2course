'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button, Progress } from '@/components/ui'
import { Upload, FileText, X, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface PDFUploaderProps {
  uploadType?: 'book' | 'notes'
  onUploadComplete?: (bookId: string) => void
}

export function PDFUploader({ uploadType = 'notes', onUploadComplete }: PDFUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState('')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Please upload a PDF file'
    }
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      return 'File size must be less than 50MB'
    }
    return null
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setError('')

    const droppedFile = e.dataTransfer.files[0]
    if (!droppedFile) return

    const validationError = validateFile(droppedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    setFile(droppedFile)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    setFile(selectedFile)
  }, [])

  const removeFile = () => {
    setFile(null)
    setUploadProgress(0)
    setIsComplete(false)
    setError('')
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError('')
    setUploadProgress(10)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      console.log('Session:', session) // Debug log

      if (!session) {
        setError('Please sign in to upload files')
        setIsUploading(false)
        return
      }

      setUploadProgress(30)

      // Upload to backend API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_type', uploadType)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      console.log('Uploading to:', `${apiUrl}/api/upload`) // Debug log

      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      console.log('Response status:', response.status) // Debug log

      setUploadProgress(80)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Upload failed')
      }

      const data = await response.json()
      console.log('Upload response:', data) // Debug log
      setUploadProgress(100)
      setIsComplete(true)
      onUploadComplete?.(data.book_id)
    } catch (err) {
      console.error('Upload error:', err) // Debug log
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
            isDragging
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-dark-700 hover:border-dark-600 bg-dark-900'
          )}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="pdf-upload"
          />
          <label htmlFor="pdf-upload" className="cursor-pointer">
            <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Upload className="w-8 h-8 text-dark-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark-100 mb-2">
              Drop your PDF here
            </h3>
            <p className="text-dark-400 text-sm mb-4">
              or click to browse from your computer
            </p>
            <p className="text-dark-500 text-xs">
              PDF files up to 50MB
            </p>
          </label>
        </div>
      ) : (
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-primary-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-dark-100 truncate">{file.name}</h4>
                  <p className="text-sm text-dark-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!isUploading && !isComplete && (
                  <button
                    onClick={removeFile}
                    className="p-1 rounded hover:bg-dark-800 text-dark-400 hover:text-dark-200 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {isUploading && (
                <div className="mt-4">
                  <Progress value={uploadProgress} size="sm" />
                  <p className="text-xs text-dark-400 mt-2">Uploading... {uploadProgress}%</p>
                </div>
              )}

              {isComplete && (
                <div className="flex items-center gap-2 mt-4 text-primary-500">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Upload complete! Processing will begin shortly.</span>
                </div>
              )}
            </div>
          </div>

          {!isUploading && !isComplete && (
            <div className="mt-6 flex gap-3">
              <Button onClick={handleUpload} className="flex-1">
                Upload & Process
              </Button>
              <Button variant="secondary" onClick={removeFile}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
