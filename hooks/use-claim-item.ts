import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";
import { useConvexAuth } from "convex/react";

export function useClaimItem(itemId: Id<"items">) {
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

	// Fetch my requests for this item
	const myRequests = useQuery(api.items.getMyRequests, { itemId });

	// Fetch availability
	const availability = useQuery(api.items.getAvailability, { id: itemId });

	const requestItem = useMutation(api.items.requestItem);
	const cancelClaim = useMutation(api.items.cancelClaim);

	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleClaim = async (
		startDate: Date,
		endDate: Date,
		onSuccess?: () => void,
	) => {
		if (!isAuthenticated) {
			toast.error("Please sign in to request this item");
			return;
		}

		setIsSubmitting(true);
		try {
			await requestItem({
				id: itemId,
				startDate: startDate.getTime(),
				endDate: endDate.getTime(),
			});
			toast.success("Item requested successfully");
			onSuccess?.();
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			if (errorMessage.includes("Unauthenticated")) {
				toast.error("Please sign in to request this item");
			} else if (errorMessage.includes("own item")) {
				toast.error("You cannot claim your own item");
			} else if (errorMessage.includes("available")) {
				toast.error("Selected dates are not available");
			} else if (
				errorMessage.includes("overlap") ||
				errorMessage.includes("Waitlist")
			) {
				// Handle specific overlap/waitlist errors if they have distinct messages
				toast.error(errorMessage);
			} else {
				toast.error(errorMessage || "Failed to request item");
				console.error(error);
			}
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = async (claimId: Id<"claims">) => {
		try {
			// We pass only claimId as it's sufficient and safer now
			await cancelClaim({ claimId });
			toast.success("Request cancelled");
		} catch (error) {
			console.error(error);
			toast.error("Failed to cancel request");
		}
	};

	// Calculate disabled dates (approved requests from ANYONE)
	const disabledDates = [
		{ before: new Date() },
		...(availability?.map((range) => ({
			from: new Date(range.startDate),
			to: new Date(range.endDate),
		})) || []),
	];

	return {
		myRequests,
		availability,
		disabledDates,
		isSubmitting,
		isAuthLoading,
		isAuthenticated,
		requestItem: handleClaim,
		cancelRequest: handleCancel,
	};
}
