"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Button } from "@/components/ui/button";

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
import { Doc } from "../convex/_generated/dataModel";
import { ItemCard } from "./item-card";

// Badge not available, using span


export function MyItemCard({ item }: { item: Doc<"items"> }) {
  const updateItem = useMutation(api.items.update);
  const deleteItem = useMutation(api.items.deleteItem);
  const approveClaim = useMutation(api.items.approveClaim);
  const rejectClaim = useMutation(api.items.rejectClaim);
  const claims = useQuery(api.items.getClaims, { itemId: item._id });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [managingClaims, setManagingClaims] = useState(false);

  const pendingClaims = claims?.filter(c => c.status === "pending") || [];
  const approvedClaim = claims?.find(c => c.status === "approved");

  return (
    <ItemCard
        item={item}
        rightHeader={
          approvedClaim ? (
             <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-green-100 text-green-800 hover:bg-green-100/80">
                Given to {approvedClaim.claimerId}
             </span>
          ) : !item.isAvailable ? (
             <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
                Unavailable
             </span>
          ) : (
             <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-blue-50 text-blue-700 hover:bg-blue-50/80">
                Available
             </span>
          )
        }
        footer={
          <div className="flex justify-end gap-2 w-full">
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
          </div>
        }
    >
        {pendingClaims.length > 0 && item.isAvailable && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800 mb-2">
                    {pendingClaims.length} Request{pendingClaims.length > 1 ? 's' : ''}
                </p>
                <div className="space-y-2">
                    {pendingClaims.map(claim => (
                        <div key={claim._id} className="flex items-center justify-between text-sm bg-white p-2 rounded border">
                            <span>User: {claim.claimerId}</span>
                            <div className="flex gap-2">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => rejectClaim({ claimId: claim._id, itemId: item._id })}
                                >
                                    Reject
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="h-7 px-2 text-xs"
                                    onClick={() => approveClaim({ claimId: claim._id, itemId: item._id })}
                                >
                                    Approve
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </ItemCard>
  );
}
