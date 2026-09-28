import type { Metadata } from "next";
import { ForgotForm } from "@/modules/auth/components/forgot-form";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function RecuperarSenhaPage() {
  return <ForgotForm />;
}
