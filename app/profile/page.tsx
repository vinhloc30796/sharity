"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ProfileForm } from "@/components/profile-form";
import { RatingSummary } from "@/components/rating-summary";
import { RatingsList } from "@/components/ratings-list";
import { UserHistory } from "@/components/user-history";
import { PendingRatings } from "@/components/pending-ratings";
import { ContactInfo } from "@/components/contact-info";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MapPin, Settings, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ProfilePage() {
	const { user, isLoaded } = useUser();
	const profile = useQuery(api.users.getMyProfile);
	const [isEditOpen, setIsEditOpen] = useState(false);

	if (!isLoaded) {
		return (
			<main className="min-h-screen flex items-center justify-center">
				<div className="text-muted-foreground">Loading...</div>
			</main>
		);
	}

	if (!user) {
		return (
			<main className="min-h-screen flex flex-col items-center justify-center gap-4">
				<p className="text-muted-foreground">
					Please sign in to view your profile.
				</p>
				<Link href="/">
					<Button variant="outline">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Home
					</Button>
				</Link>
			</main>
		);
	}

	if (profile === undefined) {
		return (
			<main className="min-h-screen flex items-center justify-center">
				<div className="text-muted-foreground">Loading profile...</div>
			</main>
		);
	}

	const displayName =
		profile?.name || user.firstName || user.username || "User";
	const avatarUrl = profile?.avatarUrl || user.imageUrl;
	const clerkId = user.id;

	return (
		<main className="min-h-screen bg-gray-50/50">
			<div className="max-w-2xl mx-auto px-4 pb-4 pt-0 md:px-8 md:pb-8 md:pt-2 space-y-5">
				<div className="flex items-center justify-between">
					<Link
						href="/"
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						<ArrowLeft className="h-5 w-5" />
					</Link>
					<h1 className="text-xl font-semibold">My Profile</h1>
					<Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
						<DialogTrigger asChild>
							<Button variant="outline" size="sm">
								<Settings className="h-4 w-4 mr-1" />
								Edit
							</Button>
						</DialogTrigger>
						<DialogContent className="max-h-[90vh] overflow-y-auto">
							<DialogHeader>
								<DialogTitle>Edit Profile</DialogTitle>
							</DialogHeader>
							<ProfileForm
								initialValues={{
									name: profile?.name,
									avatarUrl: profile?.avatarUrl,
									address: profile?.address,
									bio: profile?.bio,
									contacts: profile?.contacts,
								}}
								onSuccess={() => setIsEditOpen(false)}
							/>
						</DialogContent>
					</Dialog>
				</div>

				{/* Profile Header */}
				<Card className="py-4 gap-4">
					<CardContent className="px-4 md:px-6">
						<div className="flex items-start gap-4">
							<div className="relative h-20 w-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex-shrink-0">
								{avatarUrl ? (
									<img
										src={avatarUrl}
										alt={displayName}
										className="w-full h-full object-cover"
									/>
								) : (
									<div className="w-full h-full flex items-center justify-center">
										<User className="h-10 w-10 text-gray-400" />
									</div>
								)}
							</div>
							<div className="flex-1 min-w-0">
								<h2 className="text-xl font-semibold truncate">
									{displayName}
								</h2>
								{profile?.address && (
									<p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
										<MapPin className="h-3 w-3" />
										{profile.address}
									</p>
								)}
								<div className="mt-2">
									<RatingSummary userId={clerkId} compact />
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Pending Ratings */}
				<PendingRatings />

				{/* Contact Info */}
				{profile?.contacts && (
					<Card className="py-4 gap-3">
						<CardHeader className="px-4 md:px-6 pb-2">
							<CardTitle className="text-base">Contact Information</CardTitle>
						</CardHeader>
						<CardContent className="px-4 md:px-6">
							<ContactInfo contacts={profile.contacts} showValues />
						</CardContent>
					</Card>
				)}

				{/* Tabs for History and Ratings */}
				<Tabs defaultValue="ratings" className="w-full">
					<TabsList className="w-full grid grid-cols-2">
						<TabsTrigger value="ratings">Ratings</TabsTrigger>
						<TabsTrigger value="history">History</TabsTrigger>
					</TabsList>

					<TabsContent value="ratings" className="mt-4 space-y-4">
						<RatingSummary userId={clerkId} />
						<RatingsList userId={clerkId} />
					</TabsContent>

					<TabsContent value="history" className="mt-4">
						<UserHistory userId={clerkId} />
					</TabsContent>
				</Tabs>
			</div>
		</main>
	);
}
