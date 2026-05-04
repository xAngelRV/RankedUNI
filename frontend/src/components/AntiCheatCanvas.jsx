import React, { useRef, useEffect } from 'react';

export default function AntiCheatCanvas({ imageUrl }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const image = new Image();
    
    // Necesario para imágenes de otros dominios
    image.crossOrigin = "Anonymous";
    image.src = imageUrl;

    image.onload = () => {
      // Ajustar el canvas al tamaño de la imagen
      canvas.width = image.width;
      canvas.height = image.height;

      // Dibujar la imagen original
      ctx.drawImage(image, 0, 0);

      // Aplicar filtro de ruido estático sutil para ofuscar OCR
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Añadir ruido aleatorio (entre -15 y 15)
        const noise = (Math.random() - 0.5) * 30;
        
        data[i]     = Math.min(255, Math.max(0, data[i] + noise));     // Red
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // Green
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise)); // Blue
        // data[i + 3] = Alpha no lo tocamos
      }

      ctx.putImageData(imageData, 0, 0);
      
      // Añadir líneas tenues aleatorias para confundir más al OCR
      for(let j=0; j < 20; j++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.strokeStyle = `rgba(255, 255, 255, 0.1)`;
        ctx.lineWidth = Math.random() * 2;
        ctx.stroke();
      }
    };
  }, [imageUrl]);

  return (
    <div className="w-full max-w-3xl mx-auto border-2 border-brand-blue/30 rounded-lg overflow-hidden shadow-lg select-none pointer-events-none">
      <canvas 
        ref={canvasRef} 
        className="w-full h-auto block"
        onContextMenu={(e) => e.preventDefault()} // Prevenir click derecho
      />
    </div>
  );
}
