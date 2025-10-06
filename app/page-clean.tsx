"use client"

import { usePhotoGallery } from "@/hooks/usePhotoGallery"
import { CameraCapture } from "@/components/camera-capture"
import { Gallery } from "@/components/gallery"
import { ClientOnly } from "@/components/client-only"

export default function Home() {
  const { photos, takePhoto, deletePhoto, editTitle, sharePhoto } = usePhotoGallery()

  return (
    <ClientOnly fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl">📸</div>
          <p className="mt-2">Loading your memories...</p>
        </div>
      </main>
    }>
      <main className="min-h-screen">
        <Gallery photos={photos} onDelete={deletePhoto} onEditTitle={editTitle} onShare={sharePhoto} />
        <CameraCapture onCapture={takePhoto} />
      </main>
    </ClientOnly>
  )
}