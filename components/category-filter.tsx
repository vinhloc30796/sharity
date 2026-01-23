"use client";

import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type ItemCategory } from "./item-form";
import { cn } from "@/lib/utils";

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ItemCategory[];

interface CategoryFilterProps {
	selected: ItemCategory[];
	onChange: (categories: ItemCategory[]) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
	const isAllSelected = selected.length === 0;

	const handleAllClick = () => {
		onChange([]);
	};

	const handleCategoryClick = (category: ItemCategory) => {
		if (selected.includes(category)) {
			onChange(selected.filter((c) => c !== category));
		} else {
			onChange([...selected, category]);
		}
	};

	return (
		<div className="flex flex-wrap gap-2">
			<Button
				variant={isAllSelected ? "default" : "outline"}
				size="sm"
				onClick={handleAllClick}
				className={cn(
					"h-8 text-xs",
					isAllSelected && "bg-primary text-primary-foreground",
				)}
			>
				All
			</Button>
			{ALL_CATEGORIES.map((category) => {
				const isSelected = selected.includes(category);
				return (
					<Button
						key={category}
						variant={isSelected ? "default" : "outline"}
						size="sm"
						onClick={() => handleCategoryClick(category)}
						className={cn(
							"h-8 text-xs",
							isSelected && "bg-primary text-primary-foreground",
						)}
					>
						{CATEGORY_LABELS[category]}
					</Button>
				);
			})}
		</div>
	);
}
