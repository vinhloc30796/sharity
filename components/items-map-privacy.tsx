"use client";

import { useEffect, useState, useMemo } from "react";
import { Doc } from "../convex/_generated/dataModel";
import { CATEGORY_LABELS, type ItemCategory } from "./item-form";

// Da Lat coordinates
const DEFAULT_CENTER: [number, number] = [11.9404, 108.4583];
const DEFAULT_ZOOM = 13;

// Privacy settings (Airbnb-style: ~450-550m circle around actual location)
const CIRCLE_RADIUS_METERS = 450; // ~450m radius circle (Airbnb average)

// Component to fix Leaflet tile loading issue
function InvalidateSize() {
	const [useMapHook, setUseMapHook] = useState<
		typeof import("react-leaflet").useMap | null
	>(null);

	useEffect(() => {
		import("react-leaflet").then((mod) => {
			setUseMapHook(() => mod.useMap);
		});
	}, []);

	if (!useMapHook) return null;

	return <InvalidateSizeInner useMap={useMapHook} />;
}

function InvalidateSizeInner({
	useMap,
}: {
	useMap: typeof import("react-leaflet").useMap;
}) {
	const map = useMap();

	useEffect(() => {
		// Fix tiles not loading properly
		setTimeout(() => {
			map.invalidateSize();
		}, 100);

		// Also invalidate on window resize
		const handleResize = () => map.invalidateSize();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [map]);

	return null;
}

interface ItemsMapPrivacyProps {
	items: (Doc<"items"> & {
		imageUrls?: string[];
		category?: ItemCategory;
		location?: { lat: number; lng: number; address?: string; ward?: string };
	})[];
	onItemClick?: (id: string) => void;
}

// Category colors for circles
const CATEGORY_COLORS: Record<ItemCategory | "default", string> = {
	kitchen: "#f97316", // orange
	furniture: "#8b5cf6", // violet
	electronics: "#3b82f6", // blue
	clothing: "#ec4899", // pink
	books: "#84cc16", // lime
	sports: "#14b8a6", // teal
	other: "#6b7280", // gray
	default: "#10b981", // emerald
};

export function ItemsMapPrivacy({ items, onItemClick }: ItemsMapPrivacyProps) {
	const [MapComponents, setMapComponents] = useState<{
		MapContainer: typeof import("react-leaflet").MapContainer;
		TileLayer: typeof import("react-leaflet").TileLayer;
		Circle: typeof import("react-leaflet").Circle;
		Popup: typeof import("react-leaflet").Popup;
		L: typeof import("leaflet");
	} | null>(null);

	useEffect(() => {
		// Dynamic import for SSR compatibility
		Promise.all([import("react-leaflet"), import("leaflet")]).then(
			([reactLeaflet, L]) => {
				setMapComponents({
					MapContainer: reactLeaflet.MapContainer,
					TileLayer: reactLeaflet.TileLayer,
					Circle: reactLeaflet.Circle,
					Popup: reactLeaflet.Popup,
					L: L,
				});
			},
		);
	}, []);

	// Filter items with location (Airbnb-style: circle around actual position)
	const itemsWithLocation = useMemo(() => {
		return items.filter((item) => item.location);
	}, [items]);

	if (!MapComponents) {
		return (
			<div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
				<p className="text-muted-foreground">Loading map...</p>
			</div>
		);
	}

	const { MapContainer, TileLayer, Circle, Popup } = MapComponents;

	return (
		<div className="w-full h-[400px] rounded-lg overflow-hidden border">
			<MapContainer
				center={DEFAULT_CENTER}
				zoom={DEFAULT_ZOOM}
				style={{ height: "100%", width: "100%" }}
			>
				<InvalidateSize />
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>
				{itemsWithLocation.map((item) => {
					const color =
						CATEGORY_COLORS[item.category || "default"] ||
						CATEGORY_COLORS.default;

					return (
						<Circle
							key={item._id}
							center={[item.location!.lat, item.location!.lng]}
							radius={CIRCLE_RADIUS_METERS}
							pathOptions={{
								color: color,
								fillColor: color,
								fillOpacity: 0.2,
								weight: 2,
							}}
							eventHandlers={{
								click: () => onItemClick?.(item._id),
							}}
						>
							<Popup>
								<div className="min-w-[150px]">
									{item.imageUrls && item.imageUrls[0] && (
										<img
											src={item.imageUrls[0]}
											alt={item.name}
											className="w-full h-20 object-cover rounded mb-2"
										/>
									)}
									<h3 className="font-semibold text-sm">{item.name}</h3>
									{item.category && (
										<p className="text-xs text-muted-foreground">
											{CATEGORY_LABELS[item.category]}
										</p>
									)}
									{item.location?.ward && (
										<p className="text-xs text-muted-foreground mt-1">
											Area: {item.location.ward}
										</p>
									)}
								</div>
							</Popup>
						</Circle>
					);
				})}
			</MapContainer>
		</div>
	);
}
