"use client";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function AddWishlistDialog() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	const [showMatchAlert, setShowMatchAlert] = useState(false);
	const [matchCount, setMatchCount] = useState(0);

	const createWishlist = useMutation(api.wishlist.create);
	const items = useQuery(api.items.get);

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (!text.trim()) return;

		// Check for matches
		if (items) {
			const matches = items.filter((item) => {
				const itemText = (
					item.name +
					" " +
					(item.description || "")
				).toLowerCase();
				return itemText.includes(text.toLowerCase());
			});

			if (matches.length > 0) {
				setMatchCount(matches.length);
				setShowMatchAlert(true);
				return;
			}
		}

		await doCreate();
	};

	const doCreate = async () => {
		try {
			await createWishlist({ text });
			setText("");
			setOpen(false);
			setShowMatchAlert(false);
			toast.success("Request added to wishlist!");
		} catch {
			toast.error("Failed to add request");
		}
	};

	const onViewItems = () => {
		const trimmed = text.trim();
		setShowMatchAlert(false);
		setOpen(false);
		if (!trimmed) return;
		router.push(`/?q=${encodeURIComponent(trimmed)}`);
	};

	return (
		<>
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						Request Item
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request an Item</DialogTitle>
						<DialogDescription>
							Can't find what you're looking for? Add it to the wishlist.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="item-name">What do you need?</Label>
							<Input
								id="item-name"
								placeholder="e.g. Power Drill, Camping Tent..."
								value={text}
								onChange={(e) => setText(e.target.value)}
							/>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={!text.trim()}>
								Add Request
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<AlertDialog open={showMatchAlert} onOpenChange={setShowMatchAlert}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Similar items found!</AlertDialogTitle>
						<AlertDialogDescription>
							We found {matchCount} items that match your request. Would you
							like to view them instead?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={onViewItems}>
							View Items
						</AlertDialogCancel>
						<AlertDialogAction onClick={doCreate}>
							Post Request Anyway
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
