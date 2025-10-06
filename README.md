# Phát triển ứng dụng di động đa nền tảng (1) - Bùi Đình Trung - 22IT316
# 📸 Photo Journal

A modern, responsive photo gallery app built with Next.js and Capacitor, featuring cross-platform photo capture and management capabilities.

## ✨ Features

- **Cross-Platform Camera**: Take photos on both web and mobile devices
- **Grid Gallery**: Responsive grid layout with 3 photos per row (desktop & mobile)
- **Square Photos**: Consistent square aspect ratio for all photos
- **Smart Storage**: Base64 storage for web, filesystem for mobile apps
- **Photo Management**: Add captions, edit titles, delete photos
- **Native Sharing**: Share photos using Web Share API or Capacitor Share
- **Dark Theme**: Elegant dark interface with glass morphism effects
- **Touch Gestures**: Swipe navigation and touch interactions
- **PWA Ready**: Progressive Web App capabilities with camera support

## 🛠️ Tech Stack

- **Frontend Framework:** Next.js 15.2.4 with App Router
- **Styling:** Tailwind CSS v4 with custom components
- **Mobile Framework:** Capacitor for native mobile features
- **Icons:** Lucide React
- **Camera Support:** @capacitor/camera + @ionic/pwa-elements
- **Storage:** @capacitor/preferences with localStorage fallback
- **Deployment:** Vercel (web) + Capacitor Build (mobile)

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Android Studio (for Android builds)
- Xcode (for iOS builds)

### Setup
```bash
# Clone repository
git clone https://github.com/chouthi/Photo_Journal.git
cd Photo_Journal

# Install dependencies
npm install

# Install Capacitor dependencies
npm install @capacitor/camera @capacitor/filesystem @capacitor/preferences @capacitor/share @ionic/pwa-elements

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the app in action.

## 🎯 Key Components

### 📸 Camera Capture
- **Web**: Uses PWA Elements for camera access in browsers
- **Mobile**: Native camera API through Capacitor
- **Fallback**: Random demo images for development/testing

### 🖼️ Photo Storage
- **Web Platform**: Base64 encoding stored in Capacitor Preferences
- **Mobile Platform**: File system storage with secure paths
- **Migration**: Automatic cleanup of invalid photo references

### 🎨 UI/UX Features
- **Responsive Grid**: 3 columns on all screen sizes
- **Square Aspect Ratio**: Consistent 1:1 ratio for all photos
- **Glass Morphism**: Modern frosted glass effects
- **Touch Navigation**: Swipe gestures for photo browsing
- **Modal Previews**: Full-screen photo viewing with navigation


