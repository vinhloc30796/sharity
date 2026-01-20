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
import {
	ReactNode,
	createContext,
	useContext,
	useState,
	useCallback,
} from "react";
import { cn } from "@/lib/utils";

interface ItemCardContextType {
	isFlipped: boolean;
	toggleFlip: () => void;
	flipToFront: () => void;
	flipToBack: () => void;
}

const ItemCardContext = createContext<ItemCardContextType | undefined>(
	undefined,
);

export function useItemCard() {
	const context = useContext(ItemCardContext);
	if (!context) {
		throw new Error("useItemCard must be used within an ItemCard");
	}
	return context;
}

interface ItemCardProps {
	item: Doc<"items"> & { imageUrls?: string[] };
	footer?: ReactNode;
	children?: ReactNode;
	rightHeader?: ReactNode;
	backContent?: ReactNode;
}

export function ItemCard({
	item,
	footer,
	children,
	rightHeader,
	backContent,
}: ItemCardProps) {
	const [isFlipped, setIsFlipped] = useState(false);

	const toggleFlip = useCallback(() => setIsFlipped((prev) => !prev), []);
	const flipToFront = useCallback(() => setIsFlipped(false), []);
	const flipToBack = useCallback(() => setIsFlipped(true), []);

	return (
		<ItemCardContext.Provider
			value={{ isFlipped, toggleFlip, flipToFront, flipToBack }}
		>
			<div className="group/item-card relative w-full perspective-1000">
				<div
					className={cn(
						"relative w-full transition-all duration-500 transform-style-3d",
						isFlipped ? "rotate-y-180" : "",
					)}
				>
					{/* Front Face */}
					<div className="relative w-full backface-hidden">
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
									{rightHeader}
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
					</div>

					{/* Back Face */}
					<div className="absolute top-0 left-0 w-full h-full backface-hidden rotate-y-180">
						<Card className="h-full flex flex-col">{backContent}</Card>
					</div>
				</div>
			</div>
		</ItemCardContext.Provider>
	);
}
