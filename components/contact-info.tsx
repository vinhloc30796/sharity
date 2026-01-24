"use client";

import { MessageCircle, Phone, Facebook, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailableContacts {
	telegram: boolean;
	whatsapp: boolean;
	facebook: boolean;
	phone: boolean;
}

interface FullContacts {
	telegram?: string;
	whatsapp?: string;
	facebook?: string;
	phone?: string;
}

interface ContactInfoProps {
	availableContacts?: AvailableContacts;
	contacts?: FullContacts | null;
	showValues?: boolean;
}

export function ContactInfo({
	availableContacts,
	contacts,
	showValues = false,
}: ContactInfoProps) {
	// If we have full contacts and should show values
	if (showValues && contacts) {
		const hasAnyContact =
			contacts.telegram || contacts.whatsapp || contacts.facebook || contacts.phone;

		if (!hasAnyContact) {
			return (
				<div className="text-sm text-muted-foreground">No contact info provided.</div>
			);
		}

		return (
			<div className="flex flex-col gap-2">
				{contacts.telegram && (
					<ContactRow
						icon={<MessageCircle className="h-4 w-4 text-blue-500" />}
						label="Telegram"
						value={contacts.telegram}
						link={`https://t.me/${contacts.telegram.replace("@", "")}`}
					/>
				)}
				{contacts.whatsapp && (
					<ContactRow
						icon={<MessageCircle className="h-4 w-4 text-green-500" />}
						label="WhatsApp"
						value={contacts.whatsapp}
						link={`https://wa.me/${contacts.whatsapp.replace(/[^0-9]/g, "")}`}
					/>
				)}
				{contacts.facebook && (
					<ContactRow
						icon={<Facebook className="h-4 w-4 text-blue-600" />}
						label="Facebook"
						value={contacts.facebook}
						link={
							contacts.facebook.startsWith("http")
								? contacts.facebook
								: `https://facebook.com/${contacts.facebook}`
						}
					/>
				)}
				{contacts.phone && (
					<ContactRow
						icon={<Phone className="h-4 w-4 text-gray-600" />}
						label="Phone"
						value={contacts.phone}
						link={`tel:${contacts.phone}`}
					/>
				)}
			</div>
		);
	}

	// Show available contact methods (without values)
	if (availableContacts) {
		const available = Object.entries(availableContacts).filter(([, v]) => v);

		if (available.length === 0) {
			return (
				<div className="text-sm text-muted-foreground">No contact methods set up.</div>
			);
		}

		return (
			<div className="flex flex-col gap-2">
				<p className="text-sm text-muted-foreground">Available contact methods:</p>
				<div className="flex flex-wrap gap-2">
					{availableContacts.telegram && (
						<ContactBadge
							icon={<MessageCircle className="h-3 w-3 text-blue-500" />}
							label="Telegram"
						/>
					)}
					{availableContacts.whatsapp && (
						<ContactBadge
							icon={<MessageCircle className="h-3 w-3 text-green-500" />}
							label="WhatsApp"
						/>
					)}
					{availableContacts.facebook && (
						<ContactBadge
							icon={<Facebook className="h-3 w-3 text-blue-600" />}
							label="Facebook"
						/>
					)}
					{availableContacts.phone && (
						<ContactBadge
							icon={<Phone className="h-3 w-3 text-gray-600" />}
							label="Phone"
						/>
					)}
				</div>
				<p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
					<Lock className="h-3 w-3" />
					Contact details shared after approved transaction
				</p>
			</div>
		);
	}

	return null;
}

function ContactRow({
	icon,
	label,
	value,
	link,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	link?: string;
}) {
	const content = (
		<div className="flex items-center gap-2">
			{icon}
			<span className="text-sm text-muted-foreground">{label}:</span>
			<span className="text-sm font-medium">{value}</span>
		</div>
	);

	if (link) {
		return (
			<a
				href={link}
				target="_blank"
				rel="noopener noreferrer"
				className="hover:bg-gray-50 rounded p-1 -m-1 transition-colors"
			>
				{content}
			</a>
		);
	}

	return content;
}

function ContactBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
	return (
		<div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full text-xs">
			{icon}
			<span>{label}</span>
			<Check className="h-3 w-3 text-green-500" />
		</div>
	);
}
