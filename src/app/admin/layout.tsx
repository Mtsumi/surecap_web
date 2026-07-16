import { AdminLocaleProvider } from "./AdminLocaleContext";
import AdminLayoutClient from "./AdminLayoutClient";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminLocaleProvider>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AdminLocaleProvider>
  );
}
