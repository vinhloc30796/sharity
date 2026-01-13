"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Id } from "@/convex/_generated/dataModel";

interface ItemFormProps {
  initialValues?: {
    name: string;
    description: string;
  };
  onSubmit: (values: { name: string; description: string }) => Promise<void>;
  submitLabel?: string;
}

export function ItemForm({ initialValues, onSubmit, submitLabel = "Submit" }: ItemFormProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [description, setDescription] = useState(initialValues?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ name, description });
      // Only clear if it's a new item (no initial values), otherwise kep the values or let parent handle it?
      // For create: clear. For edit: usually close modal.
      if (!initialValues) {
          setName("");
          setDescription("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Item Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="e.g., Camping Tent"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="desc">Description</Label>
        <Input
          id="desc"
          type="text"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
    </form>
  );
}
