import React, { useState, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { fileToBase64 } from './utils/fileUtils';
import { IconPhotoUp, IconSparkles, IconLoader, IconAlertTriangle } from './components/Icons';

interface Base64Image {
  data: string;
  mimeType: string;
}

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<Base64Image | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY as string }), []);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setEditedImage(null);
      setError(null);
      setFileName(file.name);
      setOriginalImage(URL.createObjectURL(file));
      try {
        const { data, mimeType } = await fileToBase64(file);
        setBase64Image({ data, mimeType });
      } catch (err) {
        setError('Failed to process image file. Please try another one.');
        console.error(err);
      }
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!base64Image || !prompt || isLoading) return;

    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Image.data,
                mimeType: base64Image.mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseModalities: [Modality.IMAGE],
        },
      });

      const generatedPart = response.candidates?.[0]?.content?.parts?.[0];
      if (generatedPart && generatedPart.inlineData) {
        const newBase64 = generatedPart.inlineData.data;
        const newMimeType = generatedPart.inlineData.mimeType;
        setEditedImage(`data:${newMimeType};base64,${newBase64}`);
      } else {
        throw new Error('No image was generated. The model may have refused the request.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred.';
      setError(`Failed to generate image: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [base64Image, prompt, isLoading, ai.models]);

  const ImageCard: React.FC<{ src: string | null; title: string; children?: React.ReactNode }> = ({ src, title, children }) => (
    <div className="bg-gray-800/50 rounded-xl flex flex-col items-center justify-center p-4 border border-gray-700 aspect-square w-full h-full">
      <h3 className="text-lg font-semibold text-gray-300 mb-3 self-start">{title}</h3>
      <div className="w-full h-full flex items-center justify-center relative rounded-lg overflow-hidden bg-gray-900/50">
        {src ? <img src={src} alt={title} className="w-full h-full object-contain" /> : children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-7xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
          Gemini Image <span className="text-purple-400">Editor</span>
        </h1>
        <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
          Upload an image, describe your desired edits, and watch the magic happen. Powered by Gemini 2.5 Flash.
        </p>
      </header>

      <main className="w-full max-w-7xl flex-1 flex flex-col lg:flex-row gap-8">
        {/* Controls */}
        <div className="w-full lg:w-1/3 lg:max-w-md bg-gray-800/70 p-6 rounded-2xl border border-gray-700 shadow-2xl flex flex-col gap-6 lg:sticky lg:top-8 h-fit">
          <div>
            <label htmlFor="image-upload" className="text-lg font-medium text-white mb-2 block">1. Upload Image</label>
            <label htmlFor="image-upload" className="w-full h-32 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 hover:bg-gray-700/50 transition-colors duration-200">
              <IconPhotoUp className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-gray-400 text-sm">{fileName || 'Click to upload a file'}</span>
              <span className="text-gray-500 text-xs mt-1">PNG, JPG, WEBP, etc.</span>
            </label>
            <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          <div>
            <label htmlFor="prompt-input" className="text-lg font-medium text-white mb-2 block">2. Describe Your Edit</label>
            <textarea
              id="prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Add a retro filter, remove the person in the background, or make the lighting more dramatic..."
              className="w-full h-36 p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-colors duration-200 text-gray-200 placeholder-gray-500"
              rows={4}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!originalImage || !prompt || isLoading}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
          >
            {isLoading ? (
              <>
                <IconLoader className="animate-spin w-5 h-5" />
                Generating...
              </>
            ) : (
              <>
                <IconSparkles className="w-5 h-5" />
                Generate
              </>
            )}
          </button>
        </div>

        {/* Image Display */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
          <ImageCard title="Original Image">
            {!originalImage && <p className="text-gray-500 text-center">Upload an image to get started</p>}
          </ImageCard>
          <ImageCard src={editedImage} title="Edited Image">
            {!editedImage && !isLoading && !error && <p className="text-gray-500 text-center">Your generated image will appear here</p>}
            {isLoading && (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <IconLoader className="animate-spin w-10 h-10 mb-4" />
                <p>Gemini is thinking...</p>
              </div>
            )}
             {error && !isLoading && (
                <div className="flex flex-col items-center justify-center text-red-400 p-4 text-center">
                  <IconAlertTriangle className="w-10 h-10 mb-3" />
                  <p className="font-semibold">Generation Failed</p>
                  <p className="text-sm text-red-500 mt-1">{error}</p>
                </div>
              )}
          </ImageCard>
        </div>
      </main>
    </div>
  );
};

export default App;
