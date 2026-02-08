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
import { useTranslations } from "next-intl";

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
	const t = useTranslations("ProfileSetup");
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
			toast.error(t("toastRequired"));
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

			toast.success(t("toastSuccess"));
			onOpenChange(false);
		} catch (error) {
			console.error("Failed to create profile:", error);
			toast.error(t("toastFailed"));
		} finally {
			setIsSubmitting(false);
		}
	};

	const isNameFromClerk = name === clerkData.name;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t("title")}</DialogTitle>
					<DialogDescription>{t("description")}</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="name">
								{t("nameLabel")} <span className="text-red-500">*</span>
							</Label>
							{isNameFromClerk && (
								<span className="text-xs text-muted-foreground">
									{t("fromClerk")}
								</span>
							)}
						</div>
						<div className="flex gap-2">
							<Input
								id="name"
								type="text"
								placeholder={t("namePlaceholder")}
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
									title={t("resetToClerk")}
								>
									<RotateCcw className="h-4 w-4" />
								</Button>
							)}
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="address">{t("addressLabel")}</Label>
						<Input
							id="address"
							type="text"
							placeholder={t("addressPlaceholder")}
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							disabled={isSubmitting}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label>{t("contactMethodsLabel")}</Label>
						<p className="text-xs text-muted-foreground">
							{t("contactMethodsDesc")}
						</p>

						<div className="grid grid-cols-2 gap-2">
							<Input
								type="text"
								placeholder={t("telegramPlaceholder")}
								value={telegram}
								onChange={(e) => setTelegram(e.target.value)}
								disabled={isSubmitting}
							/>
							<Input
								type="text"
								placeholder={t("whatsappPlaceholder")}
								value={whatsapp}
								onChange={(e) => setWhatsapp(e.target.value)}
								disabled={isSubmitting}
							/>
							<Input
								type="text"
								placeholder={t("facebookPlaceholder")}
								value={facebook}
								onChange={(e) => setFacebook(e.target.value)}
								disabled={isSubmitting}
							/>
							<Input
								type="text"
								placeholder={t("phonePlaceholder")}
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
							{t("later")}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? t("saving") : t("save")}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
