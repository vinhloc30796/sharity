"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { AvailabilityToggle } from "@/components/notifications/availability-toggle";
import { Button } from "@/components/ui/button";
import { ItemCalendar } from "@/components/item-calendar";
import {
	useItemCalendar,
	type BorrowerCalendarState,
} from "@/hooks/use-item-calendar";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { LeaseClaimCard } from "./lease-claim-card";
import { cn } from "@/lib/utils";

type BorrowerRequestContextValue = {
	item: Doc<"items">;
	calendar: BorrowerCalendarState;
	isSubmitting: boolean;
	isAuthenticated: boolean;
	isAuthLoading: boolean;
	myRequests: Doc<"claims">[] | undefined;
	cancelRequest: (claimId: Doc<"claims">["_id"]) => Promise<void>;
	onClaim: () => void;
};

const BorrowerRequestContext =
	React.createContext<BorrowerRequestContextValue | null>(null);

function useBorrowerRequestContext(): BorrowerRequestContextValue {
	const ctx = React.useContext(BorrowerRequestContext);
	if (!ctx) {
		throw new Error(
			"BorrowerRequestContext is missing. Wrap with BorrowerRequestProvider.",
		);
	}
	return ctx;
}

export function BorrowerRequestProvider(props: {
	item: Doc<"items">;
	children: React.ReactNode;
}) {
	const { item, children } = props;

	const calendar = useItemCalendar({
		mode: "borrower",
		itemId: item._id,
		months: 2,
		showMyRequestModifiers: true,
	});

	const onClaim = () => {
		if (!calendar.date?.from || !calendar.date?.to) return;
		calendar.requestItem(calendar.date.from, calendar.date.to, () => {
			calendar.setDate(undefined);
		});
	};

	return (
		<BorrowerRequestContext.Provider
			value={{
				item,
				calendar,
				isSubmitting: calendar.isSubmitting,
				isAuthenticated: calendar.isAuthenticated,
				isAuthLoading: calendar.isAuthLoading,
				myRequests: calendar.myRequests,
				cancelRequest: calendar.cancelRequest,
				onClaim,
			}}
		>
			{children}
		</BorrowerRequestContext.Provider>
	);
}

export function BorrowerRequestCalendar(props: { className?: string }) {
	const { className } = props;
	const { calendar } = useBorrowerRequestContext();

	return <ItemCalendar {...calendar.calendarProps} className={className} />;
}

export function BorrowerRequestActions() {
	const {
		item,
		isSubmitting,
		isAuthenticated,
		isAuthLoading,
		myRequests,
		cancelRequest,
		onClaim,
		calendar,
	} = useBorrowerRequestContext();

	const markPickedUp = useMutation(api.items.markPickedUp);
	const markReturned = useMutation(api.items.markReturned);
	const generateUploadUrl = useMutation(api.items.generateUploadUrl);

	return (
		<>
			<div className="flex flex-col sm:flex-row gap-4 items-center">
				<Button
					size="lg"
					className="w-full sm:w-auto"
					onClick={onClaim}
					disabled={
						!calendar.date?.from ||
						!calendar.date?.to ||
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
					<div className="space-y-4">
						{myRequests.map((claim) => (
							<div
								key={claim._id}
								className={cn(
									calendar.hoveredClaimId === claim._id &&
										"ring-2 ring-primary rounded-lg",
								)}
							>
								<LeaseClaimCard
									itemId={item._id}
									claim={claim}
									viewerRole="borrower"
									cancelClaim={async ({ claimId }) =>
										await cancelRequest(claimId)
									}
									markPickedUp={markPickedUp}
									markReturned={markReturned}
									generateUploadUrl={async () => await generateUploadUrl()}
								/>
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

// Handles borrower availability selection and request actions for a single item.
export function BorrowerRequestPanel({ item }: { item: Doc<"items"> }) {
	return (
		<BorrowerRequestProvider item={item}>
			<div className="bg-white border rounded-lg p-4 inline-block w-full max-w-md mx-auto md:mx-0">
				<BorrowerRequestCalendar className="mx-auto" />
			</div>
			<BorrowerRequestActions />
		</BorrowerRequestProvider>
	);
}
