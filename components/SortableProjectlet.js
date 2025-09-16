'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

export default function SortableProjectlet({
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
  } = useSortable({ id });

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
        <div className="absolute -top-2 left-0 right-0 h-1 bg-blue-500 rounded-full animate-pulse" />
      )}

      <div className={`bg-white rounded-xl shadow-lg p-6 mb-4 border-2 ${
        isSortableDragging ? 'border-blue-500 shadow-2xl' : 'border-transparent'
      } transition-all duration-200`}>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute left-2 top-1/2 -translate-y-1/2 cursor-move p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>

        {/* Content with padding for drag handle */}
        <div className="pl-10">
          {children}
        </div>
      </div>

      {/* Bottom drop zone indicator */}
      {isDragging && !isSortableDragging && (
        <div className="h-2 -mt-2 mb-2">
          <div className="h-full bg-gradient-to-b from-transparent via-blue-100 to-transparent rounded" />
        </div>
      )}
    </div>
  );
}