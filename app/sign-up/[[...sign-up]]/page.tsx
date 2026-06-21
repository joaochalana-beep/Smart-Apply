import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 p-6">
      <div className="mb-6 text-center max-w-md">
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Create your ApplyWise account</h1>
        <p className="text-zinc-600 text-sm">
          After signing up, you will get a free <strong>@applywise.org</strong> email address.
          This is where company replies to your applications will be sent.
        </p>
      </div>
      <SignUp />
    </div>
  );
}
