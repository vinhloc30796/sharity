"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

interface ProfileSetupModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	clerkData: {
		name: string | null;
		email: string | null;
		avatarUrl: string | null;
	};
}

export function ProfileSetupModal({
	open,
	onOpenChange,
	clerkData,
}: ProfileSetupModalProps) {
	const [name, setName] = useState(clerkData.name || "");
	const [address, setAddress] = useState("");
	const [telegram, setTelegram] = useState("");
	const [whatsapp, setWhatsapp] = useState("");
	const [facebook, setFacebook] = useState("");
	const [phone, setPhone] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const updateProfile = useMutation(api.users.updateProfile);

	// Sync name with clerkData when it changes
	useEffect(() => {
		if (clerkData.name && !name) {
			setName(clerkData.name);
		}
	}, [clerkData.name, name]);

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

			toast.success("Profile created successfully!");
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to create profile:", error);
			toast.error("Failed to create profile");
		} finally {
			setIsSubmitting(false);
		}
	};

	const isNameFromClerk = name === clerkData.name;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Complete Your Profile</DialogTitle>
					<DialogDescription>
						Set up your profile to start sharing and borrowing items. You can
						update this later.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="name">
								Name <span className="text-red-500">*</span>
							</Label>
							{isNameFromClerk && (
								<span className="text-xs text-muted-foreground">(from Clerk)</span>
							)}
						</div>
						<div className="flex gap-2">
							<Input
								id="name"
								type="text"
								placeholder="Your name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								disabled={isSubmitting}
								className="flex-1"
							/>
							{!isNameFromClerk && clerkData.name && (
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={() => setName(clerkData.name || "")}
									title="Reset to Clerk value"
								>
									<RotateCcw className="h-4 w-4" />
								</Button>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="address">Address</Label>
						<Input
							id="address"
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

					<div className="flex gap-2 justify-end mt-2">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Later
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? "Saving..." : "Save Profile"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
