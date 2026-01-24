"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
	currentUrl?: string | null;
	onUpload: (storageId: Id<"_storage">) => void;
	size?: "sm" | "md" | "lg";
	disabled?: boolean;
}

const sizeClasses = {
	sm: "h-16 w-16",
	md: "h-24 w-24",
	lg: "h-32 w-32",
};

export function AvatarUpload({
	currentUrl,
	onUpload,
	size = "md",
	disabled = false,
}: AvatarUploadProps) {
	const [isUploading, setIsUploading] = useState(false);
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		if (!file.type.startsWith("image/")) {
			toast.error("Please select an image file");
			return;
		}

		// Validate file size (max 5MB)
		if (file.size > 5 * 1024 * 1024) {
			toast.error("Image must be less than 5MB");
			return;
		}

		// Show preview
		const objectUrl = URL.createObjectURL(file);
		setPreviewUrl(objectUrl);

		setIsUploading(true);

		try {
			const postUrl = await generateUploadUrl();
			const result = await fetch(postUrl, {
				method: "POST",
				headers: { "Content-Type": file.type },
				body: file,
			});

			if (!result.ok) throw new Error("Upload failed");

			const data = await result.json();
			onUpload(data.storageId);
			toast.success("Avatar uploaded");
		} catch (error) {
			console.error("Error uploading avatar:", error);
			toast.error("Failed to upload avatar");
			setPreviewUrl(null);
		} finally {
			setIsUploading(false);
		}
	};

	const displayUrl = previewUrl || currentUrl;

	return (
		<div className="flex flex-col items-center gap-2">
			<div
				className={cn(
					"relative rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200",
					sizeClasses[size],
				)}
			>
				{displayUrl ? (
					<img
						src={displayUrl}
						alt="Avatar"
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<User className="h-1/2 w-1/2 text-gray-400" />
					</div>
				)}

				{isUploading && (
					<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
						<Loader2 className="h-6 w-6 animate-spin text-white" />
					</div>
				)}
			</div>

			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				onChange={handleFileSelect}
				className="hidden"
				disabled={disabled || isUploading}
			/>

			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => fileInputRef.current?.click()}
				disabled={disabled || isUploading}
			>
				<Camera className="h-4 w-4 mr-1" />
				{currentUrl || previewUrl ? "Change" : "Upload"}
			</Button>
		</div>
	);
}
