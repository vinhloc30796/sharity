"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Doc } from "../convex/_generated/dataModel";
import { ReactNode } from "react";

export function ItemList({
  action,
}: {
  action?: (item: Doc<"items">) => ReactNode;
}) {
  const items = useQuery(api.items.get);
  const [search, setSearch] = useState("");

  const filteredItems = items?.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex flex-col gap-2">
         {/* Search Filter could be fancier, but simple input works for now */}
         <Input
            placeholder="Search availables items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
         />
      </div>

      <div className="grid gap-4">
        {items === undefined ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p>No items yet. Be the first to share something!</p>
        ) : filteredItems?.length === 0 ? (
           <p>No items found matching &quot;{search}&quot;</p>
        ) : (
          filteredItems?.map((item) => (
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
              <CardFooter className="flex justify-between items-center">
                <p className="text-xs text-gray-400">
                  Owner: {item.ownerId ?? "Unknown"}
                </p>
                {action && action(item)}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
