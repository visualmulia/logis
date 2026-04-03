'use client'

import { useState, useRef } from 'react'
import { useFileUpload } from '@/hooks/useFileUpload'
import { toast } from 'sonner'
import {
  Camera, X, Loader2,
  ImageIcon, ZoomIn
} from 'lucide-react'
import Image from 'next/image'

interface PhotoUploadProps {
  companyId: string
  folder: string // 'petty-cash' | 'requests'
  documentId: string
  existingPhotos?: { url: string; path: string; name: string }[]
  onPhotosChange: (
    photos: { url: string; path: string; name: string }[]
  ) => void
  maxPhotos?: number
  label?: string
}

export default function PhotoUpload({
  companyId,
  folder,
  documentId,
  existingPhotos = [],
  onPhotosChange,
  maxPhotos = 5,
  label = 'Foto Bukti',
}: PhotoUploadProps) {
  const { uploadFile, deleteFile, uploading, progress } = useFileUpload()
  const [photos, setPhotos] = useState(existingPhotos)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maksimal ${maxPhotos} foto`)
      return
    }

    for (const file of files) {
      // Validasi
      if (!file.type.startsWith('image/')) {
        toast.error('Hanya file gambar yang diizinkan')
        continue
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} terlalu besar (maks 5MB)`)
        continue
      }

      try {
        const timestamp = Date.now()
        const path = `logis/${companyId}/${folder}/${documentId}/${timestamp}_${file.name}`
        const result = await uploadFile(file, path)

        const newPhotos = [...photos, result]
        setPhotos(newPhotos)
        onPhotosChange(newPhotos)
        toast.success('Foto berhasil diupload')
      } catch {
        toast.error(`Gagal upload ${file.name}`)
      }
    }

    // Reset input
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleDelete(index: number) {
    const photo = photos[index]
    try {
      await deleteFile(photo.path)
      const newPhotos = photos.filter((_, i) => i !== index)
      setPhotos(newPhotos)
      onPhotosChange(newPhotos)
      toast.success('Foto dihapus')
    } catch {
      toast.error('Gagal menghapus foto')
    }
  }

  return (
    <div>
      <label
        className="block text-xs font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'rgba(245,240,235,0.4)' }}
      >
        {label}
        {maxPhotos > 1 && (
          <span
            className="ml-2 normal-case"
            style={{ color: 'rgba(245,240,235,0.2)' }}
          >
            ({photos.length}/{maxPhotos})
          </span>
        )}
      </label>

      {/* Photo grid */}
      <div className="flex flex-wrap gap-2 mb-3">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="relative group"
            style={{ width: 80, height: 80 }}
          >
            <Image
              src={photo.url}
              alt={photo.name}
              fill
              className="object-cover"
              style={{ border: '1px solid rgba(245,240,235,0.1)' }}
            />
            {/* Overlay actions */}
            <div
              className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.6)' }}
            >
              <button
                type="button"
                onClick={() => setPreview(photo.url)}
                className="p-1"
                style={{ color: '#fff' }}
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(index)}
                className="p-1"
                style={{ color: '#ef4444' }}
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}

        {/* Upload button */}
        {photos.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex flex-col items-center justify-center gap-1 transition-all"
            style={{
              width: 80,
              height: 80,
              border: '1px dashed rgba(245,240,235,0.2)',
              background: uploading
                ? 'rgba(249,115,22,0.05)'
                : 'transparent',
              color: uploading
                ? '#F97316'
                : 'rgba(245,240,235,0.3)',
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span style={{ fontSize: '10px' }}>{progress}%</span>
              </>
            ) : (
              <>
                <Camera size={18} />
                <span style={{ fontSize: '10px' }}>Tambah</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Upload progress bar */}
      {uploading && (
        <div
          className="h-1 w-full mb-3"
          style={{ background: 'rgba(245,240,235,0.08)' }}
        >
          <div
            className="h-full transition-all"
            style={{
              width: `${progress}%`,
              background: '#F97316',
            }}
          />
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full py-6 flex flex-col items-center gap-2 transition-all"
          style={{
            border: '1px dashed rgba(245,240,235,0.15)',
            color: 'rgba(245,240,235,0.25)',
          }}
        >
          <ImageIcon size={24} />
          <span className="text-xs">
            Tap untuk tambah foto bukti
          </span>
          <span className="text-xs opacity-60">
            JPG, PNG • Maks 5MB per foto
          </span>
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={maxPhotos > 1}
        onChange={handleFileSelect}
        className="hidden"
        capture="environment"
      />

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setPreview(null)}
        >
          <div className="relative max-w-lg w-full max-h-screen">
            <Image
              src={preview}
              alt="Preview"
              width={600}
              height={600}
              className="object-contain w-full"
              style={{ maxHeight: '80vh' }}
            />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-2 right-2 p-2"
              style={{
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}