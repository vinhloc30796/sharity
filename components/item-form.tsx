"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useCloudinaryUpload } from "@imaxis/cloudinary-convex/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
	UploadCloudIcon,
	X,
	MapPin,
	Loader2,
	Map,
	ListChecks,
} from "lucide-react";
import { CloudinaryImage } from "@/components/cloudinary-image";
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
import type { CloudinaryRef } from "@/lib/cloudinary-ref";

export type MediaImage =
	| { source: "cloudinary"; publicId: string; url: string }
	| { source: "storage"; storageId: Id<"_storage">; url: string };

interface ItemFormProps {
	initialValues?: {
		name: string;
		description: string;
		images?: MediaImage[];
		category?: ItemCategory;
		location?: Location;
		giveaway?: boolean;
		minLeaseDays?: number;
		maxLeaseDays?: number;
	};
	onSubmit: (values: {
		name: string;
		description: string;
		imageStorageIds?: Id<"_storage">[];
		imageCloudinary?: CloudinaryRef[];
		category?: ItemCategory;
		location?: Location;
		giveaway?: boolean;
		minLeaseDays?: number;
		maxLeaseDays?: number;
	}) => Promise<void>;
	submitLabel?: string;
	enableModeSwitch?: boolean;
}

export function ItemForm({
	initialValues,
	onSubmit,
	submitLabel = "Submit",
	enableModeSwitch = false,
}: ItemFormProps) {
	const [name, setName] = useState(initialValues?.name || "");
	const [description, setDescription] = useState(
		initialValues?.description || "",
	);
	const [giveaway, setGiveaway] = useState(Boolean(initialValues?.giveaway));
	const [minLeaseDays, setMinLeaseDays] = useState(() => {
		if (Boolean(initialValues?.giveaway)) return "";
		return typeof initialValues?.minLeaseDays === "number"
			? String(initialValues.minLeaseDays)
			: "";
	});
	const [maxLeaseDays, setMaxLeaseDays] = useState(() => {
		if (Boolean(initialValues?.giveaway)) return "";
		return typeof initialValues?.maxLeaseDays === "number"
			? String(initialValues.maxLeaseDays)
			: "";
	});
	const [pendingGiveaway, setPendingGiveaway] = useState<boolean | null>(null);
	const [isModeConfirmOpen, setIsModeConfirmOpen] = useState(false);
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

	const [existingImages, setExistingImages] = useState<MediaImage[]>(
		(initialValues?.images ?? []).filter(
			(img): img is Extract<MediaImage, { source: "cloudinary" }> =>
				img.source === "cloudinary",
		),
	);

	const [files, setFiles] = useState<File[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const notifications = useQuery(api.notifications.get);
	const { upload: uploadToCloudinary } = useCloudinaryUpload(
		api.cloudinary.upload,
	);

	const hasMyItemsStatus = (notifications ?? []).some(
		(n) => n.type === "new_request" && n.claim?.status === "pending",
	);

	const imageKey = (img: MediaImage): string =>
		img.source === "cloudinary" ? img.publicId : img.storageId;

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
			const parseOptionalDays = (
				label: string,
				raw: string,
			): number | undefined => {
				const trimmed = raw.trim();
				if (trimmed.length === 0) return undefined;

				const n = Number(trimmed);
				if (!Number.isFinite(n) || !Number.isInteger(n)) {
					throw new Error(`${label} must be an integer number of days`);
				}
				if (n < 1) {
					throw new Error(`${label} must be at least 1 day`);
				}
				return n;
			};

			const minLeaseDaysValue = giveaway
				? undefined
				: parseOptionalDays("Min lease length", minLeaseDays);
			const maxLeaseDaysValue = giveaway
				? undefined
				: parseOptionalDays("Max lease length", maxLeaseDays);

			if (
				minLeaseDaysValue !== undefined &&
				maxLeaseDaysValue !== undefined &&
				minLeaseDaysValue > maxLeaseDaysValue
			) {
				throw new Error(
					"Min lease length must be less than or equal to max lease length",
				);
			}

			// 1. Upload new files to Cloudinary
			const newCloudinary: CloudinaryRef[] = [];
			for (const file of files) {
				const result = (await uploadToCloudinary(file, {
					folder: "items",
					tags: ["items"],
				})) as unknown as CloudinaryRef;

				if (!result?.publicId || !result?.secureUrl) {
					throw new Error(
						"Cloudinary upload failed: missing publicId/secureUrl",
					);
				}
				newCloudinary.push(result);
			}

			// 2. Keep existing Cloudinary images
			const existingCloudinary = existingImages.map((img) => ({
				publicId: img.publicId,
				secureUrl: img.url,
			}));

			const finalCloudinary = [...existingCloudinary, ...newCloudinary];

			// Build location with address if coordinates exist
			const finalLocation = location
				? { ...location, address: address || undefined }
				: undefined;

			await onSubmit({
				name,
				description,
				imageCloudinary:
					finalCloudinary.length > 0 ? finalCloudinary : undefined,
				category,
				location: finalLocation,
				giveaway: enableModeSwitch ? giveaway : undefined,
				minLeaseDays: minLeaseDaysValue,
				maxLeaseDays: maxLeaseDaysValue,
			});

			if (!initialValues) {
				setName("");
				setDescription("");
				setExistingImages([]);
				setFiles([]);
				setCategory(undefined);
				setLocation(undefined);
				setAddress("");
				setMinLeaseDays("");
				setMaxLeaseDays("");
			}
		} catch (error) {
			console.error("Error submitting form:", error);
			const message = error instanceof Error ? error.message : String(error);
			toast.error(message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const remainingSlots = 5 - existingImages.length;

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-0">
			{enableModeSwitch ? (
				<>
					<div className="flex items-center justify-between gap-3">
						<div className="space-y-1">
							<Label htmlFor="giveaway-mode">Giveaway</Label>
							<div className="text-xs text-muted-foreground">
								No return. Ownership transfers after pickup.
							</div>
						</div>
						<Switch
							id="giveaway-mode"
							checked={giveaway}
							disabled={isSubmitting}
							onCheckedChange={(next) => {
								setPendingGiveaway(next);
								setIsModeConfirmOpen(true);
							}}
						/>
					</div>

					<AlertDialog
						open={isModeConfirmOpen}
						onOpenChange={(open) => {
							setIsModeConfirmOpen(open);
							if (!open) setPendingGiveaway(null);
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Switch mode?</AlertDialogTitle>
								<AlertDialogDescription>
									This will reject all current pending requests
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										if (pendingGiveaway === null) return;
										setGiveaway(pendingGiveaway);
										if (pendingGiveaway) {
											setMinLeaseDays("");
											setMaxLeaseDays("");
										}
										setPendingGiveaway(null);
										setIsModeConfirmOpen(false);
									}}
								>
									Switch
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</>
			) : null}

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

			{giveaway ? (
				<div className="text-xs text-muted-foreground">
					Lease length limits are disabled for giveaway items.
				</div>
			) : (
				<div className="flex flex-col gap-2">
					<Label>Lease length limits (days)</Label>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="min-lease-days" className="text-xs">
								Min days (optional)
							</Label>
							<Input
								id="min-lease-days"
								type="number"
								step={1}
								min={1}
								placeholder="e.g., 1"
								value={minLeaseDays}
								onChange={(e) => setMinLeaseDays(e.target.value)}
								disabled={isSubmitting}
								inputMode="numeric"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="max-lease-days" className="text-xs">
								Max days (optional)
							</Label>
							<Input
								id="max-lease-days"
								type="number"
								step={1}
								min={1}
								placeholder="e.g., 14"
								value={maxLeaseDays}
								onChange={(e) => setMaxLeaseDays(e.target.value)}
								disabled={isSubmitting}
								inputMode="numeric"
							/>
						</div>
					</div>
					<div className="text-xs text-muted-foreground">
						Same-day requests count as a fraction of a day.
					</div>
				</div>
			)}

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
							<div key={imageKey(img)} className="relative group aspect-square">
								<div className="relative w-full h-full">
									<CloudinaryImage
										src={img.url}
										alt="Item"
										fill
										sizes="96px"
										className="rounded-md border object-cover"
									/>
								</div>
								<button
									type="button"
									onClick={() =>
										setExistingImages((prev) =>
											prev.filter((p) => imageKey(p) !== imageKey(img)),
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

			<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
				<Button
					type="submit"
					disabled={isSubmitting}
					className="w-full sm:w-auto"
				>
					{isSubmitting ? "Uploading & Saving..." : submitLabel}
				</Button>
				<Button
					asChild
					type="button"
					variant="secondary"
					className="w-full sm:w-auto"
				>
					<Link href="/my-items" className="relative">
						<ListChecks className="h-4 w-4" />
						My Items
						{hasMyItemsStatus ? (
							<span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-background" />
						) : null}
					</Link>
				</Button>
			</div>
		</form>
	);
}
