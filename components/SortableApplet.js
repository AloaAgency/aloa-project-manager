'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export default function SortableApplet({
  id,
  children,
  isDragging
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id,
    data: {
      type: 'applet'  // Mark this as an applet for identification
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isSortableDragging ? 'z-50' : ''}`}
    >
      {/* Drop zone indicator - shows when dragging */}
      {isDragging && !isSortableDragging && (
        <div className="absolute -top-1 left-0 right-0 h-0.5 bg-green-500 rounded-full animate-pulse" />
      )}

      <div className={`relative ${isSortableDragging ? 'scale-105' : ''} transition-transform`}>
        {/* Drag handle - positioned absolutely within the content */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 cursor-move p-1 hover:bg-gray-200 rounded transition-colors z-10"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Content */}
        <div className="pl-6">
          {children}
        </div>
      </div>
    </div>
  );
}