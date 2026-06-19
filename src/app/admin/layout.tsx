import { AdminLocaleProvider } from "./AdminLocaleContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLocaleProvider>{children}</AdminLocaleProvider>;
}
