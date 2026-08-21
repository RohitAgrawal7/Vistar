import { ResumeClaimExperience } from "@/components/customer/resume-claim-experience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resume table",
};

export default async function ResumePage({
  params,
}: PageProps<"/resume/[code]">) {
  const { code } = await params;
  return <ResumeClaimExperience code={code} />;
}
