import { useState } from 'react'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { storage } from '@/lib/firebase/config'

interface UploadResult {
  url: string
  path: string
  name: string
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function uploadFile(
    file: File,
    path: string
  ): Promise<UploadResult> {
    setUploading(true)
    setProgress(0)

    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path)
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          )
          setProgress(pct)
        },
        (error) => {
          setUploading(false)
          reject(error)
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref)
          setUploading(false)
          setProgress(100)
          resolve({
            url,
            path,
            name: file.name,
          })
        }
      )
    })
  }

  async function deleteFile(path: string): Promise<void> {
    const storageRef = ref(storage, path)
    await deleteObject(storageRef)
  }

  return { uploadFile, deleteFile, uploading, progress }
}