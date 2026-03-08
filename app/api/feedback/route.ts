import { NextResponse } from "next/server";

type FeedbackType = "user_interface" | "tool_functionality" | "other";

type FeedbackRequestBody = {
  feedbackType?: unknown;
  email?: unknown;
  message?: unknown;
  context?: {
    accountId?: unknown;
    accountCode?: unknown;
    projectId?: unknown;
    projectName?: unknown;
  };
};

const FEEDBACK_TYPE_VALUES: FeedbackType[] = [
  "user_interface",
  "tool_functionality",
  "other",
];

const FEEDBACK_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FEEDBACK_MAX_MESSAGE_LENGTH = 5000;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function toNullableTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isFeedbackType(value: unknown): value is FeedbackType {
  return typeof value === "string" && FEEDBACK_TYPE_VALUES.includes(value as FeedbackType);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FeedbackRequestBody;

    if (!isFeedbackType(body.feedbackType)) {
      return NextResponse.json(
        { error: "Invalid feedback type." },
        { status: 400 }
      );
    }

    const email = toNullableTrimmedString(body.email);
    if (email && email.includes("@") && !FEEDBACK_EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "If you include an email, it must be valid." },
        { status: 400 }
      );
    }

    const message = toNullableTrimmedString(body.message);
    if (!message) {
      return NextResponse.json(
        { error: "Feedback message is required." },
        { status: 400 }
      );
    }

    if (message.length > FEEDBACK_MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Feedback must be ${FEEDBACK_MAX_MESSAGE_LENGTH} characters or less.` },
        { status: 400 }
      );
    }

    const accountId = toNullableTrimmedString(body.context?.accountId);
    const accountCode = toNullableTrimmedString(body.context?.accountCode);
    const projectId = toNullableTrimmedString(body.context?.projectId);
    const projectName = toNullableTrimmedString(body.context?.projectName);

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const supabaseServiceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const feedbackTable = process.env.SUPABASE_FEEDBACK_TABLE?.trim() || "feedback_submissions";

    const response = await fetch(`${supabaseUrl}/rest/v1/${feedbackTable}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseServiceRoleKey,
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        feedback_type: body.feedbackType,
        email,
        message,
        account_id: accountId,
        account_code: accountCode,
        project_id: projectId,
        project_name: projectName,
        user_agent: request.headers.get("user-agent"),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      return NextResponse.json(
        {
          error:
            "Supabase insert failed." +
            (errorText ? ` ${errorText.slice(0, 400)}` : ""),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected feedback API error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
