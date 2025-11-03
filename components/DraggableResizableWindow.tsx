import React, { useState, useRef, useCallback, ReactNode } from 'react';
import { CloseIcon, MaximizeIcon, MinimizeIcon, RestoreIcon } from './icons/Icons';

interface DraggableResizableWindowProps {
  children: ReactNode;
  title: string;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  onClose: () => void;
}

const WindowControlButton: React.FC<{onClick: (e: React.MouseEvent) => void, children: ReactNode, title: string, isDanger?: boolean}> = ({ onClick, children, title, isDanger = false }) => (
    <button
        onClick={(e) => {
            e.stopPropagation();
            onClick(e);
        }}
        title={title}
        className={`p-1 rounded-full text-slate-300 ${isDanger ? 'hover:bg-brand-danger hover:text-white' : 'hover:bg-slate-600'} transition-colors focus:outline-none`}
        aria-label={title}
    >
        {children}
    </button>
);


const DraggableResizableWindow: React.FC<DraggableResizableWindowProps> = ({ 
    children, 
    title, 
    initialPosition = { x: 50, y: 50 }, 
    initialSize = { width: 320, height: 180 },
    onClose
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const dragRef = useRef({ x: 0, y: 0 });
  const resizeRef = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const preStateRef = useRef({ position, size });

  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const nodeRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current) {
      setPosition({
        x: e.clientX - dragRef.current.x,
        y: e.clientY - dragRef.current.y,
      });
    }
    if (isResizing.current) {
      const newWidth = resizeRef.current.width + (e.clientX - resizeRef.current.x);
      const newHeight = resizeRef.current.height + (e.clientY - resizeRef.current.y);
      setSize({
        width: Math.max(200, newWidth), // Min width
        height: Math.max(150, newHeight), // Min height
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    isResizing.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);
  
  const handleDragMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized || isMinimized || (e.target as HTMLElement).closest('button')) {
        return;
    }
    if (nodeRef.current) {
        isDragging.current = true;
        dragRef.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }
  }, [isMaximized, isMinimized, position, handleMouseMove, handleMouseUp]);
  
  const handleResizeMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized || isMinimized) return;
    
    e.stopPropagation();
    isResizing.current = true;
    resizeRef.current = {
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [isMaximized, isMinimized, size, handleMouseMove, handleMouseUp]);


  const handleMinimize = () => {
    if (isMinimized) { // Restore from minimized
        setSize(preStateRef.current.size);
    } else { // Minimize
        if (!isMaximized) { 
            preStateRef.current = { position, size };
        }
    }
    setIsMinimized(!isMinimized);
    if (!isMinimized) setIsMaximized(false);
  };

  const handleMaximize = () => {
    if (isMaximized) { // Restore
        setPosition(preStateRef.current.position);
        setSize(preStateRef.current.size);
    } else { // Maximize
        preStateRef.current = { position, size };
    }
    setIsMaximized(!isMaximized);
    if (!isMaximized) setIsMinimized(false);
  };

  const windowStyle: React.CSSProperties = isMaximized ? {
    left: '0px',
    top: '0px',
    width: '100%',
    height: '100%',
    zIndex: 20,
    transition: 'width 0.2s ease, height 0.2s ease',
  } : {
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${size.width}px`,
    height: isMinimized ? `2.25rem` : `${size.height}px`,
    transition: isDragging.current || isResizing.current ? undefined : 'width 0.2s ease, height 0.2s ease',
  };

  return (
    <div
      ref={nodeRef}
      className="absolute bg-brand-secondary rounded-lg shadow-2xl border border-brand-accent/50 flex flex-col"
      style={windowStyle}
    >
      <div 
        className={`h-9 bg-brand-accent rounded-t-lg flex items-center justify-between px-2 ${!isMaximized && !isMinimized ? 'cursor-move' : 'cursor-default'}`}
        onMouseDown={handleDragMouseDown}
      >
        <span className="text-sm font-bold text-brand-light truncate pr-2">{title}</span>
        <div className="flex items-center gap-1">
            <WindowControlButton onClick={handleMinimize} title={isMinimized ? "Restore" : "Minimize"}>
                <MinimizeIcon className="w-4 h-4" />
            </WindowControlButton>
            <WindowControlButton onClick={handleMaximize} title={isMaximized ? "Restore" : "Maximize"}>
                {isMaximized ? <RestoreIcon className="w-4 h-4" /> : <MaximizeIcon className="w-4 h-4" />}
            </WindowControlButton>
            <WindowControlButton onClick={onClose} title="Close" isDanger={true}>
                <CloseIcon className="w-4 h-4" />
            </WindowControlButton>
        </div>
      </div>
      <div className={`flex-1 relative overflow-hidden ${isMinimized ? 'hidden' : ''}`}>
        {children}
        {!isMaximized && !isMinimized && (
            <div 
                className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
                onMouseDown={handleResizeMouseDown}
                style={{
                    borderBottom: '2px solid #e94560',
                    borderRight: '2px solid #e94560',
                }}
            />
        )}
      </div>
    </div>
  );
};

export default DraggableResizableWindow;