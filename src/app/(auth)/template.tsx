import { PageTransition } from "@/components/motion/Reveal";

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
