"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";

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
		isOwner ? { itemId: item._id } : "skip",
	);

	const [editingId, setEditingId] = useState<string | null>(null);

	const pendingClaims = claims?.filter((c) => c.status === "pending") || [];
	const approvedClaim = claims?.find((c) => c.status === "approved");

	return (
		<ItemCard
			item={item}
			rightHeader={<></>} // Suppress default header
			footer={
				isOwner ? (
					<div className="flex justify-end gap-2 w-full">
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
						{/* Placeholder for Return functionality */}
						<Button variant="outline" size="sm" disabled>
							Return (Coming Soon)
						</Button>
					</div>
				)
			}
		>
			<div className="mb-4">
				{!isOwner ? (
					<span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-indigo-100 text-indigo-800 hover:bg-indigo-100/80">
						Received from {item.ownerId}
					</span>
				) : approvedClaim ? (
					<span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-100 text-green-800 hover:bg-green-100/80">
						Given to {approvedClaim.claimerId}
					</span>
				) : !item.isAvailable ? (
					<span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
						Unavailable
					</span>
				) : (
					<span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-blue-50 text-blue-700 hover:bg-blue-50/80">
						Available
					</span>
				)}
			</div>

			{isOwner && pendingClaims.length > 0 && item.isAvailable && (
				<div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
					<p className="text-sm font-medium text-yellow-800 mb-2">
						{pendingClaims.length} Request{pendingClaims.length > 1 ? "s" : ""}
					</p>
					<div className="space-y-2">
						{pendingClaims.map((claim) => (
							<div
								key={claim._id}
								className="flex flex-col gap-2 text-sm bg-white p-2 rounded border"
							>
								<span className="font-medium">User:</span>
								<span className="text-xs text-gray-500 break-all">
									{claim.claimerId}
								</span>
								<div className="flex gap-2 justify-end w-full">
									<Button
										size="sm"
										variant="outline"
										className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
										onClick={() =>
											rejectClaim({ claimId: claim._id, itemId: item._id })
										}
									>
										<X className="h-4 w-4" />
										<span className="sr-only">Reject</span>
									</Button>
									<Button
										size="sm"
										className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700 text-white"
										onClick={() =>
											approveClaim({ claimId: claim._id, itemId: item._id })
										}
									>
										<Check className="h-4 w-4" />
										<span className="sr-only">Approve</span>
									</Button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</ItemCard>
	);
}
