/**
 * Script to download images and upload to Convex Storage
 * Run with: pnpm dlx tsx scripts/seed-images.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL =
	process.env.NEXT_PUBLIC_CONVEX_URL || "http://127.0.0.1:3210";

// Unsplash source URLs for each item (400x300 size)
const IMAGE_URLS: Record<string, string> = {
	"Rice Cooker":
		"https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop",
	"Camping Tent":
		"https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop",
	"LED Desk Lamp":
		"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop",
	"Winter Jacket":
		"https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop",
	"Vietnamese Cookbook":
		"https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop",
	"Folding Chair":
		"https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=300&fit=crop",
	"Yoga Mat":
		"https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=300&fit=crop",
	"Bluetooth Speaker":
		"https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop",
	"Coffee Grinder":
		"https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&h=300&fit=crop",
	"Board Games Set":
		"https://images.unsplash.com/photo-1611371805429-8b5c1b2c34ba?w=400&h=300&fit=crop",
};

async function downloadImage(url: string): Promise<Blob> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to download image: ${response.statusText}`);
	}
	return response.blob();
}

async function main() {
	console.log("🚀 Starting image seed script...\n");
	console.log(`📡 Connecting to Convex at: ${CONVEX_URL}\n`);

	const client = new ConvexHttpClient(CONVEX_URL);

	// Get all items
	const items = await client.query(api.items.get);
	console.log(`📦 Found ${items.length} items\n`);

	for (const item of items) {
		const imageUrl = IMAGE_URLS[item.name];
		if (!imageUrl) {
			console.log(`⏭️  Skipping ${item.name} - no image URL configured`);
			continue;
		}

		// Skip if already has images
		if (item.imageUrls && item.imageUrls.length > 0) {
			console.log(`✅ ${item.name} - already has images`);
			continue;
		}

		try {
			console.log(`📥 Downloading image for: ${item.name}...`);
			const imageBlob = await downloadImage(imageUrl);

			console.log(`📤 Uploading to Convex Storage...`);
			// Get upload URL
			const uploadUrl = await client.mutation(api.items.generateUploadUrl);

			// Upload the image
			const uploadResponse = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": imageBlob.type || "image/jpeg" },
				body: imageBlob,
			});

			if (!uploadResponse.ok) {
				throw new Error(`Upload failed: ${uploadResponse.statusText}`);
			}

			const { storageId } = await uploadResponse.json();
			console.log(`💾 Stored with ID: ${storageId}`);

			// Update item with image - use internal mutation
			await client.mutation(api.items.updateImageInternal, {
				id: item._id,
				imageStorageIds: [storageId],
			});

			console.log(`✅ ${item.name} - image uploaded successfully!\n`);
		} catch (error) {
			console.error(`❌ Failed for ${item.name}:`, error);
		}
	}

	console.log("\n🎉 Image seed completed!");
}

main().catch(console.error);
