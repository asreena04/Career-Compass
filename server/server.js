import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import PDFDocument from 'pdfkit';

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));
// -- Deployment
const allowedOrigins = new Set([
  "http://localhost:5173",
  process.env.FRONTEND_URL,
]);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    if (process.env.NODE_ENV !== "production" && origin.endsWith(".vercel.app")) {
      return cb(null, true);
    }
    return cb(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- auth helpers ---
async function requireAuth(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return { user: null, error: "Missing token" };

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { user: null, error: "Invalid token" };

  return { user: data.user, error: null };
}

async function requireCompany(req) {
  const { user, error } = await requireAuth(req);
  if (!user) return { user: null, error };

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return { user: null, error: profErr.message };
  if (profile?.role !== "Company") return { user: null, error: "Company only" };

  return { user, error: null };
}

async function requireStudent(req) {
  const { user, error } = await requireAuth(req);
  if (!user) return { user: null, error };

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return { user: null, error: profErr.message };
  if (profile?.role !== "Student") return { user: null, error: "Student only" };

  return { user, error: null };
}

async function requireAdvisor(req) {
  const { user, error } = await requireAuth(req);
  if (!user) return { user: null, error };

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return { user: null, error: profErr.message };
  if (profile?.role !== "Academic Advisor")
    return { user: null, error: "Academic Advisor only" };

  return { user, error: null };
}

async function requireAdmin(req) {
  const { user, error } = await requireAuth(req);
  if (!user) return { user: null, error };

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return { user: null, error: profErr.message };
  if (profile?.role !== "Admin") return { user: null, error: "Admin only" };

  return { user, error: null };
}

// --- local normalize (match your DB normalize_skill) ---
function normalizeLocal(input) {
  if (!input) return "";
  let x = input.toLowerCase().trim();
  x = x.replace(/c\+\+/g, "cplusplus");
  x = x.replace(/c#/g, "csharp");
  x = x.replace(/\.net/g, "dotnet");
  x = x.replace(/[^a-z0-9]/g, "");
  return x;
}

// --- dropdowns ---
app.get("/job-roles", async (req, res) => {
  const { data, error } = await admin
    .from("job_role")
    .select("job_role_id, job_role_name")
    .order("job_role_name", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

app.get("/skills/usm", async (req, res) => {
  const { data, error } = await admin
    .from("skill")
    .select("skill_id, skill_name")
    .eq("skill_source", "usm")
    .order("skill_name", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

// --- company: list their job postings (with skills) ---
app.get("/my-job-postings", async (req, res) => {
  const { user, error } = await requireCompany(req);
  if (!user) return res.status(401).json({ error });

  const { data: posts, error: postErr } = await admin
    .from("job_posting")
    .select(`
      job_posting_id,
      job_role_id,
      job_title,
      description,
      location,
      salary_range,
      application_deadline,
      application_link,
      created_at,
      status,
      closed_at
    `)

    .eq("company_id", user.id)
    .order("created_at", { ascending: false });

  if (postErr) return res.status(400).json({ error: postErr.message });

  const ids = posts.map((p) => p.job_posting_id);
  if (ids.length === 0) return res.json([]);

  const { data: links, error: linkErr } = await admin
    .from("job_posting_skill")
    .select("job_posting_id, is_other, skill:skill_id(skill_id, skill_name)")
    .in("job_posting_id", ids);

  if (linkErr) return res.status(400).json({ error: linkErr.message });

  const skillsByPost = new Map();
  for (const row of links) {
    const arr = skillsByPost.get(row.job_posting_id) || [];
    arr.push({ name: row.skill?.skill_name, is_other: row.is_other });
    skillsByPost.set(row.job_posting_id, arr);
  }

  return res.json(
    posts.map((p) => ({
      ...p,
      skills: skillsByPost.get(p.job_posting_id) || [],
    }))
  );
});

// --- company: create job posting + skills ---
app.post("/job-postings", async (req, res) => {
  const { user, error } = await requireCompany(req);
  if (!user) return res.status(401).json({ error });

  const {
    job_role_id,
    job_title,
    description,
    location,
    salary_range,
    application_deadline,
    //education_requirement,
    application_link,
    skills, // [{name,is_other}]
  } = req.body;

  const roleId = Number(job_role_id);
  if (!roleId || Number.isNaN(roleId)) return res.status(400).json({ error: "Invalid job_role_id" });

  if (!job_title || !description || !location || !application_deadline || !application_link) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  if (!Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({ error: "Skills must be a non-empty array." });
  }

  // 1) Insert job_posting
  const { data: posting, error: postingErr } = await admin
    .from("job_posting")
    .insert([{
      company_id: user.id,
      job_role_id: roleId,
      job_title,
      description,
      location,
      salary_range: salary_range ?? null,
      application_deadline,
      //education_requirement: education_requirement ?? null,
      application_link,
    }])
    .select()
    .single();

  if (postingErr) return res.status(400).json({ error: postingErr.message });

    // --- normalize and clean skills ---
  const cleaned = skills
    .map((s) => ({
      name: (s?.name || "").trim(),
      key: normalizeLocal(s?.name || ""),
      ui_is_other: !!s?.is_other,
    }))
    .filter((s) => s.name && s.key);

  // unique by normalized key
  const uniq = Array.from(new Map(cleaned.map((s) => [s.key, s])).values());

  // 1) check existing skills
  const keys = uniq.map((s) => s.key);

  const { data: existing, error: existErr } = await admin
    .from("skill")
    .select("skill_id, normalized_skill, skill_source")
    .in("normalized_skill", keys);

  if (existErr) return res.status(400).json({ error: existErr.message });

  const existingMap = new Map(existing.map((r) => [r.normalized_skill, r]));

  // 2) insert ONLY missing skills (do NOT overwrite usm)
  const missingSkillRows = uniq
    .filter((s) => !existingMap.has(s.key))
    .map((s) => ({
      skill_name: s.name,
      skill_source: "company",
    }));

  if (missingSkillRows.length > 0) {
    const { error: insErr } = await admin
      .from("skill")
      .upsert(missingSkillRows, {
        onConflict: "normalized_skill",
        ignoreDuplicates: true,
      });

    if (insErr) return res.status(400).json({ error: insErr.message });
  }

  // 3) fetch skill ids again
  const { data: finalSkills, error: fetchErr } = await admin
    .from("skill")
    .select("skill_id, normalized_skill, skill_source")
    .in("normalized_skill", keys);

  if (fetchErr) return res.status(400).json({ error: fetchErr.message });

  const idMap = new Map(finalSkills.map((r) => [r.normalized_skill, r]));

  // 4) insert bridge rows (FIX is_other)
  const bridgeRows = uniq.map((s) => {
    const rec = idMap.get(s.key);
    const isUsm = rec?.skill_source === "usm";

    return {
      job_posting_id: posting.job_posting_id,
      skill_id: rec.skill_id,
      is_other: isUsm ? false : s.ui_is_other,
    };
  });

  const { error: bridgeErr } = await admin
    .from("job_posting_skill")
    .insert(bridgeRows);

  if (bridgeErr) return res.status(400).json({ error: bridgeErr.message });

  // 5) Refresh job_role_skill aggregation (recompute for this role)
  const { error: rpcErr } = await admin.rpc("refresh_job_role_skills", {
    p_job_role_id: roleId,
  });
  if (rpcErr) return res.status(400).json({ error: rpcErr.message });

  return res.json({ ok: true, job_posting_id: posting.job_posting_id });
});

// --- company: update posting + replace skills ---
app.put("/job-postings/:id", async (req, res) => {
  const { user, error } = await requireCompany(req);
  if (!user) return res.status(401).json({ error });

  const jobPostingId = Number(req.params.id);
  if (!jobPostingId || Number.isNaN(jobPostingId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const {
    job_role_id,
    job_title,
    description,
    location,
    salary_range,
    application_deadline,
    application_link,
    skills, // [{name,is_other}]
  } = req.body;

  // Basic validation
  if (!job_title || !description || !location || !application_deadline || !application_link) {
    return res.status(400).json({ error: "Missing required fields, including application link." });
  }
  if (!Array.isArray(skills) || skills.length === 0) {
    return res.status(400).json({ error: "Skills must be a non-empty array." });
  }

  // 1) Update job_posting (ONLY update fields you actually have in DB)
  const { data: updated, error: updErr } = await admin
    .from("job_posting")
    .update({
      job_role_id: job_role_id ? Number(job_role_id) : undefined,
      job_title,
      description,
      location,
      salary_range: salary_range ?? null,
      application_deadline,
      application_link,
    })
    .eq("job_posting_id", jobPostingId)
    .eq("company_id", user.id) // ownership check
    .select()
    .single();

  if (updErr) return res.status(400).json({ error: updErr.message });

  // 2) Replace skills (delete old links)
  const { error: delErr } = await admin
    .from("job_posting_skill")
    .delete()
    .eq("job_posting_id", jobPostingId);

  if (delErr) return res.status(400).json({ error: delErr.message });

  // --- 3) Clean + de-duplicate skills by normalized_skill ---
  const cleaned = skills
    .map((s) => ({
      name: (s?.name || "").trim(),
      is_other: !!s?.is_other,
    }))
    .filter((s) => s.name.length > 0);

  if (cleaned.length === 0) {
    return res.status(400).json({ error: "Skills must contain non-empty names." });
  }

  const uniqByNorm = new Map(); // norm -> {name,is_other}
  for (const s of cleaned) {
    const norm = normalizeLocal(s.name);
    if (!norm) continue;
    if (!uniqByNorm.has(norm)) uniqByNorm.set(norm, s);
  }

  const uniq = Array.from(uniqByNorm.entries()).map(([norm, s]) => ({
    normalized: norm,
    name: s.name,
    is_other: s.is_other,
  }));

  // --- 4) Find what already exists in skill table (by normalized_skill) ---
  const normalizedList = uniq.map((x) => x.normalized);

  const { data: existingSkills, error: existErr } = await admin
    .from("skill")
    .select("skill_id, normalized_skill, skill_source")
    .in("normalized_skill", normalizedList);

  if (existErr) return res.status(400).json({ error: existErr.message });

  const existingMap = new Map(
    (existingSkills || []).map((r) => [r.normalized_skill, r])
  );

  // --- 5) Insert ONLY missing skills as company (DO NOT UPSERT) ---
  const missing = uniq.filter((x) => !existingMap.has(x.normalized));

  if (missing.length > 0) {
    const rows = missing.map((x) => ({
      skill_name: x.name,
      skill_source: "company",
      // normalized_skill filled by trigger
    }));

    const { data: insertedRows, error: insErr } = await admin
      .from("skill")
      .insert(rows)
      .select("skill_id, normalized_skill, skill_source");

    if (insErr) return res.status(400).json({ error: insErr.message });

    for (const r of insertedRows || []) {
      existingMap.set(r.normalized_skill, r);
    }
  }

  // --- 6) Build bridge rows + FIX is_other server-side ---
  // Rule: if skill_source is usm => is_other MUST be false
  const bridgeRows = uniq.map((x) => {
    const rec = existingMap.get(x.normalized);
    const isUSM = rec?.skill_source === "usm";

    return {
      job_posting_id: jobPostingId,
      skill_id: rec?.skill_id,
      is_other: isUSM ? false : !!x.is_other,
    };
  });

  if (bridgeRows.some((r) => !r.skill_id)) {
    return res.status(500).json({ error: "Failed to resolve some skill_ids." });
  }

  const { error: bridgeErr } = await admin
    .from("job_posting_skill")
    .insert(bridgeRows);

  if (bridgeErr) return res.status(400).json({ error: bridgeErr.message });

  // Refresh aggregation for the role after replacement
  const roleId = Number(updated.job_role_id); // safest: use DB returned value
  const { error: rpcErr } = await admin.rpc("refresh_job_role_skills", {
    p_job_role_id: roleId,
  });
  if (rpcErr) return res.status(400).json({ error: rpcErr.message });

  return res.json({ ok: true, job: updated });
});

// ======================================== soft delete (close) ==========================================
// --- company: close job posting (soft close) ---
app.patch("/job-postings/:id/close", async (req, res) => {
  const { user, error } = await requireCompany(req);
  if (!user) return res.status(401).json({ error });

  const jobPostingId = Number(req.params.id);
  if (!jobPostingId || Number.isNaN(jobPostingId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { data, error: updErr } = await admin
    .from("job_posting")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("job_posting_id", jobPostingId)
    .eq("company_id", user.id)
    .select()
    .single();

  if (updErr) return res.status(400).json({ error: updErr.message });
  return res.json({ ok: true, job: data });
});


// =================================================== hard delete ===========================================
app.delete("/job-postings/:id", async (req, res) => {
  const { user, error } = await requireCompany(req);
  if (!user) return res.status(401).json({ error });

  const jobPostingId = Number(req.params.id);
  if (!jobPostingId || Number.isNaN(jobPostingId)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  // ✅ 0) Get job_role_id first (you need it to refresh the aggregation)
  const { data: jp, error: jpErr } = await admin
    .from("job_posting")
    .select("job_role_id")
    .eq("job_posting_id", jobPostingId)
    .eq("company_id", user.id)
    .single();

  if (jpErr || !jp) {
    return res.status(404).json({ error: "Job posting not found (or not yours)" });
  }

  const jobRoleId = jp.job_role_id;

  // ✅ 1) Delete bridge rows first
  const { error: delBridgeErr } = await admin
    .from("job_posting_skill")
    .delete()
    .eq("job_posting_id", jobPostingId);

  if (delBridgeErr) return res.status(400).json({ error: delBridgeErr.message });

  // ✅ 2) Delete the posting itself (ownership check)
  const { error: delPostErr } = await admin
    .from("job_posting")
    .delete()
    .eq("job_posting_id", jobPostingId)
    .eq("company_id", user.id);

  if (delPostErr) return res.status(400).json({ error: delPostErr.message });

  // ✅ 3) Refresh aggregated cache table
  const { error: rpcErr } = await admin.rpc("refresh_job_role_skills", {
    p_job_role_id: jobRoleId,
  });

  if (rpcErr) return res.status(400).json({ error: rpcErr.message });

  return res.json({ ok: true });
});


// ============================================STUDENT SKILL==================================

// ---------------- student dashboard --------------------------------------
app.get("/student/me", async (req, res) => {
  const { user, error } = await requireStudent(req);
  if (!user) return res.status(401).json({ error });

  const { data: student, error: sErr } = await admin
    .from("student_profiles")
    .select(`
      id, full_name, matric_number, programme, school, year_of_study,
      advisor_id,
      advisor:advisor_id(full_name)
    `)
    .eq("id", user.id)
    .single();

  if (sErr) return res.status(400).json({ error: sErr.message });
  return res.json(student);
});

//----------------------------This “deactivates” old ones and inserts/activates the new one.------------
app.post("/student/target", async (req, res) => {
  const { user, error } = await requireStudent(req);
  if (!user) return res.status(401).json({ error });

  const roleId = Number(req.body.job_role_id);
  if (!roleId) return res.status(400).json({ error: "Invalid job_role_id" });

  // deactivate all current
  const { error: offErr } = await admin
    .from("student_job_target")
    .update({ is_active: false })
    .eq("student_id", user.id);

  if (offErr) return res.status(400).json({ error: offErr.message });

  // upsert new active target
  const { data, error: upErr } = await admin
    .from("student_job_target")
    .upsert(
      { student_id: user.id, job_role_id: roleId, is_active: true },
      { onConflict: "student_id,job_role_id" }
    )
    .select()
    .single();

  if (upErr) return res.status(400).json({ error: upErr.message });

  return res.json({ ok: true, target: data });
});

//----------- Get current active target ----------------------------
app.get("/student/target", async (req, res) => {
  const { user, error } = await requireStudent(req);
  if (!user) return res.status(401).json({ error });

  const { data, error: tErr } = await admin
    .from("student_job_target")
    .select("job_role_id, is_active, job_role:job_role_id(job_role_name)")
    .eq("student_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (tErr) return res.status(400).json({ error: tErr.message });

  // if no active target yet, return null nicely
  if (!data) return res.json(null);

  return res.json({
    job_role_id: data.job_role_id,
    job_role: data.job_role,
    is_active: data.is_active,
  });
});


//--------------Fetch roadmap rows grouped later in UI------------------
app.get("/student/roadmap", async (req, res) => {
  const { user, error } = await requireStudent(req);
  if (!user) return res.status(401).json({ error });

  // Get student year
  const { data: profile, error: profErr } = await admin
    .from("student_profiles")
    .select("year_of_study")
    .eq("id", user.id)
    .single();

  if (profErr) return res.status(400).json({ error: profErr.message });
  const studentYear = profile?.year_of_study;
  if (!studentYear) return res.status(400).json({ error: "Student year is not set." })

  // active target
  const { data: target, error: tErr } = await admin
    .from("student_job_target")
    .select("job_role_id, job_role:job_role_id(job_role_name)")
    .eq("student_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (tErr) return res.status(400).json({ error: tErr.message });
  if (!target?.job_role_id) return res.json({ target: null, items: [] });

  // progress rows
  const { data: rows, error: rErr } = await admin
    .from("student_skill_progress")
    .select(`
      progress_id,
      planned_year,
      progress_status,
      skill_id,
      skill:skill_id(skill_id, skill_name)
    `)
    .eq("student_id", user.id)
    .eq("job_role_id", target.job_role_id)
    .lte("planned_year", studentYear)
    .order("planned_year", { ascending: true });

  if (rErr) return res.status(400).json({ error: rErr.message });

  // proofs for this student + role
  const { data: proofs, error: pErr } = await admin
    .from("skill_proof")
    .select("skill_id, status, review_note, reviewed_at")
    .eq("student_id", user.id)
    .eq("job_role_id", target.job_role_id);

  if (pErr) return res.status(400).json({ error: pErr.message });

  const proofMap = new Map((proofs || []).map(p => [p.skill_id, p]));

  return res.json({
    target,
    year: studentYear,
    items: (rows || []).map(r => {
      const proof = proofMap.get(r.skill_id) || null;
      return {
        progress_id: r.progress_id,
        planned_year: r.planned_year,
        progress_status: r.progress_status,
        skill_id: r.skill?.skill_id,
        skill_name: r.skill?.skill_name,
        proof_status: proof?.status || null,
        review_note: proof?.review_note || null,
        reviewed_at: proof?.reviewed_at || null,
      };
    }),
  });
});



// ---------------- My Submissions page ---------------------
app.get("/student/submissions", async (req, res) => {
  const { user, error } = await requireStudent(req);
  if (!user) return res.status(401).json({ error });

  const { data, error: qErr } = await admin
    .from("skill_proof")
    .select(`
      proof_id,
      job_role_id,
      skill_id,
      file_url,
      description,
      status,
      submitted_at,
      review_note,
      reviewed_at,
      job_role:job_role_id(job_role_name),
      skill:skill_id(skill_name)
    `)
    .eq("student_id", user.id)
    .order("submitted_at", { ascending: false });

  if (qErr) return res.status(400).json({ error: qErr.message });
  return res.json(data);
});

// ------------------ Submit proof (allowed if none OR rejected only) --------------
app.post("/student/proofs", async (req, res) => {
  const { user, error } = await requireStudent(req);
  if (!user) return res.status(401).json({ error });

  const { job_role_id, skill_id, file_url, description } = req.body;

  const roleId = Number(job_role_id);
  const skillId = Number(skill_id);
  if (!roleId || !skillId) return res.status(400).json({ error: "Invalid job_role_id or skill_id" });
  if (!file_url) return res.status(400).json({ error: "file_url is required" });

  // Check existing
  const { data: existing, error: exErr } = await admin
    .from("skill_proof")
    .select("proof_id, status")
    .eq("student_id", user.id)
    .eq("job_role_id", roleId)
    .eq("skill_id", skillId)
    .maybeSingle();

  if (exErr) return res.status(400).json({ error: exErr.message });

  if (existing && existing.status !== "rejected") {
    return res.status(409).json({ error: `Already ${existing.status}. You can only resubmit if rejected.` });
  }

  const payload = {
    student_id: user.id,
    job_role_id: roleId,
    skill_id: skillId,
    file_url,
    description: description ?? null,
    status: "pending",
    submitted_at: new Date().toISOString(),
    review_note: null,
    reviewed_at: null,
    reviewed_by: null,
  };

  const { data: saved, error: upErr } = await admin
    .from("skill_proof")
    .upsert(payload, { onConflict: "student_id,job_role_id,skill_id" })
    .select()
    .single();

  if (upErr) return res.status(400).json({ error: upErr.message });

  return res.json({ ok: true, proof: saved });
});

app.get("/student/progress/summary", async (req, res) => {
  const { user, error } = await requireStudent(req);
  if (!user) return res.status(401).json({ error });

  const { data: target, error: tErr } = await admin
    .from("student_job_target")
    .select("job_role_id")
    .eq("student_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (tErr) return res.status(400).json({ error: tErr.message });
  if (!target?.job_role_id) return res.json({ job_role_id: null, counts: {} });

  const { data: rows, error: pErr } = await admin
    .from("student_skill_progress")
    .select("progress_status")
    .eq("student_id", user.id)
    .eq("job_role_id", target.job_role_id);

  if (pErr) return res.status(400).json({ error: pErr.message });

  const counts = {};
  for (const r of rows) counts[r.progress_status] = (counts[r.progress_status] || 0) + 1;

  return res.json({ job_role_id: target.job_role_id, counts });
});

//----------Generate roadmap after target is set------
app.post("/student/roadmap/generate", async (req, res) => {
  const { user, error } = await requireStudent(req);
  if (!user) return res.status(401).json({ error });

  const roleId = Number(req.body.job_role_id);
  if (!roleId) return res.status(400).json({ error: "Invalid job_role_id" });

  const { error: rpcErr } = await admin.rpc("generate_student_roadmap", {
    p_student_id: user.id,
    p_job_role_id: roleId,
  });

  if (rpcErr) return res.status(400).json({ error: rpcErr.message });

  return res.json({ ok: true });
});

// --- server.js: Student Job Feed Integration ---
app.get("/api/public-jobs", async (req, res) => {
  // 1. Role-Based Access: Verify user is a Student (Blocks junior years if logic is added)
  const { user, error } = await requireStudent(req);
  if (!user) return res.status(401).json({ error: "Unauthorized Access" });

  // 2. Data Sharing: Fetching ALL company data from the correct table
  const { data, error: dbError } = await admin
    .from("job_posting") // Pulls directly from the table seen in your Supabase screenshot
    .select(`
      job_posting_id,
      job_title,
      description,
      location,
      salary_range,
      application_deadline,
      application_link,
      created_at
    `)
    .eq("status", "active") // Filters for valid competition/job data
    .order("created_at", { ascending: false });

  if (dbError) return res.status(400).json({ error: dbError.message });

  // Return the auto-fetched links and data to the student frontend
  return res.json(data);
});


// ==================== ADVISOR PROOF ENDPOINTS ====================

// ---------- Advisor: get all proof submissions from their assigned students ---------
app.get("/advisor/proofs", async (req, res) => {
  const { user, error } = await requireAdvisor(req);
  if (!user) return res.status(401).json({ error });

  // Get all students assigned to this advisor
  const { data: students, error: studErr } = await admin
    .from("student_profiles")
    .select("id")
    .eq("advisor_id", user.id);

  if (studErr) return res.status(400).json({ error: studErr.message });

  const studentIds = students.map(s => s.id);
  if (studentIds.length === 0) {
    return res.json([]); // No students assigned
  }

  // Get all proofs from those students
  // Note: email is in profiles table, not student_profiles
  const { data, error: qErr } = await admin
    .from("skill_proof")
    .select(`
      proof_id,
      student_id,
      job_role_id,
      skill_id,
      file_url,
      description,
      status,
      submitted_at,
      review_note,
      reviewed_at,
      reviewed_by,
      job_role:job_role_id(job_role_name),
      skill:skill_id(skill_name),
      student_profile:student_id(full_name, matric_number)
    `)
    .in("student_id", studentIds)
    .order("submitted_at", { ascending: false });

  if (qErr) return res.status(400).json({ error: qErr.message });

  // Fetch emails separately from profiles table
  if (data && data.length > 0) {
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", studentIds);

    if (!profErr) {
      const emailMap = new Map(profiles.map(p => [p.id, p.email]));

      // Add email to each proof's student_profile
      data.forEach(proof => {
        if (proof.student_profile) {
          proof.student_profile.email = emailMap.get(proof.student_id) || "";
        }
      });
    }
  }

  return res.json(data || []);
});

/// ==================== ADVISOR ====================

// Get specific student's roadmap progress (for advisors)
app.get("/advisor/student/:studentId/progress", async (req, res) => {
  const { user, error } = await requireAdvisor(req);
  if (!user) return res.status(401).json({ error });

  const studentId = req.params.studentId;

  // Verify this student is assigned to this advisor
  const { data: student, error: studentErr } = await admin
    .from("student_profiles")
    .select("id, advisor_id")
    .eq("id", studentId)
    .single();

  if (studentErr) return res.status(404).json({ error: "Student not found" });
  if (student.advisor_id !== user.id) {
    return res.status(403).json({ error: "You can only view progress of your assigned students" });
  }

  // Get active target
  const { data: target, error: tErr } = await admin
    .from("student_job_target")
    .select("job_role_id, job_role:job_role_id(job_role_name)")
    .eq("student_id", studentId)
    .eq("is_active", true)
    .maybeSingle();

  if (tErr) return res.status(400).json({ error: tErr.message });
  if (!target?.job_role_id) return res.json({ target: null, items: [] });

  // Get progress rows
  const { data: rows, error: rErr } = await admin
    .from("student_skill_progress")
    .select(`
      progress_id,
      planned_year,
      progress_status,
      skill_id,
      skill:skill_id(skill_id, skill_name)
    `)
    .eq("student_id", studentId)
    .eq("job_role_id", target.job_role_id)
    .order("planned_year", { ascending: true });

  if (rErr) return res.status(400).json({ error: rErr.message });

  // Get proofs for this student + role
  const { data: proofs, error: pErr } = await admin
    .from("skill_proof")
    .select("skill_id, status, review_note, reviewed_at")
    .eq("student_id", studentId)
    .eq("job_role_id", target.job_role_id);

  if (pErr) return res.status(400).json({ error: pErr.message });

  const proofMap = new Map((proofs || []).map(p => [p.skill_id, p]));

  return res.json({
    target,
    items: (rows || []).map(r => {
      const proof = proofMap.get(r.skill_id) || null;
      return {
        progress_id: r.progress_id,
        planned_year: r.planned_year,
        progress_status: r.progress_status,
        skill_id: r.skill?.skill_id,
        skill_name: r.skill?.skill_name,
        proof_status: proof?.status || null,
        review_note: proof?.review_note || null,
        reviewed_at: proof?.reviewed_at || null,
      };
    }),
  });
});

// Get specific student's proof submissions (for advisors)
app.get("/advisor/student/:studentId/submissions", async (req, res) => {
  const { user, error } = await requireAdvisor(req);
  if (!user) return res.status(401).json({ error });

  const studentId = req.params.studentId;

  // Verify this student is assigned to this advisor
  const { data: student, error: studentErr } = await admin
    .from("student_profiles")
    .select("id, advisor_id")
    .eq("id", studentId)
    .single();

  if (studentErr) return res.status(404).json({ error: "Student not found" });
  if (student.advisor_id !== user.id) {
    return res.status(403).json({ error: "You can only view submissions of your assigned students" });
  }

  // Get all proof submissions for this student
  const { data, error: qErr } = await admin
    .from("skill_proof")
    .select(`
      proof_id,
      job_role_id,
      skill_id,
      file_url,
      description,
      status,
      submitted_at,
      review_note,
      reviewed_at,
      job_role:job_role_id(job_role_name),
      skill:skill_id(skill_name)
    `)
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false });

  if (qErr) return res.status(400).json({ error: qErr.message });
  return res.json(data || []);
});

// ---------- Advisor: approve or reject a proof ---------
app.patch("/advisor/proofs/:proofId", async (req, res) => {
  console.log("🎯 ENDPOINT HIT: /advisor/proofs/:proofId");
  console.log("📋 Proof ID:", req.params.proofId);
  console.log("📦 Request body:", req.body);

  const { user, error } = await requireAdvisor(req);
  console.log("👤 User check:", user ? `✅ ${user.id}` : `❌ ${error}`);

  if (!user) return res.status(401).json({ error });
  const proofId = Number(req.params.proofId);
  if (!proofId || Number.isNaN(proofId)) {
    return res.status(400).json({ error: "Invalid proof_id" });
  }

  const { status, review_note } = req.body;

  // Validate status
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'approved' or 'rejected'" });
  }

  // Get the proof to verify student belongs to this advisor
  const { data: proof, error: proofErr } = await admin
    .from("skill_proof")
    .select("student_id")
    .eq("proof_id", proofId)
    .single();

  if (proofErr) return res.status(404).json({ error: "Proof not found" });

  // Verify the student is assigned to this advisor
  const { data: student, error: studentErr } = await admin
    .from("student_profiles")
    .select("advisor_id")
    .eq("id", proof.student_id)
    .single();

  if (studentErr) return res.status(404).json({ error: "Student not found" });
  if (student.advisor_id !== user.id) {
    return res.status(403).json({ error: "You can only review proofs from your assigned students" });
  }

  // Update the proof
  const { data: updated, error: updateErr } = await admin
    .from("skill_proof")
    .update({
      status,
      review_note: review_note || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("proof_id", proofId)
    .select()
    .single();

  if (updateErr) return res.status(400).json({ error: updateErr.message });

  return res.json({ ok: true, proof: updated });
});

// Get completed skills for a student
app.get("/advisor/student/:studentId/completed-skills", async (req, res) => {
  const { user, error } = await requireAdvisor(req);
  if (!user) return res.status(401).json({ error });

  const studentId = req.params.studentId;

  try {
    // 1) Verify the advisor has access to this student
    const { data: studentProfile, error: studentError } = await admin
      .from("student_profiles")
      .select("advisor_id")
      .eq("id", studentId)
      .single();

    if (studentError) {
      return res.status(400).json({ error: studentError.message });
    }

    if (studentProfile.advisor_id !== user.id) {
      return res.status(403).json({ error: "Unauthorized access to student data" });
    }

    // 2) Get student's active target (optional but usually useful for job role name)
    const { data: target, error: targetErr } = await admin
      .from("student_job_target")
      .select("job_role_id, job_role:job_role_id(job_role_name)")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .maybeSingle();

    if (targetErr) return res.status(400).json({ error: targetErr.message });

    // 3) Fetch completed progress rows (+ skill name)
    // If you want to restrict to active target only, add .eq("job_role_id", target.job_role_id)
    let progressQuery = admin
      .from("student_skill_progress")
      .select(`
        progress_id,
        student_id,
        job_role_id,
        planned_year,
        progress_status,
        skill_id,
        skill:skill_id(skill_id, skill_name)
      `)
      .eq("student_id", studentId)
      .eq("progress_status", "Completed")
      .order("planned_year", { ascending: true });

    // restrict to active target if exists
    if (target?.job_role_id) {
      progressQuery = progressQuery.eq("job_role_id", target.job_role_id);
    }

    const { data: progressRows, error: progErr } = await progressQuery;
    if (progErr) return res.status(400).json({ error: progErr.message });

    if (!progressRows || progressRows.length === 0) {
      return res.json({
        student_id: studentId,
        target: target || null,
        completed: [],
      });
    }

    // 4) (Optional) Attach proof info if exists (approved/pending/rejected)
    // We'll fetch proofs for those completed skill_ids
    const skillIds = progressRows.map(r => r.skill_id);

    const { data: proofs, error: proofErr } = await admin
      .from("skill_proof")
      .select(`
        proof_id,
        skill_id,
        status,
        file_url,
        description,
        submitted_at,
        reviewed_at,
        review_note
      `)
      .eq("student_id", studentId)
      .in("skill_id", skillIds);

    if (proofErr) return res.status(400).json({ error: proofErr.message });

    const proofMap = new Map((proofs || []).map(p => [p.skill_id, p]));

    // 5) Format response
    const completed = progressRows.map(r => {
      const proof = proofMap.get(r.skill_id) || null;
      return {
        progress_id: r.progress_id,
        skill_id: r.skill?.skill_id ?? r.skill_id,
        skill_name: r.skill?.skill_name ?? null,
        planned_year: r.planned_year,
        job_role_id: r.job_role_id,
        progress_status: r.progress_status, // "Completed"
        proof: proof
          ? {
              proof_id: proof.proof_id,
              status: proof.status,
              file_url: proof.file_url,
              description: proof.description,
              submitted_at: proof.submitted_at,
              reviewed_at: proof.reviewed_at,
              review_note: proof.review_note,
            }
          : null,
      };
    });

    return res.json({
      student_id: studentId,
      target: target || null,
      completed,
    });
  } catch (err) {
    console.error("Error fetching completed skills:", err);
    return res.status(500).json({ error: "Failed to fetch completed skills" });
  }
});

// ==================== ADMIN USER MANAGEMENT ====================

// 1. GET /admin/users - List all users (MOST SPECIFIC STATIC ROUTE FIRST)
app.get("/admin/users", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const { data, error: qErr } = await admin
    .from("profiles")
    .select("id, email, role, username, avatar_url")
    .order("email", { ascending: true });

  if (qErr) return res.status(400).json({ error: qErr.message });
  return res.json(data || []);
});

// 2. GET /admin/users/:id/details - SPECIFIC PARAM ROUTE BEFORE GENERIC
app.get("/admin/users/:id/details", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const targetId = req.params.id;

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("id, email, role, username, avatar_url")
    .eq("id", targetId)
    .single();

  if (pErr) return res.status(400).json({ error: pErr.message });

  let roleProfile = null;

  if (profile.role === "Student") {
    const { data, error: sErr } = await admin
      .from("student_profiles")
      .select("id, full_name, matric_number, programme, school, year_of_study, advisor_id")
      .eq("id", targetId)
      .maybeSingle();

    if (sErr) return res.status(400).json({ error: sErr.message });
    roleProfile = data;
  }

  if (profile.role === "Academic Advisor") {
    const { data, error: aErr } = await admin
      .from("academic_advisor_profiles")
      .select("id, full_name, room_number, position, department")
      .eq("id", targetId)
      .maybeSingle();

    if (aErr) return res.status(400).json({ error: aErr.message });
    roleProfile = data;
  }

  if (profile.role === "Company") {
    const { data, error: cErr } = await admin
      .from("company_profiles")
      .select("id, company_name, website, company_category, contact_link, hr_contact_name")
      .eq("id", targetId)
      .maybeSingle();

    if (cErr) return res.status(400).json({ error: cErr.message });
    roleProfile = data;
  }

  return res.json({ profile, roleProfile });
});

// 3. PATCH /admin/users/:id - Update base profile (AFTER SPECIFIC ROUTES)
app.patch("/admin/users/:id", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const id = req.params.id;
  const { username, avatar_url } = req.body;

  const payload = {};
  if (username !== undefined) payload.username = username;
  if (avatar_url !== undefined) payload.avatar_url = avatar_url;

  const { data, error: updErr } = await admin
    .from("profiles")
    .update(payload)
    .eq("id", id)
    .select("id, email, role, username, avatar_url")
    .single();

  if (updErr) return res.status(400).json({ error: updErr.message });
  return res.json({ ok: true, profile: data });
});

// 4. PATCH /admin/students/:id
app.patch("/admin/students/:id", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const id = req.params.id;

  const { data: p, error: pErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .single();

  if (pErr) return res.status(400).json({ error: pErr.message });
  if (p.role !== "Student") return res.status(400).json({ error: "Target user is not a Student" });

  const allowed = ["full_name", "matric_number", "programme", "school", "year_of_study", "advisor_id"];
  const payload = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) payload[k] = req.body[k];
  }

  if (payload.year_of_study !== undefined && payload.year_of_study !== null) {
    payload.year_of_study = Number(payload.year_of_study);
    if (Number.isNaN(payload.year_of_study)) {
      return res.status(400).json({ error: "year_of_study must be a number" });
    }
  }

  const { data, error: updErr } = await admin
    .from("student_profiles")
    .update(payload)
    .eq("id", id)
    .select("id, full_name, matric_number, programme, school, year_of_study, advisor_id")
    .single();

  if (updErr) return res.status(400).json({ error: updErr.message });
  return res.json({ ok: true, student_profile: data });
});

// 5. PATCH /admin/advisors/:id
app.patch("/admin/advisors/:id", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const id = req.params.id;

  const { data: p, error: pErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .single();

  if (pErr) return res.status(400).json({ error: pErr.message });
  if (p.role !== "Academic Advisor") {
    return res.status(400).json({ error: "Target user is not an Academic Advisor" });
  }

  const allowed = ["full_name", "room_number", "position", "department"];
  const payload = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) payload[k] = req.body[k];
  }

  const { data, error: updErr } = await admin
    .from("academic_advisor_profiles")
    .update(payload)
    .eq("id", id)
    .select("id, full_name, room_number, position, department")
    .single();

  if (updErr) return res.status(400).json({ error: updErr.message });
  return res.json({ ok: true, advisor_profile: data });
});

// 6. PATCH /admin/companies/:id
app.patch("/admin/companies/:id", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const id = req.params.id;

  const { data: p, error: pErr } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", id)
    .single();

  if (pErr) return res.status(400).json({ error: pErr.message });
  if (p.role !== "Company") return res.status(400).json({ error: "Target user is not a Company" });

  const allowed = ["company_name", "website", "company_category", "contact_link", "hr_contact_name"];
  const payload = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) payload[k] = req.body[k];
  }

  const { data, error: updErr } = await admin
    .from("company_profiles")
    .update(payload)
    .eq("id", id)
    .select("id, company_name, website, company_category, contact_link, hr_contact_name")
    .single();

  if (updErr) return res.status(400).json({ error: updErr.message });
  return res.json({ ok: true, company_profile: data });
});

// ==================== ADMIN COMPETITION MANAGEMENT ====================

app.get("/admin/competitions", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const { data, error: qErr } = await admin
    .from("competition_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (qErr) return res.status(400).json({ error: qErr.message });
  res.json(data);
});

app.post("/admin/competitions", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const {
    competition_title,
    description,
    venue,
    price_participate,
    registration_link,
    image_url,
    competition_date,
    start_time,
    end_time,
  } = req.body;

  if (!competition_title || !description || !competition_date) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const { data, error: insErr } = await admin
    .from("competition_posts")
    .insert([{
      user_id: user.id,
      competition_title,
      description,
      venue: venue ?? null,
      price_participate: price_participate ?? null,
      registration_link: registration_link ?? null,
      image_url: image_url ?? null,
      competition_date,
      start_time: start_time ?? null,
      end_time: end_time ?? null,
    }])
    .select()
    .single();

  if (insErr) return res.status(400).json({ error: insErr.message });
  res.json({ ok: true, competition: data });
});

app.patch("/admin/competitions/:id", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const allowed = [
    "competition_title",
    "description",
    "venue",
    "price_participate",
    "registration_link",
    "image_url",
    "competition_date",
    "start_time",
    "end_time",
  ];

  const payload = {};
  for (const k of allowed) {
    if (req.body[k] !== undefined) payload[k] = req.body[k];
  }

  const { data, error: updErr } = await admin
    .from("competition_posts")
    .update(payload)
    .eq("id", req.params.id)
    .select()
    .single();

  if (updErr) return res.status(400).json({ error: updErr.message });
  res.json({ ok: true, competition: data });
});

app.delete("/admin/competitions/:id", async (req, res) => {
  const { user, error } = await requireAdmin(req);
  if (!user) return res.status(401).json({ error });

  const { error: delErr } = await admin
    .from("competition_posts")
    .delete()
    .eq("id", req.params.id);

  if (delErr) return res.status(400).json({ error: delErr.message });
  res.json({ ok: true });
});


// ==================== CV GENERATOR =========================
app.post("/api/generate-cv", async (req, res) => {

  const cvData = req.body;

  try {
    // Validate required fields
    if (!cvData.name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Create unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = cvData.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `CV_${safeName}_${timestamp}.pdf`;
    const storagePath = `generated/${filename}`;

    // Generate PDF content
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // Header - Name
    doc.fontSize(24).font('Helvetica-Bold').text(cvData.name.toUpperCase(), { align: 'center' });
    doc.moveDown(0.5);

    // Contact Info
    const contactLine = `${cvData.city || ''} ${cvData.state || ''} | ${cvData.email || ''} | ${cvData.phoneNumber || ''} | ${cvData.linkedin || ''}`;
    doc.fontSize(10).font('Helvetica').text(contactLine, { align: 'center' });
    doc.moveDown(1.5);

    // Career Objective
    if (cvData.careerObjective) {
      doc.fontSize(14).font('Helvetica-Bold').text('CAREER OBJECTIVE', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(cvData.careerObjective);
      doc.moveDown(1.5);
    }

    // Skills Section
    doc.fontSize(14).font('Helvetica-Bold').text('SKILLS', { underline: true });
    doc.moveDown(0.5);

    if (cvData.technicalSkills) {
      doc.fontSize(10).font('Helvetica-Bold').text('Technical Skills: ', { continued: true });
      doc.font('Helvetica').text(cvData.technicalSkills);
    }
    if (cvData.technicalLevel) {
      doc.fontSize(10).font('Helvetica-Bold').text('Level: ', { continued: true });
      doc.font('Helvetica').text(cvData.technicalLevel);
    }
    if (cvData.transferableSkills) {
      doc.fontSize(10).font('Helvetica-Bold').text('Transferable: ', { continued: true });
      doc.font('Helvetica').text(cvData.transferableSkills);
    }
    doc.moveDown(1.5);

    // Education
    if (cvData.educations && cvData.educations.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('EDUCATION', { underline: true });
      doc.moveDown(0.5);
      cvData.educations.forEach(edu => {
        doc.fontSize(10).font('Helvetica-Bold').text(edu.educationTitle || '', { continued: true });
        doc.font('Helvetica').text(`  ${edu.educationYears || ''}`, { align: 'right' });
      });
      doc.moveDown(1.5);
    }

    // Achievements
    if (cvData.achievements && cvData.achievements.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('ACHIEVEMENTS', { underline: true });
      doc.moveDown(0.5);
      cvData.achievements.forEach(ach => {
        doc.fontSize(10).font('Helvetica').text(`• ${ach.achievementTitle} (${ach.achievementYear})`);
      });
      doc.moveDown(1.5);
    }

    // Certificates
    if (cvData.certificates && cvData.certificates.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('CERTIFICATES', { underline: true });
      doc.moveDown(0.5);
      cvData.certificates.forEach(cert => {
        doc.fontSize(10).font('Helvetica').text(`• ${cert.certificateTitle} (${cert.certificateYear})`);
      });
      doc.moveDown(1.5);
    }

    // Reference
    if (cvData.referenceName) {
      doc.fontSize(14).font('Helvetica-Bold').text('REFERENCE', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Bold').text(cvData.referenceName);
      doc.font('Helvetica').text(`${cvData.referenceRole || ''}, ${cvData.referenceDepartment || ''}`);
      doc.text(cvData.referenceInstitution || '');
      doc.text(`Email: ${cvData.referenceEmail || ''} | Phone: ${cvData.referencePhoneNumber || ''}`);
    }

    // Finalize PDF
    doc.end();

    // Wait for PDF generation to complete
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });

    const pdfBuffer = Buffer.concat(chunks);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await admin.storage
      .from('cvs')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = admin.storage
      .from('cvs')
      .getPublicUrl(storagePath);

    return res.json({
      status: "success",
      message: "CV generated successfully",
      filename,
      url: publicUrl,
      download_url: publicUrl
    });

  } catch (err) {
    console.error("CV Generation Error:", err);
    return res.status(500).json({
      status: "error",
      message: err.message,
      details: "Check server logs for more information"
    });
  }
});

export default app;

// Only run locally
if (process.env.NODE_ENV !== "production") {
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`API running on http://localhost:${port}`));
}
