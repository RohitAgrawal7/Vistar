import type { ReactNode } from "react";

export const metadata = {
  title: "Vistar kitchen API",
  description: "Shared café floor for guest phones and the admin dashboard.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
