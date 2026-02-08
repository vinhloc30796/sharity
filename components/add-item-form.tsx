"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { ItemForm } from "./item-form";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";

export function AddItemForm() {
	const createItem = useMutation(api.items.create);
	const t = useTranslations("AddItemForm");

	return (
		<>
			<SignedIn>
				<Card>
					<CardHeader>
						<CardTitle>{t("title")}</CardTitle>
					</CardHeader>
					<CardContent>
						<ItemForm
							onSubmit={async (values) => {
								await createItem(values);
							}}
							submitLabel={t("submit")}
							enableModeSwitch
						/>
					</CardContent>
				</Card>
			</SignedIn>
			<SignedOut>
				<Card className="bg-gray-50 border-dashed">
					<CardHeader>
						<CardTitle className="text-center text-gray-500">
							{t("signInTitle")}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex justify-center">
						<SignInButton mode="modal">
							<Button variant="outline">{t("signIn")}</Button>
						</SignInButton>
					</CardContent>
				</Card>
			</SignedOut>
		</>
	);
}
