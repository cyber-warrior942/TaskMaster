import { auth } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function PostSignInPage() {
  const { userId } = auth();

  // If not signed in, redirect to sign-in page
  if (!userId) {
    redirect("/sign-in");
  }

  // Redirect all authenticated users to the enterprise admin dashboard
  // (As requested - note: this will redirect ALL authenticated users, 
  // not just enterprise admins, to this page after sign-in if they come via /post-sign-in)
  redirect("/dashboard/enterprise/admin");
} 