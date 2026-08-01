import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "LIGHTBRINGER · Public Workflow Demo",
  description: "A safe, bilingual public demo of the LIGHTBRINGER AI animation workflow."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ko"><body>{children}</body></html>;
}
