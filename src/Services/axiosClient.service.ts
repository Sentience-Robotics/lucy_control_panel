import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";

const ENDPOINT = import.meta.env.VITE_ENDPOINT;

export abstract class AEntity {
  id?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export enum API_TARGET {
  USERS = 'users',
  POSTS = 'posts',
  PRODUCTS = 'products',
  ORDERS = 'orders',
  CATEGORIES = 'categories',
}

class AxiosClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: ENDPOINT,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken');
        }
        return Promise.reject(error);
      }
    );
  }

  async create<T extends Partial<AEntity>, R extends AEntity>(
    target: API_TARGET,
    data: T,
    config?: object
  ): Promise<AxiosResponse<R>> {
    return this.client.post(`/${target}`, data, config);
  }

  async update<T extends Partial<AEntity>, R extends AEntity>(
    target: API_TARGET,
    id: string | number,
    data: T,
    config?: object
  ): Promise<AxiosResponse<R>> {
    return this.client.put(`/${target}/${id}`, data, config);
  }

  async findOne<R extends AEntity>(
    target: API_TARGET,
    id: string | number,
    config?: object
  ): Promise<AxiosResponse<R>> {
    return this.client.get(`/${target}/${id}`, config);
  }

  async findAll<R extends AEntity>(
    target: API_TARGET,
    params?: Record<string, unknown>,
    config?: object
  ): Promise<AxiosResponse<R[]>> {
    return this.client.get(`/${target}`, { ...config, params });
  }

  async delete<R extends AEntity>(
    target: API_TARGET,
    id: string | number,
    config?: object
  ): Promise<AxiosResponse<R>> {
    return this.client.delete(`/${target}/${id}`, config);
  }

  async request<R extends AEntity>(config: object): Promise<AxiosResponse<R>> {
    return this.client.request(config);
  }
}

export const axiosClient = new AxiosClient();
