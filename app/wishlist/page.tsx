import { WishlistPageClient } from "@/components/wishlist/wishlist-page-client";

type WishlistPageProps = {
	searchParams?: Record<string, string | string[] | undefined>;
};

export default function WishlistPage({ searchParams }: WishlistPageProps) {
	const draft = searchParams?.draft;
	const shouldFocusDraft = draft === "1";
	return <WishlistPageClient shouldFocusDraft={shouldFocusDraft} />;
}
