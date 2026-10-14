"use server";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

export interface TransitionResult {
  success: boolean;
  error?: string;
}

export interface BulkTransitionResult {
  success: boolean;
  error?: string;
  count?: number;
}

/**
 * Transitions a single candidate status.
 * Authorization and actor identity (auth.uid()) are verified inside Postgres.
 */
export async function transitionStatus(
  applicationId: string,
  newStatus: ApplicationStatus
): Promise<TransitionResult> {
  const supabase = await createClient();

  if (!supabase) {
    return { success: false, error: "Supabase configuration is missing" };
  }

  // Verify the user is authenticated in the current session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Call the atomic transition function in Postgres (actor derived from auth.uid())
  const { data, error } = await supabase.rpc("transition_application_status", {
    p_application_id: applicationId,
    p_new_status: newStatus,
  });

  if (error) {
    console.error("Status transition error:", error);
    return { success: false, error: "Failed to update status" };
  }

  if (data && !data.success) {
    return { success: false, error: data.error };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/candidates/${applicationId}`);

  return { success: true };
}

/**
 * Bulk status update in a single database transaction.
 * If ANY candidate or transition is invalid, the entire batch is rejected.
 */
export async function bulkTransitionStatus(
  applicationIds: string[],
  newStatus: ApplicationStatus
): Promise<BulkTransitionResult> {
  if (!applicationIds || applicationIds.length === 0) {
    return { success: false, error: "No candidates selected" };
  }

  const supabase = await createClient();

  if (!supabase) {
    return { success: false, error: "Supabase configuration is missing" };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase.rpc("bulk_transition_application_status", {
    p_application_ids: applicationIds,
    p_new_status: newStatus,
  });

  if (error) {
    console.error("Bulk status transition error:", error);
    return { success: false, error: "Failed to perform bulk status update" };
  }

  if (data && !data.success) {
    return { success: false, error: data.error };
  }

  revalidatePath("/dashboard");
  for (const id of applicationIds) {
    revalidatePath(`/dashboard/candidates/${id}`);
  }

  return { success: true, count: data?.count };
}
