"use client";

import { AddItemForm } from "@/components/add-item-form";
import { ItemList } from "@/components/item-list";
import { MyItemsList } from "@/components/my-items-list";
import { OwnerUnavailabilityButton } from "@/components/owner-unavailability-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WishlistDraftCard } from "@/components/wishlist/wishlist-draft-card";
import { SignedIn } from "@clerk/nextjs";

import { ClaimButton } from "@/components/claim-button";
import { ClaimItemBack } from "@/components/claim-item-back";
import { Gift, ListChecks, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense, useState } from "react";

export default function Home() {
	const [desktopLeftTab, setDesktopLeftTab] = useState<"share" | "request">(
		"share",
	);
	const [desktopRequestFocusToken, setDesktopRequestFocusToken] = useState(0);
	const [mobileTab, setMobileTab] = useState<"browse" | "wishlist" | "manage">(
		"browse",
	);
	const [mobileWishlistFocusToken, setMobileWishlistFocusToken] = useState(0);

	return (
		<main className="min-h-screen flex flex-col items-center bg-gray-50/50">
			<div className="w-full max-w-6xl p-4 md:p-8 space-y-8">
				<div className="text-center space-y-2">
					<h1 className="text-4xl font-bold tracking-tight">Sharity</h1>
					<p className="text-xl text-gray-600">
						Borrow and lend useful items in Da Lat.
					</p>
				</div>

				{/* Desktop Layout: Split View */}
				<div className="hidden md:grid md:grid-cols-[350px_1fr] lg:grid-cols-[400px_1fr] gap-8 items-start justify-center">
					<div className="sticky top-8">
						<Tabs
							value={desktopLeftTab}
							onValueChange={(v) => setDesktopLeftTab(v as "share" | "request")}
							className="w-full"
						>
							<TabsList className="w-full grid grid-cols-2">
								<TabsTrigger value="share">
									<Gift className="h-4 w-4" />
									Share
								</TabsTrigger>
								<TabsTrigger value="request">
									<ListChecks className="h-4 w-4" />
									Request
								</TabsTrigger>
							</TabsList>
							<TabsContent value="share" className="mt-4">
								<AddItemForm />
							</TabsContent>
							<TabsContent value="request" className="mt-4">
								<WishlistDraftCard
									autoFocus={desktopRequestFocusToken > 0}
									focusToken={desktopRequestFocusToken}
								/>
							</TabsContent>
						</Tabs>
						<SignedIn>
							<div className="mt-8">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg font-semibold">My Items</h2>
									<OwnerUnavailabilityButton />
								</div>
								<MyItemsList />
							</div>
						</SignedIn>
					</div>
					<div className="w-full">
						<Suspense
							fallback={<div className="w-full max-w-2xl">Loading…</div>}
						>
							<ItemList
								action={(item) => <ClaimButton item={item} />}
								actionBack={(item) => <ClaimItemBack item={item} />}
								onEmptyMakeRequest={() => {
									setDesktopLeftTab("request");
									setDesktopRequestFocusToken((n) => n + 1);
								}}
							/>
						</Suspense>
					</div>
				</div>

				{/* Mobile Layout: Tabs with Bottom Navigation */}
				<div className="md:hidden pb-20">
					<Tabs
						value={mobileTab}
						onValueChange={(v) => setMobileTab(v as typeof mobileTab)}
						className="w-full"
					>
						<TabsContent value="browse" className="mt-0 space-y-4">
							<h2 className="text-lg font-semibold px-1">Browse Items</h2>
							<Suspense
								fallback={<div className="w-full max-w-2xl">Loading…</div>}
							>
								<ItemList
									action={(item) => <ClaimButton item={item} />}
									actionBack={(item) => <ClaimItemBack item={item} />}
									onEmptyMakeRequest={() => {
										setMobileTab("wishlist");
										setMobileWishlistFocusToken((n) => n + 1);
									}}
								/>
							</Suspense>
						</TabsContent>

						<TabsContent value="wishlist" className="mt-0 space-y-4">
							<h2 className="text-lg font-semibold px-1">Wishlist</h2>
							<WishlistDraftCard
								autoFocus={mobileWishlistFocusToken > 0}
								focusToken={mobileWishlistFocusToken}
							/>
							<Link href="/wishlist" className="block">
								<Button variant="outline" className="w-full">
									Go to Wishlist
								</Button>
							</Link>
						</TabsContent>

						<TabsContent value="manage" className="mt-0 space-y-4">
							<h2 className="text-lg font-semibold px-1">Share & Manage</h2>
							<AddItemForm />
							<SignedIn>
								<div className="mt-8">
									<div className="flex items-center justify-between mb-4">
										<h2 className="text-lg font-semibold">My Items</h2>
										<OwnerUnavailabilityButton />
									</div>
									<MyItemsList />
								</div>
							</SignedIn>
						</TabsContent>

						<div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 p-2 z-50">
							<TabsList className="w-full grid grid-cols-3 h-auto">
								<TabsTrigger value="browse" className="py-3">
									<Search className="h-4 w-4" />
									Browse
								</TabsTrigger>
								<TabsTrigger value="wishlist" className="py-3">
									<ListChecks className="h-4 w-4" />
									Wishlist
								</TabsTrigger>
								<TabsTrigger value="manage" className="py-3">
									<Gift className="h-4 w-4" />
									Manage
								</TabsTrigger>
							</TabsList>
						</div>
					</Tabs>
				</div>
			</div>
		</main>
	);
}
