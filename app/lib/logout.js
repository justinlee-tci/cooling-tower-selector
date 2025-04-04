import { supabase } from "@/lib/supabaseClient"; 

export const logout = async () => {
  try {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error fetching user:", userError);
      return;
    }

    // Check if email exists (modify this if your users table uses ID instead of email)
    if (user.email) {
      const { error: updateError } = await supabase
        .from("users")
        .update({ last_logged_in: new Date().toISOString() }) // Ensure correct timestamp format
        .eq("email", user.email);

      if (updateError) {
        console.error("Error updating last login:", updateError);
      } else {
        console.log("Last login updated successfully.");
      }
    } else {
      console.error("User email not found, cannot update last login.");
    }

    // Sign out the user
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error logging out:", error);
  }
};
