"use client";

import Link from "next/link";

import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";

import { AddItemForm } from "@/components/add-item-form";
import { MyItemsList } from "@/components/my-items-list";
import { Button } from "@/components/ui/button";

export default function MyItemsPage() {
	return (
		<main className="min-h-screen bg-gray-50/50">
			<div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
				<div className="flex items-center justify-between gap-3">
					<Link
						href="/"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<h1 className="text-xl font-semibold">My Items</h1>
					<div className="w-5" />
				</div>

				<SignedIn>
					<div className="grid gap-4">
						<MyItemsList />
						<AddItemForm />
					</div>
				</SignedIn>

				<SignedOut>
					<div className="flex flex-col items-center justify-center gap-4 py-16">
						<p className="text-muted-foreground text-center">
							Please sign in to view and manage your items.
						</p>
						<SignInButton mode="modal">
							<Button variant="outline">Sign In</Button>
						</SignInButton>
					</div>
				</SignedOut>
			</div>
		</main>
	);
}
