"use client";

import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useRef, useState } from "react";
import { toast } from "sonner";
import { ItemActivityTimeline } from "@/components/item-activity-timeline";
import { BorrowerRequestPanel } from "@/components/lease/borrower-request-panel";
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
import { Toggle } from "@/components/ui/toggle";
import { ItemCalendar } from "@/components/item-calendar";
import { cn } from "@/lib/utils";
import { useItemCalendar } from "@/hooks/use-item-calendar";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

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
	const switchItemMode = useMutation(api.items.switchItemMode);
	const deleteItem = useMutation(api.items.deleteItem);
	const approveClaim = useMutation(api.items.approveClaim);
	const rejectClaim = useMutation(api.items.rejectClaim);
	const markPickedUp = useMutation(api.items.markPickedUp);
	const markReturned = useMutation(api.items.markReturned);
	const markExpired = useMutation(api.items.markExpired);
	const markMissing = useMutation(api.items.markMissing);
	const generateUploadUrl = useMutation(api.items.generateUploadUrl);

	// UI State
	const [editingId, setEditingId] = useState<string | null>(null);
	const [showInactive, setShowInactive] = useState(false);
	const claimCardRefs = useRef<Map<Id<"claims">, HTMLDivElement>>(new Map());

	const focusClaimCard = (claimId: Id<"claims">) => {
		const el = claimCardRefs.current.get(claimId);
		if (!el) return;
		el.scrollIntoView({ block: "nearest", behavior: "smooth" });
		el.focus();
	};

	const ownerRequests = ((item?.requests ?? []) as Doc<"claims">[]) ?? [];
	const ownerCalendarState = useItemCalendar({
		mode: "owner",
		itemId: id,
		requests: ownerRequests,
		months: 2,
		onFocusClaim: focusClaimCard,
	});

	const requestsToShow = ownerRequests.filter((req) => {
		if (showInactive) return true;
		// Active means:
		// 1. Pending
		// 2. Approved AND NOT (returned OR transferred OR expired OR missing)
		if (req.status === "pending") return true;
		if (req.status === "approved") {
			return (
				!req.returnedAt &&
				!req.transferredAt &&
				!req.expiredAt &&
				!req.missingAt
			);
		}
		return false;
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

	const imageSection =
		item.imageUrls && item.imageUrls.length > 0 ? (
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
		);

	const detailsSection = (
		<div>
			<div className="flex justify-between items-start">
				<h1 className="text-3xl font-bold mb-2">{item.name}</h1>
				{item.isOwner && <Badge variant="outline">You own this</Badge>}
			</div>

			<div className="flex flex-wrap gap-2 mb-4">
				{item.giveaway ? <Badge>Giveaway</Badge> : null}
				{item.category && (
					<Badge variant="secondary">{CATEGORY_LABELS[item.category]}</Badge>
				)}
				{item.location && (
					<span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
						<MapPin className="h-4 w-4" />
						{item.isOwner
							? item.location.address ||
								`${item.location.lat.toFixed(4)}, ${item.location.lng.toFixed(4)}`
							: item.location.ward || "Location available"}
					</span>
				)}
			</div>
			<p className="text-lg text-gray-700 leading-relaxed">
				{item.description}
			</p>
		</div>
	);

	const ownerItemActions = item.isOwner ? (
		<div className="flex flex-wrap gap-4">
			<Dialog
				open={editingId === item._id}
				onOpenChange={(open) => setEditingId(open ? item._id : null)}
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
							giveaway: Boolean(item.giveaway),
						}}
						enableModeSwitch
						onSubmit={async (values) => {
							if (
								typeof values.giveaway === "boolean" &&
								values.giveaway !== Boolean(item.giveaway)
							) {
								await switchItemMode({
									id: item._id,
									giveaway: values.giveaway,
								});
							}
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
							This action cannot be undone. This will permanently delete your
							item.
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
	) : null;

	const leftColumn = (
		<div className="space-y-6">
			{detailsSection}
			{imageSection}
			{ownerItemActions}
		</div>
	);

	const ownerActionsSection = (
		<div className="space-y-6">
			<div>
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-xl font-semibold">
						Requests ({item.requests?.length || 0})
					</h3>
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
				{item.requests && item.requests.length > 0 ? (
					<div className="space-y-4">
						{requestsToShow.map((claim) => (
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
									isGiveaway={Boolean(item.giveaway)}
									approveClaim={approveClaimAction}
									rejectClaim={rejectClaimAction}
									markPickedUp={markPickedUpAction}
									markReturned={markReturnedAction}
									markExpired={markExpiredAction}
									markMissing={markMissingAction}
									generateUploadUrl={async () => await generateUploadUrl()}
								/>
							</div>
						))}
					</div>
				) : (
					<p className="text-gray-500">No requests yet.</p>
				)}
			</div>
		</div>
	);

	const ownerRightColumn = (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold">Availability & Requests</h2>
			{ownerCalendar}
			<div>{ownerActionsSection}</div>
			<div className="border-t pt-6">
				<h3 className="text-xl font-semibold mb-3">Activity</h3>
				<ItemActivityTimeline
					events={activity}
					isGiveaway={Boolean(item.giveaway)}
				/>
			</div>
		</div>
	);

	const borrowerRightColumn = (
		<div className="space-y-6">
			<h2 className="text-2xl font-semibold">Checks Availability & Request</h2>
			<BorrowerRequestPanel item={item} fullWidth />
			<div className="border-t pt-6">
				<h3 className="text-xl font-semibold mb-3">Activity</h3>
				<ItemActivityTimeline
					events={activity}
					isGiveaway={Boolean(item.giveaway)}
				/>
			</div>
		</div>
	);

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
				<div className="grid grid-cols-1 md:grid-cols-[2fr_2fr] gap-8">
					{leftColumn}
					{ownerRightColumn}
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-[2fr_2fr] gap-8">
					{leftColumn}
					{borrowerRightColumn}
				</div>
			)}
		</div>
	);
}
