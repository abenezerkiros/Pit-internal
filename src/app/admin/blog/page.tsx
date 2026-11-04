import type { Metadata } from "next";
import BlogAdmin from "@/components/premier-blog/BlogAdmin";
export const metadata: Metadata = {
  title: "Premier Journal | Editorial desk",
  robots: { index: false, follow: false },
};
export default function BlogAdminPage() {
  return <BlogAdmin />;
}
