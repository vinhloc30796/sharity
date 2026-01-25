import { defineApp } from "convex/server";
import migrations from "@convex-dev/migrations/convex.config";
import cloudinary from "@imaxis/cloudinary-convex/convex.config";

const app = defineApp();
app.use(migrations);
app.use(cloudinary);

export default app;
