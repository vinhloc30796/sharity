"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RotateCcw, Settings } from "lucide-react";

interface ProfileEditModalProps {
	trigger?: React.ReactNode;
}

export function ProfileEditModal({ trigger }: ProfileEditModalProps) {
	const [open, setOpen] = useState(false);
	const profile = useQuery(api.users.getMyProfile);

	const [name, setName] = useState("");
	const [address, setAddress] = useState("");
	const [telegram, setTelegram] = useState("");
	const [whatsapp, setWhatsapp] = useState("");
	const [facebook, setFacebook] = useState("");
	const [phone, setPhone] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const updateProfile = useMutation(api.users.updateProfile);

	// Sync form with profile data when modal opens or profile changes
	useEffect(() => {
		if (profile && open) {
			setName(profile.name || "");
			setAddress(profile.address || "");
			setTelegram(profile.contacts?.telegram || "");
			setWhatsapp(profile.contacts?.whatsapp || "");
			setFacebook(profile.contacts?.facebook || "");
			setPhone(profile.contacts?.phone || "");
		}
	}, [profile, open]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast.error("Name is required");
			return;
		}

		setIsSubmitting(true);
		try {
			const contacts: {
				telegram?: string;
				whatsapp?: string;
				facebook?: string;
				phone?: string;
			} = {};
			if (telegram.trim()) contacts.telegram = telegram.trim();
			if (whatsapp.trim()) contacts.whatsapp = whatsapp.trim();
			if (facebook.trim()) contacts.facebook = facebook.trim();
			if (phone.trim()) contacts.phone = phone.trim();

			await updateProfile({
				name: name.trim(),
				address: address.trim() || undefined,
				contacts: Object.keys(contacts).length > 0 ? contacts : undefined,
			});

			toast.success("Profile updated successfully!");
			setOpen(false);
		} catch (error) {
			console.error("Failed to update profile:", error);
			toast.error("Failed to update profile");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleResetToClerk = () => {
		if (profile?.clerkData) {
			setName(profile.clerkData.name || "");
			toast.info("Name reset to Clerk value");
		}
	};

	if (!profile) return null;

	const clerkData = profile.clerkData;
	const isNameFromClerk = name === clerkData?.name;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline" size="sm">
						<Settings className="h-4 w-4 mr-2" />
						Edit Profile
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Profile</DialogTitle>
					<DialogDescription>
						Update your profile information and contact details.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="edit-name">
								Name <span className="text-red-500">*</span>
							</Label>
							{isNameFromClerk && clerkData?.name && (
								<span className="text-xs text-muted-foreground">(from Clerk)</span>
							)}
						</div>
						<div className="flex gap-2">
							<Input
								id="edit-name"
								type="text"
								placeholder="Your name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={isSubmitting}
								className="flex-1"
							/>
							{!isNameFromClerk && clerkData?.name && (
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={handleResetToClerk}
									title="Reset to Clerk value"
								>
									<RotateCcw className="h-4 w-4" />
								</Button>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="edit-address">Address</Label>
						<Input
							id="edit-address"
							type="text"
							placeholder="Your location (e.g., Da Lat, Vietnam)"
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label>Contact Methods</Label>
						<p className="text-xs text-muted-foreground">
							Add at least one way for others to contact you
						</p>

						<div className="grid grid-cols-2 gap-2">
							<Input
								type="text"
								placeholder="Telegram @username"
								value={telegram}
								onChange={(e) => setTelegram(e.target.value)}
								disabled={isSubmitting}
							/>
							<Input
								type="text"
								placeholder="WhatsApp number"
								value={whatsapp}
								onChange={(e) => setWhatsapp(e.target.value)}
								disabled={isSubmitting}
							/>
							<Input
								type="text"
								placeholder="Facebook profile"
								value={facebook}
								onChange={(e) => setFacebook(e.target.value)}
								disabled={isSubmitting}
							/>
							<Input
								type="text"
								placeholder="Phone number"
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								disabled={isSubmitting}
							/>
						</div>
					</div>

					{profile.email && (
						<div className="text-xs text-muted-foreground">
							Email: {profile.email} (from Clerk)
						</div>
					)}

					<div className="flex gap-2 justify-end mt-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => setOpen(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Changes"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
