'use client';

import { useState, useRef, useEffect } from 'react';
// Import icons
import { FaPencilAlt, FaEraser, FaTrash, FaDownload } from 'react-icons/fa';

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
    
    // Calculate position with proper scaling
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
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
    
    // Calculate position with proper scaling
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    ctx.lineTo(x, y);
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
      const response = await fetch('/api/edit2', {
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
              // Get canvas dimensions
              const canvasWidth = canvasRef.current.width;
              const canvasHeight = canvasRef.current.height;
              
              // Clear the canvas and fill with white
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);
              
              // Draw the image at full canvas size without trying to preserve aspect ratio
              // This matches the original behavior but ensures the image covers the entire canvas
              ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
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

  // Get cursor style based on current tool
  const getCursorStyle = () => {
    if (tool === 'pencil') {
      // Create a smaller pencil icon with better positioning
      return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'%3E%3C/path%3E%3C/svg%3E\") 1 19, auto";
    } else if (tool === 'eraser') {
      // Create a smaller eraser icon with better positioning
      return "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 20H7L3 16c-1.5-1.5-1.5-3.5 0-5l7-7c1.5-1.5 3.5-1.5 5 0l5 5c1.5 1.5 1.5 3.5 0 5l-4 4'%3E%3C/path%3E%3C/svg%3E\") 5 15, auto";
    }
    return "default";
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-white">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            {/* Custom SVG Icon */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
              <path d="M24 4C12.954 4 4 12.954 4 24C4 35.046 12.954 44 24 44C35.046 44 44 35.046 44 24C44 12.954 35.046 4 24 4Z" fill="#ffffff" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M28 14C28 14 32 18 32 24C32 30 28 34 28 34" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4"/>
              <path d="M20 14C20 14 16 18 16 24C16 30 20 34 20 34" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4"/>
              <path d="M14 20C14 20 18 24 24 24C30 24 34 20 34 20" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4"/>
              <path d="M14 28C14 28 18 24 24 24C30 24 34 28 34 28" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4"/>
              <path d="M24 24C26.2091 24 28 22.2091 28 20C28 17.7909 26.2091 16 24 16C21.7909 16 20 17.7909 20 20C20 22.2091 21.7909 24 24 24Z" fill="#333333"/>
              <path d="M32 32C33.1046 32 34 31.1046 34 30C34 28.8954 33.1046 28 32 28C30.8954 28 30 28.8954 30 30C30 31.1046 30.8954 32 32 32Z" fill="#333333"/>
              <path d="M16 32C17.1046 32 18 31.1046 18 30C18 28.8954 17.1046 28 16 28C14.8954 28 14 28.8954 14 30C14 31.1046 14.8954 32 16 32Z" fill="#333333"/>
            </svg>
            
            <h1 className="text-4xl font-bold text-black" style={{ fontFamily: "'Indie Flower', cursive", textShadow: "1px 1px 2px rgba(0,0,0,0.1)" }}>
              doodle with AI
            </h1>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <button
                className={`p-3 rounded-md ${tool === 'pencil' ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}
                onClick={() => setTool('pencil')}
                title="Pencil"
              >
                <FaPencilAlt />
              </button>
              <button
                className={`p-3 rounded-md ${tool === 'eraser' ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}
                onClick={() => setTool('eraser')}
                title="Eraser"
              >
                <FaEraser />
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="colorPicker" className="text-black">Color:</label>
              <input
                id="colorPicker"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 border-none cursor-pointer rounded-md"
              />
            </div>

            <div className="flex gap-2">
              <button
                className="p-3 rounded-md bg-gray-700 text-white"
                onClick={resetCanvas}
                title="Reset Canvas"
              >
                <FaTrash />
              </button>
              <button
                className="p-3 rounded-md bg-black text-white"
                onClick={downloadCanvas}
                title="Download"
              >
                <FaDownload />
              </button>
            </div>
          </div>
        </div>
        
        <div className="relative mb-4">
          <canvas
            ref={canvasRef}
            className="border-4 border-black rounded-lg bg-white shadow-lg w-full"
            style={{ cursor: getCursorStyle() }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
        
        <form onSubmit={handleAiCommandSubmit} className="w-full mb-6">
          <div className="flex items-center border-2 border-black rounded-lg overflow-hidden">
            <input
              type="text"
              value={aiCommand}
              onChange={(e) => setAiCommand(e.target.value)}
              placeholder="Enter AI command (e.g., 'draw apple', 'draw a cat')"
              className="flex-grow px-4 py-2 focus:outline-none bg-white text-black"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-black text-white px-6 py-2 font-medium hover:bg-gray-800 transition-colors relative"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="opacity-0">Generate</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    <span className="text-sm">Processing...</span>
                  </div>
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </form>
        
        {/* <div className="text-center text-black">
          <p>Draw something on the canvas and use AI commands to enhance your doodle!</p>
          <p className="text-sm mt-2">Example commands: "draw apple", "add clouds"</p>
        </div> */}
      </div>
    </main>
  );
}