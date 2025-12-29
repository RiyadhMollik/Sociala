import { useState, useRef } from 'react';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<boolean>;
}

export default function AddStoryModal({ isOpen, onClose, onSubmit }: AddStoryModalProps) {
  const [storyType, setStoryType] = useState<'text' | 'image' | 'video'>('text');
  const [textContent, setTextContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#3b82f6');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#14b8a6', // teal
    '#f97316', // orange
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    const formData = new FormData();

    if (storyType === 'text') {
      if (!textContent.trim()) {
        alert('Please enter some text');
        return;
      }
      formData.append('text_content', textContent);
      formData.append('background_color', backgroundColor);
    } else if (storyType === 'image') {
      if (!selectedFile) {
        alert('Please select an image');
        return;
      }
      formData.append('image', selectedFile);
    } else if (storyType === 'video') {
      if (!selectedFile) {
        alert('Please select a video');
        return;
      }
      formData.append('video', selectedFile);
    }

    setUploading(true);
    const success = await onSubmit(formData);
    setUploading(false);

    if (success) {
      handleClose();
    }
  };

  const handleClose = () => {
    setTextContent('');
    setBackgroundColor('#3b82f6');
    setSelectedFile(null);
    setPreview(null);
    setStoryType('text');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Story</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Story Type Selector */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setStoryType('text')}
            className={`flex-1 py-3 text-sm font-medium ${
              storyType === 'text' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            Text
          </button>
          <button
            onClick={() => setStoryType('image')}
            className={`flex-1 py-3 text-sm font-medium ${
              storyType === 'image' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            Image
          </button>
          <button
            onClick={() => setStoryType('video')}
            className={`flex-1 py-3 text-sm font-medium ${
              storyType === 'video' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'
            }`}
          >
            Video
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {storyType === 'text' && (
            <div className="space-y-4">
              {/* Preview */}
              <div 
                className="h-64 rounded-xl flex items-center justify-center p-6"
                style={{ backgroundColor }}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Write your story..."
                  className="w-full h-full bg-transparent text-white text-2xl font-bold text-center placeholder-white/60 outline-none resize-none"
                  maxLength={500}
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                <div className="flex space-x-2">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBackgroundColor(color)}
                      className={`w-10 h-10 rounded-full ${
                        backgroundColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {(storyType === 'image' || storyType === 'video') && (
            <div className="space-y-4">
              {preview ? (
                <div className="h-64 rounded-xl overflow-hidden bg-gray-100">
                  {storyType === 'image' ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <video src={preview} className="w-full h-full object-cover" controls />
                  )}
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="h-64 w-full rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center hover:border-blue-500 transition"
                >
                  <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="text-gray-600 font-medium">
                    {storyType === 'image' ? 'Add Photo' : 'Add Video'}
                  </span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={storyType === 'image' ? 'image/*' : 'video/*'}
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFile && (
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                  className="w-full py-2 text-red-600 font-medium"
                >
                  Remove {storyType}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Sharing...' : 'Share Story'}
          </button>
        </div>
      </div>
    </div>
  );
}
