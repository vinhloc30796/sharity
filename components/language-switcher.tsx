"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
	const locale = useLocale();
	const router = useRouter();
	const pathname = usePathname();

	function onSelectChange(nextLocale: string) {
		router.replace(pathname, { locale: nextLocale });
	}

	return (
		<Select value={locale} onValueChange={onSelectChange}>
			<SelectTrigger className="w-fit gap-2 border-none bg-transparent focus:ring-0 px-2 lg:px-3 focus:ring-offset-0">
				<Globe className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm font-medium">{locale.toUpperCase()}</span>
			</SelectTrigger>
			<SelectContent position="popper" align="end">
				<SelectItem value="en">English</SelectItem>
				<SelectItem value="vi">Tiếng Việt</SelectItem>
				<SelectItem value="ru">Русский</SelectItem>
			</SelectContent>
		</Select>
	);
}
