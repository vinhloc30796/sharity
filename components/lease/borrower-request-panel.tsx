"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { Loader2 } from "lucide-react";
import { AvailabilityToggle } from "@/components/notifications/availability-toggle";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ItemCalendar } from "@/components/item-calendar";
import { LeaseProposeIntradayDialog } from "@/components/lease/lease-propose-intraday-dialog";
import {
	useItemCalendar,
	type BorrowerCalendarState,
} from "@/hooks/use-item-calendar";
import type { Doc } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { LeaseClaimCard } from "./lease-claim-card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

function formatIntradayRangeLabel(range: {
	startAt: number;
	endAt: number;
}): string {
	const startHour = new Date(range.startAt).getHours();
	const endHour = new Date(range.endAt).getHours();
	return `${pad2(startHour)}:00–${pad2(endHour)}:00`;
}

type BorrowerRequestContextValue = {
	item: Doc<"items">;
	calendar: BorrowerCalendarState;
	isSubmitting: boolean;
	isAuthenticated: boolean;
	isAuthLoading: boolean;
	myRequests: Doc<"claims">[] | undefined;
	cancelRequest: (claimId: Doc<"claims">["_id"]) => Promise<void>;
	intradayRange: { startAt: number; endAt: number } | null;
	isIntradayRequired: boolean;
	intradayDialogOpen: boolean;
	intradayFixedDate: Date | null;
	onIntradayDialogOpenChange: (open: boolean) => void;
	onConfirmIntraday: (startAt: number, endAt: number) => Promise<void>;
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

	const [intradayRange, setIntradayRange] = React.useState<{
		startAt: number;
		endAt: number;
	} | null>(null);
	const [intradayDialogOpen, setIntradayDialogOpen] = React.useState(false);
	const [intradayFixedDate, setIntradayFixedDate] = React.useState<Date | null>(
		null,
	);

	const isIntradayRequired = Boolean(
		calendar.date?.from &&
			calendar.date?.to &&
			isSameDay(calendar.date.from, calendar.date.to),
	);

	const hasOverlap = (
		a: { startDate: number; endDate: number },
		b: { startDate: number; endDate: number },
	): boolean => a.startDate < b.endDate && a.endDate > b.startDate;

	const selectionKey =
		calendar.date?.from && calendar.date?.to
			? `${calendar.date.from.getTime()}-${calendar.date.to.getTime()}`
			: null;
	const lastSelectionKeyRef = React.useRef<string | null>(null);

	React.useEffect(() => {
		if (selectionKey === lastSelectionKeyRef.current) return;
		lastSelectionKeyRef.current = selectionKey;

		setIntradayRange(null);
		setIntradayDialogOpen(false);
		setIntradayFixedDate(null);

		if (calendar.date?.from && calendar.date?.to) {
			if (isSameDay(calendar.date.from, calendar.date.to)) {
				setIntradayFixedDate(calendar.date.from);
			}
		}
	}, [calendar.date, selectionKey]);

	const onConfirmIntraday = async (startAt: number, endAt: number) => {
		if (!intradayFixedDate) {
			throw new Error("Missing date for intraday selection");
		}

		const now = Date.now();
		if (startAt < now) {
			toast.error("Start time must be in the future");
			throw new Error("Start time must be in the future");
		}
		if (endAt <= startAt) {
			toast.error("End time must be after start time");
			throw new Error("End time must be after start time");
		}

		const overlaps = (calendar.availability ?? []).some((r) =>
			hasOverlap(
				{ startDate: startAt, endDate: endAt },
				{ startDate: r.startDate, endDate: r.endDate },
			),
		);
		if (overlaps) {
			toast.error("Selected hours are not available");
			throw new Error("Selected hours are not available");
		}

		setIntradayRange({ startAt, endAt });
		setIntradayDialogOpen(false);
	};

	const onClaim = () => {
		if (isIntradayRequired) {
			if (!intradayRange) {
				setIntradayDialogOpen(true);
				return;
			}
			calendar.requestItemAt(intradayRange.startAt, intradayRange.endAt, () => {
				setIntradayRange(null);
				setIntradayDialogOpen(false);
				setIntradayFixedDate(null);
				calendar.setDate(undefined);
			});
			return;
		}

		if (!calendar.date?.from || !calendar.date?.to) return;
		calendar.requestItem(calendar.date.from, calendar.date.to, () => {
			setIntradayRange(null);
			setIntradayDialogOpen(false);
			setIntradayFixedDate(null);
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
				intradayRange,
				isIntradayRequired,
				intradayDialogOpen,
				intradayFixedDate,
				onIntradayDialogOpenChange: setIntradayDialogOpen,
				onConfirmIntraday,
				onClaim,
			}}
		>
			{children}
		</BorrowerRequestContext.Provider>
	);
}

export function BorrowerRequestCalendar(props: { className?: string }) {
	const { className } = props;
	const {
		calendar,
		intradayRange,
		intradayDialogOpen,
		intradayFixedDate,
		onIntradayDialogOpenChange,
		onConfirmIntraday,
	} = useBorrowerRequestContext();
	const [isIntradayBusy, setIsIntradayBusy] = React.useState(false);

	return (
		<>
			<ItemCalendar {...calendar.calendarProps} className={className} />
			{intradayFixedDate ? (
				<div className="mt-3">
					<LeaseProposeIntradayDialog
						title="Select hours"
						description="Same-day requests are booked by the hour."
						triggerLabel={
							intradayRange
								? `Change hours (${formatIntradayRangeLabel(intradayRange)})`
								: "Select hours"
						}
						triggerVariant="outline"
						triggerSize="sm"
						triggerClassName="w-full h-8"
						confirmLabel="Save hours"
						cancelLabel="Cancel"
						fixedDate={intradayFixedDate}
						disabled={calendar.isSubmitting || isIntradayBusy}
						open={intradayDialogOpen}
						onOpenChange={onIntradayDialogOpenChange}
						onBusyChange={setIsIntradayBusy}
						onConfirm={async (startAt, endAt) => {
							await onConfirmIntraday(startAt, endAt);
						}}
					/>
				</div>
			) : null}
		</>
	);
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
	const [showInactive, setShowInactive] = React.useState(false);

	return (
		<>
			<div className="flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-3">
					<Button
						className="h-10 w-full sm:w-auto"
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
					<AvailabilityToggle id={item._id} />
				</div>
				{!isAuthenticated && (
					<span className="text-sm text-muted-foreground">
						Sign in to request
					</span>
				)}
				<span className="text-xs text-muted-foreground">
					For intraday requests, pickup &amp; return time is set automatically
					after approval.
				</span>
			</div>

			{isAuthenticated && myRequests && myRequests.length > 0 && (
				<div className="mt-6">
					<div className="flex justify-between items-center mb-3">
						<h4 className="font-medium">Your Requests</h4>
						<Toggle
							pressed={showInactive}
							onPressedChange={setShowInactive}
							variant="outline"
							size="sm"
							aria-label="Toggle inactive requests"
						>
							{showInactive ? "Hide Inactive" : "Show Inactive"}
						</Toggle>
					</div>
					<div className="space-y-4">
						{myRequests
							.filter((req) => {
								if (showInactive) return true;
								if (req.status === "pending") return true;
								if (req.status === "approved") {
									return !req.returnedAt && !req.expiredAt && !req.missingAt;
								}
								return false;
							})
							.map((claim) => (
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
