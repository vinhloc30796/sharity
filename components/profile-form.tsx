"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvatarUpload } from "@/components/avatar-upload";
import { Loader2, MessageCircle, Phone, Facebook } from "lucide-react";
import { toast } from "sonner";

interface ProfileFormProps {
	initialValues?: {
		name?: string | null;
		avatarUrl?: string | null;
		avatarStorageId?: Id<"_storage">;
		address?: string | null;
		contacts?: {
			telegram?: string;
			whatsapp?: string;
			facebook?: string;
			phone?: string;
		} | null;
	};
	onSuccess?: () => void;
}

export function ProfileForm({ initialValues, onSuccess }: ProfileFormProps) {
	const [name, setName] = useState(initialValues?.name || "");
	const [address, setAddress] = useState(initialValues?.address || "");
	const [telegram, setTelegram] = useState(initialValues?.contacts?.telegram || "");
	const [whatsapp, setWhatsapp] = useState(initialValues?.contacts?.whatsapp || "");
	const [facebook, setFacebook] = useState(initialValues?.contacts?.facebook || "");
	const [phone, setPhone] = useState(initialValues?.contacts?.phone || "");
	const [avatarStorageId, setAvatarStorageId] = useState<Id<"_storage"> | undefined>(
		initialValues?.avatarStorageId,
	);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const updateProfile = useMutation(api.users.updateProfile);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const contacts = {
				telegram: telegram.trim() || undefined,
				whatsapp: whatsapp.trim() || undefined,
				facebook: facebook.trim() || undefined,
				phone: phone.trim() || undefined,
			};

			// Only include contacts if at least one is set
			const hasContacts = Object.values(contacts).some((v) => v);

			await updateProfile({
				name: name.trim() || undefined,
				address: address.trim() || undefined,
				contacts: hasContacts ? contacts : undefined,
				avatarStorageId,
			});

			toast.success("Profile updated");
			onSuccess?.();
		} catch (error) {
			console.error("Error updating profile:", error);
			toast.error("Failed to update profile");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-6">
			<div className="flex justify-center">
				<AvatarUpload
					currentUrl={initialValues?.avatarUrl}
					onUpload={setAvatarStorageId}
					size="lg"
					disabled={isSubmitting}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="name">Name</Label>
				<Input
					id="name"
					type="text"
					placeholder="Your name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					disabled={isSubmitting}
				/>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="address">Address / Location</Label>
				<Input
					id="address"
					type="text"
					placeholder="e.g., Da Lat, Ward 1"
					value={address}
					onChange={(e) => setAddress(e.target.value)}
					disabled={isSubmitting}
				/>
			</div>

			<div className="flex flex-col gap-4">
				<Label className="text-base">Contact Information</Label>
				<p className="text-sm text-muted-foreground -mt-2">
					These will be shared with users you have approved transactions with.
				</p>

				<div className="flex flex-col gap-3">
					<div className="flex items-center gap-2">
						<div className="w-8 flex justify-center">
							<MessageCircle className="h-5 w-5 text-blue-500" />
						</div>
						<Input
							type="text"
							placeholder="Telegram username"
							value={telegram}
							onChange={(e) => setTelegram(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					<div className="flex items-center gap-2">
						<div className="w-8 flex justify-center">
							<MessageCircle className="h-5 w-5 text-green-500" />
						</div>
						<Input
							type="text"
							placeholder="WhatsApp number"
							value={whatsapp}
							onChange={(e) => setWhatsapp(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					<div className="flex items-center gap-2">
						<div className="w-8 flex justify-center">
							<Facebook className="h-5 w-5 text-blue-600" />
						</div>
						<Input
							type="text"
							placeholder="Facebook profile"
							value={facebook}
							onChange={(e) => setFacebook(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					<div className="flex items-center gap-2">
						<div className="w-8 flex justify-center">
							<Phone className="h-5 w-5 text-gray-600" />
						</div>
						<Input
							type="tel"
							placeholder="Phone number"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>
				</div>
			</div>

			<Button type="submit" disabled={isSubmitting}>
				{isSubmitting ? (
					<>
						<Loader2 className="h-4 w-4 animate-spin mr-2" />
						Saving...
					</>
				) : (
					"Save Profile"
				)}
			</Button>
		</form>
	);
}
