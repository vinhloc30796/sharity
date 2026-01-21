"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useItemCard } from "./item-card";
import { AvailabilityToggle } from "./notifications/availability-toggle";

interface ClaimItemBackProps {
	item: Doc<"items">;
}

export function ClaimItemBack({ item }: ClaimItemBackProps) {
	const { flipToFront } = useItemCard();
	const requestItem = useMutation(api.items.requestItem);
	const availability = useQuery(api.items.getAvailability, {
		itemId: item._id,
	});

	const [date, setDate] = useState<DateRange | undefined>();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [numberOfMonths, setNumberOfMonths] = useState(1);

	useEffect(() => {
		const updateMonths = () => {
			setNumberOfMonths(window.innerWidth >= 768 ? 2 : 1);
		};
		updateMonths();
		window.addEventListener("resize", updateMonths);
		return () => window.removeEventListener("resize", updateMonths);
	}, []);

	// Calculate disabled dates
	const disabledDates = [
		{ before: new Date() },
		...(availability?.map((range) => ({
			from: new Date(range.startDate),
			to: new Date(range.endDate),
		})) || []),
	];

	const handleClaim = async () => {
		if (!date?.from || !date?.to) return;
		setIsSubmitting(true);
		try {
			await requestItem({
				itemId: item._id,
				startDate: date.from.getTime(),
				endDate: date.to.getTime(),
			});
			toast.success("Item requested successfully");
			flipToFront();
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			if (errorMessage.includes("own item")) {
				toast.error("You cannot claim your own item");
			} else if (errorMessage.includes("available")) {
				toast.error("Selected dates are not available");
			} else {
				toast.error("Failed to request item");
				console.error(error);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="flex flex-col bg-card rounded-lg p-2">
			<div className="flex-1 flex flex-col items-center justify-center p-2">
				<h4 className="font-medium text-lg mb-1">Select Dates</h4>
				<p className="text-sm text-muted-foreground mb-4 text-center">
					Select the range you want to borrow this item for.
				</p>
				<div className="border rounded-md p-2 bg-background flex justify-center w-full overflow-hidden">
					<Calendar
						mode="range"
						selected={date}
						onSelect={setDate}
						disabled={disabledDates}
						numberOfMonths={numberOfMonths}
						className="rounded-md border-0"
						classNames={{
							months:
								"flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
						}}
					/>
				</div>
			</div>
			<div className="p-3 border-t border-border flex justify-between gap-2 mt-auto">
				<AvailabilityToggle itemId={item._id} />
				<div className="flex gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={flipToFront}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleClaim}
						disabled={!date?.from || !date?.to || isSubmitting}
					>
						{isSubmitting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							"Request"
						)}
					</Button>
				</div>
			</div>
		</div>
	);
}
