"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { ItemForm } from "./item-form";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export function MyItemsList() {
  const items = useQuery(api.items.getMyItems);
  const updateItem = useMutation(api.items.update);
  const deleteItem = useMutation(api.items.deleteItem);
  const [editingId, setEditingId] = useState<Id<"items"> | null>(null);

  if (items === undefined) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (items.length === 0) {
    return <div className="text-center p-4 text-gray-500">You haven't shared any items yet.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={item._id}>
          <CardHeader>
            <CardTitle>{item.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">{item.description}</p>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Dialog open={editingId === item._id} onOpenChange={(open) => setEditingId(open ? item._id : null)}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">Edit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Item</DialogTitle>
                </DialogHeader>
                <ItemForm
                  initialValues={{
                    name: item.name,
                    description: item.description || "",
                  }}
                  onSubmit={async (values) => {
                    await updateItem({
                      id: item._id,
                      name: values.name,
                      description: values.description,
                    });
                    setEditingId(null);
                  }}
                  submitLabel="Save Changes"
                />
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your item.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteItem({ id: item._id })}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
