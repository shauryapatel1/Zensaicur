import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, Upload, Image as ImageIcon } from 'lucide-react';
import { ErrorCode, createAppError, getUserFriendlyErrorMessage, safeStorage } from '../types/errors';

/**
 * PhotoUpload - Component for uploading and managing photos
 * 
 * @component
 * @param {function} onPhotoSelect - Function to handle photo selection
 * @param {string|null} [currentPhoto] - URL of current photo
 * @param {boolean} [disabled=false] - Whether the component is disabled
 * @param {string} [className] - Optional CSS class name
 * 
 * @example
 * return (
 *   <PhotoUpload
 *     onPhotoSelect={setSelectedPhoto}
 *     currentPhoto={entry.photo_url}
 *     disabled={isSubmitting}
 *   />
 * )
 */
interface PhotoUploadProps {
  onPhotoSelect: (file: File | null) => void;
  currentPhoto?: string | null;
  disabled?: boolean;
  className?: string;
  onUpsellTrigger?: () => void;
  isPremiumUser?: boolean;
}

const PhotoUpload = React.memo(function PhotoUpload({ 
  onPhotoSelect, 
  currentPhoto,
  disabled = false, 
  className = '',
  onUpsellTrigger = () => {},
  isPremiumUser = true
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isFeatureDisabled = disabled || !isPremiumUser;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setPreview(null);
      setSelectedPhoto(null);
      onPhotoSelect(null);
      return;
    }

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      const typeError = createAppError(
        ErrorCode.MEDIA_INVALID_TYPE,
        'Please select a valid image file (JPEG, PNG, GIF, or WebP)',
        { fileType: file.type }
      );
      alert(getUserFriendlyErrorMessage(typeError));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const sizeError = createAppError(
        ErrorCode.MEDIA_TOO_LARGE,
        'Image must be smaller than 5MB',
        { fileSize: file.size, maxSize: 5 * 1024 * 1024 }
      );
      alert(getUserFriendlyErrorMessage(sizeError));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setSelectedPhoto(file);
    };
    reader.readAsDataURL(file);

    onPhotoSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only handle keyboard events if the feature is enabled
    if (isFeatureDisabled) {
      return;
    }
    
    // Open file dialog on Enter or Space key
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFileDialog();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (isFeatureDisabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isFeatureDisabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const clearPhoto = () => {
    setPreview(null);
    setSelectedPhoto(null);
    onPhotoSelect(null);
    if (fileInputRef && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    if (isFeatureDisabled) return;
    
    if (!isPremiumUser && onUpsellTrigger) {
      onUpsellTrigger('Premium Features', 'Get unlimited access to all features including photo uploads');
      return;
    }
    
    fileInputRef.current?.click();
  };

  return (
    <div className={`${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={isFeatureDisabled}
      />

      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="relative group"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-zen-sage-200">
              <img
                src={preview}
                alt={selectedPhoto?.name ? `Journal photo: ${selectedPhoto.name}` : "Uploaded journal photo"}
                className="w-full h-48 object-cover"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex space-x-2">
                  <button
                    onClick={openFileDialog}
                    disabled={disabled}
                    aria-label="Change photo"
                    className="p-2 bg-white/90 text-zen-sage-700 rounded-full hover:bg-white transition-colors shadow-lg"
                    title="Change photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    aria-label="Remove photo"
                    onClick={clearPhoto}
                    disabled={disabled}
                    className="p-2 bg-white/90 text-red-600 rounded-full hover:bg-white transition-colors shadow-lg"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="upload" 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`
              relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${!isFeatureDisabled ? 'cursor-pointer' : 'cursor-not-allowed'}
              ${isDragging 
                ? 'border-zen-mint-400 bg-zen-mint-50' 
                : 'border-zen-sage-300 hover:border-zen-mint-400 hover:bg-zen-mint-50/50'
              }
              ${isFeatureDisabled ? 'opacity-50' : ''}
            `}
            role="button"
            tabIndex={isFeatureDisabled ? -1 : 0}
            aria-label="Upload photo by clicking or dragging an image file"
            aria-disabled={isFeatureDisabled}
            onKeyDown={handleKeyDown}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFileDialog}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-colors
                ${isDragging ? 'bg-zen-mint-200' : 'bg-zen-sage-100 dark:bg-gray-700'}
              `}>
                {isDragging ? (
                  <Upload className="w-6 h-6 text-zen-mint-600" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-zen-sage-600" />
                )}
              </div>
              
              <div>
                {!isPremiumUser && (
                  <span className="absolute top-2 right-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium">
                    Trial Expired
                  </span>
                )}
                <p className="font-medium text-zen-sage-700 dark:text-gray-300 mb-1">
                  {isDragging ? 'Drop your photo here' : 'Add a photo to your entry'}
                </p>
                <p className="text-sm text-zen-sage-500 dark:text-gray-400">
                  Drag & drop or click to browse • Max 5MB
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default PhotoUpload;