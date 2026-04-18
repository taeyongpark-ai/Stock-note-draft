import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ALLOWED_USER_ID = "user_3CXCOad0eNONtrvgh9L9mVzrhYF";

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth.protect();

  if (userId !== ALLOWED_USER_ID) {
    return NextResponse.redirect(new URL("/unauthorized", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
