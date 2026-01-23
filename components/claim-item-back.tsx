"use client";

import { Doc } from "../convex/_generated/dataModel";
import { useItemCalendar } from "@/hooks/use-item-calendar";
import { ItemCalendar } from "@/components/item-calendar";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useItemCard } from "./item-card";
import { AvailabilityToggle } from "./notifications/availability-toggle";
import { format } from "date-fns";

interface ClaimItemBackProps {
	item: Doc<"items">;
}

export function ClaimItemBack({ item }: ClaimItemBackProps) {
	const { flipToFront } = useItemCard();

	const calendar = useItemCalendar({
		mode: "borrower",
		itemId: item._id,
		months: "responsive",
		showMyRequestModifiers: false,
	});

	const requestDisabled =
		!calendar.date?.from ||
		!calendar.date?.to ||
		calendar.isSubmitting ||
		calendar.isAuthLoading ||
		!calendar.isAuthenticated;

	const onClaim = () => {
		if (!calendar.date?.from || !calendar.date?.to) return;
		calendar.requestItem(calendar.date.from, calendar.date.to, () => {
			calendar.setDate(undefined);
		});
	};

	return (
		<div className="flex flex-col bg-card rounded-lg p-2 h-full overflow-y-auto">
			<div className="flex-1 flex flex-col items-center p-2">
				<h4 className="font-medium text-lg mb-1">Select Dates</h4>
				{!calendar.isAuthenticated && (
					<p className="text-sm text-muted-foreground mb-3 text-center">
						{calendar.isAuthLoading
							? "Connecting..."
							: "Sign in to request this item."}
					</p>
				)}
				<div className="border rounded-md p-2 bg-background flex justify-center w-full max-w-full">
					<ItemCalendar {...calendar.calendarProps} />
				</div>

				{/* My Requests Section */}
				{calendar.isAuthenticated &&
					calendar.myRequests &&
					calendar.myRequests.length > 0 && (
						<div className="w-full mt-4 border-t pt-2">
							<h5 className="text-sm font-medium mb-2">Your Requests</h5>
							<div className="space-y-2 max-h-32 overflow-y-auto">
								{calendar.myRequests.map((req) => (
									<div
										key={req._id}
										className="flex justify-between items-center text-sm p-2 bg-secondary/20 rounded border"
									>
										<div className="flex flex-col">
											<span
												className={
													req.status === "approved"
														? "text-green-600 font-bold"
														: ""
												}
											>
												{format(new Date(req.startDate), "MMM d")} -{" "}
												{format(new Date(req.endDate), "MMM d")}
											</span>
											<div className="flex gap-2 text-xs text-muted-foreground capitalize">
												<span
													className={
														req.status === "approved" ? "text-green-600" : ""
													}
												>
													{req.status}
												</span>
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-destructive hover:text-destructive/90"
											onClick={() => calendar.cancelRequest(req._id)}
											title="Cancel Request"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						</div>
					)}
			</div>

			<div className="p-3 border-t border-border flex justify-between gap-2 mt-auto">
				<AvailabilityToggle id={item._id} />
				<div className="flex gap-2">
					<Button variant="ghost" size="sm" onClick={flipToFront}>
						Cancel
					</Button>
					<Button size="sm" onClick={onClaim} disabled={requestDisabled}>
						{calendar.isSubmitting ? (
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
