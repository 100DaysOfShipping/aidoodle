'use client';

import { useState, useRef, useEffect } from 'react';

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
  const [color, setColor] = useState('#000000');
  const [aiCommand, setAiCommand] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 800;
      canvas.height = 600;
      const context = canvas.getContext('2d');
      if (context) {
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.lineWidth = 5;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        setCtx(context);
      }
    }
  }, []);

  // Drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    
    if (tool === 'pencil') {
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
    } else if (tool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 20;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  // Handle AI command submission
  const handleAiCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCommand.trim() || !canvasRef.current) return;

    setIsLoading(true);
    try {
      // Get canvas data as PNG
      const imageData = canvasRef.current.toDataURL('image/png');
      
      // Send to API
      const response = await fetch('/api/edit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
          command: aiCommand,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Load the returned image onto canvas
        if (data.editedImage) {
          const img = new Image();
          img.onload = () => {
            if (ctx && canvasRef.current) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              ctx.drawImage(img, 0, 0);
            }
          };
          img.src = data.editedImage;
        }
      } else {
        console.error('API request failed');
      }
    } catch (error) {
      console.error('Error processing AI command:', error);
    } finally {
      setIsLoading(false);
      setAiCommand('');
    }
  };

  // Reset canvas function
  const resetCanvas = () => {
    if (!ctx || !canvasRef.current) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  // Download canvas function
  const downloadCanvas = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'ai-doodle.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-100">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-4xl font-bold text-indigo-600">AI Doodle App</h1>
          
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <button
                className={`px-4 py-2 rounded-md ${tool === 'pencil' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                onClick={() => setTool('pencil')}
              >
                Pencil
              </button>
              <button
                className={`px-4 py-2 rounded-md ${tool === 'eraser' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-800'}`}
                onClick={() => setTool('eraser')}
              >
                Eraser
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-500 text-white"
                onClick={resetCanvas}
              >
                Reset
              </button>
              <button
                className="px-4 py-2 rounded-md bg-green-500 text-white"
                onClick={downloadCanvas}
              >
                Download
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="colorPicker" className="text-gray-700">Color:</label>
              <input
                id="colorPicker"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 border-none cursor-pointer"
              />
            </div>
          </div>
        </div>
        
        <div className="relative mb-4">
          <canvas
            ref={canvasRef}
            className="border-4 border-indigo-500 rounded-lg bg-white shadow-lg w-full"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 rounded-lg">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
              <p className="ml-4 text-lg font-medium text-indigo-600">Processing your request...</p>
            </div>
          )}
        </div>
        
        <form onSubmit={handleAiCommandSubmit} className="w-full mb-6">
          <div className="flex items-center border-2 border-indigo-500 rounded-lg overflow-hidden">
            <input
              type="text"
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              placeholder="Enter AI command (e.g., 'draw apple')"
              className="flex-grow px-4 py-2 focus:outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 font-medium hover:bg-indigo-700 transition-colors"
              disabled={isLoading}
            >
              Generate
            </button>
          </div>
        </form>
        
        <div className="text-center text-gray-600">
          <p>Draw something on the canvas and use AI commands to enhance your doodle!</p>
          <p className="text-sm mt-2">Example commands: "draw apple", "add clouds", "turn into cartoon"</p>
        </div>
      </div>
    </main>
  );
}
