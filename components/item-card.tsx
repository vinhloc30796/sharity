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
  item: Doc<"items">;
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
        {item.description && (
          <p className="text-gray-600 mb-4">{item.description}</p>
        )}
        {children}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
