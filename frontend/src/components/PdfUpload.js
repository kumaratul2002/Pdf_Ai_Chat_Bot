import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function PdfUpload({ onPdfProcessed }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    if (file.type !== 'application/pdf') {
      setUploadStatus('Please select a PDF file');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Processing PDF...');

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await axios.post(`${API_URL}/api/upload-pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadStatus('PDF processed successfully!');
      onPdfProcessed(response.data.filename);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(error.response?.data?.error || 'Failed to process PDF');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center space-y-6">
        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-blue-600 font-medium">{uploadStatus}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
            </div>
            
            <div>
              <h2 className="text-xl font-medium text-gray-700 mb-2">
                Upload your PDF document
              </h2>
              <p className="text-gray-500 mb-6">
                Select a PDF file to upload and chat with its content
              </p>
            </div>

            <div>
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg cursor-pointer inline-flex items-center space-x-2 transition-colors text-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <span>Choose PDF File</span>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>

            {uploadStatus && !isUploading && (
              <p className={`text-sm ${uploadStatus.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {uploadStatus}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 text-sm text-gray-500 text-center">
        <p><strong>Note:</strong> Your PDF will be processed and stored securely. Only PDF files are supported.</p>
      </div>
    </div>
  );
}

export default PdfUpload; 