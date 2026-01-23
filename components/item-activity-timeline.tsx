"use client";

import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Doc } from "../convex/_generated/dataModel";

function formatActor(actorId: string): string {
	if (actorId.length <= 16) return actorId;
	return `${actorId.slice(0, 8)}…${actorId.slice(-6)}`;
}

function formatEventTitle(event: Doc<"item_activity">): string {
	switch (event.type) {
		case "item_created":
			return "Item created";
		case "loan_started":
			return "Loan started";
		case "item_picked_up":
			return "Item picked up";
		case "item_returned":
			return "Item returned";
		default:
			return "Activity";
	}
}

function formatEventDetails(event: Doc<"item_activity">): string | null {
	if (event.type === "loan_started" && event.borrowerId) {
		const dates =
			event.startDate && event.endDate
				? ` (${format(new Date(event.startDate), "MMM d")} - ${format(
						new Date(event.endDate),
						"MMM d",
					)})`
				: "";
		return `Borrower: ${formatActor(event.borrowerId)}${dates}`;
	}

	if (
		(event.type === "item_picked_up" || event.type === "item_returned") &&
		event.claimId
	) {
		return `Claim: ${event.claimId}`;
	}

	if (event.note) return event.note;
	return null;
}

export function ItemActivityTimeline({
	events,
	className,
}: {
	events: Doc<"item_activity">[] | undefined;
	className?: string;
}) {
	if (events === undefined) {
		return (
			<div className={cn("text-sm text-muted-foreground", className)}>
				Loading activity…
			</div>
		);
	}

	if (events.length === 0) {
		return (
			<div className={cn("text-sm text-muted-foreground", className)}>
				No activity yet.
			</div>
		);
	}

	return (
		<div className={cn("space-y-3", className)}>
			{events.map((event) => {
				const title = formatEventTitle(event);
				const details = formatEventDetails(event);
				return (
					<div key={event._id} className="flex gap-3">
						<div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
						<div className="min-w-0">
							<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
								<span className="text-sm font-medium">{title}</span>
								<span className="text-xs text-muted-foreground">
									{format(new Date(event.createdAt), "MMM d, yyyy p")}
								</span>
								<span className="text-xs text-muted-foreground">
									by {formatActor(event.actorId)}
								</span>
							</div>
							{details && (
								<div className="text-xs text-muted-foreground break-all">
									{details}
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
