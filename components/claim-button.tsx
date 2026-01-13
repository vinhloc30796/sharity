"use client";

import { Button } from "@/components/ui/button";
import { Doc } from "../convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from "@/components/ui/tooltip";

interface ClaimButtonProps {
  item: Doc<"items"> & { isRequested?: boolean };
  onClaim: (itemId: string) => void;
}

export function ClaimButton({ item, onClaim }: ClaimButtonProps) {
  const { isSignedIn } = useAuth();
  
  if (item.isRequested) {
    return (
      <Button size="sm" variant="secondary" disabled>
        Requested
      </Button>
    );
  }

  const isAvailable = item.isAvailable;

  // Determine state
  let tooltipText = "";
  let isDisabled = false;
  let buttonText = "Claim";
  let variant: "default" | "secondary" | "destructive" | "outline" | "ghost" = "default";

  if (!isSignedIn) {
    isDisabled = true;
    tooltipText = "Sign in to claim this item";
    buttonText = "Claim";
  } else if (!isAvailable) {
    isDisabled = true;
    tooltipText = "This item is currently unavailable";
    buttonText = "Unavailable";
    variant = "secondary";
  } else {
    // Signed in and Available
    tooltipText = "Click to request this item";
  }

  // If there's no tooltip needed (available state), just render button?
  // User asked for responsive tooltip. Even for available, "Click to request" is good.
  
  const content = (
      <Button 
        size="sm" 
        variant={variant}
        disabled={isDisabled}
        onClick={() => onClaim(item._id)}
        className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
      >
        {buttonText}
      </Button>
  );

  if (!tooltipText) {
      return content;
  }

  return (
    <TooltipProvider>
        <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
            <span tabIndex={0} className="inline-flex cursor-default">
            {content}
            </span>
        </TooltipTrigger>
        <TooltipContent>
            <p>{tooltipText}</p>
        </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
}
