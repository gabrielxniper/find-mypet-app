import { AppException } from "../../../shared/exceptions/app.exception";
import { ErrorCodes } from "../../../shared/exceptions/error-codes";
import { supabaseAdmin } from "../../../shared/supabase/supabaseAdmin";
import type { CreateShareInput, PetShare, SharedPetResult } from "../models/share.model";

export class ShareRepository {
  async resolveUserIdByEmail(email: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new AppException("Erro ao buscar usuário.", 500, ErrorCodes.INTERNAL_ERROR, error.message);
    }

    if (!data) {
      throw new AppException(`Nenhuma conta encontrada com o email "${email}".`, 404, ErrorCodes.NOT_FOUND);
    }

    return data.id;
  }

  async create(input: CreateShareInput): Promise<PetShare> {
    const { data, error } = await supabaseAdmin
      .from("pet_shares")
      .insert({
        pet_id: input.pet_id,
        owner_id: input.owner_id,
        shared_with_user_id: input.shared_with_user_id,
        permission: input.permission,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new AppException("Este pet já foi compartilhado com esse usuário.", 409, ErrorCodes.CONFLICT);
      }
      throw new AppException("Não foi possível compartilhar o pet.", 500, ErrorCodes.INTERNAL_ERROR, error.message);
    }
    return data;
  }

  async findByPetAndOwner(petId: string, ownerId: string): Promise<PetShare[]> {
    const { data, error } = await supabaseAdmin
      .from("pet_shares")
      .select("*")
      .eq("pet_id", petId)
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppException("Não foi possível listar compartilhamentos.", 500, ErrorCodes.INTERNAL_ERROR, error.message);
    }

    if (!data || data.length === 0) return [];

    const userIds = data.map((s: any) => s.shared_with_user_id);
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

    return data.map((row: any) => ({
      ...row,
      shared_with_email: profiles?.find((p: any) => p.id === row.shared_with_user_id)?.email ?? row.shared_with_user_id,
    }));
  }

  async delete(shareId: string, ownerId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("pet_shares")
      .delete()
      .eq("id", shareId)
      .eq("owner_id", ownerId);

    if (error) {
      throw new AppException("Não foi possível remover o compartilhamento.", 500, ErrorCodes.INTERNAL_ERROR, error.message);
    }
  }

  async findSharedPetsForUser(userId: string): Promise<SharedPetResult[]> {
    const { data: shares, error: sharesError } = await supabaseAdmin
      .from("pet_shares")
      .select("id, permission, pet_id")
      .eq("shared_with_user_id", userId);

    if (sharesError) {
      throw new AppException("Não foi possível buscar pets compartilhados.", 500, ErrorCodes.INTERNAL_ERROR, sharesError.message);
    }

    if (!shares || shares.length === 0) return [];

    const petIds = shares.map((s: any) => s.pet_id);

    const { data: pets, error: petsError } = await supabaseAdmin
      .from("pets")
      .select("id, image_href, name, raca, cor, sexo, descricao, owner_id, created_at")
      .in("id", petIds);

    if (petsError) {
      throw new AppException("Não foi possível buscar detalhes dos pets.", 500, ErrorCodes.INTERNAL_ERROR, petsError.message);
    }

    const ownerIds = [...new Set((pets || []).map((p: any) => p.owner_id))];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ownerIds);

    return shares.map((share: any) => {
      const pet = (pets || []).find((p: any) => p.id === share.pet_id);
      const owner = (profiles || []).find((p: any) => p.id === pet?.owner_id);
      return {
        share_id: share.id,
        permission: share.permission,
        owner_name: owner?.full_name ?? owner?.email ?? null,
        ...pet,
      };
    });
  }

  async updatePermission(shareId: string, ownerId: string, permission: string): Promise<PetShare> {
    const { data, error } = await supabaseAdmin
      .from("pet_shares")
      .update({ permission })
      .eq("id", shareId)
      .eq("owner_id", ownerId)
      .select()
      .single();

    if (error) {
      throw new AppException("Não foi possível atualizar a permissão.", 500, ErrorCodes.INTERNAL_ERROR, error.message);
    }
    return data;
  }
}
