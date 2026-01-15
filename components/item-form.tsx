"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Id } from "@/convex/_generated/dataModel";
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadList,
	FileUploadItemPreview,
	FileUploadItemMetadata,
	FileUploadItemDelete,
} from "@/components/ui/file-upload";
import { UploadCloudIcon, X } from "lucide-react";
import { toast } from "sonner";

interface ItemFormProps {
	initialValues?: {
		name: string;
		description: string;
		// We expect properly paired images now, but fallback to arrays if needed
		images?: { id: Id<"_storage">; url: string }[];
		imageStorageIds?: Id<"_storage">[]; // Fallback
		imageUrls?: string[]; // Fallback
	};
	onSubmit: (values: {
		name: string;
		description: string;
		imageStorageIds?: Id<"_storage">[];
	}) => Promise<void>;
	submitLabel?: string;
}

export function ItemForm({
	initialValues,
	onSubmit,
	submitLabel = "Submit",
}: ItemFormProps) {
	const [name, setName] = useState(initialValues?.name || "");
	const [description, setDescription] = useState(
		initialValues?.description || "",
	);

	// Initialize existing images. Prefer 'images' field, else fallback to mapping if lengths match.
	const [existingImages, setExistingImages] = useState<
		{ id: Id<"_storage">; url: string }[]
	>(() => {
		if (initialValues?.images) {
			return initialValues.images;
		}
		if (initialValues?.imageStorageIds && initialValues?.imageUrls) {
			// Best effort mapping if lengths match, otherwise ignore to avoid mismatch/deletion bugs
			if (
				initialValues.imageStorageIds.length === initialValues.imageUrls.length
			) {
				return initialValues.imageStorageIds.map((id, i) => ({
					id,
					url: initialValues.imageUrls![i],
				}));
			}
		}
		return [];
	});

	const [files, setFiles] = useState<File[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const generateUploadUrl = useMutation(api.items.generateUploadUrl);

	// Map to store storage IDs for newly uploaded files
	const fileStorageIds = useRef<Map<File, Id<"_storage">>>(new Map());

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name) return;

		setIsSubmitting(true);

		try {
			// 1. Upload new files
			const newIds: Id<"_storage">[] = [];

			for (const file of files) {
				let storageId = fileStorageIds.current.get(file);

				// If not already uploaded, upload now
				if (!storageId) {
					try {
						const postUrl = await generateUploadUrl();
						const result = await fetch(postUrl, {
							method: "POST",
							headers: { "Content-Type": file.type },
							body: file,
						});
						if (!result.ok) throw new Error("Upload failed");
						const data = await result.json();
						storageId = data.storageId;
						fileStorageIds.current.set(file, storageId!);
					} catch (err) {
						console.error(err);
						throw new Error(`Failed to upload ${file.name}`);
					}
				}

				if (storageId) {
					newIds.push(storageId);
				}
			}

			// 2. Gather IDs from existing images (that weren't deleted)
			const existingIds = existingImages.map((img) => img.id);

			const finalStorageIds = [...existingIds, ...newIds];

			await onSubmit({
				name,
				description,
				imageStorageIds:
					finalStorageIds.length > 0 ? finalStorageIds : undefined,
			});

			if (!initialValues) {
				setName("");
				setDescription("");
				setExistingImages([]);
				setFiles([]);
				fileStorageIds.current.clear();
			}
		} catch (error) {
			console.error("Error submitting form:", error);
			toast.error("Failed to submit item: " + (error as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const remainingSlots = 5 - existingImages.length;

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-0">
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

			<div className="flex flex-col gap-2">
				<Label>Images (Max 5)</Label>

				{/* Existing Images List */}
				{existingImages.length > 0 && (
					<div className="grid grid-cols-5 gap-2 mb-2">
						{existingImages.map((img) => (
							<div key={img.id} className="relative group aspect-square">
								<img
									src={img.url}
									alt="Item"
									className="w-full h-full object-cover rounded-md border"
								/>
								<button
									type="button"
									onClick={() =>
										setExistingImages((prev) =>
											prev.filter((p) => p.id !== img.id),
										)
									}
									className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100"
								>
									<X className="h-3 w-3" />
								</button>
							</div>
						))}
					</div>
				)}

				{/* File Upload Area */}
				{remainingSlots > 0 ? (
					<FileUpload
						maxFiles={remainingSlots}
						accept="image/*"
						value={files}
						onValueChange={setFiles}
						multiple={remainingSlots > 1}
						// Removed onUpload to disable auto-upload
					>
						<FileUploadDropzone className="h-32 bg-gray-50/50 border-dashed transition-colors hover:bg-gray-50/80 hover:border-primary/20">
							<div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
								<UploadCloudIcon className="size-8 text-muted-foreground/50" />
								<div className="flex flex-col items-center">
									<span className="font-semibold text-foreground">
										Click to upload
									</span>
									<span>or drag and drop</span>
									<span className="text-xs text-muted-foreground/75">
										{existingImages.length > 0
											? `You can add ${remainingSlots} more image${remainingSlots !== 1 ? "s" : ""}`
											: "Up to 5 images"}
									</span>
								</div>
							</div>
						</FileUploadDropzone>
						<FileUploadList>
							{files.map((file, i) => (
								<FileUploadItem key={i} value={file}>
									<FileUploadItemPreview />
									<FileUploadItemMetadata />
									<FileUploadItemDelete />
								</FileUploadItem>
							))}
						</FileUploadList>
					</FileUpload>
				) : (
					<div className="p-4 border border-dashed rounded-md bg-gray-50 text-center text-sm text-gray-500">
						Limit of 5 images reached. Remove some to add new ones.
					</div>
				)}
			</div>

			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? "Uploading & Saving..." : submitLabel}
			</Button>
		</form>
	);
}
