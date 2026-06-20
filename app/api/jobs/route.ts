import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Pagination
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Filters
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const location = searchParams.get("location");
    const workType = searchParams.get("work_type");
    const source = searchParams.get("source");
    const minMatch = searchParams.get("min_match");

    // Sorting
    const sortBy = searchParams.get("sort_by") || "created_at"; // created_at, match_score
    const sortOrder = searchParams.get("sort_order") || "desc";

    let query = supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`role.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (location) {
      query = query.ilike("location", `%${location}%`);
    }

    if (workType) {
      query = query.eq("work_type", workType);
    }

    if (source) {
      query = query.eq("source", source);
    }

    if (minMatch) {
      query = query.gte("match_score", parseInt(minMatch));
    }

    const { data: jobs, error, count } = await query;

    if (error) {
      console.error("[Jobs API] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch jobs", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      jobs: jobs || [],
      count: count || jobs?.length || 0,
      offset,
      limit,
      has_more: (count || 0) > offset + limit,
    });

  } catch (err: any) {
    console.error("[Jobs API] Error:", err);
    return NextResponse.json(
      { error: "Internal error", details: err.message },
      { status: 500 }
    );
  }
}