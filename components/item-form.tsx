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
import { UploadCloudIcon, X, MapPin, Loader2, Map } from "lucide-react";
import {
	LocationPickerDialog,
	type LocationPickerValue,
} from "./location-picker-dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export type ItemCategory =
	| "kitchen"
	| "furniture"
	| "electronics"
	| "clothing"
	| "books"
	| "sports"
	| "other";

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
	kitchen: "Kitchen",
	furniture: "Furniture",
	electronics: "Electronics",
	clothing: "Clothing",
	books: "Books",
	sports: "Sports",
	other: "Other",
};

export interface Location {
	lat: number;
	lng: number;
	address?: string;
	ward?: string;
}
import { toast } from "sonner";
import { uploadFileToConvexStorage } from "@/lib/upload-to-convex-storage";

interface ItemFormProps {
	initialValues?: {
		name: string;
		description: string;
		// We expect properly paired images now, but fallback to arrays if needed
		images?: { id: Id<"_storage">; url: string }[];
		imageStorageIds?: Id<"_storage">[]; // Fallback
		imageUrls?: string[]; // Fallback
		category?: ItemCategory;
		location?: Location;
	};
	onSubmit: (values: {
		name: string;
		description: string;
		imageStorageIds?: Id<"_storage">[];
		category?: ItemCategory;
		location?: Location;
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
	const [category, setCategory] = useState<ItemCategory | undefined>(
		initialValues?.category,
	);
	const [location, setLocation] = useState<Location | undefined>(
		initialValues?.location,
	);
	const [address, setAddress] = useState(
		initialValues?.location?.address || "",
	);
	const [isGettingLocation, setIsGettingLocation] = useState(false);
	const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);

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
	const fileStorageIds = useRef<globalThis.Map<File, Id<"_storage">>>(
		new globalThis.Map(),
	);

	const handleGetLocation = () => {
		if (!navigator.geolocation) {
			toast.error("Geolocation is not supported by your browser");
			return;
		}

		setIsGettingLocation(true);
		navigator.geolocation.getCurrentPosition(
			(position) => {
				setLocation({
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					address: address || undefined,
				});
				setIsGettingLocation(false);
				toast.success("Location captured successfully");
			},
			(error) => {
				setIsGettingLocation(false);
				toast.error(`Failed to get location: ${error.message}`);
			},
		);
	};

	const handleLocationSelect = (loc: LocationPickerValue) => {
		setLocation({
			lat: loc.lat,
			lng: loc.lng,
			address: loc.address,
			ward: loc.ward,
		});
		setAddress(loc.address || "");
		toast.success("Location selected");
	};

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
					storageId = await uploadFileToConvexStorage({
						file,
						generateUploadUrl: async () => await generateUploadUrl(),
					});
					fileStorageIds.current.set(file, storageId);
				}

				if (storageId) {
					newIds.push(storageId);
				}
			}

			// 2. Gather IDs from existing images (that weren't deleted)
			const existingIds = existingImages.map((img) => img.id);

			const finalStorageIds = [...existingIds, ...newIds];

			// Build location with address if coordinates exist
			const finalLocation = location
				? { ...location, address: address || undefined }
				: undefined;

			await onSubmit({
				name,
				description,
				imageStorageIds:
					finalStorageIds.length > 0 ? finalStorageIds : undefined,
				category,
				location: finalLocation,
			});

			if (!initialValues) {
				setName("");
				setDescription("");
				setExistingImages([]);
				setFiles([]);
				fileStorageIds.current.clear();
				setCategory(undefined);
				setLocation(undefined);
				setAddress("");
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
				<Label htmlFor="category">Category</Label>
				<Select
					value={category}
					onValueChange={(value) => setCategory(value as ItemCategory)}
					disabled={isSubmitting}
				>
					<SelectTrigger id="category">
						<SelectValue placeholder="Select a category" />
					</SelectTrigger>
					<SelectContent>
						{(Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((cat) => (
							<SelectItem key={cat} value={cat}>
								{CATEGORY_LABELS[cat]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<Label>Location</Label>
				<div className="flex gap-2">
					<Input
						type="text"
						placeholder="Address (auto-filled from map)"
						value={address}
						onChange={(e) => setAddress(e.target.value)}
						disabled={isSubmitting}
						className="flex-1"
					/>
					<Button
						type="button"
						variant="outline"
						onClick={() => setIsLocationDialogOpen(true)}
						disabled={isSubmitting}
						title="Pick on map"
					>
						<Map className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={handleGetLocation}
						disabled={isSubmitting || isGettingLocation}
						title="Get current location"
					>
						{isGettingLocation ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<MapPin className="h-4 w-4" />
						)}
					</Button>
				</div>
				{location && (
					<p className="text-xs text-muted-foreground">
						📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
					</p>
				)}
				<LocationPickerDialog
					open={isLocationDialogOpen}
					onOpenChange={setIsLocationDialogOpen}
					value={location}
					onSelect={handleLocationSelect}
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
