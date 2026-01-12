"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

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
      <p className="text-xl text-gray-600">Borrow and lend useful items in Da Lat.</p>
      
      <div className="w-full max-w-md border p-4 rounded-lg bg-gray-50">
        <h2 className="text-lg font-semibold mb-4">Add an Item</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Item Name (e.g., Camping Tent)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="p-2 border rounded"
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Share Item
          </button>
        </form>
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
              <div key={item._id} className="border p-4 rounded flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${item.isAvailable === false ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                        {item.isAvailable === false ? 'Unavailable' : 'Available'}
                    </span>
                </div>
                {item.description && <p className="text-gray-600">{item.description}</p>}
                <p className="text-xs text-gray-400">Owner: {item.ownerId ?? 'Unknown'}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
