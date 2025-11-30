import React, { useEffect, useRef } from 'react';
import { Eye, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

const TruckVisualization = ({ loadDetails, truckDimensions = { length: 13.6, width: 2.45, height: 2.7 } }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const scaleRef = useRef(40); // Píxeles por metro

  useEffect(() => {
    if (!canvasRef.current || !loadDetails) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const scale = scaleRef.current;

    // Configurar dimensiones del canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = 400;

    // Función para dibujar
    const draw = () => {
      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Configurar estilo
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 2;

      // Calcular posición central
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Vista lateral del camión
      drawTruckSideView(ctx, centerX, centerY, scale);

      // Dibujar carga
      drawLoadItems(ctx, centerX, centerY, scale);

      // Vista superior del camión
      drawTruckTopView(ctx, centerX, centerY + 200, scale);

      // Información de utilización
      drawUtilizationInfo(ctx, canvas.width - 200, 30);
    };

    const drawTruckSideView = (ctx, centerX, centerY, scale) => {
      const truckLength = truckDimensions.length * scale;
      const truckHeight = truckDimensions.height * scale * 0.5; // Escala reducida para altura

      // Dibujar remolque
      ctx.fillStyle = '#F3F4F6';
      ctx.fillRect(
        centerX - truckLength / 2,
        centerY - truckHeight / 2,
        truckLength,
        truckHeight
      );

      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        centerX - truckLength / 2,
        centerY - truckHeight / 2,
        truckLength,
        truckHeight
      );

      // Dibujar cabina (simplificada)
      const cabinWidth = 1.5 * scale;
      ctx.fillStyle = '#3B82F6';
      ctx.fillRect(
        centerX - truckLength / 2 - cabinWidth,
        centerY - truckHeight / 2 + 10,
        cabinWidth,
        truckHeight - 20
      );

      // Dibujar ruedas
      const wheelRadius = 0.3 * scale;
      ctx.fillStyle = '#1F2937';

      // Ruedas del remolque
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(
          centerX - truckLength / 2 + (truckLength * 0.7) + (i * wheelRadius * 3),
          centerY + truckHeight / 2,
          wheelRadius,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Ruedas de la cabina
      ctx.beginPath();
      ctx.arc(
        centerX - truckLength / 2 - cabinWidth / 2,
        centerY + truckHeight / 2,
        wheelRadius,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Etiquetas de dimensiones
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.textAlign = 'center';

      // Longitud
      ctx.fillText(
        `${truckDimensions.length}m`,
        centerX,
        centerY + truckHeight / 2 + 25
      );

      // Altura
      ctx.save();
      ctx.translate(centerX - truckLength / 2 - 25, centerY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${truckDimensions.height}m`, 0, 0);
      ctx.restore();
    };

    const drawLoadItems = (ctx, centerX, centerY, scale) => {
      if (!loadDetails || !loadDetails.loadDetails) return;

      const truckLength = truckDimensions.length * scale;
      const truckHeight = truckDimensions.height * scale * 0.5;
      let currentX = centerX - truckLength / 2;

      loadDetails.loadDetails.forEach((item, index) => {
        const itemWidth = item.linearMeters * scale;
        const itemHeight = Math.min(1.5 * scale, truckHeight - 10); // Altura estándar de pallet

        // Color alternado para distinguir items
        ctx.fillStyle = index % 2 === 0 ? '#FEF3C7' : '#DBEAFE';
        ctx.fillRect(
          currentX,
          centerY - itemHeight / 2,
          itemWidth,
          itemHeight
        );

        // Borde del item
        ctx.strokeStyle = index % 2 === 0 ? '#F59E0B' : '#3B82F6';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          currentX,
          centerY - itemHeight / 2,
          itemWidth,
          itemHeight
        );

        // Etiqueta del item
        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#1F2937';
        ctx.textAlign = 'center';
        ctx.fillText(
          `${item.quantity}x`,
          currentX + itemWidth / 2,
          centerY
        );

        currentX += itemWidth;
      });

      // Mostrar espacio libre
      const usedSpace = currentX - (centerX - truckLength / 2);
      const freeSpace = truckLength - usedSpace;

      if (freeSpace > 5) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        ctx.fillRect(
          currentX,
          centerY - truckHeight / 2,
          freeSpace,
          truckHeight
        );

        ctx.strokeStyle = '#10B981';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          currentX,
          centerY - truckHeight / 2,
          freeSpace,
          truckHeight
        );
        ctx.setLineDash([]);

        ctx.font = '11px sans-serif';
        ctx.fillStyle = '#10B981';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Espacio libre: ${(freeSpace / scale).toFixed(2)}m`,
          currentX + freeSpace / 2,
          centerY
        );
      }
    };

    const drawTruckTopView = (ctx, centerX, centerY, scale) => {
      const truckLength = truckDimensions.length * scale;
      const truckWidth = truckDimensions.width * scale * 0.5; // Escala reducida para ancho

      // Título
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#4B5563';
      ctx.textAlign = 'center';
      ctx.fillText('Vista Superior', centerX, centerY - truckWidth / 2 - 10);

      // Dibujar contorno del camión
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(
        centerX - truckLength / 2,
        centerY - truckWidth / 2,
        truckLength,
        truckWidth
      );

      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        centerX - truckLength / 2,
        centerY - truckWidth / 2,
        truckLength,
        truckWidth
      );

      // Dibujar items desde vista superior
      if (loadDetails && loadDetails.loadDetails) {
        let currentX = centerX - truckLength / 2;

        loadDetails.loadDetails.forEach((item, index) => {
          const itemLength = item.linearMeters * scale;

          // Simular distribución de ancho (europallets: 0.8m)
          const palletWidth = 0.8 * scale * 0.5;
          const palletsPerRow = Math.floor((truckDimensions.width * scale * 0.5) / palletWidth);
          const rows = Math.ceil(item.quantity / palletsPerRow);

          for (let row = 0; row < rows && row < item.quantity; row++) {
            const palletsInRow = Math.min(palletsPerRow, item.quantity - (row * palletsPerRow));

            for (let col = 0; col < palletsInRow; col++) {
              const x = currentX + (row * itemLength / rows);
              const y = centerY - truckWidth / 2 + (col * palletWidth) + 5;

              ctx.fillStyle = index % 2 === 0 ? '#FEF3C7' : '#DBEAFE';
              ctx.fillRect(x, y, itemLength / rows - 2, palletWidth - 2);

              ctx.strokeStyle = index % 2 === 0 ? '#F59E0B' : '#3B82F6';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(x, y, itemLength / rows - 2, palletWidth - 2);
            }
          }

          currentX += itemLength;
        });
      }

      // Dimensión de ancho
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(centerX + truckLength / 2 + 20, centerY);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(`${truckDimensions.width}m`, 0, 0);
      ctx.restore();
    };

    const drawUtilizationInfo = (ctx, x, y) => {
      if (!loadDetails || !loadDetails.totalLinearMeters) return;

      const utilization = (loadDetails.totalLinearMeters / truckDimensions.length) * 100;

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#1F2937';
      ctx.textAlign = 'left';
      ctx.fillText('Utilización', x - 150, y);

      // Barra de progreso
      const barWidth = 150;
      const barHeight = 20;

      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(x - 150, y + 10, barWidth, barHeight);

      const fillColor = utilization > 80 ? '#EF4444' : utilization > 60 ? '#F59E0B' : '#10B981';
      ctx.fillStyle = fillColor;
      ctx.fillRect(x - 150, y + 10, (barWidth * utilization) / 100, barHeight);

      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 150, y + 10, barWidth, barHeight);

      // Porcentaje
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#1F2937';
      ctx.textAlign = 'center';
      ctx.fillText(`${utilization.toFixed(1)}%`, x - 75, y + 24);

      // Leyenda
      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.textAlign = 'left';
      ctx.fillText(`${loadDetails.totalLinearMeters}m / ${truckDimensions.length}m`, x - 150, y + 45);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [loadDetails, truckDimensions]);

  const handleZoomIn = () => {
    scaleRef.current = Math.min(scaleRef.current * 1.2, 100);
    if (canvasRef.current) {
      canvasRef.current.dispatchEvent(new Event('resize'));
    }
  };

  const handleZoomOut = () => {
    scaleRef.current = Math.max(scaleRef.current / 1.2, 20);
    if (canvasRef.current) {
      canvasRef.current.dispatchEvent(new Event('resize'));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Eye className="text-blue-600" />
          Visualización del Camión
        </h3>
        <div className="flex gap-2">
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-100 rounded hover:bg-gray-200"
            title="Acercar"
          >
            <ZoomIn size={20} />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-100 rounded hover:bg-gray-200"
            title="Alejar"
          >
            <ZoomOut size={20} />
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-2">
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ minHeight: '400px' }}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 border border-yellow-500"></div>
          <span>Grupo 1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 border border-blue-500"></div>
          <span>Grupo 2</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-500"></div>
          <span>Espacio libre</span>
        </div>
      </div>
    </div>
  );
};

export default TruckVisualization;