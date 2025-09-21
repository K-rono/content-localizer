import React, { useState } from 'react';

const ContextForm = ({ file, onSubmit, onBack }) => {
  const [formData, setFormData] = useState({
    targetLanguage: 'malay',
    contentType: 'marketing',
    tone: 'professional',
    specialNotes: ''
  });

  const languages = [
    { value: 'malay', label: 'Malay (Bahasa Malaysia)' },
    { value: 'mandarin', label: 'Mandarin (中文)' },
    { value: 'tamil', label: 'Tamil (தமிழ்)' },
    { value: 'english', label: 'English' }
  ];

  const contentTypes = [
    { value: 'marketing', label: 'Marketing' },
    { value: 'technical', label: 'Technical' },
    { value: 'casual', label: 'Casual' }
  ];

  const tones = [
    { value: 'formal', label: 'Formal' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'professional', label: 'Professional' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Context Engineering</h2>
        <p className="text-gray-600">Configure how your content should be localized</p>
      </div>

      {/* File Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {file?.type.startsWith('image/') && (
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {file?.type.startsWith('video/') && (
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {file?.type === 'text/plain' && (
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{file?.name}</h3>
            <p className="text-sm text-gray-500 capitalize">
              {file?.type.split('/')[0]} file • {(file?.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Target Language */}
        <div>
          <label htmlFor="targetLanguage" className="block text-sm font-medium text-gray-700 mb-2">
            Target Language
          </label>
          <select
            id="targetLanguage"
            name="targetLanguage"
            value={formData.targetLanguage}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Content Type */}
        <div>
          <label htmlFor="contentType" className="block text-sm font-medium text-gray-700 mb-2">
            Content Type
          </label>
          <select
            id="contentType"
            name="contentType"
            value={formData.contentType}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {contentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tone */}
        <div>
          <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
            Tone
          </label>
          <select
            id="tone"
            name="tone"
            value={formData.tone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {tones.map(tone => (
              <option key={tone.value} value={tone.value}>
                {tone.label}
              </option>
            ))}
          </select>
        </div>

        {/* Special Notes */}
        <div>
          <label htmlFor="specialNotes" className="block text-sm font-medium text-gray-700 mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            id="specialNotes"
            name="specialNotes"
            value={formData.specialNotes}
            onChange={handleChange}
            rows={4}
            placeholder="Add any specific instructions for the localization process..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Context Summary */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Localization Summary</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><span className="font-medium">Language:</span> {languages.find(l => l.value === formData.targetLanguage)?.label}</p>
            <p><span className="font-medium">Type:</span> {contentTypes.find(t => t.value === formData.contentType)?.label}</p>
            <p><span className="font-medium">Tone:</span> {tones.find(t => t.value === formData.tone)?.label}</p>
            {formData.specialNotes && (
              <p><span className="font-medium">Notes:</span> {formData.specialNotes}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Upload
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Start Localization
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContextForm;
