import { API_BASE_URL } from '@env';

import { supabase } from '../shared/lib/supabase';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type ApiRequestOptions = {
    method?: HttpMethod;
    body?: unknown;
    authenticated?: boolean;
};

type ApiErrorResponse = {
    message?: string;
    error?: {
        message?: string;
        code?: string;
    };
};

export class ApiService {

    static async request<T>(
        endpoint: string,
        options: ApiRequestOptions = {}
    ): Promise<T> {
        const {
            method = 'GET',
            body,
            authenticated = true,
        } = options;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            
        };

        if (authenticated) {
            const token = await this.getAccessToken();

            headers.Authorization = `Bearer ${token}`;
        }

        let response: Response;

        try { 
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });
        } catch {
            throw new Error(
                'Não foi possível conectar à API. Verifique sua conexão ou tente novamente mais tarde.'
            );
        }
        const responseData = await this.parseResponse(response);

        if (!response.ok) {
            throw new Error(
                this.getErrorMessage(responseData)
            );
        }

        return responseData as T;
    }

    static async get<T>(
        endpoint: string,
        authenticated = true
    ): Promise<T> {
        console.log('GET', `${API_BASE_URL}${endpoint}`);
        return this.request<T>(endpoint, {
            method: 'GET',
            authenticated,
        });
    }

    static async post<T>(
        endpoint: string,
        body?: unknown,
        authenticated = true
    ): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body,
            authenticated,
        });
    }

    static async patch<T>(
        endpoint: string,
        body?: unknown,
        authenticated = true
    ): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body,
            authenticated,
        });
    }

    private static async getAccessToken(): Promise<string> {
        const { data } = await supabase.auth.getSession();

        const token = data.session?.access_token;

        if (!token) {
            throw new Error('Usuário não autenticado.');
        }

        return token;
    }

    private static async parseResponse(
        response: Response
    ): Promise<unknown> {
        const text = await response.text();

        if (!text) {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch {
            return {
                message: 'Resposta inválida recebida da API.',
            };
        }
    }

    private static getErrorMessage(responseData: unknown): string {
        const data = responseData as ApiErrorResponse | null;

        return (
            data?.error?.message ||
            data?.message ||
            'Erro ao comunicar com a API.'
        );
    }
}
