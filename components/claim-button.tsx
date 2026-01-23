"use client";

import { Button } from "@/components/ui/button";
import { Doc } from "../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
	TooltipProvider,
} from "@/components/ui/tooltip";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useItemCard } from "./item-card";

interface ClaimButtonProps {
	item: Doc<"items"> & { isRequested?: boolean };
}

export function ClaimButton({ item }: ClaimButtonProps) {
	const { isSignedIn } = useAuth();
	// useItemCard must be called unconditionally at the top level
	const { flipToBack } = useItemCard();
	// requestItem and availability moved to ClaimItemBack
	// state moved to ClaimItemBack

	if (item.isRequested) {
		return (
			<Button size="sm" variant="secondary" onClick={flipToBack}>
				Manage Request
			</Button>
		);
	}

	// This check relies on the parent query adding `isOwner` or similar check,
	// checking strictly via auth might be safer but `isRequested` covers the "already interacted" case.
	// If the user IS the owner, calling this might fail on backend, but UI wise we might want to hide it
	// or rely on `item.ownerId === userId` check if we had userId.
	// For now, if unsigned in, we show sign in tooltip.

	if (!isSignedIn) {
		return (
			<TooltipProvider>
				<Tooltip delayDuration={300}>
					<TooltipTrigger asChild>
						<span tabIndex={0} className="inline-flex cursor-default">
							<Button size="sm" disabled className="opacity-50">
								Claim
							</Button>
						</span>
					</TooltipTrigger>
					<TooltipContent>
						<p>Sign in to claim this item</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	// Calculate disabled dates
	// Moved to ClaimItemBack

	// If not signed in, show tooltip (existing logic)
	// ... (Wait, I need to keep the early return for not signed in)

	// Actually, let's just rewrite the component body.

	// NOTE: The previous code handled `item.isRequested` check. Keeping it.

	return (
		<Button size="sm" onClick={flipToBack}>
			Claim
		</Button>
	);
}
