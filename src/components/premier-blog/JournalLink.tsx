"use client";
import Link from "next/link";
import { useTeam } from "@/components/auth";
import { ALLOWED_EMAILS } from "@/lib/premier-blog/model";
export default function JournalLink() {
  const { user } = useTeam();
  return user &&
    ALLOWED_EMAILS.some((email) => email === user.email.toLowerCase()) ? (
    <Link href="/admin/blog" className="button">
      Journal editor
    </Link>
  ) : null;
}
