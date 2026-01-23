"use client";

import { AddItemForm } from "@/components/add-item-form";
import { ItemList } from "@/components/item-list";
import { MyItemsList } from "@/components/my-items-list";
import { OwnerUnavailabilityButton } from "@/components/owner-unavailability-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignedIn } from "@clerk/nextjs";

import { ClaimButton } from "@/components/claim-button";
import { ClaimItemBack } from "@/components/claim-item-back";

export default function Home() {
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
					</div>
					<div className="w-full">
						<ItemList
							action={(item) => <ClaimButton item={item} />}
							actionBack={(item) => <ClaimItemBack item={item} />}
						/>
					</div>
				</div>

				{/* Mobile Layout: Tabs with Bottom Navigation */}
				<div className="md:hidden pb-20">
					<Tabs defaultValue="browse" className="w-full">
						<TabsContent value="browse" className="mt-0 space-y-4">
							<h2 className="text-lg font-semibold px-1">Browse Items</h2>
							<ItemList
								action={(item) => <ClaimButton item={item} />}
								actionBack={(item) => <ClaimItemBack item={item} />}
							/>
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
							<TabsList className="w-full grid grid-cols-2 h-auto">
								<TabsTrigger value="browse" className="py-3">
									Browse
								</TabsTrigger>
								<TabsTrigger value="manage" className="py-3">
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
