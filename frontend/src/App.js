import React, { useState } from 'react';
import PdfUpload from './components/PdfUpload';
import ChatInterface from './components/ChatInterface';
import './index.css';

function App() {
  const [pdfProcessed, setPdfProcessed] = useState(false);
  const [uploadedFile, setUploadedFile] = useState('');

  const handlePdfProcessed = (filename) => {
    setPdfProcessed(true);
    setUploadedFile(filename);
  };

  const handleNewUpload = () => {
    setPdfProcessed(false);
    setUploadedFile('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            PDF Chat Bot
          </h1>
          <p className="text-gray-600 text-lg">
            Upload a PDF and ask questions about its content
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {!pdfProcessed ? (
            <PdfUpload onPdfProcessed={handlePdfProcessed} />
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="bg-green-100 rounded-full p-2 mr-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </div>
                    <div>
                      <p className="text-green-800 font-medium">PDF Processed Successfully!</p>
                      <p className="text-green-600 text-sm">File: {uploadedFile}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleNewUpload}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Upload New PDF
                  </button>
                </div>
              </div>
              <ChatInterface />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App; 