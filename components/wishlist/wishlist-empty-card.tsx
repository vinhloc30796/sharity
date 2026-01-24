import { Button } from "@/components/ui/button";
import Link from "next/link";

type WishlistEmptyCardProps = {
	onMakeRequest?: () => void;
};

export function WishlistEmptyCard({ onMakeRequest }: WishlistEmptyCardProps) {
	return (
		<div className="p-6 bg-white rounded-lg border shadow-sm space-y-4 text-center">
			<h3 className="text-lg font-semibold">
				Can&apos;t find what you&apos;re looking for?
			</h3>
			<p className="text-muted-foreground">
				Check the community wishlist to see what others need, or make a request
				yourself.
			</p>
			<div className="grid gap-2">
				<Link href="/wishlist" className="block">
					<Button variant="outline" className="w-full">
						Go to Wishlist
					</Button>
				</Link>
				{onMakeRequest ? (
					<Button className="w-full" type="button" onClick={onMakeRequest}>
						Make a Request
					</Button>
				) : (
					<Link href="/wishlist?draft=1" className="block">
						<Button className="w-full">Make a Request</Button>
					</Link>
				)}
			</div>
		</div>
	);
}
