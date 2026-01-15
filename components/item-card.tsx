import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
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
						<Carousel className="w-full h-full">
							<CarouselContent>
								{item.imageUrls.map((url, index) => (
									<CarouselItem key={index}>
										<div className="w-full aspect-video relative">
											<img
												src={url}
												alt={`${item.name} - Image ${index + 1}`}
												className="object-cover w-full h-full"
											/>
										</div>
									</CarouselItem>
								))}
							</CarouselContent>
							{item.imageUrls.length > 1 && (
								<>
									<CarouselPrevious className="left-2" />
									<CarouselNext className="right-2" />
								</>
							)}
						</Carousel>
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
