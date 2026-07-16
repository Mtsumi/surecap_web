export default function AdminField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div>
      <dt className="admin-field-label">{label}</dt>
      <dd className="admin-field-value">{value}</dd>
    </div>
  );
}
