import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Doc } from "../convex/_generated/dataModel";
import { ReactNode } from "react";

interface ItemCardProps {
  item: Doc<"items"> & { imageUrls?: string[] };
  footer?: ReactNode;
  children?: ReactNode;
  rightHeader?: ReactNode;
}

export function ItemCard({
  item,
  footer,
  children,
  rightHeader,
}: ItemCardProps) {
  return (
    <Card>
      <CardHeader>
        {item.imageUrls && item.imageUrls.length > 0 && (
           <div className="w-full aspect-video mb-4 relative rounded-md overflow-hidden bg-gray-100 group">
              <img src={item.imageUrls[0]} alt={item.name} className="object-cover w-full h-full" />
              {item.imageUrls.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                      +{item.imageUrls.length - 1} more
                  </div>
              )}
           </div>
        )}
        <div className="flex justify-between items-start">
          <CardTitle>{item.name}</CardTitle>
          {rightHeader || (
            <span
              className={`px-2 py-1 rounded text-xs ${
                item.isAvailable === false
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {item.isAvailable === false ? "Unavailable" : "Available"}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
        {item.description && (
          <p className="text-gray-600 mb-4">{item.description}</p>
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
