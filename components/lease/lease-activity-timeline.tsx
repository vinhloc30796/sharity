"use client";

import { format } from "date-fns";
import type { Doc } from "@/convex/_generated/dataModel";
import { UserLink } from "@/components/user-link";
import { cn } from "@/lib/utils";
import { CloudinaryImage } from "@/components/cloudinary-image";

export type LeaseActivityEvent = Doc<"lease_activity"> & {
	photoUrls?: string[];
};

function Actor({ actorId }: { actorId: string }) {
	if (actorId === "system") {
		return <span>System</span>;
	}
	return <UserLink userId={actorId} size="sm" showAvatar={false} />;
}

function formatEventTitle(event: LeaseActivityEvent): string {
	switch (event.type) {
		case "lease_requested":
			return "Requested";
		case "lease_approved":
			return "Approved";
		case "lease_rejected":
			return "Rejected";
		case "lease_expired":
			return "Expired";
		case "lease_missing":
			return "Missing";
		case "lease_pickup_proposed":
			return "Pickup proposed";
		case "lease_pickup_approved":
			return "Pickup time approved";
		case "lease_return_proposed":
			return "Return proposed";
		case "lease_return_approved":
			return "Return time approved";
		case "lease_picked_up":
			return "Picked up";
		case "lease_returned":
			return "Returned";
		default:
			return "Lease activity";
	}
}

// Displays lease activity events with optional photo previews.
export function LeaseActivityTimeline({
	events,
	className,
}: {
	events: LeaseActivityEvent[] | undefined;
	className?: string;
}) {
	if (events === undefined) {
		return (
			<div className={cn("text-sm text-muted-foreground", className)}>
				Loading lease activity...
			</div>
		);
	}

	if (events.length === 0) {
		return (
			<div className={cn("text-sm text-muted-foreground", className)}>
				No lease activity yet.
			</div>
		);
	}

	return (
		<div className={cn("space-y-3", className)}>
			{events.map((event) => {
				const title = formatEventTitle(event);
				const photoUrls = event.photoUrls ?? [];
				return (
					<div key={event._id} className="flex gap-3">
						<div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground" />
						<div className="min-w-0">
							<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
								<span className="text-sm font-medium">{title}</span>
								<span className="text-xs text-muted-foreground">
									{format(new Date(event.createdAt), "MMM d, yyyy p")}
								</span>
								<span className="text-xs text-muted-foreground flex items-center gap-1">
									by <Actor actorId={event.actorId} />
								</span>
							</div>

							{event.note && (
								<div className="text-xs text-muted-foreground break-all">
									{event.note}
								</div>
							)}

							{(event.type === "lease_pickup_proposed" ||
								event.type === "lease_pickup_approved" ||
								event.type === "lease_return_proposed" ||
								event.type === "lease_return_approved") &&
								typeof event.windowStartAt === "number" &&
								typeof event.windowEndAt === "number" && (
									<div className="text-xs text-muted-foreground">
										Window: {format(new Date(event.windowStartAt), "MMM d p")}–
										{format(new Date(event.windowEndAt), "p")}
									</div>
								)}

							{photoUrls.length > 0 && (
								<div className="mt-2 flex flex-wrap gap-2">
									{photoUrls.map((url) => (
										<a
											key={url}
											href={url}
											target="_blank"
											rel="noopener noreferrer"
											className="block"
										>
											<CloudinaryImage
												src={url}
												alt="Lease photo"
												width={64}
												height={64}
												sizes="64px"
												className="h-16 w-16 rounded-md border object-cover"
											/>
										</a>
									))}
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
