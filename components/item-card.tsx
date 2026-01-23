import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
	Carousel,
	CarouselContent,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";
import { Doc } from "../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, type ItemCategory } from "./item-form";
import { MapPin, ExternalLink } from "lucide-react";
import {
	ReactNode,
	createContext,
	useContext,
	useState,
	useCallback,
	useRef,
	useEffect,
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
	item: Doc<"items"> & {
		imageUrls?: string[];
		category?: ItemCategory;
		location?: { lat: number; lng: number; address?: string };
	};
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

	const [height, setHeight] = useState<number | undefined>(undefined);
	const frontRef = useRef<HTMLDivElement>(null);
	const backRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const updateHeight = () => {
			const frontHeight = frontRef.current?.scrollHeight;
			const backHeight = backRef.current?.scrollHeight;

			if (isFlipped) {
				setHeight(backHeight);
			} else {
				setHeight(frontHeight);
			}
		};

		updateHeight();

		const observer = new ResizeObserver(updateHeight);
		if (frontRef.current) observer.observe(frontRef.current);
		if (backRef.current) observer.observe(backRef.current);

		return () => observer.disconnect();
	}, [isFlipped]);

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
					style={{ height: height ? `${height}px` : undefined }}
				>
					{/* Front Face */}
					<div className="relative w-full backface-hidden" ref={frontRef}>
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
									<CardTitle>
										<Link
											href={`/item/${item._id}`}
											className="hover:underline"
										>
											{item.name}
										</Link>
									</CardTitle>
									{rightHeader}
								</div>
							</CardHeader>
							<CardContent>
								{children}
								<div className="flex flex-wrap gap-2 mb-2">
									{item.category && (
										<Badge variant="secondary">
											{CATEGORY_LABELS[item.category]}
										</Badge>
									)}
									{item.location && (
										<a
											href={`https://maps.google.com/?q=${item.location.lat},${item.location.lng}`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
										>
											<MapPin className="h-3 w-3" />
											{item.location.address ||
												`${item.location.lat.toFixed(2)}, ${item.location.lng.toFixed(2)}`}
											<ExternalLink className="h-3 w-3" />
										</a>
									)}
								</div>
								{item.description && (
									<p className="text-gray-600 mb-4">{item.description}</p>
								)}
							</CardContent>
							{footer && <CardFooter>{footer}</CardFooter>}
						</Card>
					</div>

					{/* Back Face */}
					<div
						className="absolute top-0 left-0 w-full backface-hidden rotate-y-180"
						ref={backRef}
					>
						<Card className="flex flex-col">{backContent}</Card>
					</div>
				</div>
			</div>
		</ItemCardContext.Provider>
	);
}
