"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Package, ArrowRight, ArrowLeft } from "lucide-react";

interface UserHistoryProps {
	userId: string;
}

export function UserHistory({ userId }: UserHistoryProps) {
	const history = useQuery(api.users.getUserHistory, { userId });

	if (history === undefined) {
		return (
			<div className="text-sm text-muted-foreground">Loading history...</div>
		);
	}

	const { lending, borrowing, stats } = history;

	if (stats.totalLent === 0 && stats.totalBorrowed === 0) {
		return (
			<div className="text-sm text-muted-foreground text-center py-4">
				No transaction history yet.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="grid grid-cols-2 gap-4">
				<Card className="py-4 gap-3">
					<CardContent className="px-4 md:px-6 text-center">
						<div className="flex items-center justify-center gap-2 text-muted-foreground">
							<ArrowRight className="h-4 w-4" />
							<span className="text-sm">Lent</span>
						</div>
						<div className="text-2xl font-bold">{stats.totalLent}</div>
					</CardContent>
				</Card>
				<Card className="py-4 gap-3">
					<CardContent className="px-4 md:px-6 text-center">
						<div className="flex items-center justify-center gap-2 text-muted-foreground">
							<ArrowLeft className="h-4 w-4" />
							<span className="text-sm">Borrowed</span>
						</div>
						<div className="text-2xl font-bold">{stats.totalBorrowed}</div>
					</CardContent>
				</Card>
			</div>

			<Tabs defaultValue="lending" className="w-full">
				<TabsList className="w-full grid grid-cols-2">
					<TabsTrigger value="lending">Lending ({lending.length})</TabsTrigger>
					<TabsTrigger value="borrowing">
						Borrowing ({borrowing.length})
					</TabsTrigger>
				</TabsList>

				<TabsContent value="lending" className="mt-4">
					<HistoryList items={lending} type="lending" />
				</TabsContent>

				<TabsContent value="borrowing" className="mt-4">
					<HistoryList items={borrowing} type="borrowing" />
				</TabsContent>
			</Tabs>
		</div>
	);
}

interface HistoryItem {
	claimId: string;
	itemId: string;
	itemName: string;
	itemImageUrl: string | null;
	startDate: number;
	endDate: number;
	status: string;
}

function HistoryList({
	items,
	type,
}: {
	items: HistoryItem[];
	type: "lending" | "borrowing";
}) {
	if (items.length === 0) {
		return (
			<div className="text-sm text-muted-foreground text-center py-4">
				No {type} history.
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			{items.map((item) => (
				<Card key={item.claimId} className="py-4 gap-3">
					<CardContent className="px-4 md:px-6">
						<div className="flex items-center gap-3">
							{item.itemImageUrl ? (
								<img
									src={item.itemImageUrl}
									alt={item.itemName}
									className="w-12 h-12 object-cover rounded"
								/>
							) : (
								<div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
									<Package className="h-6 w-6 text-gray-400" />
								</div>
							)}
							<div className="flex-1 min-w-0">
								<p className="font-medium truncate">{item.itemName}</p>
								<p className="text-sm text-muted-foreground">
									{format(new Date(item.startDate), "MMM d")} -{" "}
									{format(new Date(item.endDate), "MMM d, yyyy")}
								</p>
							</div>
							<Badge variant="outline" className="capitalize">
								{item.status}
							</Badge>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
