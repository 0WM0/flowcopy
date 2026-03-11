import { createClient } from "@/lib/supabase/client";

// Types
export interface ProjectRecord {
  id: string;
  user_id: string;
  title: string;
  data: Record<string, unknown>; // Full project data blob (nodes, edges, glossary, etc.)
  created_at: string;
  updated_at: string;
}

export interface ProjectListItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  // Derived from `data.nodes`; not stored as a separate DB column
  node_count: number;
}

type ProjectListRow = Pick<
  ProjectRecord,
  "id" | "title" | "created_at" | "updated_at"
> & {
  data?: {
    nodes?: unknown;
  } | null;
};

const deriveNodeCount = (projectData: ProjectListRow["data"]): number =>
  Array.isArray(projectData?.nodes) ? projectData.nodes.length : 0;

// --- Project CRUD ---

export async function listProjects(): Promise<ProjectListItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, data, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  // NOTE: this fetches `data` to derive node_count for dashboard display.
  // For large projects, consider a dedicated `node_count` column or RPC later.
  return ((data ?? []) as ProjectListRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    created_at: row.created_at,
    updated_at: row.updated_at,
    node_count: deriveNodeCount(row.data),
  }));
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }

    throw error;
  }

  return data as ProjectRecord;
}

export async function createProject(
  title: string,
  data: Record<string, unknown> = {}
): Promise<ProjectRecord> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title,
      data,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return project as ProjectRecord;
}

export async function updateProject(
  id: string,
  updates: { title?: string; data?: Record<string, unknown> }
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").update(updates).eq("id", id);

  if (error) {
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    throw error;
  }
}