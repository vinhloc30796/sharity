import type { Metadata } from "next";

const title = "Wishlist | Sharity";
const description =
	"Request items you can't find and vote on others' requests.";

export const metadata: Metadata = {
	title: "Wishlist",
	description,
	openGraph: {
		title,
		description,
		url: "/wishlist",
		images: [
			{
				url: "/opengraph-image",
				width: 1200,
				height: 630,
				alt: "Sharity",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title,
		description,
		images: ["/twitter-image"],
	},
};

export default function WishlistLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <>{children}</>;
}
