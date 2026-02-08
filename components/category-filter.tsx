"use client";

import { Button } from "@/components/ui/button";
import { ITEM_CATEGORIES, type ItemCategory } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface CategoryFilterProps {
	selected: ItemCategory[];
	onChange: (categories: ItemCategory[]) => void;
}

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
	const t = useTranslations("Categories");
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
			{ITEM_CATEGORIES.map((category) => {
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
						{t(category)}
					</Button>
				);
			})}
		</div>
	);
}
