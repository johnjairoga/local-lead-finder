import { NextRequest, NextResponse } from "next/server";
import { container } from "@/lib/di/container";
import { AppError } from "@/lib/errors";
import { BusinessStatus } from "@/types/business";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const VALID_STATUSES = new Set<string>(Object.values(BusinessStatus));

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: string };

    if (!body.status || !VALID_STATUSES.has(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const business = await container.businessService.updateStatus(
      id,
      body.status as BusinessStatus
    );

    return NextResponse.json({ business });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.statusCode }
      );
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
