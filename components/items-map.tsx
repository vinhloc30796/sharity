"use client";

import { useEffect, useState } from "react";
import { Doc } from "../convex/_generated/dataModel";
import { CATEGORY_LABELS, type ItemCategory } from "./item-form";
import { createMarkerIcon } from "./item-marker";

// Da Lat coordinates
const DEFAULT_CENTER: [number, number] = [11.9404, 108.4583];
const DEFAULT_ZOOM = 13;

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

interface ItemsMapProps {
	items: (Doc<"items"> & {
		imageUrls?: string[];
		category?: ItemCategory;
		location?: { lat: number; lng: number; address?: string; ward?: string };
	})[];
	onItemClick?: (id: string) => void;
}

export function ItemsMap({ items, onItemClick }: ItemsMapProps) {
	const [MapComponents, setMapComponents] = useState<{
		MapContainer: typeof import("react-leaflet").MapContainer;
		TileLayer: typeof import("react-leaflet").TileLayer;
		Marker: typeof import("react-leaflet").Marker;
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
					Marker: reactLeaflet.Marker,
					Popup: reactLeaflet.Popup,
					L: L,
				});
			},
		);
	}, []);

	const itemsWithLocation = items.filter((item) => item.location);

	if (!MapComponents) {
		return (
			<div className="w-full h-[400px] bg-gray-100 rounded-lg flex items-center justify-center">
				<p className="text-muted-foreground">Loading map...</p>
			</div>
		);
	}

	const { MapContainer, TileLayer, Marker, Popup } = MapComponents;

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
				{itemsWithLocation.map((item) => (
					<Marker
						key={item._id}
						position={[item.location!.lat, item.location!.lng]}
						icon={createMarkerIcon({
							category: item.category,
							L: MapComponents.L,
						})}
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
					</Marker>
				))}
			</MapContainer>
		</div>
	);
}
