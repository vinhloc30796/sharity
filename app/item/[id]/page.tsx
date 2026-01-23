"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useRef, useState } from "react";
import { toast } from "sonner";
import { ItemActivityTimeline } from "@/components/item-activity-timeline";
import {
	BorrowerRequestActions,
	BorrowerRequestCalendar,
	BorrowerRequestProvider,
} from "@/components/lease/borrower-request-panel";
import { LeaseClaimCard } from "@/components/lease/lease-claim-card";
import { CATEGORY_LABELS, ItemForm } from "@/components/item-form";
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
import { ItemCalendar } from "@/components/item-calendar";
import { cn } from "@/lib/utils";
import { useItemCalendar } from "@/hooks/use-item-calendar";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type ItemRequest = {
	_id: Id<"claims">;
	status: "pending" | "approved" | "rejected";
	startDate: number;
	endDate: number;
};

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
	const markExpired = useMutation(api.items.markExpired);
	const markMissing = useMutation(api.items.markMissing);
	const generateUploadUrl = useMutation(api.items.generateUploadUrl);

	// Borrower Logic
	// Logic moved to BorrowerRequestPanel

	// UI State
	const [editingId, setEditingId] = useState<string | null>(null);
	const claimCardRefs = useRef<Map<Id<"claims">, HTMLDivElement>>(new Map());

	const focusClaimCard = (claimId: Id<"claims">) => {
		const el = claimCardRefs.current.get(claimId);
		if (!el) return;
		el.scrollIntoView({ block: "nearest", behavior: "smooth" });
		el.focus();
	};

	const ownerRequests = ((item?.requests ?? []) as ItemRequest[]) ?? [];
	const ownerCalendarState = useItemCalendar({
		mode: "owner",
		itemId: id,
		requests: ownerRequests,
		months: 2,
		onFocusClaim: focusClaimCard,
	});

	const approveClaimAction = async (
		args: Parameters<typeof approveClaim>[0],
	) => {
		await approveClaim(args);
	};
	const rejectClaimAction = async (args: Parameters<typeof rejectClaim>[0]) => {
		await rejectClaim(args);
	};
	const markPickedUpAction = async (
		args: Parameters<typeof markPickedUp>[0],
	) => {
		await markPickedUp(args);
	};
	const markReturnedAction = async (
		args: Parameters<typeof markReturned>[0],
	) => {
		await markReturned(args);
	};
	const markExpiredAction = async (args: Parameters<typeof markExpired>[0]) => {
		await markExpired(args);
	};
	const markMissingAction = async (args: Parameters<typeof markMissing>[0]) => {
		await markMissing(args);
	};

	if (item === undefined) {
		return <div className="p-8 text-center">Loading...</div>;
	}

	if (item === null) {
		return <div className="p-8 text-center">Item not found</div>;
	}

	const ownerCalendar = item.isOwner ? (
		<div className="bg-white border rounded-lg p-4 w-full">
			<div className="flex justify-center w-full max-w-full">
				<ItemCalendar {...ownerCalendarState.calendarProps} />
			</div>
		</div>
	) : null;

	return (
		<div className="container mx-auto px-3 sm:px-4 lg:px-6 py-8 max-w-7xl">
			<Button
				variant="ghost"
				className="mb-6 gap-2"
				onClick={() => router.back()}
			>
				<ArrowLeft className="h-4 w-4" /> Back to Items
			</Button>

			{item.isOwner ? (
				<div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8">
					{/* Image + Calendar Section */}
					<div className="space-y-4">
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

						{ownerCalendar}
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
							{/* Owner View */}
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
									{item.requests && item.requests.length > 0 ? (
										<div className="space-y-4">
											{item.requests.map((claim) => (
												<div
													key={claim._id}
													tabIndex={-1}
													ref={(el) => {
														if (el) claimCardRefs.current.set(claim._id, el);
														else claimCardRefs.current.delete(claim._id);
													}}
													className={cn(
														"outline-none scroll-mt-24",
														ownerCalendarState.hoveredClaimId === claim._id &&
															"ring-2 ring-primary rounded-lg",
													)}
												>
													<LeaseClaimCard
														itemId={item._id}
														claim={claim}
														viewerRole="owner"
														approveClaim={approveClaimAction}
														rejectClaim={rejectClaimAction}
														markPickedUp={markPickedUpAction}
														markReturned={markReturnedAction}
														markExpired={markExpiredAction}
														markMissing={markMissingAction}
														generateUploadUrl={async () =>
															await generateUploadUrl()
														}
													/>
												</div>
											))}
										</div>
									) : (
										<p className="text-gray-500">No requests yet.</p>
									)}
								</div>

								<div className="border-t pt-6">
									<h3 className="text-xl font-semibold mb-3">Activity</h3>
									<ItemActivityTimeline events={activity} />
								</div>
							</div>
						</div>
					</div>
				</div>
			) : (
				<BorrowerRequestProvider item={item}>
					<div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8">
						{/* Image + Calendar Section */}
						<div className="space-y-4">
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

							<div className="bg-white border rounded-lg p-4 w-full">
								<div className="flex justify-center w-full max-w-full">
									<BorrowerRequestCalendar className="mx-auto" />
								</div>
							</div>
						</div>

						{/* Details Section */}
						<div className="space-y-6">
							<div>
								<div className="flex justify-between items-start">
									<h1 className="text-3xl font-bold mb-2">{item.name}</h1>
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
								{/* Borrower View */}
								<div className="space-y-6">
									<div className="flex flex-col gap-4">
										<h3 className="text-xl font-semibold">
											Checks Availability & Request
										</h3>
										<BorrowerRequestActions />
									</div>
									<div className="border-t pt-6">
										<h3 className="text-xl font-semibold mb-3">Activity</h3>
										<ItemActivityTimeline events={activity} />
									</div>
								</div>
							</div>
						</div>
					</div>
				</BorrowerRequestProvider>
			)}
		</div>
	);
}
