"use client";

import Link from "next/link";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ItemForm } from "./item-form";
import { useState } from "react";
import { Doc, Id } from "../convex/_generated/dataModel";
import { ItemCard } from "./item-card";
import { Check, X } from "lucide-react";

// Badge not available, using span

function formatActor(actorId: string): string {
	if (actorId.length <= 16) return actorId;
	return `${actorId.slice(0, 8)}…${actorId.slice(-6)}`;
}

function primaryStatusForOwnerClaims(
	claims: Doc<"claims">[] | undefined,
):
	| "available"
	| "pending"
	| "approved"
	| "picked_up"
	| "returned"
	| "expired"
	| "missing" {
	const list = claims ?? [];

	const activeApproved = list.filter((c) => {
		if (c.status !== "approved") return false;
		return !c.returnedAt && !c.expiredAt && !c.missingAt;
	});

	// Prefer lifecycle states of an active approved lease.
	const inUse = activeApproved.find((c) => !!c.pickedUpAt);
	if (inUse) return "picked_up";

	const approved = activeApproved[0];
	if (approved) return "approved";

	const hasPending = list.some((c) => c.status === "pending");
	if (hasPending) return "pending";

	// If nothing active, show the most severe terminal state we can infer.
	if (list.some((c) => !!c.missingAt)) return "missing";
	if (list.some((c) => !!c.expiredAt)) return "expired";
	if (list.some((c) => !!c.returnedAt)) return "returned";

	return "available";
}

function labelForOwnerStatus(
	status: ReturnType<typeof primaryStatusForOwnerClaims>,
): string {
	switch (status) {
		case "available":
			return "Available";
		case "pending":
			return "Requests pending";
		case "approved":
			return "Approved";
		case "picked_up":
			return "In use";
		case "returned":
			return "Completed";
		case "expired":
			return "Expired";
		case "missing":
			return "Missing";
	}
}

function classNameForOwnerStatus(
	status: ReturnType<typeof primaryStatusForOwnerClaims>,
): string {
	switch (status) {
		case "available":
			return "border-transparent bg-blue-50 text-blue-700 hover:bg-blue-50/80";
		case "pending":
			return "border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100/80";
		case "approved":
			return "border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-100/80";
		case "picked_up":
			return "border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-100/80";
		case "returned":
			return "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80";
		case "expired":
		case "missing":
			return "border-transparent bg-rose-100 text-rose-900 hover:bg-rose-100/80";
	}
}

export function MyItemCard({
	item,
	isOwner = true,
}: {
	item: Doc<"items"> & {
		imageUrls?: string[];
		images?: { id: Id<"_storage">; url: string }[];
	};
	isOwner?: boolean;
}) {
	const updateItem = useMutation(api.items.update);
	const deleteItem = useMutation(api.items.deleteItem);
	const approveClaim = useMutation(api.items.approveClaim);
	const rejectClaim = useMutation(api.items.rejectClaim);
	const claims = useQuery(
		api.items.getClaims,
		isOwner ? { id: item._id } : "skip",
	);

	const [editingId, setEditingId] = useState<string | null>(null);

	const pendingClaims = (claims ?? []).filter((c) => c.status === "pending");
	const status = primaryStatusForOwnerClaims(claims);
	const activeApprovedClaim = (claims ?? []).find((c) => {
		if (c.status !== "approved") return false;
		return !c.returnedAt && !c.expiredAt && !c.missingAt;
	});
	const nextPendingClaim =
		pendingClaims.length > 0
			? [...pendingClaims].sort((a, b) => a.startDate - b.startDate)[0]
			: undefined;

	return (
		<ItemCard
			item={item}
			rightHeader={<></>} // Suppress default header
			density="compact"
			descriptionLines={2}
			footer={
				isOwner ? (
					<div className="flex justify-end gap-2 w-full">
						<Link href={`/item/${item._id}`}>
							<Button variant="secondary" size="sm">
								Manage
							</Button>
						</Link>
						<Dialog
							open={editingId === item._id}
							onOpenChange={(open) => setEditingId(open ? item._id : null)}
						>
							<DialogTrigger asChild>
								<Button variant="outline" size="sm">
									Edit
								</Button>
							</DialogTrigger>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Edit Item</DialogTitle>
								</DialogHeader>
								<ItemForm
									initialValues={{
										name: item.name,
										description: item.description || "",
										imageStorageIds: item.imageStorageIds,
										imageUrls: item.imageUrls,
										images: item.images,
									}}
									onSubmit={async (values) => {
										await updateItem({
											id: item._id,
											name: values.name,
											description: values.description,
											imageStorageIds: values.imageStorageIds,
										});
										setEditingId(null);
									}}
									submitLabel="Save Changes"
								/>
							</DialogContent>
						</Dialog>

						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" size="sm">
									Delete
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Are you sure?</AlertDialogTitle>
									<AlertDialogDescription>
										This action cannot be undone. This will permanently delete
										your item.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										onClick={() => deleteItem({ id: item._id })}
									>
										Delete
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				) : (
					<div className="flex justify-end gap-2 w-full">
						<Link href={`/item/${item._id}`}>
							<Button variant="secondary" size="sm">
								Open
							</Button>
						</Link>
					</div>
				)
			}
		>
			<div className="mb-4">
				{!isOwner ? (
					<span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80">
						Received from {item.ownerId}
					</span>
				) : (
					<span
						className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${classNameForOwnerStatus(status)}`}
					>
						{labelForOwnerStatus(status)}
						{activeApprovedClaim ? (
							<span className="ml-2 text-xs text-muted-foreground">
								to {formatActor(activeApprovedClaim.claimerId)} (
								{format(activeApprovedClaim.startDate, "MMM d")} -{" "}
								{format(activeApprovedClaim.endDate, "MMM d")})
							</span>
						) : null}
					</span>
				)}
			</div>

			{isOwner && pendingClaims.length > 0 && (
				<div className="mt-3 flex items-center justify-between gap-3 rounded-md border bg-amber-50 px-3 py-2">
					<div className="min-w-0">
						<div className="text-sm font-medium text-amber-900">
							{pendingClaims.length} pending request
							{pendingClaims.length > 1 ? "s" : ""}
						</div>
						{nextPendingClaim ? (
							<div className="text-xs text-amber-900/80 truncate">
								{formatActor(nextPendingClaim.claimerId)} ·{" "}
								{format(nextPendingClaim.startDate, "MMM d")} -{" "}
								{format(nextPendingClaim.endDate, "MMM d")}
							</div>
						) : null}
					</div>
					{nextPendingClaim ? (
						<div className="flex shrink-0 gap-2">
							<Button
								size="sm"
								variant="outline"
								className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
								onClick={() =>
									rejectClaim({ claimId: nextPendingClaim._id, id: item._id })
								}
							>
								<X className="h-4 w-4" />
								<span className="sr-only">Reject</span>
							</Button>
							<Button
								size="sm"
								className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
								onClick={() =>
									approveClaim({ claimId: nextPendingClaim._id, id: item._id })
								}
							>
								<Check className="h-4 w-4" />
								<span className="sr-only">Approve</span>
							</Button>
						</div>
					) : null}
				</div>
			)}
		</ItemCard>
	);
}
