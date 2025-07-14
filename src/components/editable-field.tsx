"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
  initialValue: string;
  onSave: (newValue: string) => void;
  isTextarea?: boolean;
  className?: string;
  inputClassName?: string;
  viewAs?: 'h1' | 'h2' | 'h3' | 'p' | 'div';
}

export function EditableField({
  initialValue,
  onSave,
  isTextarea = false,
  className,
  inputClassName,
  viewAs: Component = 'div'
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      if (isTextarea) {
        textareaRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }
  }, [isEditing, isTextarea]);
  
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSave = () => {
    if (value.trim() !== initialValue.trim()) {
      onSave(value);
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isTextarea) {
        handleSave();
      }
      if (e.key === 'Escape') {
          setValue(initialValue);
          setIsEditing(false);
      }
  };

  if (isEditing) {
    if (isTextarea) {
      return (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className={cn("w-full h-auto resize-none bg-background/80 p-2 rounded-md", inputClassName)}
          rows={Math.max(5, value.split('\n').length)}
        />
      );
    }
    return (
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn("w-full bg-background/80", inputClassName)}
      />
    );
  }

  return (
    <Component
      onClick={() => setIsEditing(true)}
      className={cn("cursor-pointer hover:bg-primary/10 p-2 rounded-md transition-colors min-h-[2.5rem]", className)}
      style={{ whiteSpace: 'pre-wrap' }}
    >
      {value || (isTextarea ? 'Click to add content...' : 'Click to add title...')}
    </Component>
  );
}
