"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const items = useQuery(api.items.get);
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
    <main className="flex min-h-screen flex-col items-center p-24 gap-8">
      <h1 className="text-4xl font-bold">Sharity</h1>
      <p className="text-xl text-gray-600">
        Borrow and lend useful items in Da Lat.
      </p>

      <div className="w-full max-w-md">
        <SignedIn>
          <Card>
            <CardHeader>
              <CardTitle>Add an Item</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Item Name (e.g., Camping Tent)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
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
      </div>

      <div className="w-full max-w-2xl">
        <h2 className="text-2xl font-semibold mb-4">Available Items</h2>
        <div className="grid gap-4">
          {items === undefined ? (
            <p>Loading...</p>
          ) : items.length === 0 ? (
            <p>No items yet. Be the first to share something!</p>
          ) : (
            items.map((item) => (
              <Card key={item._id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{item.name}</CardTitle>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        item.isAvailable === false
                          ? "bg-red-100 text-red-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {item.isAvailable === false ? "Unavailable" : "Available"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {item.description && (
                    <p className="text-gray-600">{item.description}</p>
                  )}
                </CardContent>
                <CardFooter>
                  <p className="text-xs text-gray-400">
                    Owner: {item.ownerId ?? "Unknown"}
                  </p>
                </CardFooter>
              </Card>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
