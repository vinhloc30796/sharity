"use client";

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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadList,
} from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { uploadFileToConvexStorage } from "@/lib/upload-to-convex-storage";
import { useMutation } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
	ArrowBigUp,
	CheckCircle2,
	ImageIcon,
	Pencil,
	UploadCloudIcon,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface WishlistItemProps {
	item: Doc<"wishlist"> & {
		matchCount: number;
		isLiked: boolean;
		images: { id: string; url: string }[];
		isOwner: boolean;
	};
	compact?: boolean;
}

export function WishlistItem({ item, compact }: WishlistItemProps) {
	const toggleVote = useMutation(api.wishlist.toggleVote);
	const updateWishlist = useMutation(api.wishlist.update);
	const generateUploadUrl = useMutation(api.items.generateUploadUrl);
	const query = encodeURIComponent(item.text.trim());

	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editText, setEditText] = useState(item.text);
	const [editFiles, setEditFiles] = useState<File[]>([]);
	const [existingImages, setExistingImages] = useState(item.images);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [previewImage, setPreviewImage] = useState<string | null>(null);

	const fileStorageIds = useRef<globalThis.Map<File, Id<"_storage">>>(
		new globalThis.Map(),
	);

	const handleVote = async () => {
		try {
			await toggleVote({ id: item._id });
		} catch {
			toast.error("Failed to vote");
		}
	};

	const handleEditOpen = () => {
		setEditText(item.text);
		setExistingImages(item.images);
		setEditFiles([]);
		fileStorageIds.current.clear();
		setIsEditOpen(true);
	};

	const handleEditSave = async () => {
		const trimmed = editText.trim();
		if (!trimmed) return;

		setIsSubmitting(true);
		try {
			// Upload new files
			const newIds: Id<"_storage">[] = [];
			for (const file of editFiles) {
				let storageId = fileStorageIds.current.get(file);
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

			// Combine existing images (that weren't removed) with new uploads
			const allImageIds = [
				...existingImages.map((img) => img.id as Id<"_storage">),
				...newIds,
			];

			await updateWishlist({
				id: item._id,
				text: trimmed,
				imageStorageIds: allImageIds.length > 0 ? allImageIds : undefined,
			});

			setIsEditOpen(false);
			toast.success("Request updated!");
		} catch (error) {
			toast.error("Failed to update: " + (error as Error).message);
		} finally {
			setIsSubmitting(false);
		}
	};

	const removeExistingImage = (imageId: string) => {
		setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
	};

	return (
		<>
			<Card className="w-full gap-0 py-2">
				<div className="flex items-center gap-3 px-4">
					{/* Image thumbnail */}
					{item.images.length > 0 && (
						<button
							type="button"
							onClick={() => setPreviewImage(item.images[0].url)}
							className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-gray-100 hover:opacity-80 transition-opacity"
						>
							<img
								src={item.images[0].url}
								alt=""
								className="absolute inset-0 h-full w-full object-cover"
							/>
							{item.images.length > 1 && (
								<span className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl">
									+{item.images.length - 1}
								</span>
							)}
						</button>
					)}

					<div className="min-w-0 flex-1">
						<div className="truncate text-sm font-medium">{item.text}</div>
					</div>

					{item.matchCount > 0 && (
						<Link
							href={`/?q=${query}`}
							className="inline-flex items-center gap-1 rounded-md border bg-green-50 px-2 py-1 text-xs text-green-700 transition-colors hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<CheckCircle2 className="h-3.5 w-3.5" />
							<span className="whitespace-nowrap">
								{item.matchCount} {item.matchCount === 1 ? "match" : "matches"}
							</span>
						</Link>
					)}

					{item.isOwner && (
						<Button
							variant="ghost"
							size="sm"
							className="h-8 w-8 p-0"
							onClick={handleEditOpen}
						>
							<Pencil className="h-4 w-4" />
						</Button>
					)}

					<Button
						variant={item.isLiked ? "secondary" : "ghost"}
						size="sm"
						className={`h-8 gap-1 px-2 ${
							item.isLiked
								? "bg-orange-100 hover:bg-orange-200 text-orange-700"
								: ""
						}`}
						onClick={handleVote}
					>
						<ArrowBigUp
							className={`h-4 w-4 ${item.isLiked ? "fill-orange-700" : ""}`}
						/>
						<span className="text-xs">{item.votes.length}</span>
					</Button>

					{!compact && (
						<span className="text-xs text-muted-foreground whitespace-nowrap">
							{formatDistanceToNow(item.createdAt, { addSuffix: true })}
						</span>
					)}
				</div>
			</Card>

			{/* Edit Dialog */}
			<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Edit Request</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>What do you need?</Label>
							<Input
								value={editText}
								onChange={(e) => setEditText(e.target.value)}
								disabled={isSubmitting}
							/>
						</div>

						{/* Existing images */}
						{existingImages.length > 0 && (
							<div className="space-y-2">
								<Label>Current photos</Label>
								<div className="flex flex-wrap gap-2">
									{existingImages.map((img) => (
										<div
											key={img.id}
											className="group relative h-16 w-16 rounded-md overflow-hidden border"
										>
											<img
												src={img.url}
												alt=""
												className="absolute inset-0 h-full w-full object-cover"
											/>
											<button
												type="button"
												onClick={() => removeExistingImage(img.id)}
												className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all"
											>
												<X className="h-3 w-3" />
											</button>
										</div>
									))}
								</div>
							</div>
						)}

						{/* Add new images */}
						<div className="space-y-2">
							<Label>Add more photos</Label>
							<FileUpload
								maxFiles={5 - existingImages.length}
								accept="image/*"
								value={editFiles}
								onValueChange={setEditFiles}
								multiple
							>
								<FileUploadDropzone className="h-24 bg-gray-50/50 border-dashed">
									<div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
										<UploadCloudIcon className="size-6 text-muted-foreground/50" />
										<span>Click or drag to add</span>
									</div>
								</FileUploadDropzone>
								<FileUploadList>
									{editFiles.map((file, i) => (
										<FileUploadItem key={i} value={file}>
											<FileUploadItemPreview />
											<FileUploadItemMetadata />
											<FileUploadItemDelete />
										</FileUploadItem>
									))}
								</FileUploadList>
							</FileUpload>
						</div>

						<div className="flex gap-2 justify-end">
							<Button
								variant="outline"
								onClick={() => setIsEditOpen(false)}
								disabled={isSubmitting}
							>
								Cancel
							</Button>
							<Button
								onClick={handleEditSave}
								disabled={isSubmitting || !editText.trim()}
							>
								{isSubmitting ? "Saving..." : "Save"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			{/* Image Preview Dialog */}
			<AlertDialog
				open={!!previewImage}
				onOpenChange={() => setPreviewImage(null)}
			>
				<AlertDialogContent className="max-w-2xl">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<ImageIcon className="h-4 w-4" />
							{item.text}
						</AlertDialogTitle>
					</AlertDialogHeader>
					<div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
						{item.images.map((img) => (
							<div
								key={img.id}
								className="relative aspect-square rounded-md overflow-hidden border"
							>
								<img
									src={img.url}
									alt=""
									className="absolute inset-0 h-full w-full object-cover"
								/>
							</div>
						))}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel>Close</AlertDialogCancel>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
