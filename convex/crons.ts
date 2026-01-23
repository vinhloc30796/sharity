import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
	"resolve_overdue_lease_proposals",
	{ minutes: 5 },
	internal.items.resolveOverdueProposals,
);

export default crons;
