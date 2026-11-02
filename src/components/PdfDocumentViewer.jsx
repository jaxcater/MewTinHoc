import React from 'react';

// Replace PDF.js entirely with native browser iframe rendering for universal
// compatibility. Works on all browsers without worker, CORS, or MIME issues.
export default function PdfDocumentViewer({ src, zoom = 100, title }) {
  // Construct Google Docs Viewer URL as fallback for better mobile rendering
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`;
  
  return (
    <div className="pdf-document-viewer" style={{ 
      width: '100%', 
      height: '100%', 
      overflow: 'auto',
      position: 'relative'
    }}>
      <iframe
        src={src}
        title={title || 'PDF Document'}
        style={{
          width: zoom === 100 ? '100%' : `${zoom}%`,
          height: '100%',
          minHeight: '600px',
          border: 'none',
          display: 'block',
        }}
        onError={(e) => {
          // Fallback to Google Docs Viewer on error
          e.target.src = viewerUrl;
        }}
      />
    </div>
  );
}
