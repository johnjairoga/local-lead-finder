import { NextResponse } from "next/server";
import { container } from "@/lib/di/container";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const summary = await container.businessService.getDashboardSummary();
    return NextResponse.json(summary);
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
