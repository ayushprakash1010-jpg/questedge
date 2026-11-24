import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getApiUrl } from "@/lib/api-url";

export async function GET(_request: NextRequest, { params }: { params: {mandateId: string; scorecardId: string} }) {
  if (!await auth0.getSession()) return NextResponse.json({error: "Not authenticated"}, {status: 401});
  const {token} = await auth0.getAccessToken();
  const response = await fetch(getApiUrl() + "/api/v1/resume-ranking/pool/" + encodeURIComponent(params.mandateId) + "/" + encodeURIComponent(params.scorecardId), {
    headers: {Authorization: "Bearer " + token}, cache: "no-store",
  });
  return NextResponse.json(await response.json(), {status: response.status});
}
