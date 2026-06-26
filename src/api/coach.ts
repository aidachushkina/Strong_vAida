import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { CoachLink, Profile } from '@/types/database';

/** A trainer's roster: active + pending links, with the client's profile. */
export interface RosterEntry {
  link: CoachLink;
  client: Profile | null;
}

export function useRoster(trainerId: string | undefined) {
  return useQuery({
    queryKey: ['roster', trainerId],
    enabled: !!trainerId,
    queryFn: async (): Promise<RosterEntry[]> => {
      const { data: links, error } = await supabase
        .from('coach_links')
        .select('*')
        .eq('trainer_id', trainerId!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const clientIds = (links ?? [])
        .map((l) => l.client_id)
        .filter((id): id is string => !!id);

      let profilesById = new Map<string, Profile>();
      if (clientIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', clientIds);
        profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));
      }

      return (links ?? []).map((link) => ({
        link,
        client: link.client_id ? profilesById.get(link.client_id) ?? null : null,
      }));
    },
  });
}

/** The active link for a client (their single trainer), with trainer profile. */
export function useMyTrainer(clientId: string | undefined) {
  return useQuery({
    queryKey: ['my-trainer', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<{ link: CoachLink; trainer: Profile | null } | null> => {
      const { data: link } = await supabase
        .from('coach_links')
        .select('*')
        .eq('client_id', clientId!)
        .eq('status', 'active')
        .maybeSingle();
      if (!link) return null;

      const { data: trainer } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', link.trainer_id)
        .maybeSingle();

      return { link, trainer: trainer ?? null };
    },
  });
}

export function useCreateInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('create_invite_code');
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster'] }),
  });
}

export function useRedeemInviteCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.rpc('redeem_invite_code', {
        p_code: code,
      });
      if (error) throw error;
      return data as CoachLink;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-trainer'] }),
  });
}

export function useLinkClientByEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.rpc('link_client_by_email', {
        p_email: email,
      });
      if (error) throw error;
      return data as CoachLink;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roster'] }),
  });
}
