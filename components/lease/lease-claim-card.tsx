"use client";

import { useMutation, useQuery } from "convex/react";
import {
	Check,
	Clock,
	X,
	AlertTriangle,
	Package,
	PackageCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import type { LeaseActivityEvent } from "./lease-activity-timeline";
import { LeaseActivitySection } from "./lease-activity-section";
import { LeaseActionDialog } from "./lease-action-dialog";
import { LeaseClaimHeader } from "./lease-claim-header";
import { LeaseProposeWindowDialog } from "./lease-propose-window-dialog";
import type {
	ApproveClaimArgs,
	CancelClaimArgs,
	MarkLeaseStatusArgs,
	MutationResult,
	RecordLeaseArgs,
	RejectClaimArgs,
	ViewerRole,
} from "./lease-claim-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";

function getLeaseState(claim: Doc<"claims">): string {
	if (claim.status === "rejected") return "rejected";
	if (claim.status === "approved") return "approved";
	return "requested";
}

function badgeVariantForState(
	state: string,
): "default" | "secondary" | "outline" | "destructive" {
	switch (state) {
		case "approved":
			return "default";
		case "requested":
			return "secondary";
		case "picked_up":
			return "default";
		case "transferred":
			return "outline";
		case "returned":
			return "outline";
		case "expired":
			return "destructive";
		case "past_due":
			return "destructive";
		case "missing":
			return "destructive";
		case "rejected":
			return "destructive";
		default:
			return "secondary";
	}
}

function labelForState(state: string): string {
	switch (state) {
		case "requested":
			return "Awaiting approval";
		case "approved":
			return "Approved";
		case "rejected":
			return "Rejected";
		case "picked_up":
			return "In use";
		case "transferred":
			return "Transferred";
		case "returned":
			return "Completed";
		case "expired":
			return "Expired";
		case "past_due":
			return "Past due";
		case "missing":
			return "Missing";
		default:
			return "Unknown";
	}
}

function getStateIcon(state: string) {
	switch (state) {
		case "requested":
			return Clock;
		case "approved":
			return Check;
		case "rejected":
			return X;
		case "picked_up":
			return Package;
		case "transferred":
			return PackageCheck;
		case "returned":
			return PackageCheck;
		case "expired":
		case "past_due":
		case "missing":
			return AlertTriangle;
		default:
			return Clock;
	}
}

// Manages a single lease claim with activity and status actions.
export function LeaseClaimCard(props: {
	itemId: Id<"items">;
	claim: Doc<"claims">;
	viewerRole: ViewerRole;
	isGiveaway: boolean;
	ownerId?: string;
	layout?: "card" | "embedded";
	approveClaim?: (args: ApproveClaimArgs) => MutationResult;
	rejectClaim?: (args: RejectClaimArgs) => MutationResult;
	cancelClaim?: (args: CancelClaimArgs) => MutationResult;
	markPickedUp: (args: RecordLeaseArgs) => MutationResult;
	markReturned: (args: RecordLeaseArgs) => MutationResult;
	markExpired?: (args: MarkLeaseStatusArgs) => MutationResult;
	markMissing?: (args: MarkLeaseStatusArgs) => MutationResult;
}) {
	const {
		itemId,
		claim,
		viewerRole,
		isGiveaway,
		ownerId,
		layout = "card",
		approveClaim,
		rejectClaim,
		cancelClaim,
		markPickedUp,
		markReturned,
		markExpired,
		markMissing,
	} = props;

	const events = useQuery(api.items.getLeaseActivity, { claimId: claim._id });
	const leaseEvents = events as LeaseActivityEvent[] | undefined;

	const isOwner = viewerRole === "owner";
	const isApproved = claim.status === "approved";

	const isIntradayLease = useMemo(() => {
		const ONE_HOUR_MS = 60 * 60 * 1000;
		const ONE_DAY_MS = 24 * ONE_HOUR_MS;

		const duration = claim.endDate - claim.startDate;
		if (duration <= 0 || duration >= ONE_DAY_MS) return false;
		if (
			claim.startDate % ONE_HOUR_MS !== 0 ||
			claim.endDate % ONE_HOUR_MS !== 0
		) {
			return false;
		}
		const start = new Date(claim.startDate);
		const end = new Date(claim.endDate);
		return (
			start.getFullYear() === end.getFullYear() &&
			start.getMonth() === end.getMonth() &&
			start.getDate() === end.getDate()
		);
	}, [claim.startDate, claim.endDate]);

	const proposePickupWindow = useMutation(api.items.proposePickupWindow);
	const approvePickupWindow = useMutation(api.items.approvePickupWindow);
	const proposeReturnWindow = useMutation(api.items.proposeReturnWindow);
	const approveReturnWindow = useMutation(api.items.approveReturnWindow);

	const [isApproving, setIsApproving] = useState(false);
	const [isRejecting, setIsRejecting] = useState(false);
	const [isCancelling, setIsCancelling] = useState(false);
	const [isApprovingPickupTime, setIsApprovingPickupTime] = useState(false);
	const [isApprovingReturnTime, setIsApprovingReturnTime] = useState(false);

	const eventTimes = useMemo(() => {
		const byType = new Map<LeaseActivityEvent["type"], number>();
		if (leaseEvents) {
			for (const e of leaseEvents) {
				const existing = byType.get(e.type);
				if (existing === undefined || e.createdAt < existing) {
					byType.set(e.type, e.createdAt);
				}
			}
		}
		return {
			requestedAt: byType.get("lease_requested"),
			approvedAt: byType.get("lease_approved"),
			rejectedAt: byType.get("lease_rejected"),
			expiredAt: byType.get("lease_expired"),
			missingAt: byType.get("lease_missing"),
			pickedUpAt: byType.get("lease_picked_up"),
			returnedAt: byType.get("lease_returned"),
			transferredAt: byType.get("lease_transferred") ?? claim.transferredAt,
		};
	}, [leaseEvents, claim.transferredAt]);

	const derivedState = useMemo(() => {
		if (eventTimes.rejectedAt) return "rejected";
		if (eventTimes.missingAt) return "missing";
		if (eventTimes.returnedAt) return "returned";
		if (eventTimes.transferredAt) return "transferred";
		if (eventTimes.expiredAt) return "expired";
		if (eventTimes.pickedUpAt) return "picked_up";
		if (eventTimes.approvedAt) return "approved";
		// Check if pending request has start date in the past
		if (claim.status === "pending" && claim.startDate < Date.now()) {
			return "past_due";
		}
		if (eventTimes.requestedAt) return "requested";
		return getLeaseState(claim);
	}, [claim, eventTimes]);

	const pickupProposal = useMemo(() => {
		const e = leaseEvents?.find((ev) => ev.type === "lease_pickup_proposed");
		if (
			!e ||
			typeof e.windowStartAt !== "number" ||
			typeof e.windowEndAt !== "number"
		) {
			return undefined;
		}
		const proposerRole: ViewerRole =
			e.actorId === claim.claimerId ? "borrower" : "owner";
		return {
			actorId: e.actorId,
			proposerRole,
			proposalId: e.proposalId,
			windowStartAt: e.windowStartAt,
			windowEndAt: e.windowEndAt,
		};
	}, [leaseEvents, claim.claimerId]);

	const pickupApproval = useMemo(() => {
		const e = leaseEvents?.find((ev) => ev.type === "lease_pickup_approved");
		if (!e) return undefined;
		if (
			typeof e.windowStartAt !== "number" ||
			typeof e.windowEndAt !== "number"
		) {
			return undefined;
		}
		const approverRole: ViewerRole =
			e.actorId === claim.claimerId ? "borrower" : "owner";
		return {
			actorId: e.actorId,
			approverRole,
			proposalId: e.proposalId,
			windowStartAt: e.windowStartAt,
			windowEndAt: e.windowEndAt,
		};
	}, [leaseEvents, claim.claimerId]);

	const returnProposal = useMemo(() => {
		const e = leaseEvents?.find((ev) => ev.type === "lease_return_proposed");
		if (
			!e ||
			typeof e.windowStartAt !== "number" ||
			typeof e.windowEndAt !== "number"
		) {
			return undefined;
		}
		const proposerRole: ViewerRole =
			e.actorId === claim.claimerId ? "borrower" : "owner";
		return {
			actorId: e.actorId,
			proposerRole,
			proposalId: e.proposalId,
			windowStartAt: e.windowStartAt,
			windowEndAt: e.windowEndAt,
		};
	}, [leaseEvents, claim.claimerId]);

	const returnApproval = useMemo(() => {
		const e = leaseEvents?.find((ev) => ev.type === "lease_return_approved");
		if (!e) return undefined;
		if (
			typeof e.windowStartAt !== "number" ||
			typeof e.windowEndAt !== "number"
		) {
			return undefined;
		}
		const approverRole: ViewerRole =
			e.actorId === claim.claimerId ? "borrower" : "owner";
		return {
			actorId: e.actorId,
			approverRole,
			proposalId: e.proposalId,
			windowStartAt: e.windowStartAt,
			windowEndAt: e.windowEndAt,
		};
	}, [leaseEvents, claim.claimerId]);

	const canRecordPickup =
		isApproved &&
		!eventTimes.pickedUpAt &&
		!eventTimes.expiredAt &&
		!eventTimes.rejectedAt;
	const canRecordReturn =
		!isGiveaway &&
		isApproved &&
		!!eventTimes.pickedUpAt &&
		!eventTimes.returnedAt &&
		!eventTimes.transferredAt &&
		!eventTimes.missingAt &&
		!eventTimes.rejectedAt;

	const isPastDue = derivedState === "past_due";
	const canBorrowerCancel =
		!isOwner &&
		!!cancelClaim &&
		(claim.status === "pending" || claim.status === "approved") &&
		!isPastDue &&
		!eventTimes.pickedUpAt &&
		!eventTimes.returnedAt &&
		!eventTimes.expiredAt &&
		!eventTimes.missingAt &&
		!eventTimes.rejectedAt;

	const canMarkExpired =
		isOwner &&
		isApproved &&
		!eventTimes.pickedUpAt &&
		!eventTimes.expiredAt &&
		!eventTimes.rejectedAt;
	const canMarkMissing =
		!isGiveaway &&
		isOwner &&
		isApproved &&
		!!eventTimes.pickedUpAt &&
		!eventTimes.returnedAt &&
		!eventTimes.transferredAt &&
		!eventTimes.missingAt &&
		!eventTimes.rejectedAt;

	const StateIcon = getStateIcon(derivedState);
	const now = Date.now();
	const pickupProposalActive =
		pickupProposal && now <= pickupProposal.windowEndAt;
	const returnProposalActive =
		returnProposal && now <= returnProposal.windowEndAt;
	const pickupApproved =
		pickupProposal &&
		pickupApproval &&
		pickupApproval.proposalId &&
		pickupApproval.proposalId === pickupProposal.proposalId;
	const returnApproved =
		returnProposal &&
		returnApproval &&
		returnApproval.proposalId &&
		returnApproval.proposalId === returnProposal.proposalId;
	const pickupConfirmWindowOpen =
		pickupProposalActive &&
		pickupProposal &&
		now >= pickupProposal.windowStartAt &&
		now <= pickupProposal.windowEndAt;
	const returnConfirmWindowOpen =
		returnProposalActive &&
		returnProposal &&
		now >= returnProposal.windowStartAt &&
		now <= returnProposal.windowEndAt;

	const toErrorMessage = (error: unknown): string =>
		error instanceof Error ? error.message : String(error);

	const inner = (
		<>
			<CardHeader>
				<LeaseClaimHeader
					claim={claim}
					requestedAt={eventTimes.requestedAt ?? claim._creationTime}
					stateLabel={labelForState(derivedState)}
					stateVariant={badgeVariantForState(derivedState)}
					StateIcon={StateIcon}
					viewerRole={viewerRole}
					ownerId={ownerId}
				/>
			</CardHeader>

			<CardContent>
				{isPastDue && (
					<div className="pb-3 text-xs text-muted-foreground">
						This request has passed its start date and can no longer be
						approved.
					</div>
				)}

				{canBorrowerCancel && (
					<div className="pb-3">
						<Button
							variant="outline"
							size="sm"
							className="w-full h-8 text-destructive hover:text-destructive"
							disabled={isApproving || isRejecting || isCancelling}
							onClick={async () => {
								if (!cancelClaim) return;
								setIsCancelling(true);
								try {
									await cancelClaim({ claimId: claim._id });
								} finally {
									setIsCancelling(false);
								}
							}}
						>
							{isCancelling ? "Cancelling..." : "Cancel request"}
						</Button>
					</div>
				)}

				{isOwner && claim.status === "pending" && !isPastDue && (
					<div className="flex gap-2">
						<Button
							size="sm"
							className="flex-1 h-8"
							disabled={isApproving || isRejecting || isCancelling}
							onClick={async () => {
								if (!approveClaim) return;
								setIsApproving(true);
								try {
									await approveClaim({ claimId: claim._id, id: itemId });
								} finally {
									setIsApproving(false);
								}
							}}
						>
							{isApproving ? (
								"Approving..."
							) : (
								<>
									<Check className="h-3.5 w-3.5 mr-1.5" />
									Approve
								</>
							)}
						</Button>

						{rejectClaim ? (
							<LeaseActionDialog
								title={
									isGiveaway
										? "Reject giveaway request"
										: "Reject lease request"
								}
								description={
									isGiveaway
										? "This will notify the requester that their request was declined."
										: "This will notify the borrower that their request was declined."
								}
								triggerLabel="Reject"
								triggerIcon={X}
								triggerVariant="outline"
								triggerSize="sm"
								triggerClassName="h-8"
								confirmLabel="Reject request"
								confirmVariant="destructive"
								cancelLabel="Cancel"
								noteConfig={{
									id: "reject-note",
									label: "Reason (optional, but recommended)",
									placeholder: "Let them know why...",
									rows: 3,
								}}
								disabled={isApproving}
								onBusyChange={setIsRejecting}
								onConfirm={async () =>
									await rejectClaim({ claimId: claim._id, id: itemId })
								}
							/>
						) : null}
					</div>
				)}

				{(isOwner || viewerRole === "borrower") &&
					claim.status === "approved" && (
						<div className="space-y-2">
							{isIntradayLease ? (
								<div className="text-xs text-muted-foreground">
									Intraday lease: pickup &amp; return times are set
									automatically from the selected hours.
								</div>
							) : null}
							{canRecordPickup && (
								<div className="space-y-2">
									{pickupProposal ? (
										<div className="text-xs text-muted-foreground">
											{pickupApproved
												? "Pickup proposed & approved: "
												: "Pickup proposed: "}
											{format(
												new Date(pickupProposal.windowStartAt),
												"MMM d p",
											)}
											–{format(new Date(pickupProposal.windowEndAt), "p")}
											{pickupApproved ? null : ". Pending approval."}
										</div>
									) : null}

									{!isIntradayLease ? (
										<LeaseProposeWindowDialog
											title="Propose pickup time"
											triggerLabel={
												pickupProposal
													? "Change pickup time"
													: "Propose pickup time"
											}
											triggerIcon={Package}
											triggerSize="sm"
											triggerClassName="w-full h-8"
											confirmLabel="Send proposal"
											cancelLabel="Cancel"
											fixedDate={new Date(claim.startDate)}
											defaultHour={
												pickupProposal
													? new Date(pickupProposal.windowStartAt).getHours()
													: undefined
											}
											disabled={
												isApproving ||
												isRejecting ||
												isCancelling ||
												isApprovingPickupTime ||
												isApprovingReturnTime
											}
											onConfirm={async (windowStartAt) => {
												try {
													await proposePickupWindow({
														itemId,
														claimId: claim._id,
														windowStartAt,
													});
													toast.success(
														"Pickup request sent. Now please wait for approval from your counterpart. Nothing to do for now",
													);
												} catch (error: unknown) {
													toast.error(toErrorMessage(error));
													throw error;
												}
											}}
										/>
									) : null}

									{pickupProposal && pickupProposalActive ? (
										pickupApproved ? (
											pickupConfirmWindowOpen ? (
												<LeaseActionDialog
													title="Confirm item pickup"
													description="Record that the item has been picked up. Photos help document the item&apos;s condition."
													triggerLabel="Confirm pickup"
													triggerIcon={Package}
													triggerSize="sm"
													triggerClassName="w-full h-8"
													confirmLabel="Confirm pickup"
													cancelLabel="Cancel"
													noteConfig={{
														id: "pickup-note",
														label: "Notes (optional)",
														placeholder: "Any notes about the pickup...",
														rows: 2,
													}}
													photoConfig={{
														label: "Photos (optional)",
														maxFiles: 5,
														accept: "image/*",
														folder: "leases",
													}}
													onConfirm={async ({ note, photoCloudinary }) => {
														try {
															await markPickedUp({
																itemId,
																claimId: claim._id,
																note,
																photoCloudinary,
															});
															toast.success("Pickup confirmed");
														} catch (error: unknown) {
															toast.error(toErrorMessage(error));
															throw error;
														}
													}}
												/>
											) : (
												<Tooltip>
													<TooltipTrigger asChild>
														<span className="w-full">
															<Button size="sm" className="w-full h-8" disabled>
																Confirm pickup
															</Button>
														</span>
													</TooltipTrigger>
													<TooltipContent sideOffset={6}>
														Confirm is available during{" "}
														{format(
															new Date(pickupProposal.windowStartAt),
															"MMM d p",
														)}
														–{format(new Date(pickupProposal.windowEndAt), "p")}
														.
													</TooltipContent>
												</Tooltip>
											)
										) : pickupProposal.proposerRole !== viewerRole ? (
											<Button
												variant="outline"
												size="sm"
												className="w-full h-8"
												disabled={
													isApproving ||
													isRejecting ||
													isCancelling ||
													isApprovingPickupTime ||
													isApprovingReturnTime
												}
												onClick={async () => {
													setIsApprovingPickupTime(true);
													try {
														await approvePickupWindow({
															itemId,
															claimId: claim._id,
														});
														toast.success(
															"Pickup time approved. Waiting for confirmation from your counterpart.",
														);
													} catch (error: unknown) {
														toast.error(toErrorMessage(error));
													} finally {
														setIsApprovingPickupTime(false);
													}
												}}
											>
												{isApprovingPickupTime
													? "Approving..."
													: "Approve pickup time"}
											</Button>
										) : null
									) : pickupProposal ? (
										<div className="text-xs text-muted-foreground">
											This window has passed. It will auto-expire soon.
										</div>
									) : null}
								</div>
							)}

							{canRecordReturn && (
								<div className="space-y-2">
									{returnProposal ? (
										<div className="text-xs text-muted-foreground">
											{returnApproved
												? "Return proposed & approved: "
												: "Return proposed: "}
											{format(
												new Date(returnProposal.windowStartAt),
												"MMM d p",
											)}
											–{format(new Date(returnProposal.windowEndAt), "p")}
											{returnApproved ? null : ". Pending approval."}
										</div>
									) : null}

									{!isIntradayLease ? (
										<LeaseProposeWindowDialog
											title="Propose return time"
											triggerLabel={
												returnProposal
													? "Change return time"
													: "Propose return time"
											}
											triggerIcon={PackageCheck}
											triggerSize="sm"
											triggerClassName="w-full h-8"
											confirmLabel="Send proposal"
											cancelLabel="Cancel"
											fixedDate={new Date(claim.endDate)}
											defaultHour={
												returnProposal
													? new Date(returnProposal.windowStartAt).getHours()
													: undefined
											}
											disabled={
												isApproving ||
												isRejecting ||
												isCancelling ||
												isApprovingPickupTime ||
												isApprovingReturnTime
											}
											onConfirm={async (windowStartAt) => {
												if (isGiveaway) return;
												try {
													await proposeReturnWindow({
														itemId,
														claimId: claim._id,
														windowStartAt,
													});
													toast.success(
														"Return request sent. Now please wait for approval from your counterpart. Nothing to do for now",
													);
												} catch (error: unknown) {
													toast.error(toErrorMessage(error));
													throw error;
												}
											}}
										/>
									) : null}

									{returnProposal && returnProposalActive ? (
										returnApproved ? (
											returnConfirmWindowOpen ? (
												<LeaseActionDialog
													title="Confirm item return"
													description="Record that the item has been returned. Photos help document the item&apos;s condition."
													triggerLabel="Confirm return"
													triggerIcon={PackageCheck}
													triggerSize="sm"
													triggerClassName="w-full h-8"
													confirmLabel="Confirm return"
													cancelLabel="Cancel"
													noteConfig={{
														id: "return-note",
														label: "Notes (optional)",
														placeholder: "Any notes about the return...",
														rows: 2,
													}}
													photoConfig={{
														label: "Photos (optional)",
														maxFiles: 5,
														accept: "image/*",
														folder: "leases",
													}}
													onConfirm={async ({ note, photoCloudinary }) => {
														try {
															await markReturned({
																itemId,
																claimId: claim._id,
																note,
																photoCloudinary,
															});
															toast.success("Return confirmed");
														} catch (error: unknown) {
															toast.error(toErrorMessage(error));
															throw error;
														}
													}}
												/>
											) : (
												<Tooltip>
													<TooltipTrigger asChild>
														<span className="w-full">
															<Button size="sm" className="w-full h-8" disabled>
																Confirm return
															</Button>
														</span>
													</TooltipTrigger>
													<TooltipContent sideOffset={6}>
														Confirm is available during{" "}
														{format(
															new Date(returnProposal.windowStartAt),
															"MMM d p",
														)}
														–{format(new Date(returnProposal.windowEndAt), "p")}
														.
													</TooltipContent>
												</Tooltip>
											)
										) : returnProposal.proposerRole !== viewerRole ? (
											<Button
												variant="outline"
												size="sm"
												className="w-full h-8"
												disabled={
													isApproving ||
													isRejecting ||
													isCancelling ||
													isApprovingPickupTime ||
													isApprovingReturnTime
												}
												onClick={async () => {
													setIsApprovingReturnTime(true);
													try {
														await approveReturnWindow({
															itemId,
															claimId: claim._id,
														});
														toast.success(
															"Return time approved. Waiting for confirmation from your counterpart.",
														);
													} catch (error: unknown) {
														toast.error(toErrorMessage(error));
													} finally {
														setIsApprovingReturnTime(false);
													}
												}}
											>
												{isApprovingReturnTime
													? "Approving..."
													: "Approve return time"}
											</Button>
										) : null
									) : returnProposal ? (
										<div className="text-xs text-muted-foreground">
											This window has passed. It will auto-mark missing soon.
										</div>
									) : null}
								</div>
							)}

							{isOwner && (canMarkExpired || canMarkMissing) && (
								<div className="flex gap-2">
									{canMarkExpired && markExpired && (
										<LeaseActionDialog
											title={
												isGiveaway
													? "Mark giveaway as expired"
													: "Mark lease as expired"
											}
											description={
												isGiveaway
													? "The requester didn't pick up the item. This will end the giveaway."
													: "The borrower didn't pick up the item. This will end the lease."
											}
											triggerLabel="Expired"
											triggerIcon={AlertTriangle}
											triggerVariant="outline"
											triggerSize="sm"
											triggerClassName="flex-1 h-7 text-xs text-destructive hover:text-destructive"
											confirmLabel="Mark as expired"
											confirmVariant="destructive"
											cancelLabel="Cancel"
											noteConfig={{
												id: "expired-note",
												label: "Notes (optional)",
												placeholder: "Why is this being marked expired...",
												rows: 2,
											}}
											onConfirm={async ({ note }) =>
												await markExpired({
													itemId,
													claimId: claim._id,
													note,
												})
											}
										/>
									)}

									{canMarkMissing && markMissing && (
										<LeaseActionDialog
											title="Mark item as missing"
											description="The item wasn't returned as expected. This is a serious issue."
											triggerLabel="Missing"
											triggerIcon={AlertTriangle}
											triggerVariant="outline"
											triggerSize="sm"
											triggerClassName="flex-1 h-7 text-xs text-destructive hover:text-destructive"
											confirmLabel="Mark as missing"
											confirmVariant="destructive"
											cancelLabel="Cancel"
											noteConfig={{
												id: "missing-note",
												label: "Notes (optional)",
												placeholder: "Details about the missing item...",
												rows: 2,
											}}
											onConfirm={async ({ note }) =>
												await markMissing({
													itemId,
													claimId: claim._id,
													note,
												})
											}
										/>
									)}
								</div>
							)}
						</div>
					)}

				<LeaseActivitySection events={leaseEvents} />
			</CardContent>
		</>
	);

	return layout === "embedded" ? inner : <Card>{inner}</Card>;
}
