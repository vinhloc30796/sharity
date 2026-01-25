"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { ItemForm } from "./item-form";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function AddItemForm() {
	const createItem = useMutation(api.items.create);
	const [giveaway, setGiveaway] = useState(false);

	return (
		<>
			<SignedIn>
				<Card>
					<CardHeader>
						<CardTitle>Add an Item</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between gap-3 pb-4">
							<div className="space-y-1">
								<Label htmlFor="giveaway">Giveaway</Label>
								<div className="text-xs text-muted-foreground">
									No return. Ownership transfers after pickup.
								</div>
							</div>
							<Switch
								id="giveaway"
								checked={giveaway}
								onCheckedChange={setGiveaway}
							/>
						</div>
						<ItemForm
							onSubmit={async (values) => {
								await createItem({ ...values, giveaway });
							}}
							submitLabel="Share Item"
						/>
					</CardContent>
				</Card>
			</SignedIn>
			<SignedOut>
				<Card className="bg-gray-50 border-dashed">
					<CardHeader>
						<CardTitle className="text-center text-gray-500">
							Sign in to Share Items
						</CardTitle>
					</CardHeader>
					<CardContent className="flex justify-center">
						<SignInButton mode="modal">
							<Button variant="outline">Sign In</Button>
						</SignInButton>
					</CardContent>
				</Card>
			</SignedOut>
		</>
	);
}
