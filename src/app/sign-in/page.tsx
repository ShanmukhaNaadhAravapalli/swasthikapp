
// import { SignInPage } from "@/components/sign-in-flow-1";

// import { redirect } from "next/navigation";

// import { auth } from "@/lib/auth";
// import { headers } from "next/headers";

// export default async function SignIn() {
//   const session = await auth.api.getSession({
//       headers: await headers()
//     })
  
//     if(!!session){
//       redirect('/sign-in')
//     }
//   return <SignInPage />;
// }
import { SignInPage } from "@/components/sign-in-flow-1";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function SignIn() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (session) {
    redirect("/dashboard"); // Already signed in → redirect
  }

  return <SignInPage />;
}
