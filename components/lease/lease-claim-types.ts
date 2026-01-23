import type { Id } from "@/convex/_generated/dataModel";

export type ViewerRole = "owner" | "borrower";

export type ApproveClaimArgs = { claimId: Id<"claims">; id: Id<"items"> };
export type RejectClaimArgs = { claimId: Id<"claims">; id: Id<"items"> };
export type MutationResult = Promise<null | void>;

export type RecordLeaseArgs = {
	itemId: Id<"items">;
	claimId: Id<"claims">;
	note?: string;
	photoStorageIds?: Id<"_storage">[];
};

export type MarkLeaseStatusArgs = {
	itemId: Id<"items">;
	claimId: Id<"claims">;
	note?: string;
};
