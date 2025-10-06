"use client"

import { useState, useEffect } from "react"
import { Camera, Share, Edit3, Trash2 } from "lucide-react"
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { Share as CapacitorShare } from '@capacitor/share'

// Extend Window interface for Capacitor
declare global {
  interface Window {
    Capacitor?: {
      platform: string
    }
  }
}

// Simple photo type
interface Photo {
  id: string
  title: string
  timestamp: number
  filePath: string
  webPath?: string
}

// Capacitor-based photo gallery hook
function usePhotoGallery() {
  const [photos, setPhotos] = useState<Photo[]>([])

  // Load photos from Capacitor Preferences on mount
  useEffect(() => {
    loadPhotos()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadPhotos = async () => {
    try {
      const { value } = await Preferences.get({ key: 'photo-gallery' })
      if (value) {
        const loadedPhotos = JSON.parse(value)
        
        // Enhanced migration: Fix old photos with invalid paths
        const migratedPhotos = loadedPhotos.map((photo: Photo) => {
          // Remove photos with filesystem paths that don't work on web
          if (photo.webPath && (
            photo.webPath.includes('/DOCUMENTS/') || 
            photo.webPath.includes('file://') ||
            photo.webPath.startsWith('http://localhost') ||
            photo.webPath.includes('photo_') && !photo.webPath.startsWith('data:')
          )) {
            console.log('Removing broken photo:', photo.id)
            return null
          }
          
          // Remove photos with invalid filePath that don't start with data:
          if (photo.filePath && !photo.filePath.startsWith('data:') && (
            photo.filePath.includes('/DOCUMENTS/') ||
            photo.filePath.includes('file://') ||
            photo.filePath.includes('photo_')
          )) {
            console.log('Removing broken photo with invalid filePath:', photo.id)
            return null
          }
          
          return photo
        }).filter(Boolean) // Remove null entries
        
        setPhotos(migratedPhotos)
        
        // Save migrated photos back to storage if any were removed
        if (migratedPhotos.length !== loadedPhotos.length) {
          console.log(`Migration: Removed ${loadedPhotos.length - migratedPhotos.length} broken photos`)
          await savePhotos(migratedPhotos)
        }
      }
    } catch (error) {
      console.error('Error loading photos:', error)
      // Reset to empty array if corrupted data
      setPhotos([])
      await Preferences.remove({ key: 'photo-gallery' })
    }
  }

  // Save photos to Capacitor Preferences whenever photos change
  const savePhotos = async (photoList: Photo[]) => {
    try {
      await Preferences.set({ 
        key: 'photo-gallery', 
        value: JSON.stringify(photoList) 
      })
    } catch (error) {
      console.error('Error saving photos:', error)
    }
  }

  const takePhoto = async (title: string, imageData: string) => {
    try {
      // Force web behavior when running in browser environment
      // Check for browser-specific APIs that don't exist in native mobile
      const isBrowserEnvironment = typeof window !== 'undefined' && 
                                   typeof document !== 'undefined' && 
                                   typeof navigator !== 'undefined' &&
                                   'userAgent' in navigator

      // Enhanced platform detection with browser environment check
      const hasCapacitor = !!window.Capacitor
      const capacitorPlatform = window.Capacitor?.platform
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.port !== ''
      )
      const isHttp = typeof window !== 'undefined' && window.location.protocol === 'http:'
      
      // Force web behavior for ANY browser environment (development OR production)
      const isWeb = isBrowserEnvironment || 
                   !hasCapacitor || 
                   capacitorPlatform === 'web' || 
                   isLocalhost || 
                   isHttp ||
                   (typeof window !== 'undefined' && window.location.href.includes('localhost'))
      
      console.log('=== Photo Capture Debug ===')
      console.log('isBrowserEnvironment:', isBrowserEnvironment)
      console.log('hasCapacitor:', hasCapacitor)
      console.log('capacitorPlatform:', capacitorPlatform)
      console.log('isLocalhost:', isLocalhost)
      console.log('isHttp:', isHttp)
      console.log('location.href:', window.location.href)
      console.log('userAgent:', navigator.userAgent)
      console.log('FINAL isWeb decision:', isWeb)
      console.log('imageData length:', imageData.length)
      console.log('========================')
      
      // ALWAYS use web storage when in browser (even with Capacitor present)
      if (isWeb) {
        // For web: store base64 image directly
        const newPhoto: Photo = {
          id: Date.now().toString(),
          title,
          timestamp: Date.now(),
          filePath: `data:image/jpeg;base64,${imageData}`,
          webPath: `data:image/jpeg;base64,${imageData}`
        }
        
        console.log('✅ Created WEB photo:', newPhoto.id, 'webPath type:', typeof newPhoto.webPath, 'starts with data:', newPhoto.webPath?.startsWith('data:'))
        
        const updatedPhotos = [newPhoto, ...photos]
        setPhotos(updatedPhotos)
        await savePhotos(updatedPhotos)
      } else {
        // For mobile: save to filesystem
        const fileName = `photo_${Date.now()}.jpeg`
        const savedFile = await Filesystem.writeFile({
          path: fileName,
          data: imageData,
          directory: Directory.Documents
        })

        // Get web path for display
        const webPath = await Filesystem.getUri({
          directory: Directory.Documents,
          path: fileName
        })

        const newPhoto: Photo = {
          id: Date.now().toString(),
          title,
          timestamp: Date.now(),
          filePath: savedFile.uri,
          webPath: webPath.uri
        }
        
        console.log('📱 Created MOBILE photo:', newPhoto.id, 'webPath:', newPhoto.webPath)
        
        const updatedPhotos = [newPhoto, ...photos]
        setPhotos(updatedPhotos)
        await savePhotos(updatedPhotos)
      }
    } catch (error) {
      console.error('Error saving photo:', error)
      // Fallback: save as base64 in case of any error
      const newPhoto: Photo = {
        id: Date.now().toString(),
        title,
        timestamp: Date.now(),
        filePath: `data:image/jpeg;base64,${imageData}`,
        webPath: `data:image/jpeg;base64,${imageData}`
      }
      
      console.log('Created fallback photo:', newPhoto.id)
      
      const updatedPhotos = [newPhoto, ...photos]
      setPhotos(updatedPhotos)
      await savePhotos(updatedPhotos)
    }
  }

  const deletePhoto = async (photo: Photo) => {
    try {
      // Force web behavior when running in browser environment (same logic as takePhoto)
      const isBrowserEnvironment = typeof window !== 'undefined' && 
                                   typeof document !== 'undefined' && 
                                   typeof navigator !== 'undefined' &&
                                   'userAgent' in navigator

      const hasCapacitor = !!window.Capacitor
      const capacitorPlatform = window.Capacitor?.platform
      const isLocalhost = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.port !== ''
      )
      const isHttp = typeof window !== 'undefined' && window.location.protocol === 'http:'
      
      const isWeb = isBrowserEnvironment || 
                   !hasCapacitor || 
                   capacitorPlatform === 'web' || 
                   isLocalhost || 
                   isHttp ||
                   (typeof window !== 'undefined' && window.location.href.includes('localhost'))
      
      if (!isWeb && !photo.filePath.startsWith('data:')) {
        // For mobile: delete from filesystem (only if it's not a base64 image)
        try {
          await Filesystem.deleteFile({
            path: photo.filePath,
            directory: Directory.Documents
          })
        } catch {
          console.log('File already deleted or does not exist:', photo.id)
        }
      }
      // For web or base64 images, just remove from state (no file to delete)
    } catch (error) {
      console.error('Error in deletePhoto:', error)
    }
    
    const updatedPhotos = photos.filter(p => p.id !== photo.id)
    setPhotos(updatedPhotos)
    await savePhotos(updatedPhotos)
  }

  const editTitle = async (photoId: string, newTitle: string) => {
    const updatedPhotos = photos.map(p => 
      p.id === photoId ? {...p, title: newTitle} : p
    )
    setPhotos(updatedPhotos)
    await savePhotos(updatedPhotos)
  }

  return { photos, takePhoto, deletePhoto, editTitle }
}

// Capacitor Camera Component
function CameraCapture({ onCapture }: { onCapture: (title: string, imageData: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [capturedImageData, setCapturedImageData] = useState<string | null>(null)
  const [caption, setCaption] = useState("")

  const handleTakePhoto = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        width: 500,
        height: 500
      })
      
      if (image.base64String) {
        setCapturedPhoto(`data:image/jpeg;base64,${image.base64String}`)
        setCapturedImageData(image.base64String)
        setIsOpen(true)
      }
    } catch (error: unknown) {
      // Check if user cancelled - this is normal behavior, not an error
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage && (
        errorMessage.includes('cancelled') || 
        errorMessage.includes('canceled') ||
        errorMessage.includes('User cancelled') ||
        errorMessage.includes('User canceled')
      )) {
        console.log('User cancelled photo capture')
        return // Just return silently, no fallback needed
      }
      
      console.error('Error taking photo:', error)
      // Only use fallback for actual camera errors, not user cancellation
      try {
        const response = await fetch(`https://picsum.photos/400/600?random=${Date.now()}`)
        const blob = await response.blob()
        const reader = new FileReader()
        
        reader.onloadend = () => {
          const base64data = reader.result as string
          console.log('Fallback image created, base64 length:', base64data.length)
          setCapturedPhoto(base64data)
          setCapturedImageData(base64data.split(',')[1]) // Remove data:image/jpeg;base64, prefix
          setIsOpen(true)
        }
        
        reader.readAsDataURL(blob)
      } catch (fallbackError) {
        console.error('Fallback image creation failed:', fallbackError)
      }
    }
  }

  const handlePost = () => {
    if (capturedPhoto && capturedImageData) {
      onCapture(caption.trim() || "", capturedImageData)
      setCapturedPhoto(null)
      setCapturedImageData(null)
      setCaption("")
      setIsOpen(false)
    }
  }

  const handleCancel = () => {
    setCapturedPhoto(null)
    setCapturedImageData(null)
    setCaption("")
    setIsOpen(false)
  }

  return (
    <>
      {/* Locket-style camera button */}
      <button
        onClick={handleTakePhoto}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white text-black rounded-full w-20 h-20 shadow-2xl hover:scale-105 flex items-center justify-center transition-all duration-200"
      >
        <Camera size={28} strokeWidth={1.5} />
      </button>

      {isOpen && capturedPhoto && (
        <div className="fixed inset-0 bg-black z-50">
          {/* Minimal header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-6">
            <button
              onClick={handleCancel}
              className="text-white/80 hover:text-white transition-all"
            >
              <span className="text-lg">✕</span>
            </button>
            <button
              onClick={handlePost}
              className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-100 transition-all"
            >
              Share
            </button>
          </div>

          {/* Photo with frame */}
          <div className="h-full flex flex-col items-center justify-center p-8 pt-20">
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={capturedPhoto}
                alt="Captured photo"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Caption below photo */}
            <div className="w-full max-w-sm mt-6">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full bg-white/10 backdrop-blur-lg text-white placeholder-white/60 text-base p-4 rounded-2xl resize-none border-none outline-none"
                rows={2}
                maxLength={150}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Grid Gallery
function GridGallery({ photos, onDelete, onEditTitle, onModalChange }: { 
  photos: Photo[], 
  onDelete: (photo: Photo) => void, 
  onEditTitle: (photoId: string, newTitle: string) => void,
  onModalChange: (isOpen: boolean) => void
}) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null)
  const [editTitle, setEditTitle] = useState("")

  // Update modal state when photo is selected/deselected
  useEffect(() => {
    onModalChange(!!selectedPhoto)
  }, [selectedPhoto, onModalChange])

  // Minimum swipe distance
  const minSwipeDistance = 50

  // Navigation functions
  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      setSelectedPhoto(photos[nextIndex])
    }
  }

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1
      setCurrentIndex(prevIndex)
      setSelectedPhoto(photos[prevIndex])
    }
  }

  // Touch events for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientY)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isUpSwipe = distance > minSwipeDistance
    const isDownSwipe = distance < -minSwipeDistance

    if (isUpSwipe) {
      goToNext()
    }
    if (isDownSwipe) {
      goToPrevious()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    if (!selectedPhoto) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        goToNext()
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        goToPrevious()
      } else if (e.key === 'Escape') {
        setSelectedPhoto(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedPhoto, currentIndex, photos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle photo selection from grid
  const handlePhotoClick = (photo: Photo) => {
    const index = photos.findIndex(p => p.id === photo.id)
    setCurrentIndex(index)
    setSelectedPhoto(photo)
  }

  // Edit caption functions
  const handleEdit = () => {
    if (selectedPhoto) {
      setEditTitle(selectedPhoto.title)
      setEditingPhoto(selectedPhoto)
    }
  }

  const handleSaveEdit = () => {
    if (editingPhoto && editTitle.trim()) {
      onEditTitle(editingPhoto.id, editTitle)
      setEditingPhoto(null)
      // Update selected photo title
      setSelectedPhoto(prev => prev ? {...prev, title: editTitle} : null)
    }
  }

  if (photos.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Camera size={80} className="text-white/60 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">No memories yet</h2>
          <p className="text-gray-300 mb-6">Tap the camera button to capture your first moment</p>
          
          
            
          </div>
        </div>
      
    )
  }

  return (
    <>
      <div className="min-h-screen p-4 bg-black">
        <h1 className="text-2xl font-bold text-center mb-6 text-white">My Memories</h1>
        <div className="grid grid-cols-3 gap-2 max-w-4xl mx-auto">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-gray-800">
              <img
                src={photo.webPath}
                alt={photo.title}
                className="w-full aspect-square object-cover cursor-pointer hover:opacity-80 transition-all"
                onClick={() => handlePhotoClick(photo)}
                onError={() => {
                  console.log('Image load error for photo:', photo.id)
                  // Only auto-delete if it's not a data: URL (base64)
                  if (!photo.webPath?.startsWith('data:')) {
                    console.log('Removing broken photo with invalid path:', photo.id)
                    onDelete(photo)
                  }
                }}
              />
              <div className="p-2">
                <h3 className="font-medium text-sm mb-1 text-white truncate">{photo.title}</h3>
                <p className="text-gray-400 text-xs">
                  {new Date(photo.timestamp).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo Preview Modal with Navigation */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black z-50"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-6">
            <button
              onClick={() => setSelectedPhoto(null)}
              className="text-white/80 hover:text-white transition-all"
            >
              <span className="text-lg">✕</span>
            </button>
            
            {/* Photo counter */}
            <div className="text-white text-sm">
              {currentIndex + 1} / {photos.length}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    // Check if running on web or mobile
                    const isWeb = !window.Capacitor || 
                                 window.Capacitor.platform === 'web' || 
                                 (typeof window !== 'undefined' && window.location.protocol === 'http:') ||
                                 (typeof window !== 'undefined' && window.location.hostname === 'localhost')
                    
                    if (isWeb && selectedPhoto.webPath?.startsWith('data:')) {
                      // For web with base64 images, use Web Share API without URL
                      if (navigator.share) {
                        // Convert base64 to blob for sharing
                        const response = await fetch(selectedPhoto.webPath)
                        const blob = await response.blob()
                        const file = new File([blob], `photo_${selectedPhoto.id}.jpg`, { type: 'image/jpeg' })
                        
                        await navigator.share({
                          title: selectedPhoto.title || 'Shared Photo',
                          text: selectedPhoto.title || 'Check out this photo!',
                          files: [file]
                        })
                      } else {
                        // Fallback: copy to clipboard
                        navigator.clipboard.writeText(selectedPhoto.title || 'Check out this photo!')
                        alert('Photo info copied to clipboard!')
                      }
                    } else {
                      // For mobile with filesystem, use Capacitor Share
                      await CapacitorShare.share({
                        title: selectedPhoto.title,
                        text: selectedPhoto.title,
                        url: selectedPhoto.webPath,
                        dialogTitle: 'Share Photo'
                      })
                    }
                  } catch (error) {
                    console.error('Error sharing:', error)
                    // Fallback: copy title to clipboard
                    try {
                      await navigator.clipboard.writeText(selectedPhoto.title || 'Check out this photo!')
                      alert('Photo info copied to clipboard!')
                    } catch (clipboardError) {
                      console.error('Clipboard fallback failed:', clipboardError)
                    }
                  }
                }}
                className="bg-white/10 backdrop-blur-lg text-white p-2 rounded-full hover:bg-white/20 transition-all"
              >
                <Share size={18} strokeWidth={1.5} />
              </button>
              <button
                onClick={handleEdit}
                className="bg-white/10 backdrop-blur-lg text-white p-2 rounded-full hover:bg-white/20 transition-all"
              >
                <Edit3 size={18} strokeWidth={1.5} />
              </button>
              <button
                onClick={() => {
                  onDelete(selectedPhoto)
                  setSelectedPhoto(null)
                }}
                className="bg-red-500/80 backdrop-blur-lg text-white p-2 rounded-full hover:bg-red-500 transition-all"
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Photo with frame */}
          <div className="h-full flex flex-col items-center justify-center p-8 pt-20">
            <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={selectedPhoto.webPath}
                alt={selectedPhoto.title}
                className="w-full h-full object-cover"
                onError={() => {
                  console.log('Modal image load error for photo:', selectedPhoto.id)
                  // Only auto-delete if it's not a data: URL (base64)
                  if (!selectedPhoto.webPath?.startsWith('data:')) {
                    console.log('Removing broken modal photo with invalid path:', selectedPhoto.id)
                    onDelete(selectedPhoto)
                    setSelectedPhoto(null)
                  }
                }}
              />
            </div>

            {/* Caption below photo */}
            {selectedPhoto.title && (
              <div className="w-full max-w-sm mt-6">
                <div className="bg-white/10 backdrop-blur-lg text-white text-base p-4 rounded-2xl">
                  {selectedPhoto.title}
                </div>
              </div>
            )}

            {/* Date */}
            <p className="text-white/60 text-sm mt-3">
              {new Date(selectedPhoto.timestamp).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Navigation indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, index) => (
              <div
                key={index}
                className={`w-1 h-1 rounded-full transition-all ${
                  index === currentIndex ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>

          {/* Swipe hint */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/50 text-xs">
            Swipe up/down or use arrow keys
          </div>
        </div>
      )}

      {/* Edit Modal for Grid */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-lg font-light mb-4 text-white">Edit Caption</h2>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full p-3 bg-white/10 text-white placeholder-white/60 rounded-xl border-none outline-none"
              placeholder="Add a caption..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveEdit()}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setEditingPhoto(null)}
                className="flex-1 p-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all font-light"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 p-3 bg-white text-black rounded-xl hover:bg-gray-100 transition-all font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function Home() {
  const { photos, takePhoto, deletePhoto, editTitle } = usePhotoGallery()
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Debug platform detection on component mount
  useEffect(() => {
    console.log('=== Platform Debug ===')
    console.log('window.Capacitor:', window.Capacitor)
    console.log('window.Capacitor?.platform:', window.Capacitor?.platform)
    console.log('window.location.protocol:', window.location.protocol)
    console.log('window.location.href:', window.location.href)
    const isWeb = !window.Capacitor || window.Capacitor.platform === 'web' || typeof window !== 'undefined' && window.location.protocol === 'http:'
    console.log('Detected as web:', isWeb)
    console.log('=== End Platform Debug ===')
  }, [])

  return (
    <main className="min-h-screen bg-black">
      {/* Gallery Views */}
      <GridGallery 
        photos={photos} 
        onDelete={deletePhoto} 
        onEditTitle={editTitle}
        onModalChange={setIsModalOpen}
      />
      
      {/* Camera button - hide when modal is open */}
      {!isModalOpen && <CameraCapture onCapture={takePhoto} />}
    </main>
  )
}