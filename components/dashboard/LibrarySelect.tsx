"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LibrarySelectOption = {
  value: string;
  label: string;
};

type LibrarySelectProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: LibrarySelectOption[];
  placeholder?: string;
  className?: string;
};

export function LibrarySelect({ id, value, onValueChange, options, placeholder, className }: LibrarySelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
