import { auth } from "@/auth";

export default async function Secret() {
  const session = await auth();
  if (!session) return <div>Not authenticated</div>;

  return <h1 className="text-2xl text-green-700">Welcome to the secret page</h1>;
}
