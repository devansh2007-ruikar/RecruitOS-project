"use server";

import { createClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

export interface TransitionResult {
  success: boolean;
  error?: string;
}

export async function transitionStatus(
  applicationId: string,
  newStatus: ApplicationStatus
): Promise<TransitionResult> {
  const supabase = await createClient();

  if (!supabase) {
    return { success: false, error: "Supabase configuration is missing" };
  }

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Call the atomic transition function in Postgres
  const { data, error } = await supabase.rpc("transition_application_status", {
    p_application_id: applicationId,
    p_new_status: newStatus,
    p_actor_id: user.id,
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
