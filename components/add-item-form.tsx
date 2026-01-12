"use client";

import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function AddItemForm() {
  const createItem = useMutation(api.items.create);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    await createItem({ name, description });
    setName("");
    setDescription("");
  };

  return (
    <>
      <SignedIn>
        <Card>
          <CardHeader>
            <CardTitle>Add an Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Camping Tent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="desc">Description</Label>
                <Input
                  id="desc"
                  type="text"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <Button type="submit">Share Item</Button>
            </form>
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
