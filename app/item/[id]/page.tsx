"use client";

import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import { ArrowLeft, Check, ExternalLink, Loader2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { ItemActivityTimeline } from "@/components/item-activity-timeline";
import { CATEGORY_LABELS, ItemForm } from "@/components/item-form";
import { AvailabilityToggle } from "@/components/notifications/availability-toggle";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useClaimItem } from "@/hooks/use-claim-item";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";

export default function ItemDetailPage({
	params,
}: {
	params: Promise<{ id: Id<"items"> }>;
}) {
	const { id } = use(params);
	const router = useRouter();

	const item = useQuery(api.items.getById, { id });
	const activity = useQuery(api.items.getItemActivity, { itemId: id });

	// Mutations for Owner
	const updateItem = useMutation(api.items.update);
	const deleteItem = useMutation(api.items.deleteItem);
	const approveClaim = useMutation(api.items.approveClaim);
	const rejectClaim = useMutation(api.items.rejectClaim);
	const markPickedUp = useMutation(api.items.markPickedUp);
	const markReturned = useMutation(api.items.markReturned);

	// Borrower Logic
	// Logic moved to BorrowerRequestPanel

	// Owner Logic Variables
	const pendingClaims =
		item?.requests?.filter((c) => c.status === "pending") || [];
	const approvedClaim = item?.requests?.find((c) => c.status === "approved");

	const approvedClaimPickedUp = !!(
		approvedClaim &&
		activity?.some(
			(e) => e.type === "item_picked_up" && e.claimId === approvedClaim._id,
		)
	);

	const approvedClaimReturned = !!(
		approvedClaim &&
		activity?.some(
			(e) => e.type === "item_returned" && e.claimId === approvedClaim._id,
		)
	);

	// UI State
	const [editingId, setEditingId] = useState<string | null>(null);

	if (item === undefined) {
		return <div className="p-8 text-center">Loading...</div>;
	}

	if (item === null) {
		return <div className="p-8 text-center">Item not found</div>;
	}

	return (
		<div className="container mx-auto px-4 py-8 max-w-5xl">
			<Button
				variant="ghost"
				className="mb-6 gap-2"
				onClick={() => router.back()}
			>
				<ArrowLeft className="h-4 w-4" /> Back to Items
			</Button>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				{/* Image Section */}
				<div>
					{item.imageUrls && item.imageUrls.length > 0 ? (
						<div className="relative rounded-lg overflow-hidden bg-gray-100 border">
							<Carousel className="w-full">
								<CarouselContent>
									{item.imageUrls.map((url, index) => (
										<CarouselItem key={index}>
											<div className="aspect-square relative">
												<img
													src={url}
													alt={`${item.name} - Image ${index + 1}`}
													className="object-cover w-full h-full"
												/>
											</div>
										</CarouselItem>
									))}
								</CarouselContent>
								{item.imageUrls.length > 1 && (
									<>
										<CarouselPrevious className="left-2" />
										<CarouselNext className="right-2" />
									</>
								)}
							</Carousel>
						</div>
					) : (
						<div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
							No Images
						</div>
					)}
				</div>

				{/* Details Section */}
				<div className="space-y-6">
					<div>
						<div className="flex justify-between items-start">
							<h1 className="text-3xl font-bold mb-2">{item.name}</h1>
							{item.isOwner && <Badge variant="outline">You own this</Badge>}
						</div>

						<div className="flex flex-wrap gap-2 mb-4">
							{item.category && (
								<Badge variant="secondary">
									{CATEGORY_LABELS[item.category]}
								</Badge>
							)}
							{item.location && (
								<a
									href={`https://maps.google.com/?q=${item.location.lat},${item.location.lng}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									<MapPin className="h-4 w-4" />
									{item.location.address ||
										`${item.location.lat.toFixed(2)}, ${item.location.lng.toFixed(2)}`}
									<ExternalLink className="h-3 w-3" />
								</a>
							)}
						</div>
						<p className="text-lg text-gray-700 leading-relaxed">
							{item.description}
						</p>
					</div>

					<div className="border-t pt-6">
						{item.isOwner ? (
							/* Owner View */
							<div className="space-y-6">
								<div className="flex gap-4">
									<Dialog
										open={editingId === item._id}
										onOpenChange={(open) =>
											setEditingId(open ? item._id : null)
										}
									>
										<DialogTrigger asChild>
											<Button variant="outline">Edit Item</Button>
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
													toast.success("Item updated");
												}}
												submitLabel="Save Changes"
											/>
										</DialogContent>
									</Dialog>

									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button variant="destructive">Delete Item</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Are you sure?</AlertDialogTitle>
												<AlertDialogDescription>
													This action cannot be undone. This will permanently
													delete your item.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Cancel</AlertDialogCancel>
												<AlertDialogAction
													onClick={async () => {
														await deleteItem({ id: item._id });
														toast.success("Item deleted");
														router.push("/");
													}}
												>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								</div>

								<div>
									<h3 className="text-xl font-semibold mb-4">
										Requests ({item.requests?.length || 0})
									</h3>

									{approvedClaim && (
										<div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
											<h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
												<Check className="h-4 w-4" /> Currently Approved
											</h4>
											<p className="text-sm text-green-800">
												Lent to <strong>{approvedClaim.claimerId}</strong> from{" "}
												{format(approvedClaim.startDate, "MMM d")} to{" "}
												{format(approvedClaim.endDate, "MMM d")}
											</p>
											<div className="mt-3 flex flex-wrap gap-2">
												<Button
													size="sm"
													variant="outline"
													disabled={approvedClaimPickedUp}
													onClick={async () => {
														await markPickedUp({
															itemId: item._id,
															claimId: approvedClaim._id,
														});
														toast.success("Marked as picked up");
													}}
												>
													{approvedClaimPickedUp
														? "Picked up"
														: "Mark picked up"}
												</Button>
												<Button
													size="sm"
													variant="outline"
													disabled={approvedClaimReturned}
													onClick={async () => {
														await markReturned({
															itemId: item._id,
															claimId: approvedClaim._id,
														});
														toast.success("Marked as returned");
													}}
												>
													{approvedClaimReturned ? "Returned" : "Mark returned"}
												</Button>
											</div>
										</div>
									)}

									{pendingClaims.length > 0 ? (
										<div className="space-y-3">
											{pendingClaims.map((claim) => (
												<div
													key={claim._id}
													className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm"
												>
													<div>
														<p className="font-medium">{claim.claimerId}</p>
														<p className="text-sm text-gray-500">
															Wants to borrow:{" "}
															{format(claim.startDate, "MMM d")} -{" "}
															{format(claim.endDate, "MMM d")}
														</p>
													</div>
													<div className="flex gap-2">
														<Button
															size="sm"
															variant="outline"
															className="text-red-600 hover:bg-red-50 hover:text-red-700"
															onClick={() =>
																rejectClaim({
																	claimId: claim._id,
																	id: item._id,
																})
															}
														>
															Reject
														</Button>
														<Button
															size="sm"
															className="bg-green-600 hover:bg-green-700"
															onClick={() =>
																approveClaim({
																	claimId: claim._id,
																	id: item._id,
																})
															}
														>
															Approve
														</Button>
													</div>
												</div>
											))}
										</div>
									) : (
										!approvedClaim && (
											<p className="text-gray-500">No pending requests.</p>
										)
									)}
								</div>

								<div className="border-t pt-6">
									<h3 className="text-xl font-semibold mb-3">Activity</h3>
									<ItemActivityTimeline events={activity} />
								</div>
							</div>
						) : (
							/* Borrower View */
							<div className="space-y-6">
								<div className="flex flex-col gap-4">
									<h3 className="text-xl font-semibold">
										Checks Availability & Request
									</h3>
									<BorrowerRequestPanel item={item} />
								</div>
								<div className="border-t pt-6">
									<h3 className="text-xl font-semibold mb-3">Activity</h3>
									<ItemActivityTimeline events={activity} />
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function BorrowerRequestPanel({ item }: { item: Doc<"items"> }) {
	const {
		requestItem,
		disabledDates,
		isSubmitting,
		isAuthenticated,
		isAuthLoading,
		myRequests,
		cancelRequest,
	} = useClaimItem(item._id);

	const [date, setDate] = useState<DateRange | undefined>();
	const [numberOfMonths, setNumberOfMonths] = useState(1);

	useEffect(() => {
		const updateMonths = () => {
			setNumberOfMonths(window.innerWidth >= 768 ? 2 : 1);
		};
		updateMonths();
		window.addEventListener("resize", updateMonths);
		return () => window.removeEventListener("resize", updateMonths);
	}, []);

	const onClaim = () => {
		if (!date?.from || !date?.to) return;
		requestItem(date.from, date.to, () => {
			setDate(undefined);
		});
	};

	return (
		<>
			<div className="bg-white border rounded-lg p-4 inline-block w-full max-w-md mx-auto md:mx-0">
				<Calendar
					mode="range"
					selected={date}
					onSelect={setDate}
					disabled={disabledDates}
					numberOfMonths={numberOfMonths}
					className="mx-auto"
				/>
			</div>

			<div className="flex flex-col sm:flex-row gap-4 items-center">
				<Button
					size="lg"
					className="w-full sm:w-auto"
					onClick={onClaim}
					disabled={
						!date?.from ||
						!date?.to ||
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
					<div className="space-y-3">
						{myRequests.map((req) => (
							<div
								key={req._id}
								className="flex items-center justify-between p-3 bg-secondary/10 border rounded-lg"
							>
								<div>
									<p className="font-medium">
										{format(new Date(req.startDate), "MMM d, yyyy")} -{" "}
										{format(new Date(req.endDate), "MMM d, yyyy")}
									</p>
									<p className="text-sm text-muted-foreground capitalize">
										Status:{" "}
										<span
											className={
												req.status === "approved"
													? "text-green-600 font-bold"
													: ""
											}
										>
											{req.status}
										</span>
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="text-destructive hover:bg-destructive/10"
									onClick={() => cancelRequest(req._id)}
								>
									Cancel
								</Button>
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
