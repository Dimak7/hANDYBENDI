import { PasswordForm } from "@/components/login-form";
export default async function ResetPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <div className="login-main" style={{ minHeight: "100vh" }}>
      <PasswordForm token={token} />
    </div>
  );
}
