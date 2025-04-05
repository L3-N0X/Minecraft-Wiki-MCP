import axios, { AxiosInstance } from "axios";
import { WIKIMEDIA_API_URL } from "../config/constants.js";

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: WIKIMEDIA_API_URL,
      params: {
        format: "json",
        origin: "*",
      },
    });
  }

  async get<T, P extends Record<string, unknown>>(endpoint: string, params: P): Promise<T> {
    try {
      const response = await this.axiosInstance.get(endpoint, {
        params: {
          ...params,
        },
      });

      if (response.data.error) {
        throw new Error(response.data.error.info);
      }

      return response.data;
    } catch (error) {
      throw new Error(
        `API request failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

export const apiService = new ApiService();
