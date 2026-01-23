"use client";

import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize = ComponentProps<typeof Button>["size"];

export type LeaseProposeWindowDialogProps = {
	title: string;
	description?: string;
	triggerLabel: string;
	triggerIcon?: LucideIcon;
	triggerVariant?: ButtonVariant;
	triggerSize?: ButtonSize;
	triggerClassName?: string;
	confirmLabel: string;
	confirmVariant?: ButtonVariant;
	cancelLabel: string;
	fixedDate: Date;
	defaultHour?: number;
	disabled?: boolean;
	onConfirm: (windowStartAt: number) => Promise<unknown>;
	onBusyChange?: (busy: boolean) => void;
};

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

function formatHourWindowLabel(hour: number): string {
	const start = `${pad2(hour)}:00`;
	const endHour = (hour + 1) % 24;
	const end = `${pad2(endHour)}:00`;
	return `${start}–${end}`;
}

/**
 * Dialog that lets user pick a 1-hour window on a fixed date.
 */
export function LeaseProposeWindowDialog(props: LeaseProposeWindowDialogProps) {
	const {
		title,
		description,
		triggerLabel,
		triggerIcon: TriggerIcon,
		triggerVariant,
		triggerSize,
		triggerClassName,
		confirmLabel,
		confirmVariant,
		cancelLabel,
		fixedDate,
		defaultHour,
		disabled,
		onConfirm,
		onBusyChange,
	} = props;

	const [open, setOpen] = useState(false);
	const [hourValue, setHourValue] = useState<string>(
		defaultHour !== undefined ? String(defaultHour) : "9",
	);
	const [isSaving, setIsSaving] = useState(false);

	const hour = Number(hourValue);
	const dateLabel = useMemo(
		() => format(fixedDate, "MMM d, yyyy"),
		[fixedDate],
	);
	const windowLabel = useMemo(() => formatHourWindowLabel(hour), [hour]);

	const windowStartAt = useMemo(() => {
		const d = new Date(fixedDate);
		d.setHours(hour, 0, 0, 0);
		return d.getTime();
	}, [fixedDate, hour]);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					size={triggerSize}
					variant={triggerVariant}
					className={triggerClassName}
					disabled={Boolean(disabled)}
				>
					{TriggerIcon ? <TriggerIcon className="h-3.5 w-3.5 mr-1.5" /> : null}
					{triggerLabel}
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{description ?? `Choose a 1-hour window on ${dateLabel}.`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-2">
					<Label>Hour window</Label>
					<Select value={hourValue} onValueChange={setHourValue}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Select an hour" />
						</SelectTrigger>
						<SelectContent>
							{Array.from({ length: 24 }, (_, i) => (
								<SelectItem key={i} value={String(i)}>
									{formatHourWindowLabel(i)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<div className="text-xs text-muted-foreground">
						Proposed: {dateLabel} {windowLabel}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={isSaving}
					>
						{cancelLabel}
					</Button>
					<Button
						variant={confirmVariant}
						disabled={isSaving}
						onClick={async () => {
							setIsSaving(true);
							onBusyChange?.(true);
							try {
								await onConfirm(windowStartAt);
								setOpen(false);
							} finally {
								setIsSaving(false);
								onBusyChange?.(false);
							}
						}}
					>
						{isSaving ? `${confirmLabel}...` : confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
