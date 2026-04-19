import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ALLOWED_USER_ID = "user_3CXCOad0eNONtrvgh9L9mVzrhYF";

/** Clerk 인증 제외 경로 (cron은 Bearer 토큰으로 자체 인증) */
const isPublicRoute = createRouteMatcher(["/api/cron/(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

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
