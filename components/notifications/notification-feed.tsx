"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { format, formatDistanceToNow } from "date-fns";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NotificationFeed() {
	const notifications = useQuery(api.notifications.get);
	const markAsRead = useMutation(api.notifications.markAsRead);
	const markAllAsRead = useMutation(api.notifications.markAllAsRead);
	const approveClaim = useMutation(api.items.approveClaim);
	const rejectClaim = useMutation(api.items.rejectClaim);
	const approvePickupWindow = useMutation(api.items.approvePickupWindow);
	const approveReturnWindow = useMutation(api.items.approveReturnWindow);
	const markPickedUp = useMutation(api.items.markPickedUp);
	const markReturned = useMutation(api.items.markReturned);
	const router = useRouter();

	if (notifications === undefined) {
		return <div className="p-4 text-center">Loading notifications...</div>;
	}

	if (notifications.length === 0) {
		return (
			<div className="p-4 text-center text-gray-500">No new notifications</div>
		);
	}

	const handleMarkRead = async (id: Id<"notifications">) => {
		await markAsRead({ notificationId: id });
	};

	const navigateToItem = (itemId: Id<"items">) => {
		router.push(`/item/${itemId}`);
	};

	const getNotificationActionContext = (n: (typeof notifications)[number]) => {
		const itemId = n.itemId as Id<"items">;
		const claimId = n.requestId as Id<"claims"> | undefined;
		const windowStartAt = n.windowStartAt as number | undefined;
		const windowEndAt = n.windowEndAt as number | undefined;
		return { itemId, claimId, windowStartAt, windowEndAt };
	};

	const handleNotificationClick = (
		n: (typeof notifications)[number],
		context: { itemId: Id<"items"> },
	) => {
		const { itemId } = context;

		// For any notification related to an item/request, navigate to the
		// item detail / request page so the user can review context.
		navigateToItem(itemId);

		if (!n.isRead) {
			void handleMarkRead(n._id);
		}
	};

	const renderedNotifications = notifications.map((n) => {
		const { itemId, claimId, windowStartAt, windowEndAt } =
			getNotificationActionContext(n);

		const isGiveaway = Boolean(n.item?.giveaway);
		const isTransferred = Boolean(n.claim?.transferredAt);

		let message = "";
		switch (n.type) {
			case "new_request":
				message = `New request for "${n.item?.name}"`;
				break;
			case "request_approved":
				message = `Request approved for "${n.item?.name}"! You can now view the owner's contact details.`;
				break;
			case "request_rejected":
				message = `Request rejected for "${n.item?.name}"`;
				break;
			case "item_available":
				message = `"${n.item?.name}" is now available!`;
				break;
			case "pickup_proposed":
				message = `Pickup requested for "${n.item?.name}"`;
				if (windowStartAt && windowEndAt) {
					message += `: ${format(new Date(windowStartAt), "MMM d p")}–${format(
						new Date(windowEndAt),
						"p",
					)}`;
				}
				break;
			case "pickup_approved":
				message = `Pickup approved for "${n.item?.name}"`;
				if (windowStartAt && windowEndAt) {
					message += `: ${format(new Date(windowStartAt), "MMM d p")}–${format(
						new Date(windowEndAt),
						"p",
					)}`;
				}
				break;
			case "pickup_confirmed":
				message =
					isGiveaway && isTransferred
						? `Transfer completed for "${n.item?.name}"`
						: `Pickup confirmed for "${n.item?.name}"`;
				break;
			case "pickup_expired":
				message = `Pickup expired for "${n.item?.name}"`;
				break;
			case "return_proposed":
				message = `Return requested for "${n.item?.name}"`;
				if (windowStartAt && windowEndAt) {
					message += `: ${format(new Date(windowStartAt), "MMM d p")}–${format(
						new Date(windowEndAt),
						"p",
					)}`;
				}
				break;
			case "return_approved":
				message = `Return approved for "${n.item?.name}"`;
				if (windowStartAt && windowEndAt) {
					message += `: ${format(new Date(windowStartAt), "MMM d p")}–${format(
						new Date(windowEndAt),
						"p",
					)}`;
				}
				break;
			case "return_confirmed":
				message = `Return confirmed for "${n.item?.name}"`;
				break;
			case "return_missing":
				message = `Return missing for "${n.item?.name}"`;
				break;
			default:
				message = "New notification";
		}

		const renderAction = () => {
			const commonDisabled = !claimId;

			if (n.type === "new_request") {
				const isPending = n.claim?.status === "pending";
				const isApproved = n.claim?.status === "approved";
				const isRejected = n.claim?.status === "rejected";

				// If already handled, show status instead of buttons
				if (!isPending && (isApproved || isRejected)) {
					return (
						<span
							className={`text-xs px-2 py-1 rounded ${
								isApproved
									? "bg-green-100 text-green-700"
									: "bg-red-100 text-red-700"
							}`}
						>
							{isApproved ? "Approved" : "Rejected"}
						</span>
					);
				}

				const canAct = !!claimId && isPending;
				return (
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							variant="outline"
							className="h-7 text-destructive hover:text-destructive"
							disabled={!canAct}
							onClick={async (e) => {
								e.preventDefault();
								e.stopPropagation();
								if (!claimId) return;
								try {
									await rejectClaim({ id: itemId, claimId });
									toast.success("Request rejected");
									await handleMarkRead(n._id);
								} catch (error: unknown) {
									const message =
										error instanceof Error ? error.message : String(error);
									toast.error(message);
								}
							}}
						>
							Reject
						</Button>
						<Button
							size="sm"
							className="h-7"
							disabled={!canAct}
							onClick={async (e) => {
								e.preventDefault();
								e.stopPropagation();
								if (!claimId) return;
								try {
									await approveClaim({ id: itemId, claimId });
									toast.success("Request approved");
									await handleMarkRead(n._id);
								} catch (error: unknown) {
									const message =
										error instanceof Error ? error.message : String(error);
									toast.error(message);
								}
							}}
						>
							Approve
						</Button>
					</div>
				);
			}

			if (n.type === "pickup_proposed") {
				return (
					<Button
						size="sm"
						className="h-7"
						disabled={commonDisabled}
						onClick={async (e) => {
							e.preventDefault();
							e.stopPropagation();
							if (!claimId) return;
							try {
								await approvePickupWindow({ itemId, claimId });
								toast.success("Pickup time approved");
								await handleMarkRead(n._id);
							} catch (error: unknown) {
								const message =
									error instanceof Error ? error.message : String(error);
								toast.error(message);
							}
						}}
					>
						Approve
					</Button>
				);
			}

			if (n.type === "return_proposed") {
				if (isGiveaway || isTransferred) {
					return (
						<Button
							size="sm"
							variant="outline"
							className="h-7"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								navigateToItem(itemId);
							}}
						>
							View
						</Button>
					);
				}
				return (
					<Button
						size="sm"
						className="h-7"
						disabled={commonDisabled}
						onClick={async (e) => {
							e.preventDefault();
							e.stopPropagation();
							if (!claimId) return;
							try {
								await approveReturnWindow({ itemId, claimId });
								toast.success("Return time approved");
								await handleMarkRead(n._id);
							} catch (error: unknown) {
								const message =
									error instanceof Error ? error.message : String(error);
								toast.error(message);
							}
						}}
					>
						Approve
					</Button>
				);
			}

			if (n.type === "pickup_approved") {
				return (
					<Button
						size="sm"
						className="h-7"
						disabled={commonDisabled}
						onClick={async (e) => {
							e.preventDefault();
							e.stopPropagation();
							if (!claimId) return;
							try {
								await markPickedUp({ itemId, claimId });
								toast.success("Pickup confirmed");
								await handleMarkRead(n._id);
							} catch (error: unknown) {
								const message =
									error instanceof Error ? error.message : String(error);
								toast.error(message);
							}
						}}
					>
						Confirm
					</Button>
				);
			}

			if (n.type === "return_approved") {
				if (isGiveaway || isTransferred) {
					return (
						<Button
							size="sm"
							variant="outline"
							className="h-7"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								navigateToItem(itemId);
							}}
						>
							View
						</Button>
					);
				}
				return (
					<Button
						size="sm"
						className="h-7"
						disabled={commonDisabled}
						onClick={async (e) => {
							e.preventDefault();
							e.stopPropagation();
							if (!claimId) return;
							try {
								await markReturned({ itemId, claimId });
								toast.success("Return confirmed");
								await handleMarkRead(n._id);
							} catch (error: unknown) {
								const message =
									error instanceof Error ? error.message : String(error);
								toast.error(message);
							}
						}}
					>
						Confirm
					</Button>
				);
			}

			if (
				n.type === "pickup_confirmed" ||
				n.type === "pickup_expired" ||
				n.type === "return_confirmed" ||
				n.type === "return_missing"
			) {
				return (
					<Button
						size="sm"
						variant="outline"
						className="h-7"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							navigateToItem(itemId);
						}}
					>
						View
					</Button>
				);
			}

			if (n.type === "request_approved" && n.item?.ownerId) {
				return (
					<Button
						size="sm"
						variant="outline"
						className="h-7"
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							router.push(`/user/${n.item?.ownerId}`);
						}}
					>
						View Profile
					</Button>
				);
			}

			return null;
		};

		return (
			<Card
				key={n._id}
				className={`p-3 mb-2 flex justify-between items-start gap-2 ${
					n.isRead ? "bg-gray-50" : "bg-white border-blue-200 shadow-sm"
				}`}
				onClick={() => handleNotificationClick(n, { itemId })}
			>
				<div className="flex-1 cursor-pointer">
					<p
						className={`text-sm ${n.isRead ? "text-gray-600" : "font-medium text-gray-900"}`}
					>
						{message}
					</p>
					<p className="text-xs text-gray-400 mt-1">
						{formatDistanceToNow(n.createdAt, { addSuffix: true })}
					</p>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					{renderAction()}
					{!n.isRead && (
						<Button
							variant="ghost"
							size="icon"
							className="h-6 w-6 shrink-0"
							onClick={(e) => {
								e.stopPropagation();
								handleMarkRead(n._id);
							}}
						>
							<span className="sr-only">Mark as read</span>
							<div className="h-2 w-2 rounded-full bg-blue-500" />
						</Button>
					)}
				</div>
			</Card>
		);
	});

	return (
		<div className="flex flex-col max-h-[400px]">
			<div className="p-2 border-b flex justify-between items-center sticky top-0 bg-white z-10">
				<span className="font-semibold text-sm">Notifications</span>
				<Button
					variant="ghost"
					size="sm"
					className="text-xs h-7"
					onClick={() => markAllAsRead({})}
				>
					Mark all read <Check className="ml-1 h-3 w-3" />
				</Button>
			</div>
			<div className="overflow-y-auto p-2 flex-1 scrollbar-thin scrollbar-thumb-gray-200">
				{renderedNotifications}
			</div>
		</div>
	);
}
