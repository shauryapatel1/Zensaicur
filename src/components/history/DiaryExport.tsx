import React, { useState } from 'react';
import HTMLFlipBook from 'react-pageflip';

// Example themes
const THEMES = [
  {
    name: 'Classic',
    background: '#fffbe6',
    color: '#333',
    fontFamily: 'serif',
    border: '1px solid #e0c97f',
    shadow: '0 4px 24px 0 rgba(224,201,127,0.12)',
  },
  {
    name: 'Night',
    background: '#232946',
    color: '#eebbc3',
    fontFamily: 'monospace',
    border: '1px solid #232946',
    shadow: '0 4px 24px 0 rgba(35,41,70,0.18)',
  },
  {
    name: 'Mint',
    background: '#e0f7fa',
    color: '#00695c',
    fontFamily: 'sans-serif',
    border: '1px solid #b2ebf2',
    shadow: '0 4px 24px 0 rgba(0,105,92,0.10)',
  },
  {
    name: 'Lavender Dream',
    background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    color: '#4b2067',
    fontFamily: 'cursive',
    border: '1px solid #b39ddb',
    shadow: '0 4px 24px 0 rgba(179,157,219,0.15)',
    decorative: '🌸',
  },
  {
    name: 'Sunset',
    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    color: '#b3541e',
    fontFamily: 'Georgia, serif',
    border: '1px solid #fcb69f',
    shadow: '0 4px 24px 0 rgba(252,182,159,0.13)',
    decorative: '🌅',
  },
  {
    name: 'Minimalist',
    background: '#f7f7f7',
    color: '#222',
    fontFamily: 'Inter, Arial, sans-serif',
    border: '1px solid #e0e0e0',
    shadow: '0 2px 12px 0 rgba(0,0,0,0.06)',
    decorative: '📝',
  },
];

interface DiaryExportProps {
  entries: Array<{
    id: string;
    title: string | null;
    content: string;
    mood: string;
    created_at: string;
    photo_filename?: string | null;
    signedPhotoUrl?: string | null;
  }>;
  theme: string;
  coverTitle: string;
  coverImage: string | null;
}

const DiaryExport: React.FC<DiaryExportProps> = ({ entries, theme, coverTitle, coverImage }) => {
  const themeObj = THEMES.find(t => t.name === theme) || THEMES[0];

  return (
    <div className="diary-export-modal p-4">
      <HTMLFlipBook
        width={350}
        height={500}
        size="stretch"
        minWidth={315}
        minHeight={420}
        maxWidth={600}
        maxHeight={800}
        drawShadow={true}
        className="shadow-xl mx-auto"
        showCover={true}
        style={{}}
        startPage={0}
        flippingTime={1000}
        usePortrait={true}
        startZIndex={0}
        autoSize={true}
        maxShadowOpacity={1}
        mobileScrollSupport={true}
        clickEventForward={true}
        useMouseEvents={true}
        swipeDistance={30}
        showPageCorners={true}
        disableFlipByClick={false}
      >
        {/* Cover Page */}
        <div
          key="cover"
          style={{
            background: themeObj.background,
            color: themeObj.color,
            fontFamily: themeObj.fontFamily,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 32,
            border: themeObj.border,
            boxShadow: themeObj.shadow,
            position: 'relative',
          }}
        >
          {themeObj.decorative && (
            <div style={{ position: 'absolute', top: 16, right: 24, fontSize: 32, opacity: 0.18 }}>
              {themeObj.decorative}
            </div>
          )}
          {coverImage && <img src={coverImage} alt="Cover" className="mb-4 w-40 h-40 object-cover rounded shadow" />}
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: themeObj.fontFamily }}>{coverTitle}</h1>
          <p className="text-lg">{new Date().toLocaleDateString()}</p>
        </div>
        {/* Entry Pages */}
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            style={{
              background: themeObj.background,
              color: themeObj.color,
              fontFamily: themeObj.fontFamily,
              padding: 32,
              minHeight: 500,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              border: themeObj.border,
              boxShadow: themeObj.shadow,
              position: 'relative',
            }}
          >
            {themeObj.decorative && (
              <div style={{ position: 'absolute', top: 16, right: 24, fontSize: 28, opacity: 0.13 }}>
                {themeObj.decorative}
              </div>
            )}
            <div className="mb-2 text-xs opacity-70">{new Date(entry.created_at).toLocaleDateString()}</div>
            <h2 className="text-xl font-semibold mb-2">{entry.title || 'Untitled Entry'}</h2>
            <div className="mb-2 italic text-sm">Mood: {entry.mood}</div>
            {entry.signedPhotoUrl && (
              <img src={entry.signedPhotoUrl} alt="Entry" className="mb-2 w-32 h-32 object-cover rounded shadow" />
            )}
            <div className="whitespace-pre-line text-base mb-8">{entry.content}</div>
            {/* Page number */}
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              width: '100%',
              textAlign: 'center',
              fontSize: 14,
              color: themeObj.color,
              opacity: 0.4,
              letterSpacing: 2,
            }}>
              Page {idx + 1}
            </div>
          </div>
        ))}
      </HTMLFlipBook>
    </div>
  );
};

export default DiaryExport; 