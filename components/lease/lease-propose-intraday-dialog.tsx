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

export type LeaseProposeIntradayDialogProps = {
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
	defaultStartHour?: number;
	defaultEndHour?: number;
	disabled?: boolean;
	onConfirm: (startAt: number, endAt: number) => Promise<unknown>;
	onBusyChange?: (busy: boolean) => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	showTrigger?: boolean;
};

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

function formatHourLabel(hour: number): string {
	return `${pad2(hour)}:00`;
}

/**
 * Dialog that lets user pick start and end hour on a fixed date (no minutes).
 */
export function LeaseProposeIntradayDialog(
	props: LeaseProposeIntradayDialogProps,
) {
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
		defaultStartHour,
		defaultEndHour,
		disabled,
		onConfirm,
		onBusyChange,
		open: controlledOpen,
		onOpenChange,
		showTrigger = true,
	} = props;

	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const open = controlledOpen ?? uncontrolledOpen;
	const setOpen = onOpenChange ?? setUncontrolledOpen;
	const [startHourValue, setStartHourValue] = useState<string>(
		defaultStartHour !== undefined ? String(defaultStartHour) : "9",
	);
	const [endHourValue, setEndHourValue] = useState<string>(
		defaultEndHour !== undefined ? String(defaultEndHour) : "17",
	);
	const [isSaving, setIsSaving] = useState(false);

	const startHour = Number(startHourValue);
	const endHour = Number(endHourValue);

	const dateLabel = useMemo(
		() => format(fixedDate, "MMM d, yyyy"),
		[fixedDate],
	);

	const startAt = useMemo(() => {
		const d = new Date(fixedDate);
		d.setHours(startHour, 0, 0, 0);
		return d.getTime();
	}, [fixedDate, startHour]);

	const endAt = useMemo(() => {
		const d = new Date(fixedDate);
		d.setHours(endHour, 0, 0, 0);
		return d.getTime();
	}, [fixedDate, endHour]);

	const isValid = endHour > startHour;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{showTrigger ? (
				<DialogTrigger asChild>
					<Button
						size={triggerSize}
						variant={triggerVariant}
						className={triggerClassName}
						disabled={Boolean(disabled)}
					>
						{TriggerIcon ? (
							<TriggerIcon className="h-3.5 w-3.5 mr-1.5" />
						) : null}
						{triggerLabel}
					</Button>
				</DialogTrigger>
			) : null}
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{description ?? `Choose hours on ${dateLabel}.`}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Start hour</Label>
						<Select value={startHourValue} onValueChange={setStartHourValue}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select a start hour" />
							</SelectTrigger>
							<SelectContent>
								{Array.from({ length: 24 }, (_, i) => (
									<SelectItem key={i} value={String(i)}>
										{formatHourLabel(i)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>End hour</Label>
						<Select value={endHourValue} onValueChange={setEndHourValue}>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Select an end hour" />
							</SelectTrigger>
							<SelectContent>
								{Array.from({ length: 24 }, (_, i) => (
									<SelectItem key={i} value={String(i)}>
										{formatHourLabel(i)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{!isValid ? (
							<div className="text-xs text-destructive">
								End hour must be after start hour.
							</div>
						) : null}
					</div>

					<div className="text-xs text-muted-foreground">
						Proposed: {dateLabel} {formatHourLabel(startHour)}–
						{formatHourLabel(endHour)}
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
						disabled={isSaving || !isValid}
						onClick={async () => {
							if (!isValid) return;
							setIsSaving(true);
							onBusyChange?.(true);
							try {
								await onConfirm(startAt, endAt);
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
