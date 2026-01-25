"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCloudinaryUpload } from "@imaxis/cloudinary-convex/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/star-rating";
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadList,
	FileUploadItemPreview,
	FileUploadItemMetadata,
	FileUploadItemDelete,
} from "@/components/ui/file-upload";
import { UploadCloudIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { CloudinaryRef } from "@/lib/cloudinary-ref";

interface RatingFormProps {
	claimId: Id<"claims">;
	targetRole: "lender" | "borrower";
	itemName: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function RatingForm({
	claimId,
	targetRole,
	itemName,
	onSuccess,
	onCancel,
}: RatingFormProps) {
	const [stars, setStars] = useState(0);
	const [comment, setComment] = useState("");
	const [files, setFiles] = useState<File[]>([]);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const createRating = useMutation(api.ratings.createRating);
	const { upload: uploadToCloudinary } = useCloudinaryUpload(
		api.cloudinary.upload,
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (stars === 0) {
			toast.error("Please select a rating");
			return;
		}

		setIsSubmitting(true);

		try {
			const photoCloudinary: CloudinaryRef[] = [];
			for (const file of files) {
				const result = (await uploadToCloudinary(file, {
					folder: "ratings",
					tags: ["ratings"],
				})) as unknown as CloudinaryRef;

				if (!result?.publicId || !result?.secureUrl) {
					throw new Error(
						"Cloudinary upload failed: missing publicId/secureUrl",
					);
				}
				photoCloudinary.push(result);
			}

			await createRating({
				claimId,
				stars,
				comment: comment.trim() || undefined,
				photoCloudinary:
					photoCloudinary.length > 0 ? photoCloudinary : undefined,
			});

			toast.success("Rating submitted successfully");
			onSuccess?.();
		} catch (error) {
			console.error("Error submitting rating:", error);
			toast.error("Failed to submit rating");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<div className="text-sm text-muted-foreground">
				Rate the {targetRole} for &quot;{itemName}&quot;
			</div>

			<div className="flex flex-col gap-2">
				<Label>Rating</Label>
				<StarRating value={stars} onChange={setStars} size="lg" />
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="comment">Comment (optional)</Label>
				<Textarea
					id="comment"
					placeholder="Share your experience..."
					value={comment}
					onChange={(e) => setComment(e.target.value)}
					disabled={isSubmitting}
					rows={3}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label>Photo (optional)</Label>
				<FileUpload
					maxFiles={3}
					accept="image/*"
					value={files}
					onValueChange={setFiles}
					multiple
				>
					<FileUploadDropzone className="h-24 bg-gray-50/50 border-dashed">
						<div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
							<UploadCloudIcon className="size-6 text-muted-foreground/50" />
							<span>Add photos (up to 3)</span>
						</div>
					</FileUploadDropzone>
					<FileUploadList>
						{files.map((file, i) => (
							<FileUploadItem key={i} value={file}>
								<FileUploadItemPreview />
								<FileUploadItemMetadata size="sm" />
								<FileUploadItemDelete />
							</FileUploadItem>
						))}
					</FileUploadList>
				</FileUpload>
			</div>

			<div className="flex gap-2 justify-end">
				{onCancel && (
					<Button
						type="button"
						variant="outline"
						onClick={onCancel}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isSubmitting || stars === 0}>
					{isSubmitting ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
							Submitting...
						</>
					) : (
						"Submit Rating"
					)}
				</Button>
			</div>
		</form>
	);
}
