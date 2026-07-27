import { z } from "zod";
import { GROUP_MEMBER_STATUSES, GROUP_STATUSES } from "@/types/enums";

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  branchId: z.string(),
  leaderCustomerId: z.string().nullable(),
  status: z.enum(GROUP_STATUSES),
  deletedAt: z.string().nullable(),
});
export type Group = z.infer<typeof GroupSchema>;

export const GroupMemberSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  customerId: z.string(),
  joinedAt: z.string(),
  status: z.enum(GROUP_MEMBER_STATUSES),
});
export type GroupMember = z.infer<typeof GroupMemberSchema>;
