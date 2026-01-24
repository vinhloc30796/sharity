import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
	ClerkProvider,
	SignInButton,
	SignUpButton,
	SignedIn,
	SignedOut,
	UserButton,
} from "@clerk/nextjs";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { NotificationBell } from "@/components/notifications/notification-bell";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	metadataBase: new URL("https://sharity-dalat.vercel.app"),
	title: {
		default: "Sharity — Share, borrow, and lend items in Da Lat, Vietnam",
		template: "%s — Sharity, the sharing economy in Da Lat, Vietnam",
	},
	description:
		"Sharity is a community sharing platform in Da Lat, Vietnam. Lend rarely used items, borrow what you need for a few days, and manage requests and availability in one place.",
	openGraph: {
		type: "website",
		siteName: "Sharity",
		title: "Sharity — Share, borrow, and lend items in Da Lat, Vietnam",
		description:
			"Sharity is a community sharing platform in Da Lat, Vietnam. Lend rarely used items, borrow what you need for a few days, and manage requests and availability in one place.",
		url: "/",
		locale: "en_US",
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
		title: "Sharity — Share, borrow, and lend items in Da Lat, Vietnam",
		description:
			"Sharity is a community sharing platform in Da Lat, Vietnam. Lend rarely used items, borrow what you need for a few days, and manage requests and availability in one place.",
		images: ["/twitter-image"],
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html lang="en">
				<body
					className={`${geistSans.variable} ${geistMono.variable} antialiased`}
				>
					<ConvexClientProvider>
						<header className="flex justify-end p-4 gap-4">
							<SignedOut>
								<SignInButton mode="modal">
									<Button variant="ghost">Sign In</Button>
								</SignInButton>
								<SignUpButton mode="modal">
									<Button>Sign Up</Button>
								</SignUpButton>
							</SignedOut>
							<SignedIn>
								<NotificationBell />
								<UserButton />
							</SignedIn>
						</header>
						{children}
						<Toaster />
					</ConvexClientProvider>
				</body>
			</html>
		</ClerkProvider>
	);
}
