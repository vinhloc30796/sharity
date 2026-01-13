"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { ItemForm } from "./item-form";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AddItemForm() {
  const createItem = useMutation(api.items.create);

  return (
    <>
      <SignedIn>
        <Card>
          <CardHeader>
            <CardTitle>Add an Item</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemForm 
              onSubmit={async (values) => {
                await createItem(values);
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
