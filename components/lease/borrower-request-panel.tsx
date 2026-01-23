"use client";

import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { AvailabilityToggle } from "@/components/notifications/availability-toggle";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useClaimItem } from "@/hooks/use-claim-item";
import type { Doc } from "@/convex/_generated/dataModel";

// Handles borrower availability selection and request actions for a single item.
export function BorrowerRequestPanel({ item }: { item: Doc<"items"> }) {
	const {
		requestItem,
		disabledDates,
		isSubmitting,
		isAuthenticated,
		isAuthLoading,
		myRequests,
		cancelRequest,
	} = useClaimItem(item._id);

	const [date, setDate] = useState<DateRange | undefined>();
	const [numberOfMonths, setNumberOfMonths] = useState(1);

	useEffect(() => {
		const updateMonths = () => {
			setNumberOfMonths(window.innerWidth >= 768 ? 2 : 1);
		};
		updateMonths();
		window.addEventListener("resize", updateMonths);
		return () => window.removeEventListener("resize", updateMonths);
	}, []);

	const onClaim = () => {
		if (!date?.from || !date?.to) return;
		requestItem(date.from, date.to, () => {
			setDate(undefined);
		});
	};

	return (
		<>
			<div className="bg-white border rounded-lg p-4 inline-block w-full max-w-md mx-auto md:mx-0">
				<Calendar
					mode="range"
					selected={date}
					onSelect={setDate}
					disabled={disabledDates}
					numberOfMonths={numberOfMonths}
					className="mx-auto"
				/>
			</div>

			<div className="flex flex-col sm:flex-row gap-4 items-center">
				<Button
					size="lg"
					className="w-full sm:w-auto"
					onClick={onClaim}
					disabled={
						!date?.from ||
						!date?.to ||
						isSubmitting ||
						!isAuthenticated ||
						isAuthLoading
					}
				>
					{isSubmitting ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting...
						</>
					) : (
						"Request to Borrow"
					)}
				</Button>
				{!isAuthenticated && (
					<span className="text-sm text-muted-foreground">
						Sign in to request
					</span>
				)}
			</div>

			{isAuthenticated && myRequests && myRequests.length > 0 && (
				<div className="mt-6">
					<h4 className="font-medium mb-3">Your Pending/Approved Requests</h4>
					<div className="space-y-3">
						{myRequests.map((req) => (
							<div
								key={req._id}
								className="flex items-center justify-between p-3 bg-secondary/10 border rounded-lg"
							>
								<div>
									<p className="font-medium">
										{format(new Date(req.startDate), "MMM d, yyyy")} -{" "}
										{format(new Date(req.endDate), "MMM d, yyyy")}
									</p>
									<p className="text-sm text-muted-foreground capitalize">
										Status:{" "}
										<span
											className={
												req.status === "approved"
													? "text-green-600 font-bold"
													: ""
											}
										>
											{req.status}
										</span>
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="text-destructive hover:bg-destructive/10"
									onClick={() => cancelRequest(req._id)}
								>
									Cancel
								</Button>
							</div>
						))}
					</div>
				</div>
			)}

			<div className="mt-4">
				<AvailabilityToggle id={item._id} />
			</div>
		</>
	);
}
