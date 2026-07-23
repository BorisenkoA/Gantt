"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import { Crew, ProjectItem } from "./types";
import { makeDemoCrews, makeDemoProjects } from "./demoData";
import { normalizePositions } from "./scheduler";

type BoardState = {
  crews: Crew[];
  projects: ProjectItem[];
  loading: boolean;
  connected: boolean;
};

async function fetchAll() {
  const sb = getSupabase();
  if (!sb) return null;
  const [{ data: crews, error: e1 }, { data: projects, error: e2 }] =
    await Promise.all([
      sb.from("crews").select("*").order("id"),
      sb.from("projects").select("*").order("crew_id").order("position"),
    ]);

  if (e1 || e2) {
    console.error("Supabase fetch error:", e1, e2);
    return null;
  }

  const mappedProjects: ProjectItem[] = (projects || []).map((p: any) => ({
    id: String(p.id),
    crewId: Number(p.crew_id),
    name: p.name || "",
    duration: Number(p.duration) || 1,
    color: p.color || "amber",
    position: Number(p.position) || 0,
    pauseDays: Number(p.pause_days) || 0,
    powerKw: p.power_kw ? Number(p.power_kw) : undefined,
    startDate: p.start_date || undefined,
  }));

  const mappedCrews: Crew[] = (crews || []).map((c: any) => ({
    id: Number(c.id),
    name: c.name,
    anchorDate: c.anchor_date,
  }));

  return { crews: mappedCrews, projects: mappedProjects };
}

async function seedDemoData() {
  const sb = getSupabase();
  if (!sb) return;
  const crews = makeDemoCrews();
  const projects = makeDemoProjects();

  await sb.from("crews").upsert(
    crews.map((c) => ({ id: c.id, name: c.name, anchor_date: c.anchorDate }))
  );

  await sb.from("projects").upsert(
    projects.map((p) => ({
      id: p.id,
      crew_id: p.crewId,
      name: p.name,
      duration: p.duration,
      color: p.color,
      position: p.position,
      pause_days: p.pauseDays || 0,
      power_kw: p.powerKw ?? null,
      start_date: p.startDate ?? null,
    }))
  );
}

export function useBoard() {
  const [state, setState] = useState<BoardState>({
    crews: [],
    projects: [],
    loading: true,
    connected: false,
  });
  const skipNextRemote = useRef(false);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured) {
      setState({
        crews: makeDemoCrews(),
        projects: makeDemoProjects(),
        loading: false,
        connected: false,
      });
      return;
    }

    (async () => {
      let data = await fetchAll();
      if (cancelled) return;

      if (data && data.projects.length === 0 && data.crews.length === 0) {
        await seedDemoData();
        data = await fetchAll();
      }

      if (cancelled) return;

      if (data) {
        setState({
          crews: data.crews.length ? data.crews : makeDemoCrews(),
          projects: data.projects,
          loading: false,
          connected: true,
        });
      } else {
        setState({
          crews: makeDemoCrews(),
          projects: makeDemoProjects(),
          loading: false,
          connected: false,
        });
      }
    })();

    const sb = getSupabase();
    if (!sb) return;

    const channel = sb
      .channel("board-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        async () => {
          if (skipNextRemote.current) {
            skipNextRemote.current = false;
            return;
          }
          const data = await fetchAll();
          if (data && !cancelled) {
            setState((s) => ({ ...s, projects: data.projects }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "crews" },
        async () => {
          if (skipNextRemote.current) {
            skipNextRemote.current = false;
            return;
          }
          const data = await fetchAll();
          if (data && !cancelled) {
            setState((s) => ({ ...s, crews: data.crews }));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  const persistProjects = useCallback(async (projects: ProjectItem[]) => {
    const sb = getSupabase();
    if (!sb) return;
    skipNextRemote.current = true;

    const payload = projects.map((p) => ({
      id: p.id,
      crew_id: p.crewId,
      name: p.name,
      duration: p.duration,
      color: p.color,
      position: p.position,
      pause_days: p.pauseDays || 0,
      power_kw: p.powerKw ?? null,
      start_date: p.startDate ?? null,
    }));

    const { error } = await sb.from("projects").upsert(payload);
    if (error) {
      console.error("Supabase SAVE ERROR (Projects):", error);
    }
  }, []);

  const persistCrews = useCallback(async (crews: Crew[]) => {
    const sb = getSupabase();
    if (!sb) return;
    skipNextRemote.current = true;
    const { error } = await sb.from("crews").upsert(
      crews.map((c) => ({ id: c.id, name: c.name, anchor_date: c.anchorDate }))
    );
    if (error) console.error("Supabase SAVE ERROR (Crews):", error);
  }, []);

  const deleteProjectRemote = useCallback(async (id: string) => {
    const sb = getSupabase();
    if (!sb) return;
    skipNextRemote.current = true;
    const { error } = await sb.from("projects").delete().eq("id", id);
    if (error) console.error("Supabase DELETE ERROR:", error);
  }, []);

  const updateProjects = useCallback(
    (updater: (prev: ProjectItem[]) => ProjectItem[]) => {
      setState((s) => {
        const next = updater(s.projects);
        const uniqueNext = Array.from(
          new Map(next.map((item) => [item.id, item])).values()
        );
        persistProjects(uniqueNext);
        return { ...s, projects: uniqueNext };
      });
    },
    [persistProjects]
  );

  const updateCrews = useCallback(
    (updater: (prev: Crew[]) => Crew[]) => {
      setState((s) => {
        const next = updater(s.crews);
        persistCrews(next);
        return { ...s, crews: next };
      });
    },
    [persistCrews]
  );

const addCrew = useCallback(async (name: string, anchorDate: string) => {
    const sb = getSupabase();
    if (!sb) return;

    skipNextRemote.current = true;
    const { data, error } = await sb
      .from("crews")
      .insert({
        name,
        anchor_date: anchorDate,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding crew:", error);
    } else if (data) {
      const newCrew: Crew = {
        id: Number(data.id),
        name: data.name,
        anchorDate: data.anchor_date,
      };
      setState((s) => ({ ...s, crews: [...s.crews, newCrew] }));
    }
  }, []);

  const removeCrew = useCallback(async (crewId: number) => {
    const sb = getSupabase();

    setState((s) => ({
      ...s,
      crews: s.crews.filter((c) => c.id !== crewId),
      projects: s.projects.filter((p) => p.crewId !== crewId),
    }));

    if (sb) {
      skipNextRemote.current = true;
      await sb.from("projects").delete().eq("crew_id", crewId);
      const { error } = await sb.from("crews").delete().eq("id", crewId);
      if (error) console.error("Error removing crew:", error);
    }
  }, []);

  const removeProject = useCallback(
    (id: string) => {
      setState((s) => {
        const target = s.projects.find((p) => p.id === id);
        let next = s.projects.filter((p) => p.id !== id);
        if (target) next = normalizePositions(next, target.crewId);
        persistProjects(next);
        deleteProjectRemote(id);
        return { ...s, projects: next };
      });
    },
    [persistProjects, deleteProjectRemote]
  );

  return {
    crews: state.crews,
    projects: state.projects,
    loading: state.loading,
    connected: state.connected,
    updateProjects,
    updateCrews,
    addCrew,
    removeCrew,
    removeProject,
  };
}